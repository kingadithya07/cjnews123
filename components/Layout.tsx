
import React, { useEffect, useState, useCallback } from 'react';
import { UserRole, Article } from '../types';
import { Newspaper, User, Menu, X, Search, LogIn, LogOut, Clock, Flame, FileText, LockKeyhole, Shield, PenTool, Home, Megaphone, Sun, Cloud, CloudRain, CloudSun, Wind, MapPin, Globe, Loader2, Thermometer, Droplets, Briefcase, MoreHorizontal, RefreshCcw, Bell, LayoutDashboard, ChevronDown, PlusCircle } from 'lucide-react';
import { APP_NAME } from '../constants';
import Link from './Link';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient';

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

const NavItem: React.FC<NavItemProps> = ({ to, label, icon: Icon, onClick, isActive, onNavigate }) => (
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
  const [time, setTime] = useState(new Date());
  const [weatherState, setWeatherState] = useState<WeatherState>({ location: 'Hyderabad', temp: 19, condition: 'Sunny', aqi: 74, humidity: 45, lastUpdated: 0 });
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const MAX_VISIBLE_CATS = 6;
  const visibleCats = categories.slice(0, MAX_VISIBLE_CATS);
  const hiddenCats = categories.slice(MAX_VISIBLE_CATS);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeatherData = useCallback(async (query: string) => {
    setIsWeatherLoading(true); setWeatherError(null);
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
      setWeatherState({
        location: name, temp: Math.round(weatherData.current.temperature_2m),
        condition: weatherData.current.weather_code === 0 ? 'Clear' : 'Cloudy',
        aqi: Math.round(aqiData.current.us_aqi), humidity: weatherData.current.relative_humidity_2m, lastUpdated: Date.now()
      });
      setIsWeatherModalOpen(false);
    } catch (err: any) { setWeatherError(err.message); } finally { setIsWeatherLoading(false); }
  }, []);

  const isActive = (path: string) => currentPath === path;
  const isDashboard = currentPath.startsWith('/editor') || currentPath.startsWith('/writer');
  if (isDashboard) return <div className="min-h-screen bg-gray-50">{children}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-news-paper overflow-x-hidden w-full">
      <div className="bg-white border-b border-gray-100 py-2.5 px-4 md:px-6 flex justify-between items-center text-[10px] font-bold tracking-widest uppercase text-gray-400">
         <div className="flex gap-4 items-center">
            <span>{format(new Date(), 'dd MMM yyyy')}</span>
            <span className="text-news-gold hidden sm:flex items-center gap-1.5 border-l border-gray-200 pl-4"><Clock size={12} /> {format(time, 'hh:mm:ss a')}</span>
         </div>
         <div className="flex items-center gap-6">
             {userName ? (
                 <div className="flex items-center gap-3">
                    {currentRole !== UserRole.READER && (
                        <div className="flex items-center gap-4 border-r border-gray-200 pr-4 mr-1">
                             <Link to={currentRole === UserRole.WRITER ? '/writer' : '/editor'} onNavigate={onNavigate} className="flex items-center gap-1.5 text-news-accent hover:text-news-black transition-colors font-black">
                                <PlusCircle size={14} /> <span>CREATE ARTICLE</span>
                            </Link>
                            <Link to={currentRole === UserRole.WRITER ? '/writer' : '/editor'} onNavigate={onNavigate} className="flex items-center gap-1.5 text-news-black hover:text-news-accent transition-colors">
                                <LayoutDashboard size={14} /> <span className="hidden sm:inline">DASHBOARD</span>
                            </Link>
                        </div>
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
                 <Link to="/login" onNavigate={onNavigate} className="flex items-center gap-1.5 hover:text-news-blue"><LogIn size={12} /> LOGIN</Link>
             )}
         </div>
      </div>

      <header className="bg-white px-4 md:px-6 py-4 md:py-8 border-b border-gray-100 relative z-20">
         <div className="max-w-7xl mx-auto flex items-center justify-between">
             <div className="hidden md:block w-1/4"></div>
             <div className="flex-1 md:w-1/2 text-left md:text-center min-w-0 pr-2 md:pr-0 flex items-center justify-start md:justify-center">
                 <Link to="/" onNavigate={onNavigate} className="inline-block group">
                    <h1 className="font-serif text-2xl md:text-5xl font-extrabold tracking-tighter text-news-blue leading-none uppercase whitespace-nowrap"><span className="text-news-gold">CJ</span> NEWSHUB</h1>
                    <div className="flex items-center md:justify-center justify-start gap-2 md:gap-4 mt-2 md:mt-3">
                        <span className="hidden md:block h-[1px] bg-gray-200 w-12"></span>
                        <span className="text-[7px] md:text-[9px] uppercase tracking-[0.4em] text-gray-400 font-bold italic">Global Editorial Excellence</span>
                        <span className="hidden md:block h-[1px] bg-gray-200 w-12"></span>
                    </div>
                 </Link>
             </div>
             <div className="w-auto md:w-1/4 flex justify-end items-center gap-3 md:gap-6 shrink-0">
                 <button onClick={() => setIsWeatherModalOpen(true)} className="flex md:hidden items-center gap-1.5 text-right group border-r border-gray-100 pr-2 mr-1">
                    <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[8px] font-black text-gray-800 uppercase tracking-tight max-w-[70px] truncate leading-none">{weatherState.location}</span>
                        <div className="flex items-center gap-1.5 leading-none">
                             <span className="text-[7px] font-bold text-gray-500">AQI {weatherState.aqi}</span>
                             <span className="text-xs font-black text-news-blue">{weatherState.temp}°</span>
                        </div>
                    </div>
                    {weatherState.condition === 'Rainy' ? <CloudRain size={16} className="text-news-blue" /> : <Sun size={16} className="text-news-gold" />}
                 </button>
                 <button onClick={() => setIsWeatherModalOpen(true)} className="hidden md:flex items-center gap-3 text-left group">
                    {weatherState.condition === 'Rainy' ? <CloudRain size={24} className="text-news-blue" /> : <Sun size={24} className="text-news-gold" />}
                    <div className="flex flex-col leading-none">
                        <span className="text-lg font-black text-news-blue">{weatherState.temp}°</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{weatherState.location}</span>
                    </div>
                 </button>
                 <button className="hidden md:flex bg-news-accent text-white px-6 py-2.5 rounded text-[11px] font-black uppercase tracking-wider shadow-lg hover:bg-red-800 transition-all flex-col items-center leading-tight">
                    <span>SUBSCRIBE</span><span className="text-[8px] opacity-80">NOW</span>
                 </button>
                 <button className="md:hidden text-news-blue p-2 -mr-2 hover:bg-gray-100 rounded transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                 </button>
             </div>
         </div>
      </header>

      <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
         <div className="max-w-7xl mx-auto px-6 h-12 flex justify-center items-center gap-6 overflow-visible">
             <NavItem to="/" label="HOME" isActive={isActive('/')} onNavigate={onNavigate} />
             <NavItem to="/epaper" label="E-PAPER" icon={Newspaper} isActive={isActive('/epaper')} onNavigate={onNavigate} />
             <div className="h-3 w-[1px] bg-gray-200 mx-2"></div>
             {visibleCats.map(cat => (
                 <NavItem key={cat} to={`/category/${cat}`} label={cat} isActive={isActive(`/category/${cat}`)} onNavigate={onNavigate} />
             ))}
         </div>
      </nav>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 p-6 animate-in slide-in-from-top-2 shadow-lg">
             <div className="flex flex-col gap-6">
                 <NavItem to="/" label="HOME" onClick={() => setIsMobileMenuOpen(false)} isActive={isActive('/')} onNavigate={onNavigate} />
                 <NavItem to="/epaper" label="E-PAPER" icon={Newspaper} onClick={() => setIsMobileMenuOpen(false)} isActive={isActive('/epaper')} onNavigate={onNavigate} />
                 <div className="h-[1px] bg-gray-100 w-full my-1"></div>
                 {categories.map(cat => (
                     <NavItem key={cat} to={`/category/${cat}`} label={cat} onClick={() => setIsMobileMenuOpen(false)} isActive={isActive(`/category/${cat}`)} onNavigate={onNavigate} />
                 ))}
                 <button className="bg-news-accent text-white w-full py-3 rounded text-xs font-black uppercase tracking-widest shadow-lg">SUBSCRIBE NOW</button>
             </div>
        </div>
      )}

      <div className="bg-news-blue text-white h-11 flex items-center overflow-hidden border-b border-gray-800">
          <div className="bg-news-gold text-black px-5 h-full font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 shrink-0 z-10">
              <Flame size={14} /> BREAKING
          </div>
          <div className="flex-1 whitespace-nowrap overflow-hidden flex items-center">
              <div className="animate-marquee inline-flex items-center">
                  {articles.length > 0 ? articles.map((a, i) => (
                      <Link key={a.id} to={`/article/${a.slug || a.id}`} onNavigate={onNavigate} className="inline-flex items-center group hover:bg-white/5 transition-colors px-2 py-1 rounded">
                          <span className={`mx-2 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${i % 3 === 0 ? 'bg-[#0b1f36]' : 'bg-[#12314f]'} text-gray-300`}>{a.categories[0]}</span>
                          <span className="text-[11px] font-bold text-gray-200 mr-8 uppercase">{a.title}</span>
                      </Link>
                  )) : <span className="mx-8 text-[11px] font-bold text-gray-400 uppercase">Awaiting global bureaus...</span>}
              </div>
          </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 md:px-6 py-10">
          {children}
      </main>

      <footer className="bg-news-lightyellow text-gray-900 py-16 border-t-4 border-news-gold">
        <div className="max-w-7xl mx-auto px-6 text-center">
           <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-news-blue mb-2 uppercase tracking-tighter"><span className="text-news-gold">CJ</span> NEWSHUB</h2>
           <p className="text-[10px] font-serif font-bold tracking-[0.3em] text-news-gold uppercase mb-8">Global Editorial Excellence</p>
           <p className="text-[10px] tracking-[0.5em] uppercase text-gray-600 mt-4">© {new Date().getFullYear()} CJ NEWSHUB MEDIA GROUP. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
