
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { UserRole, Article, TrustedDevice } from '../types';
import { Newspaper, User, Menu, X, Search, LogIn, Clock, Flame, LayoutDashboard, ChevronDown, Handshake, ArrowUp, ArrowDown, Cloud, CloudRain, Sun, Home, Megaphone, Bell, ShieldAlert, Check, Monitor, Smartphone, Tablet } from 'lucide-react';
import { APP_NAME } from '../constants';
import Link from './Link';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient';
import SearchModal from './SearchModal';

interface LayoutProps {
  children: React.ReactNode;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  userName?: string | null;
  userAvatar?: string | null;
  onForceSync?: () => void;
  lastSync?: Date;
  articles?: Article[];
  categories?: string[];
  pendingDevices?: TrustedDevice[];
  onApproveDevice?: (id: string) => void;
  onRejectDevice?: (id: string) => void;
}

interface WeatherState {
  location: string;
  temp: number;
  condition: string;
  aqi: number;
  humidity?: number;
  lastUpdated: number;
}

interface NavItemProps {
  to: string;
  label: string;
  icon?: any;
  onClick?: () => void;
  isActive: boolean;
  onNavigate: (path: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ 
  to, 
  label, 
  icon: Icon, 
  onClick, 
  isActive, 
  onNavigate 
}) => (
  <Link
    to={to}
    onNavigate={onNavigate}
    onClick={onClick}
    className={`text-[10px] font-extrabold uppercase tracking-[0.15em] flex items-center gap-3 transition-colors duration-200 py-3 border-b border-gray-100 w-full ${
      isActive ? 'text-news-blue border-news-blue' : 'text-gray-500 hover:text-news-blue hover:bg-gray-50'
    }`}
  >
    {Icon && <Icon size={14} />}
    {label}
  </Link>
);

const DesktopNavItem: React.FC<NavItemProps> = ({ 
  to, 
  label, 
  icon: Icon, 
  onClick, 
  isActive, 
  onNavigate 
}) => (
  <Link
    to={to}
    onNavigate={onNavigate}
    onClick={onClick}
    className={`text-[9px] font-extrabold uppercase tracking-[0.15em] flex items-center gap-1.5 transition-colors duration-200 h-full border-b-2 ${
      isActive ? 'text-news-blue border-news-blue' : 'text-gray-500 hover:text-news-blue border-transparent'
    }`}
  >
    {Icon && <Icon size={12} />}
    {label}
  </Link>
);

const Layout: React.FC<LayoutProps> = ({ 
  children, currentRole, onRoleChange, currentPath, onNavigate, userName, userAvatar, 
  onForceSync, lastSync, articles = [], categories = [], 
  pendingDevices = [], onApproveDevice, onRejectDevice 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  
  // Notification State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  
  const [weatherState, setWeatherState] = useState<WeatherState>(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('newsroom_full_weather') : null;
      if (saved) return JSON.parse(saved);
    } catch (e) { console.warn("Failed to load weather", e); }
    return {
      location: 'Hyderabad',
      temp: 19,
      condition: 'Sunny',
      aqi: 74,
      humidity: 45,
      lastUpdated: 0
    };
  });

  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const MAX_VISIBLE_CATS = 6;
  const visibleCats = categories.slice(0, MAX_VISIBLE_CATS);
  const hiddenCats = categories.slice(MAX_VISIBLE_CATS);

  // Filter Breaking News: Last 5 Days Only, Sorted Newest First
  const breakingNews = useMemo(() => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 5);
      
      return articles
          .filter(a => new Date(a.publishedAt) >= cutoffDate)
          .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [articles]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const fullHeight = document.documentElement.scrollHeight;
        
        setShowScrollTop(scrollTop > 300);
        setShowScrollBottom((scrollTop + windowHeight) < (fullHeight - 300) && fullHeight > windowHeight * 1.5);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); 
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentPath]);

  // Click outside listener for notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

  const getWeatherCondition = (code: number) => {
      if (code === 0) return 'Clear';
      if (code <= 3) return 'Partly Cloudy';
      if (code <= 48) return 'Foggy';
      if (code <= 55) return 'Drizzle';
      if (code <= 65) return 'Rainy';
      if (code <= 77) return 'Snowy';
      if (code <= 86) return 'Showers';
      if (code <= 99) return 'Thunderstorm';
      return 'Cloudy';
  };

  const fetchWeatherData = useCallback(async (query: string) => {
    setIsWeatherLoading(true);
    setWeatherError(null);
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      if (!geoData.results || geoData.results.length === 0) throw new Error("Location not found.");
      const { latitude, longitude, name } = geoData.results[0];
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi&timezone=auto`)
      ]);
      const weatherData = await weatherRes.json();
      const aqiData = await aqiRes.json();
      const newState = {
        location: name,
        temp: Math.round(weatherData.current.temperature_2m),
        condition: getWeatherCondition(weatherData.current.weather_code), 
        aqi: Math.round(aqiData.current.us_aqi),
        humidity: weatherData.current.relative_humidity_2m,
        lastUpdated: Date.now()
      };
      setWeatherState(newState);
      localStorage.setItem('newsroom_full_weather', JSON.stringify(newState));
      setIsWeatherModalOpen(false);
    } catch (err: any) { setWeatherError(err.message); } finally { setIsWeatherLoading(false); }
  }, []);

  useEffect(() => {
      if (Date.now() - weatherState.lastUpdated > 900000) {
          fetchWeatherData(weatherState.location);
      }
  }, [fetchWeatherData, weatherState.lastUpdated, weatherState.location]);

  const isActive = (path: string) => currentPath === path;
  const isDashboard = currentPath.startsWith('/editor') || currentPath.startsWith('/writer');
  if (isDashboard) return <div className="min-h-screen bg-gray-50">{children}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-news-paper overflow-x-hidden w-full relative">
      
      <div className="bg-white border-b border-gray-100 py-2.5 px-4 md:px-6 flex justify-between items-center text-[10px] font-bold tracking-widest uppercase text-gray-400">
         <div className="flex gap-4 items-center">
            <span>{format(new Date(), 'dd MMM yyyy')}</span>
            <span className="text-news-gold hidden sm:flex items-center gap-1.5 border-l border-gray-200 pl-4">
              <Clock size={12} /> {format(time, 'hh:mm:ss a')}
            </span>
         </div>
         <div className="flex items-center gap-6">
             {userName ? (
                 <div className="flex items-center gap-3 relative">
                    
                    {/* Notification Bell - Always visible for logged in users */}
                    <div className="relative mr-4" ref={notificationRef}>
                      <button 
                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                        className={`transition-colors relative p-1 ${isNotificationsOpen ? 'text-news-black' : 'text-gray-400 hover:text-news-accent'}`}
                        title="Notifications"
                      >
                        <Bell size={16} />
                        {pendingDevices.length > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                            {pendingDevices.length}
                          </span>
                        )}
                      </button>

                      {isNotificationsOpen && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in zoom-in-95">
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Notifications</span>
                            {pendingDevices.length > 0 && (
                                <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{pendingDevices.length} Requests</span>
                            )}
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                            {pendingDevices.length === 0 ? (
                                <div className="p-6 text-center">
                                    <div className="bg-gray-50 w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-300">
                                        <Bell size={16} />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium">No new notifications</p>
                                </div>
                            ) : (
                                pendingDevices.map(device => (
                                  <div key={device.id} className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-3 mb-2">
                                      <div className="p-1.5 bg-gray-100 rounded text-gray-500">
                                        {device.deviceType === 'mobile' ? <Smartphone size={14}/> : device.deviceType === 'tablet' ? <Tablet size={14}/> : <Monitor size={14}/>}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-gray-900 truncate">{device.deviceName}</p>
                                        <p className="text-[9px] text-gray-500 truncate">{device.location} • {device.browser}</p>
                                        <p className="text-[9px] text-red-500 font-bold mt-1">Requesting Access</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      <button 
                                        onClick={() => onApproveDevice && onApproveDevice(device.id)}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[9px] font-bold uppercase py-1.5 rounded flex items-center justify-center gap-1"
                                      >
                                        <Check size={10} strokeWidth={3} /> Approve
                                      </button>
                                      <button 
                                        onClick={() => onRejectDevice && onRejectDevice(device.id)}
                                        className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 text-[9px] font-bold uppercase py-1.5 rounded flex items-center justify-center gap-1"
                                      >
                                        <X size={10} strokeWidth={3} /> Block
                                      </button>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {currentRole !== UserRole.READER && (
                        <Link 
                            to={currentRole === UserRole.WRITER ? '/writer' : '/editor'} 
                            onNavigate={onNavigate}
                            className="flex items-center gap-1.5 text-news-black hover:text-news-accent transition-colors mr-3 border-r border-gray-200 pr-3"
                        >
                            <LayoutDashboard size={14} /> <span className="hidden sm:inline">DASHBOARD</span>
                        </Link>
                    )}
                    <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 border border-gray-300">
                             {userAvatar ? <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" /> : <User size={16} className="m-1 text-gray-400"/>}
                         </div>
                         <span className="text-news-blue font-extrabold hidden sm:inline">{userName.toUpperCase()}</span>
                    </div>
                    <button onClick={() => supabase.auth.signOut()} className="text-gray-400 hover:text-news-accent ml-2">LOGOUT</button>
                 </div>
             ) : (
                 <Link to="/login" onNavigate={onNavigate} className="flex items-center gap-1.5 hover:text-news-blue">
                   <LogIn size={12} /> LOGIN
                 </Link>
             )}
         </div>
      </div>

      <header className="bg-white px-4 md:px-6 py-4 md:py-8 border-b border-gray-100 relative z-20">
         <div className="max-w-7xl mx-auto flex items-center justify-between">
             <div className="hidden md:block w-1/4">
             </div>

             <div className="flex-1 md:w-1/2 text-left md:text-center min-w-0 pr-2 md:pr-0 flex items-center justify-start md:justify-center">
                 <Link to="/" onNavigate={onNavigate} className="inline-block group">
                    <h1 className="font-serif text-2xl md:text-5xl font-extrabold tracking-tighter text-news-blue leading-none uppercase whitespace-nowrap">
                        <span className="text-news-gold">CJ</span> NEWSHUB
                    </h1>
                    <div className="flex items-center md:justify-center justify-start gap-2 md:gap-4 mt-2 md:mt-3">
                        <span className="hidden md:block h-[1px] bg-gray-200 w-12"></span>
                        <span className="text-[7px] md:text-[9px] uppercase tracking-[0.4em] text-gray-400 font-bold italic">Global Editorial Excellence</span>
                        <span className="hidden md:block h-[1px] bg-gray-200 w-12"></span>
                    </div>
                 </Link>
             </div>

             <div className="w-auto md:w-1/4 flex justify-end items-center gap-3 md:gap-6 shrink-0">
                 <button 
                    onClick={() => setIsSearchOpen(true)} 
                    className="md:hidden text-gray-500 hover:text-news-blue p-2 -mr-1"
                 >
                    <Search size={20} />
                 </button>

                 <button onClick={() => setIsWeatherModalOpen(true)} className="flex md:hidden items-center gap-1.5 text-right group border-r border-gray-100 pr-2 mr-1">
                    <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[8px] font-black text-gray-800 uppercase tracking-tight max-w-[70px] truncate leading-none">{weatherState.location}</span>
                        <div className="flex items-center gap-1.5 leading-none">
                             <span className="text-[7px] font-bold text-gray-500">AQI {weatherState.aqi}</span>
                             <span className="text-xs font-black text-news-blue">{weatherState.temp}°</span>
                        </div>
                    </div>
                    {weatherState.condition.includes('Rain') ? <CloudRain size={16} className="text-news-blue shrink-0" /> : 
                     weatherState.condition.includes('Cloud') ? <Cloud size={16} className="text-gray-400 shrink-0" /> :
                     <Sun size={16} className="text-news-gold shrink-0" />}
                 </button>

                 <button onClick={() => setIsWeatherModalOpen(true)} className="hidden md:flex items-center gap-3 text-left group">
                    {weatherState.condition.includes('Rain') ? <CloudRain size={24} className="text-news-blue group-hover:scale-110 transition-transform" /> : 
                     weatherState.condition.includes('Cloud') ? <Cloud size={24} className="text-gray-400 group-hover:scale-110 transition-transform" /> :
                     <Sun size={24} className="text-news-gold group-hover:scale-110 transition-transform" />}
                    <div className="flex flex-col leading-none">
                        <span className="text-lg font-black text-news-blue">{weatherState.temp}°</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{weatherState.location}</span>
                    </div>
                    <div className="h-8 w-[1px] bg-gray-100 mx-1"></div>
                    <div className="flex flex-col leading-none">
                        <span className="text-[10px] font-black text-news-gold">{weatherState.aqi}</span>
                        <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">AQI</span>
                    </div>
                 </button>

                 <button className="hidden md:flex bg-news-accent text-white px-6 py-2.5 rounded text-[11px] font-black uppercase tracking-wider shadow-lg hover:bg-red-800 transition-all flex-col items-center leading-tight">
                    <span>SUBSCRIBE</span>
                    <span className="text-[8px] opacity-80">NOW</span>
                 </button>

                 <button 
                    className="md:hidden text-news-blue p-2 -mr-2 hover:bg-gray-100 rounded transition-colors"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                 >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                 </button>
             </div>
         </div>
      </header>

      <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
         <div className="max-w-7xl mx-auto px-6 h-12 flex justify-center items-center gap-6 overflow-visible">
             <DesktopNavItem to="/" label="HOME" isActive={isActive('/')} onNavigate={onNavigate} />
             <DesktopNavItem to="/epaper" label="E-PAPER" icon={Newspaper} isActive={isActive('/epaper')} onNavigate={onNavigate} />
             
             <div className="h-3 w-[1px] bg-gray-200 mx-2"></div>
             {visibleCats.map(cat => (
                 <DesktopNavItem key={cat} to={`/category/${cat}`} label={cat} isActive={isActive(`/category/${cat}`)} onNavigate={onNavigate} />
             ))}

             {hiddenCats.length > 0 && (
                 <div className="relative group h-full flex items-center">
                     <button className="text-[9px] font-extrabold uppercase tracking-[0.15em] flex items-center gap-1.5 text-gray-500 hover:text-news-blue transition-colors outline-none">
                         MORE <ChevronDown size={10} />
                     </button>
                     <div className="absolute top-full left-1/2 -translate-x-1/2 pt-0 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                         <div className="bg-white border border-gray-200 shadow-xl rounded-sm py-2 mt-1">
                             {hiddenCats.map(cat => (
                                 <Link 
                                     key={cat} 
                                     to={`/category/${cat}`} 
                                     onNavigate={onNavigate}
                                     className={`block px-4 py-2 text-[9px] font-bold uppercase tracking-widest transition-colors ${isActive(`/category/${cat}`) ? 'text-news-blue bg-gray-50' : 'text-gray-600 hover:bg-gray-50 hover:text-news-blue'}`}
                                 >
                                     {cat}
                                 </Link>
                             ))}
                         </div>
                     </div>
                 </div>
             )}

             <button 
                onClick={() => setIsSearchOpen(true)}
                className="text-[9px] font-extrabold uppercase tracking-[0.15em] flex items-center gap-1.5 transition-colors duration-200 h-full border-b-2 border-transparent text-gray-500 hover:text-news-blue ml-4"
             >
                 <Search size={14} /> SEARCH
             </button>
         </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 p-6 animate-in slide-in-from-top-2 shadow-lg h-auto max-h-[80vh] overflow-y-auto">
             <div className="flex flex-col gap-1">
                 <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Sections</h3>
                 {categories.map(cat => (
                     <NavItem 
                        key={cat} 
                        to={`/category/${cat}`} 
                        label={cat} 
                        onClick={() => setIsMobileMenuOpen(false)} 
                        isActive={isActive(`/category/${cat}`)} 
                        onNavigate={onNavigate} 
                     />
                 ))}
                 <div className="h-[1px] bg-gray-100 w-full my-4"></div>
                 <button className="bg-news-accent text-white w-full py-4 rounded text-xs font-black uppercase tracking-widest shadow-lg">
                    SUBSCRIBE NOW
                 </button>
             </div>
        </div>
      )}

      {/* TICKER */}
      <div className="bg-news-blue text-white h-11 flex items-center overflow-hidden border-b border-gray-800 relative z-10">
          <div className="bg-news-gold text-black px-5 h-full font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shrink-0 z-20 shadow-xl">
              <Flame size={14} /> BREAKING
          </div>
          <div className="flex-1 whitespace-nowrap overflow-hidden flex items-center relative group">
              <div className="animate-marquee inline-flex items-center group-hover:[animation-play-state:paused]">
                  {breakingNews.length > 0 ? (
                      breakingNews.map((a, i) => (
                      <Link 
                          key={`${a.id}-${i}`} 
                          to={`/article/${a.slug || a.id}`} 
                          onNavigate={onNavigate} 
                          className="inline-flex items-center group/item hover:bg-white/5 transition-colors px-4 py-1.5 rounded mx-2"
                      >
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded mr-3 ${i % 3 === 0 ? 'bg-[#0b1f36] text-gray-300' : i % 3 === 1 ? 'bg-[#12314f] text-gray-300' : 'bg-[#0f2b46] text-gray-400'}`}>
                              {a.categories[0]}
                          </span>
                          <span className="text-[11px] font-bold text-gray-200 uppercase group-hover/item:text-white group-hover/item:underline decoration-news-gold underline-offset-4 tracking-wide">{a.title} <span className="text-news-gold/50 ml-3 no-underline">///</span></span>
                      </Link>
                  ))) : (
                      <span className="mx-8 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                          No recent breaking dispatches in the last 5 days...
                      </span>
                  )}
              </div>
          </div>
      </div>

      <div className="md:hidden bg-white border-b border-gray-200 py-3 flex justify-around items-center shadow-sm relative z-30">
          <Link to="/" onNavigate={onNavigate} className={`flex flex-col items-center gap-1.5 min-w-[60px] ${isActive('/') ? 'text-news-blue' : 'text-gray-400 hover:text-gray-600'}`}>
              <Home size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
          </Link>
          <Link to="/epaper" onNavigate={onNavigate} className={`flex flex-col items-center gap-1.5 min-w-[60px] ${isActive('/epaper') ? 'text-news-blue' : 'text-gray-400 hover:text-gray-600'}`}>
              <Newspaper size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wider">E-Paper</span>
          </Link>
          <Link to="/classifieds" onNavigate={onNavigate} className={`flex flex-col items-center gap-1.5 min-w-[60px] ${isActive('/classifieds') ? 'text-news-blue' : 'text-gray-400 hover:text-gray-600'}`}>
              <Megaphone size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Classifieds</span>
          </Link>
          <Link 
            to={userName ? (currentRole === UserRole.WRITER ? '/writer' : currentRole === UserRole.READER ? '/' : '/editor') : '/login'} 
            onNavigate={onNavigate} 
            className={`flex flex-col items-center gap-1.5 min-w-[60px] ${(isActive('/login') || isActive('/writer') || isActive('/editor')) ? 'text-news-blue' : 'text-gray-400 hover:text-gray-600'}`}
          >
              <User size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wider">Profile</span>
          </Link>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-12">
                {children}
            </div>
        </div>
      </main>

      <footer className="bg-news-lightyellow text-gray-900 py-16 border-t-4 border-news-gold">
        <div className="max-w-7xl mx-auto px-6 text-center">
           <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-news-blue mb-2 uppercase tracking-tighter">
               <span className="text-news-gold">CJ</span> NEWSHUB
           </h2>
           <p className="text-[9px] md:text-[10px] font-serif font-bold tracking-[0.3em] text-news-gold uppercase mb-8">Global Editorial Excellence</p>
           <p className="text-[10px] tracking-[0.5em] uppercase text-gray-600 mt-4">© {new Date().getFullYear()} CJ NEWSHUB MEDIA GROUP. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 print:hidden pointer-events-none">
          {showScrollTop && (
              <button 
                onClick={scrollToTop} 
                className="pointer-events-auto bg-news-black text-white p-3 md:p-3.5 rounded-full shadow-2xl hover:bg-news-gold hover:text-black transition-all border border-gray-700 opacity-90 hover:opacity-100 hover:scale-110 active:scale-95"
                title="Scroll to Top"
              >
                  <ArrowUp size={20} />
              </button>
          )}
          {showScrollBottom && (
              <button 
                onClick={scrollToBottom} 
                className="pointer-events-auto bg-white text-news-black p-3 md:p-3.5 rounded-full shadow-2xl hover:bg-news-blue hover:text-white transition-all border border-gray-200 opacity-90 hover:opacity-100 hover:scale-110 active:scale-95"
                title="Scroll to Bottom"
              >
                  <ArrowDown size={20} />
              </button>
          )}
      </div>

      {isWeatherModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
                <button onClick={() => setIsWeatherModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black"><X size={20}/></button>
                <h3 className="font-serif text-xl font-bold mb-4">Update Location</h3>
                <form onSubmit={(e) => { e.preventDefault(); fetchWeatherData(locationQuery); }} className="space-y-4">
                    <input type="text" value={locationQuery} onChange={e => setLocationQuery(e.target.value)} placeholder="Enter city name..." className="w-full p-3 border rounded-lg focus:border-news-blue outline-none" />
                    <button type="submit" disabled={isWeatherLoading} className="w-full bg-news-blue text-white py-3 rounded-lg font-bold uppercase text-[10px] tracking-widest">
                        {isWeatherLoading ? 'Fetching...' : 'Update Weather'}
                    </button>
                    {weatherError && <p className="text-red-500 text-xs">{weatherError}</p>}
                </form>
            </div>
        </div>
      )}

      <SearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        articles={articles || []}
        onNavigate={onNavigate}
      />
    </div>
  );
};

export default Layout;
