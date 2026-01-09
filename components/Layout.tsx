
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { UserRole, Article } from '../types';
import { Newspaper, User, Menu, X, Search, LogIn, LogOut, Clock, Flame, FileText, LockKeyhole, Shield, PenTool, Home, Megaphone, Sun, Cloud, CloudRain, CloudSun, Wind, MapPin, Globe, Loader2, Thermometer, Droplets, Briefcase, MoreHorizontal, RefreshCcw, Bell, LayoutDashboard, ChevronDown, Handshake } from 'lucide-react';
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

// Updated NavItem: Smaller font size (text-[9px]), adjusted icon size
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

// Desktop Nav Item (styled differently)
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

const Layout: React.FC<LayoutProps> = ({ children, currentRole, onRoleChange, currentPath, onNavigate, userName, userAvatar, onForceSync, lastSync, articles = [], categories = [] }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  
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

  // Constants for Navigation
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

  // Auto-refresh weather on mount if data is stale (older than 15 mins)
  useEffect(() => {
      if (Date.now() - weatherState.lastUpdated > 900000) {
          fetchWeatherData(weatherState.location);
      }
  }, [fetchWeatherData, weatherState.lastUpdated, weatherState.location]);

  const isActive = (path: string) => currentPath === path;
  const isDashboard = currentPath.startsWith('/editor') || currentPath.startsWith('/writer');
  if (isDashboard) return <div className="min-h-screen bg-gray-50">{children}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-news-paper overflow-x-hidden w-full">
      
      {/* TOP BAR: DATE & LOGIN */}
      <div className="bg-white border-b border-gray-100 py-2.5 px-4 md:px-6 flex justify-between items-center text-[10px] font-bold tracking-widest uppercase text-gray-400">
         <div className="flex gap-4 items-center">
            <span>{format(new Date(), 'dd MMM yyyy')}</span>
            <span className="text-news-gold hidden sm:flex items-center gap-1.5 border-l border-gray-200 pl-4">
              <Clock size={12} /> {format(time, 'hh:mm:ss a')}
            </span>
         </div>
         <div className="flex items-center gap-6">
             {userName ? (
                 <div className="flex items-center gap-3">
                    {/* Dashboard Link Moved Here - Visible on Mobile */}
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

      {/* BRAND HEADER */}
      <header className="bg-white px-4 md:px-6 py-4 md:py-8 border-b border-gray-100 relative z-20">
         <div className="max-w-7xl mx-auto flex items-center justify-between">
             
             {/* LEFT: SPACER (Formerly Search) - Keeps layout balanced on desktop */}
             <div className="hidden md:block w-1/4">
                 {/* Empty spacer for balance */}
             </div>

             {/* CENTER: LOGO - Left on Mobile, Center on Desktop */}
             <div className="flex-1 md:w-1/2 text-left md:text-center min-w-0 pr-2 md:pr-0 flex items-center justify-start md:justify-center">
                 <Link to="/" onNavigate={onNavigate} className="inline-block group">
                    <h1 className="font-serif text-2xl md:text-5xl font-extrabold tracking-tighter text-news-blue leading-none uppercase whitespace-nowrap">
                        <span className="text-news-gold">CJ</span> NEWSHUB
                    </h1>
                    {/* Subline - Visible on mobile now */}
                    <div className="flex items-center md:justify-center justify-start gap-2 md:gap-4 mt-2 md:mt-3">
                        <span className="hidden md:block h-[1px] bg-gray-200 w-12"></span>
                        <span className="text-[7px] md:text-[9px] uppercase tracking-[0.4em] text-gray-400 font-bold italic">Global Editorial Excellence</span>
                        <span className="hidden md:block h-[1px] bg-gray-200 w-12"></span>
                    </div>
                 </Link>
             </div>

             {/* RIGHT: WEATHER & SUBSCRIBE & MOBILE MENU */}
             <div className="w-auto md:w-1/4 flex justify-end items-center gap-3 md:gap-6 shrink-0">
                 
                 {/* Mobile Search - Visible on small screens */}
                 <button 
                    onClick={() => setIsSearchOpen(true)} 
                    className="md:hidden text-gray-500 hover:text-news-blue p-2 -mr-1"
                 >
                    <Search size={20} />
                 </button>

                 {/* Mobile Weather Widget (Compact) - Visible on small screens */}
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

                 {/* Desktop Weather (Full) */}
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

                 {/* Subscribe - Desktop Only */}
                 <button className="hidden md:flex bg-news-accent text-white px-6 py-2.5 rounded text-[11px] font-black uppercase tracking-wider shadow-lg hover:bg-red-800 transition-all flex-col items-center leading-tight">
                    <span>SUBSCRIBE</span>
                    <span className="text-[8px] opacity-80">NOW</span>
                 </button>

                 {/* Mobile Menu Toggle */}
                 <button 
                    className="md:hidden text-news-blue p-2 -mr-2 hover:bg-gray-100 rounded transition-colors"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                 >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                 </button>
             </div>
         </div>
      </header>

      {/* DESKTOP NAVIGATION */}
      <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
         <div className="max-w-7xl mx-auto px-6 h-12 flex justify-center items-center gap-6 overflow-visible">
             {/* Desktop Search Trigger - Left of Home */}
             <button 
                onClick={() => setIsSearchOpen(true)}
                className="text-[9px] font-extrabold uppercase tracking-[0.15em] flex items-center gap-1.5 transition-colors duration-200 h-full border-b-2 border-transparent text-gray-500 hover:text-news-blue"
             >
                 <Search size={14} /> SEARCH
             </button>

             <DesktopNavItem to="/" label="HOME" isActive={isActive('/')} onNavigate={onNavigate} />
             <DesktopNavItem to="/epaper" label="E-PAPER" icon={Newspaper} isActive={isActive('/epaper')} onNavigate={onNavigate} />
             
             {/* Dynamic Categories */}
             <div className="h-3 w-[1px] bg-gray-200 mx-2"></div>
             {visibleCats.map(cat => (
                 <DesktopNavItem key={cat} to={`/category/${cat}`} label={cat} isActive={isActive(`/category/${cat}`)} onNavigate={onNavigate} />
             ))}

             {/* More Dropdown */}
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
         </div>
      </nav>

      {/* MOBILE NAVIGATION MENU (HAMBURGER) */}
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
      <div className="bg-news-blue text-white h-11 flex items-center overflow-hidden border-b border-gray-800">
          <div className="bg-news-gold text-black px-5 h-full font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shrink-0 z-10">
              <Flame size={14} /> BREAKING
          </div>
          <div className="flex-1 whitespace-nowrap overflow-hidden flex items-center">
              <div className="animate-marquee inline-flex items-center">
                  {breakingNews.length > 0 ? breakingNews.map((a, i) => (
                      <Link 
                          key={a.id} 
                          to={`/article/${a.slug || a.id}`} 
                          onNavigate={onNavigate} 
                          className="inline-flex items-center group hover:bg-white/5 transition-colors px-2 py-1 rounded"
                      >
                          <span className={`mx-2 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${i % 3 === 0 ? 'bg-[#0b1f36] text-gray-300' : i % 3 === 1 ? 'bg-[#12314f] text-gray-300' : 'bg-[#0f2b46] text-gray-400'}`}>
                              {a.categories[0]}
                          </span>
                          <span className="text-[11px] font-bold text-gray-200 mr-8 uppercase group-hover:text-white group-hover:underline decoration-news-gold underline-offset-4">{a.title} <span className="text-gray-500 ml-2 no-underline">+++</span></span>
                      </Link>
                  )) : <span className="mx-8 text-[11px] font-bold text-gray-400 uppercase">No recent dispatches in the last 5 days...</span>}
              </div>
          </div>
      </div>

      {/* MOBILE ICON NAVIGATION BAR */}
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
            
            {/* Global Partners Section Removed as per request */}
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

      {/* Global Search Modal */}
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
