
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, TrustedDevice } from '../types';
import { Shield, Feather, Lock, ArrowRight, AlertCircle, Newspaper, Loader2, Mail, Server, Eye, EyeOff } from 'lucide-react';
import { APP_NAME } from '../constants';
import { supabase } from '../supabaseClient';
import { getDeviceId, getDeviceMetadata } from '../utils';

type StaffType = 'admin' | 'editor' | 'publisher';

const StaffLogin: React.FC<any> = ({ onLogin, onNavigate, existingDevices, onAddDevice, onEmergencyReset }) => {
  const [activeTab, setActiveTab] = useState<StaffType>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  const handleSessionFound = async (session: any) => {
    const currentId = getDeviceId();
    
    // Fetch fresh device list directly from DB
    const { data: freshDevices, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', session.user.id);

    const userDevices = freshDevices || existingDevices.filter((d: any) => d.userId === session.user.id);
    const thisDevice = userDevices.find((d: any) => d.id === currentId);

    if (userDevices.length > 0) {
        if (thisDevice && thisDevice.status === 'approved') {
            finalizeLogin(session.user);
        } else {
            // If device unauthorized or pending, redirect to main login for approval screen
            onNavigate('/login');
        }
    } else {
        const meta = getDeviceMetadata();
        try {
            await onAddDevice({
                id: currentId,
                userId: session.user.id,
                deviceName: meta.name,
                deviceType: meta.type,
                location: 'Primary Station',
                lastActive: 'Active Now',
                isCurrent: true,
                isPrimary: true, 
                status: 'approved',
                browser: meta.browser
            });
        } catch (e) {
            console.error("Failed to register primary staff device", e);
        }
        finalizeLogin(session.user);
    }
  };

  const finalizeLogin = (user: any) => {
    const metaRole = user.user_metadata.role;
    let role = UserRole.READER;

    if (metaRole) {
        role = metaRole as UserRole;
    } else {
        if (activeTab === 'admin') role = UserRole.ADMIN;
        else if (activeTab === 'editor') role = UserRole.EDITOR;
        else role = UserRole.WRITER;
    }

    onLogin(role, user.user_metadata.full_name, user.user_metadata.avatar_url);
    
    if (role === UserRole.ADMIN || role === UserRole.EDITOR) onNavigate('/editor');
    else if (role === UserRole.WRITER) onNavigate('/writer');
    else onNavigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        handleSessionFound({ user: data.user });
    } catch (err: any) {
      setError(err.message || "Access denied.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-news-gold rounded-full blur-[140px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-900 rounded-full blur-[140px]"></div>
      </div>
      <div className="relative z-10 w-full max-w-4xl bg-[#141414] rounded-2xl shadow-2xl border border-white/5 flex flex-col md:flex-row overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-full md:w-5/12 bg-black/40 p-10 flex flex-col justify-between border-r border-white/5">
           <div>
              <div className="flex items-center gap-2 mb-1">
                 <Newspaper size={24} className="text-news-gold" />
                 <h1 className="text-white font-serif text-2xl font-black tracking-tighter uppercase italic">CJ <span className="not-italic text-white">NEWSHUB</span></h1>
              </div>
              <p className="text-news-gold text-[10px] font-bold uppercase tracking-[0.3em] mb-12">Authorized Personnel Only</p>
              
              <div className="space-y-4">
                 <button onClick={() => setActiveTab('admin')} className={`w-full text-left p-5 rounded-xl border transition-all ${activeTab === 'admin' ? 'bg-white/5 border-red-500/30 shadow-lg' : 'bg-transparent border-transparent text-gray-500'}`}>
                    <Server size={22} className={activeTab === 'admin' ? 'text-red-500' : ''} />
                    <div className="mt-2"><span className={`block font-bold text-sm ${activeTab === 'admin' ? 'text-white' : ''}`}>Global Admin</span></div>
                 </button>
                 <button onClick={() => setActiveTab('editor')} className={`w-full text-left p-5 rounded-xl border transition-all ${activeTab === 'editor' ? 'bg-white/5 border-news-gold/30 shadow-lg' : 'bg-transparent border-transparent text-gray-500'}`}>
                    <Shield size={22} className={activeTab === 'editor' ? 'text-news-gold' : ''} />
                    <div className="mt-2"><span className={`block font-bold text-sm ${activeTab === 'editor' ? 'text-white' : ''}`}>Chief Editor</span></div>
                 </button>
                 <button onClick={() => setActiveTab('publisher')} className={`w-full text-left p-5 rounded-xl border transition-all ${activeTab === 'publisher' ? 'bg-white/5 border-blue-500/30 shadow-lg' : 'bg-transparent border-transparent text-gray-500'}`}>
                    <Feather size={22} className={activeTab === 'publisher' ? 'text-blue-500' : ''} />
                    <div className="mt-2"><span className={`block font-bold text-sm ${activeTab === 'publisher' ? 'text-white' : ''}`}>Editorial Writer</span></div>
                 </button>
              </div>
           </div>
           <div className="pt-8 mt-10 border-t border-white/5">
              <button onClick={onEmergencyReset} className="text-[9px] text-gray-700 hover:text-white font-bold uppercase tracking-[0.4em] transition-colors">
                  System Security Protocol
              </button>
           </div>
        </div>

        <div className="w-full md:w-7/12 p-8 md:p-14 bg-[#1a1a1a]">
           <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Staff Access</h2>
              <p className="text-sm text-gray-500 font-medium">Verified credentials required for internal CJ NEWSHUB stations.</p>
           </div>
           
           {error && <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 text-red-500 text-xs rounded-xl flex items-center gap-3"><AlertCircle size={16}/> {error}</div>}
           
           <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="relative">
                <Mail className="absolute left-4 top-4.5 text-gray-500" size={18}/>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl text-white py-4 pl-12 pr-5 focus:border-news-gold outline-none transition-all" placeholder="staff@cjnewshub.com" />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-4.5 text-gray-500" size={18}/>
                <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl text-white py-4 pl-12 pr-12 focus:border-news-gold outline-none transition-all" 
                    placeholder="Station Key" 
                />
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4.5 text-gray-500 hover:text-white transition-colors"
                >
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
              
              <button type="submit" disabled={loading} className={`w-full py-5 px-6 rounded-xl text-xs font-black tracking-[0.2em] transition-all flex justify-center items-center gap-3 shadow-2xl ${activeTab === 'admin' ? 'bg-red-600 text-white' : activeTab === 'editor' ? 'bg-news-gold text-black' : 'bg-blue-600 text-white'}`}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>STAFF HANDSHAKE <ArrowRight size={18}/></>}
              </button>
              
              <div className="text-center pt-4 opacity-50 text-[10px] uppercase text-gray-600">
                  <a href="/#/login" className="hover:text-white transition-colors underline">Public Login</a>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
