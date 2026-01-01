
import React, { useEffect, useState } from 'react';
import { UserRole, Article } from '../types';
import { Newspaper, User, Menu, X, Search, LogIn, LogOut, Clock, Flame, FileText, LockKeyhole, Shield, PenTool, Home, Megaphone, Sun, Cloud, CloudRain, CloudSun, Wind, MapPin, Globe, Loader2, Thermometer, Droplets, Briefcase, MoreHorizontal, RefreshCcw, Bell } from 'lucide-react';
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
}

interface WeatherState {
  location: string;
  temp: number;
  condition: string;
  aqi: number;
  humidity?: number;
  lastUpdated: number;
}

const Layout: React.FC<LayoutProps> = ({ children, currentRole, onRoleChange, currentPath, onNavigate, userName, userAvatar, onForceSync, lastSync, articles = [] }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [time, setTime] = useState(new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  
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

  const breakingNews = articles.slice(0, 8);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchWeatherData = async (query: string) => {
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
        condition: 'Sunny', 
        aqi: Math.round(aqiData.current.us_aqi),
        humidity: weatherData.current.relative_humidity_2m,
        lastUpdated: Date.now()
      };
      setWeatherState(newState);
      localStorage.setItem('newsroom_full_weather', JSON.stringify(newState));
      setIsWeatherModalOpen(false);
    } catch (err: any) { setWeatherError(err.message); } finally { setIsWeatherLoading(false); }
  };

  const getAQILabel = (aqi: number) => {
    if (aqi <= 50) return 'GOOD';
    if (aqi <= 100) return 'MOD. AIR';
    return 'UNHEALTHY';
  };

  const NavItem = ({ to, label, icon: Icon, onClick }: { to: string, label: string, icon?: any, onClick?: () => void }) => (
    <Link
      to={to}
      onNavigate={onNavigate}
      onClick={onClick}
      className={`text-[11px] font-extrabold uppercase tracking-[0.15em] flex items-center gap-1.5 transition-colors duration-200 ${
        isActive(to) ? 'text-news-blue border-b-2 border-news-blue' : 'text-gray-500 hover:text-news-blue'
      }`}
    >
      {Icon && <Icon size={14} />}
      {label}
    </Link>
  );

  const isActive = (path: string) => currentPath === path;
  const isDashboard = currentPath.startsWith('/editor') || currentPath.startsWith('/writer');
  if (isDashboard) return <div className="min-h-screen bg-gray-50">{children}</div>;

  return (
    <div className="min-h-screen flex flex-col bg-news-paper">
      
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
                 <div className="flex items-center gap-4">
                    <span className="text-news-blue font-extrabold hidden sm:inline">{userName.toUpperCase()}</span>
                    <button onClick={() => supabase.auth.signOut()} className="text-gray-400 hover:text-news-accent">LOGOUT</button>
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
                 {/* Search Removed */}
             </div>

             {/* CENTER: LOGO - Left on Mobile, Center on Desktop */}
             <div className="flex-1 md:w-1/2 text-left md:text-center min-w-0 pr-2 md:pr-0 flex items-center">
                 <Link to="/" onNavigate={onNavigate} className="inline-block">
                    <h1 className="font-serif text-2xl md:text-5xl font-extrabold tracking-tighter text-news-blue leading-none uppercase whitespace-nowrap">
                        <span className="text-news-gold">CJ</span> NEWSHUB
                    </h1>
                    {/* Subline - Hidden on mobile for cleaner look */}
                    <div className="hidden md:flex items-center justify-center gap-4 mt-3">
                        <span className="h-[1px] bg-gray-200 w-12"></span>
                        <span className="text-[9px] uppercase tracking-[0.4em] text-gray-400 font-bold italic">Global Editorial Excellence</span>
                        <span className="h-[1px] bg-gray-200 w-12"></span>
                    </div>
                 </Link>
             </div>

             {/* RIGHT: WEATHER & SUBSCRIBE & MOBILE MENU */}
             <div className="w-auto md:w-1/4 flex justify-end items-center gap-3 md:gap-6 shrink-0">
                 
                 {/* Mobile Weather Widget (Compact) - Visible on small screens */}
                 <button onClick={() => setIsWeatherModalOpen(true)} className="flex md:hidden items-center gap-1.5 text-right group border-r border-gray-100 pr-2 mr-1">
                    <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[8px] font-black text-gray-800 uppercase tracking-tight max-w-[70px] truncate leading-none">{weatherState.location}</span>
                        <div className="flex items-center gap-1.5 leading-none">
                             <span className="text-[7px] font-bold text-gray-500">AQI {weatherState.aqi}</span>
                             <span className="text-xs font-black text-news-blue">{weatherState.temp}°</span>
                        </div>
                    </div>
                    <Sun size={16} className="text-news-gold shrink-0" />
                 </button>

                 {/* Desktop Weather (Full) */}
                 <button onClick={() => setIsWeatherModalOpen(true)} className="hidden md:flex items-center gap-3 text-left group">
                    <Sun size={24} className="text-news-gold group-hover:scale-110 transition-transform" />
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
         <div className="max-w-7xl mx-auto px-6 h-14 flex justify-center items-center gap-8">
             <NavItem to="/" label="HOME" />
             <NavItem to="/epaper" label="E-PAPER" icon={Newspaper} />
             <NavItem to="/classifieds" label="CLASSIFIEDS" />
             <NavItem to="#" label="WORLD" />
             <NavItem to="#" label="BUSINESS" />
             <NavItem to="#" label="TECHNOLOGY" />
             <NavItem to="#" label="CULTURE" />
             <NavItem to="#" label="SPORTS" />
         </div>
      </nav>

      {/* MOBILE NAVIGATION MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 p-6 animate-in slide-in-from-top-2 shadow-lg">
             <div className="flex flex-col gap-6">
                 <NavItem to="/" label="HOME" onClick={() => setIsMobileMenuOpen(false)} />
                 <NavItem to="/epaper" label="E-PAPER" icon={Newspaper} onClick={() => setIsMobileMenuOpen(false)} />
                 <NavItem to="/classifieds" label="CLASSIFIEDS" onClick={() => setIsMobileMenuOpen(false)} />
                 <div className="h-[1px] bg-gray-100 w-full my-1"></div>
                 <NavItem to="#" label="WORLD" onClick={() => setIsMobileMenuOpen(false)} />
                 <NavItem to="#" label="BUSINESS" onClick={() => setIsMobileMenuOpen(false)} />
                 <NavItem to="#" label="TECHNOLOGY" onClick={() => setIsMobileMenuOpen(false)} />
                 <NavItem to="#" label="CULTURE" onClick={() => setIsMobileMenuOpen(false)} />
                 <NavItem to="#" label="SPORTS" onClick={() => setIsMobileMenuOpen(false)} />
                 <div className="h-[1px] bg-gray-100 w-full my-1"></div>
                 <button className="bg-news-accent text-white w-full py-3 rounded text-xs font-black uppercase tracking-widest shadow-lg">
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
                  {articles.length > 0 ? articles.map((a, i) => (
                      <React.Fragment key={a.id}>
                          <span className={`mx-2 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${i % 3 === 0 ? 'bg-[#0b1f36] text-gray-300' : i % 3 === 1 ? 'bg-[#12314f] text-gray-300' : 'bg-[#0f2b46] text-gray-400'}`}>
                              {a.category}
                          </span>
                          <span className="text-[11px] font-bold text-gray-200 mr-8 uppercase">{a.title} <span className="text-gray-500 ml-2">+++</span></span>
                      </React.Fragment>
                  )) : <span className="mx-8 text-[11px] font-bold text-gray-400 uppercase">Awaiting dispatches from our global news bureaus...</span>}
              </div>
          </div>
      </div>

      <main className="flex-grow max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-9">
                {children}
            </div>
            
            <div className="lg:col-span-3 space-y-8">
                {/* Weather widget removed from here as requested */}
                
                <div className="bg-[#f0f0ed] p-1 rounded-sm text-center">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.4em]">PREMIUM GLOBAL PARTNERS</span>
                </div>
                
                {/* Newsletter section removed as requested */}
                
            </div>
        </div>
      </main>

      <footer className="bg-news-lightyellow text-gray-900 py-16 border-t-4 border-news-gold">
        <div className="max-w-7xl mx-auto px-6 text-center">
           <h2 className="font-serif text-3xl md:text-4xl font-extrabold text-news-blue mb-4 uppercase tracking-tighter">
               <span className="text-news-gold">CJ</span> NEWSHUB
           </h2>
           <p className="text-[10px] tracking-[0.5em] uppercase text-gray-600 mt-12">© {new Date().getFullYear()} CJ NEWSHUB MEDIA GROUP. ALL RIGHTS RESERVED.</p>
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
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
