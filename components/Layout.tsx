
import React, { useEffect, useState } from 'react';
import { UserRole } from '../types';
import { Newspaper, User, Menu, X, Search, LogIn, LogOut, Clock, Flame, FileText, LockKeyhole, Shield, PenTool, Home, Megaphone, Sun, Cloud, CloudRain, CloudSun, Wind, MapPin, Globe, Loader2, Thermometer, Droplets, Briefcase, MoreHorizontal, LayoutDashboard, Settings, ChevronRight } from 'lucide-react';
import { APP_NAME } from '../constants';
import Link from './Link';
import { format } from 'date-fns';

interface LayoutProps {
  children: React.ReactNode;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  userName?: string | null;
  userAvatar?: string | null;
}

interface WeatherState {
  location: string;
  temp: number;
  condition: string;
  aqi: number;
  humidity?: number;
}

const Layout: React.FC<LayoutProps> = ({ children, currentRole, onRoleChange, currentPath, onNavigate, userName, userAvatar }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  
  // Lazy initialize state from localStorage to prevent flash of default content
  const [weatherState, setWeatherState] = useState<WeatherState>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('newsroom_weather_location') : null;
    return {
      location: saved || 'Mumbai, India',
      temp: 28,
      condition: 'Sunny',
      aqi: 72,
      humidity: 65
    };
  });

  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch fresh data for the initial location (saved or default)
    fetchWeatherData(weatherState.location);
  }, []);

  const fetchWeatherData = async (query: string) => {
    setIsWeatherLoading(true);
    setWeatherError(null);
    try {
      // 1. Geocode location name to Lat/Lng
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error("Location not found. Try a city name.");
      }

      const { latitude, longitude, name, admin1, country } = geoData.results[0];
      const fullName = `${name}${admin1 ? `, ${admin1}` : ''}, ${country}`;

      // 2. Fetch Weather and AQI in parallel
      const [weatherRes, aqiRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code`),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`)
      ]);

      const weatherData = await weatherRes.json();
      const aqiData = await aqiRes.json();

      const temp = Math.round(weatherData.current.temperature_2m);
      const humidity = weatherData.current.relative_humidity_2m;
      const aqiValue = Math.round(aqiData.current.us_aqi);
      
      // Map weather code to condition string
      const code = weatherData.current.weather_code;
      let condition = 'Clear';
      if (code >= 1 && code <= 3) condition = 'Partly Cloudy';
      else if (code >= 45 && code <= 48) condition = 'Foggy';
      else if (code >= 51 && code <= 67) condition = 'Rainy';
      else if (code >= 71 && code <= 86) condition = 'Snowy';
      else if (code >= 95) condition = 'Thunderstorm';

      setWeatherState({
        location: fullName,
        temp,
        condition,
        aqi: aqiValue,
        humidity
      });
      localStorage.setItem('newsroom_weather_location', fullName);
      setIsWeatherModalOpen(false);
    } catch (err: any) {
      setWeatherError(err.message || "Failed to fetch weather data.");
    } finally {
      setIsWeatherLoading(false);
    }
  };

  const handleWeatherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationQuery.trim()) return;
    fetchWeatherData(locationQuery);
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return 'text-green-500';
    if (aqi <= 100) return 'text-yellow-500';
    if (aqi <= 150) return 'text-orange-500';
    if (aqi <= 200) return 'text-red-500';
    return 'text-purple-600';
  };

  const getAQILabel = (aqi: number) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy (SG)';
    if (aqi <= 200) return 'Unhealthy';
    return 'Hazardous';
  };

  const WeatherIcon = ({ condition, size = 18 }: { condition: string, size?: number }) => {
    if (condition.includes('Rain') || condition.includes('Thunderstorm')) return <CloudRain size={size} className="text-blue-400" />;
    if (condition.includes('Cloud')) return <Cloud size={size} className="text-gray-400" />;
    return <Sun size={size} className="text-news-gold" />;
  };

  const isActive = (path: string) => currentPath === path;
  const isDashboard = currentPath.startsWith('/editor') || currentPath.startsWith('/writer');

  if (isDashboard) {
      return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const NavItem = ({ to, label, icon: Icon }: { to: string, label: string, icon?: any }) => (
    <Link
      to={to}
      onNavigate={onNavigate}
      className={`text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors duration-200 ${
        isActive(to) ? 'text-news-accent' : 'text-gray-600 hover:text-news-black'
      }`}
    >
      {Icon && <Icon size={14} className="mb-0.5" />}
      {label}
    </Link>
  );

  const MobileNavIcon = ({ to, label, icon: Icon, onClick }: { to?: string, label: string, icon: any, onClick?: () => void }) => {
    const active = to ? isActive(to) : (label === 'PROFILE' && isProfileSheetOpen);
    
    const handleClick = () => {
        if (onClick) onClick();
        else if (to) onNavigate(to);
    };

    return (
      <button onClick={handleClick} className="flex-1 flex justify-center w-full group">
        <div className={`flex flex-col items-center gap-1 py-2`}>
          <div className={`p-1.5 rounded-full transition-all duration-300 ${active ? 'bg-news-accent text-white shadow-md' : 'text-gray-400 group-hover:text-gray-600'}`}>
              {label === 'PROFILE' && userAvatar ? (
                 <img src={userAvatar} className="w-5 h-5 rounded-full object-cover" alt="Profile"/>
              ) : (
                 <Icon size={18} />
              )}
          </div>
          <span className={`text-[8px] font-bold uppercase tracking-widest ${active ? 'text-news-accent' : 'text-gray-400'}`}>
            {label}
          </span>
        </div>
      </button>
    );
  };

  const handleProfileClick = () => {
      if (userName) {
          setIsProfileSheetOpen(true);
      } else {
          onNavigate('/login');
      }
  };

  const dashboardLink = currentRole === UserRole.EDITOR || currentRole === UserRole.ADMIN ? '/editor' : currentRole === UserRole.WRITER ? '/writer' : null;
  const DashboardIcon = currentRole === UserRole.EDITOR || currentRole === UserRole.ADMIN ? Shield : PenTool;

  const BreakingTicker = ({ className = '' }: { className?: string }) => (
    <div className={`bg-news-black text-white text-xs font-medium flex border-b border-gray-800 h-10 items-center overflow-hidden ${className}`}>
        <div className="bg-news-gold text-black px-6 h-full font-bold uppercase tracking-widest flex items-center gap-2 shrink-0 z-10">
            <Flame size={14} className="animate-pulse" /> Breaking
        </div>
        <div className="flex-1 whitespace-nowrap overflow-hidden relative flex items-center">
            <div className="animate-marquee inline-block">
                <span className="mx-8">Welcome to Digital Newsroom. Bringing you the latest updates from around the globe.</span>
                <span className="mx-8">Exclusive coverage, in-depth analysis, and real-time reporting.</span>
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-news-paper">
      
      {/* MOBILE HEADER WRAPPER (Top Strip + Brand + Nav + Ticker) */}
      <div className="md:hidden flex flex-col bg-white sticky top-0 z-50 shadow-md">
          {/* Date & Account Strip */}
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 bg-gray-50">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{format(new Date(), 'dd MMM yyyy')}</span>
              {/* Login removed from top bar as requested */}
              <div className="w-4"></div> 
          </div>
          
          {/* Brand Header */}
          <div className="px-5 py-4 flex justify-between items-center bg-white">
              <Link to="/" onNavigate={onNavigate}>
                <h1 className="font-display text-3xl font-black tracking-tighter text-news-black flex items-baseline leading-none">
                    <span>DIGITAL</span>
                    <span className="text-news-gold italic ml-1.5">Newsroom</span>
                </h1>
              </Link>
              <button onClick={() => setIsWeatherModalOpen(true)} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <div className="flex flex-col items-end leading-none">
                    <span className="text-xs font-black">{weatherState.temp}°</span>
                    <span className={`text-[8px] font-bold ${getAQIColor(weatherState.aqi)}`}>AQI {weatherState.aqi}</span>
                  </div>
                  <WeatherIcon condition={weatherState.condition} size={16} />
              </button>
          </div>

          {/* Navigation Bar */}
          <div className="flex justify-around items-center px-2 border-t border-gray-100 bg-white pb-1">
             <MobileNavIcon to="/" label="HOME" icon={Home} />
             <MobileNavIcon to="/epaper" label="PAPER" icon={Newspaper} />
             <MobileNavIcon to="/classifieds" label="ADS" icon={Briefcase} />
             <MobileNavIcon label={userName ? "PROFILE" : "LOGIN"} icon={User} onClick={handleProfileClick} />
          </div>

          {/* Frozen Breaking Ticker (Mobile Only) */}
          <BreakingTicker />
      </div>

      {/* MOBILE PROFILE DRAWER (SHEET) */}
      {isProfileSheetOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsProfileSheetOpen(false)}></div>
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300">
                  <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto mt-3 mb-6"></div>
                  
                  <div className="px-6 pb-8">
                      {/* User Header */}
                      <div className="flex items-center gap-4 mb-8">
                          <div className="w-16 h-16 rounded-full bg-gray-100 border-2 border-white shadow-md overflow-hidden shrink-0">
                              {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover"/> : <User size={32} className="m-auto mt-4 text-gray-400"/>}
                          </div>
                          <div>
                              <h3 className="font-serif font-bold text-xl text-gray-900">{userName}</h3>
                              <span className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border ${
                                  currentRole === UserRole.ADMIN ? 'bg-red-600 border-red-700' : 
                                  currentRole === UserRole.EDITOR ? 'bg-news-gold border-yellow-600 text-black' : 
                                  currentRole === UserRole.WRITER ? 'bg-blue-600 border-blue-700' : 'bg-gray-500 border-gray-600'
                              }`}>
                                  {currentRole} Access
                              </span>
                          </div>
                      </div>

                      {/* Menu Links */}
                      <div className="space-y-2">
                          {dashboardLink && (
                              <button 
                                onClick={() => { onNavigate(dashboardLink); setIsProfileSheetOpen(false); }}
                                className="w-full flex items-center justify-between p-4 bg-news-black text-white rounded-xl shadow-lg group active:scale-95 transition-transform"
                              >
                                  <div className="flex items-center gap-3">
                                      <div className="p-2 bg-white/10 rounded-lg text-news-gold"><LayoutDashboard size={20}/></div>
                                      <div className="text-left">
                                          <span className="block text-xs font-bold uppercase tracking-widest text-gray-400">Management</span>
                                          <span className="block font-bold">Go to Dashboard</span>
                                      </div>
                                  </div>
                                  <ChevronRight size={20} className="text-gray-500 group-hover:text-white transition-colors"/>
                              </button>
                          )}

                          <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors text-gray-700">
                              <Settings size={20} className="text-gray-400"/>
                              <span className="font-medium text-sm">Account Settings</span>
                          </button>
                          
                          <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 rounded-xl transition-colors text-gray-700">
                              <Shield size={20} className="text-gray-400"/>
                              <span className="font-medium text-sm">Privacy & Security</span>
                          </button>

                          <div className="h-px bg-gray-100 my-2"></div>

                          <button 
                            onClick={() => { onNavigate('/login'); setIsProfileSheetOpen(false); }}
                            className="w-full flex items-center gap-4 p-4 hover:bg-red-50 rounded-xl transition-colors text-red-600"
                          >
                              <LogOut size={20}/>
                              <span className="font-bold text-sm">Sign Out</span>
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* MOBILE MORE MENU OVERLAY */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 bg-white pt-24 pb-20 px-6 overflow-y-auto animate-in fade-in slide-in-from-top-5 md:hidden">
              <div className="space-y-6">
                  <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Sections</h4>
                      <div className="grid grid-cols-2 gap-3">
                          <Link to="#" onNavigate={onNavigate} onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-gray-50 rounded-lg font-bold text-gray-700 text-sm hover:bg-gray-100 border border-gray-100">World News</Link>
                          <Link to="#" onNavigate={onNavigate} onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-gray-50 rounded-lg font-bold text-gray-700 text-sm hover:bg-gray-100 border border-gray-100">Technology</Link>
                          <Link to="#" onNavigate={onNavigate} onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-gray-50 rounded-lg font-bold text-gray-700 text-sm hover:bg-gray-100 border border-gray-100">Business</Link>
                          <Link to="#" onNavigate={onNavigate} onClick={() => setIsMobileMenuOpen(false)} className="p-4 bg-gray-50 rounded-lg font-bold text-gray-700 text-sm hover:bg-gray-100 border border-gray-100">Culture</Link>
                      </div>
                  </div>
                  
                  <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Support</h4>
                      <div className="space-y-2">
                          <Link to="#" onNavigate={onNavigate} onClick={() => setIsMobileMenuOpen(false)} className="block p-3 border border-gray-100 rounded-lg text-sm text-gray-600">Help Center</Link>
                          <Link to="/staff/login" onNavigate={onNavigate} onClick={() => setIsMobileMenuOpen(false)} className="block p-3 border border-gray-100 rounded-lg text-sm text-gray-600">Staff Login</Link>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* DESKTOP TOP BAR */}
      <div className="hidden md:flex bg-white border-b border-gray-200 text-xs text-gray-500 py-1.5 px-4 font-sans tracking-widest uppercase justify-between items-center sticky top-0 z-50">
         <div className="flex gap-6">
            <span className="font-bold text-gray-700">{format(new Date(), 'EEEE, MMMM dd, yyyy').toUpperCase()}</span>
            <span className="flex items-center gap-1"><Clock size={12} className="text-news-gold" /> {format(time, 'hh:mm:ss a')}</span>
         </div>
         <div className="flex items-center gap-4">
             {userName ? (
                 <div className="flex items-center gap-3">
                     {dashboardLink && (
                        <Link to={dashboardLink} onNavigate={onNavigate} className="bg-news-black text-news-gold px-3 py-1 rounded text-[10px] font-bold hover:bg-gray-800 transition-colors">DASHBOARD</Link>
                     )}
                     <div className="flex items-center gap-2 border-l border-gray-200 pl-3">
                         {userAvatar ? <img src={userAvatar} className="w-5 h-5 rounded-full object-cover" /> : <User size={12}/>}
                         <span className="font-bold text-news-black">{userName}</span>
                         <Link to="/login" onNavigate={onNavigate} className="text-gray-400 hover:text-red-600 ml-2"><LogOut size={12}/></Link>
                     </div>
                 </div>
             ) : (
                 <Link to="/login" onNavigate={onNavigate} className="font-bold text-gray-700 hover:text-news-accent">LOGIN</Link>
             )}
         </div>
      </div>

      {/* DESKTOP BRAND HEADER */}
      <header className="hidden md:block bg-white px-4 py-8 border-b border-gray-100">
         <div className="max-w-7xl mx-auto flex items-center justify-between">
             <div className="w-1/4 relative">
                 <input type="text" placeholder="Search news..." className="w-full border-b border-gray-300 py-2 pr-8 text-sm italic font-serif bg-transparent focus:outline-none focus:border-news-black" />
                 <Search className="absolute right-0 top-2 text-gray-400" size={16}/>
             </div>
             <div className="w-1/2 text-center">
                 <Link to="/" onNavigate={onNavigate}>
                    <h1 className="font-display text-7xl font-black tracking-tighter text-news-black leading-none inline-flex items-baseline">
                        <span>DIGITAL</span>
                        <span className="text-news-gold italic ml-3">Newsroom</span>
                    </h1>
                    <div className="flex items-center justify-center gap-3 mt-3">
                        <span className="h-px bg-gray-300 w-12"></span>
                        <span className="text-[10px] uppercase tracking-[0.4em] text-gray-500 font-bold">Global Editorial Excellence</span>
                        <span className="h-px bg-gray-300 w-12"></span>
                    </div>
                 </Link>
             </div>
             <div className="w-1/4 flex justify-end">
                 <button onClick={() => setIsWeatherModalOpen(true)} className="flex items-center gap-4 bg-gray-50 px-5 py-2.5 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all group">
                    <WeatherIcon condition={weatherState.condition} size={28} />
                    <div className="flex flex-col items-start leading-tight">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-gray-900">{weatherState.temp}°</span>
                            <span className={`text-[10px] font-bold ${getAQIColor(weatherState.aqi)}`}>AQI {weatherState.aqi}</span>
                        </div>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate max-w-[120px]">{weatherState.location}</span>
                    </div>
                 </button>
             </div>
         </div>
      </header>

      {/* DESKTOP NAV */}
      <div className="hidden md:block bg-white border-b border-gray-200 sticky top-[33px] z-50 shadow-sm">
         <div className="max-w-7xl mx-auto px-4">
             <nav className="flex justify-center items-center h-12 space-x-10">
                 <NavItem to="/" label="Home" />
                 <NavItem to="/epaper" label="E-Paper" icon={FileText} />
                 <NavItem to="/classifieds" label="Classifieds" />
                 <NavItem to="#" label="World" />
                 <NavItem to="#" label="Technology" />
                 <NavItem to="#" label="Business" />
                 <NavItem to="#" label="Culture" />
             </nav>
         </div>
      </div>

      {/* BREAKING TICKER (Desktop Only) */}
      <BreakingTicker className="hidden md:flex" />

      {/* MAIN CONTENT */}
      <main className="flex-grow container mx-auto px-4 py-8 mb-16 md:mb-0">
        {children}
      </main>

      {/* FOOTER - Hidden on E-Paper Reader Route */}
      {currentPath !== '/epaper' && (
        <footer className="bg-news-black text-gray-400 py-16 border-t-4 border-news-gold hidden md:block">
          <div className="max-w-7xl mx-auto px-4">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                <div>
                    <h2 className="font-serif text-2xl font-bold text-white mb-4">DIGITAL <span className="text-news-gold">NEWSROOM</span></h2>
                    <p className="text-sm leading-relaxed text-gray-500">The premier destination for in-depth journalism, real-time reporting, and global perspectives.</p>
                </div>
                <div>
                   <h4 className="text-white font-bold uppercase tracking-wider text-xs mb-6 pb-2 border-b border-gray-800">Explore</h4>
                   <ul className="space-y-3 text-sm">
                      <li><Link to="#" onNavigate={onNavigate} className="hover:text-news-gold">World News</Link></li>
                      <li><Link to="/epaper" onNavigate={onNavigate} className="hover:text-news-gold">E-Paper Edition</Link></li>
                      <li><Link to="/classifieds" onNavigate={onNavigate} className="hover:text-news-gold">Classifieds</Link></li>
                   </ul>
                </div>
                <div>
                   <h4 className="text-white font-bold uppercase tracking-wider text-xs mb-6 pb-2 border-b border-gray-800">Support</h4>
                   <ul className="space-y-3 text-sm">
                      <li><Link to="#" onNavigate={onNavigate} className="hover:text-news-gold">Help Center</Link></li>
                      <li><Link to="/staff/login" onNavigate={onNavigate} className="hover:text-news-gold">Staff Portal</Link></li>
                   </ul>
                </div>
                <div>
                   <h4 className="text-white font-bold uppercase tracking-wider text-xs mb-6 pb-2 border-b border-gray-800">Subscribe</h4>
                   <div className="flex mt-4">
                      <input type="email" placeholder="Email" className="bg-gray-800 text-white px-4 py-3 w-full text-xs focus:outline-none" />
                      <button className="bg-news-gold text-black px-4 py-3 text-xs font-bold uppercase">Join</button>
                   </div>
                </div>
             </div>
             <p className="text-center text-[10px] tracking-widest uppercase text-gray-700 mt-12">© {new Date().getFullYear()} Digital Newsroom Publishing Group. All rights reserved.</p>
          </div>
        </footer>
      )}

      {/* WEATHER MODAL */}
      {isWeatherModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative overflow-hidden">
                <button onClick={() => setIsWeatherModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-black z-10"><X size={20}/></button>
                
                <div className="relative mb-6">
                    <h3 className="font-serif text-2xl font-bold">Weather & Air Quality</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Search any city globally</p>
                </div>

                <form onSubmit={handleWeatherSubmit} className="space-y-4 mb-8">
                    <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-gray-400" size={18}/>
                        <input 
                            type="text" 
                            value={locationQuery} 
                            onChange={e => setLocationQuery(e.target.value)} 
                            placeholder="Search e.g. Mumbai, New York..." 
                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg outline-none focus:border-news-black bg-gray-50" 
                        />
                    </div>
                    {weatherError && <p className="text-xs text-red-500 font-bold">{weatherError}</p>}
                    <button type="submit" disabled={isWeatherLoading} className="w-full bg-news-black text-white py-3 rounded-lg font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors">
                        {isWeatherLoading ? <Loader2 className="animate-spin" size={16}/> : 'Fetch Latest Data'}
                    </button>
                </form>

                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <WeatherIcon condition={weatherState.condition} size={32} />
                            <div>
                                <p className="text-3xl font-black leading-none">{weatherState.temp}°C</p>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{weatherState.condition}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-2xl font-black leading-none ${getAQIColor(weatherState.aqi)}`}>{weatherState.aqi}</p>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">AQI: {getAQILabel(weatherState.aqi)}</p>
                        </div>
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                            <Droplets size={14} className="text-blue-500" />
                            <span className="text-xs font-bold">{weatherState.humidity}% Humidity</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Globe size={14} className="text-news-gold" />
                            <span className="text-xs font-bold truncate max-w-[150px]">{weatherState.location}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
