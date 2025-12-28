
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, TrustedDevice } from '../types';
import { Shield, Feather, Lock, ArrowRight, CheckCircle, AlertCircle, Upload, Newspaper, Loader2, RotateCw, Mail, Server } from 'lucide-react';
import { APP_NAME } from '../constants';
import { supabase } from '../supabaseClient';
import { getDeviceId, getDeviceMetadata } from '../utils';

interface StaffLoginProps {
  onLogin: (role: UserRole, name: string, avatar?: string) => void;
  onNavigate: (path: string) => void;
  existingDevices: TrustedDevice[];
  onAddDevice: (device: TrustedDevice) => void;
  onEmergencyReset: () => void;
}

type StaffType = 'admin' | 'editor' | 'publisher';

const StaffLogin: React.FC<StaffLoginProps> = ({ onLogin, onNavigate, existingDevices, onAddDevice, onEmergencyReset }) => {
  const [activeTab, setActiveTab] = useState<StaffType>('admin');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isMounted = useRef(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  
  const [pendingUser, setPendingUser] = useState<any>(null);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted.current) {
            handleSessionFound(session);
        }
    };
    checkExistingSession();
  }, [existingDevices]);

  // Poll for device approval
  useEffect(() => {
    let interval: any;
    if (isAwaitingApproval && pendingUser) {
        interval = setInterval(() => {
            checkApprovalStatus();
        }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAwaitingApproval, existingDevices, pendingUser]);

  const handleSessionFound = (session: any) => {
    const currentId = getDeviceId();
    const userDevices = existingDevices.filter(d => d.userId === session.user.id);
    const thisDevice = userDevices.find(d => d.id === currentId);

    if (userDevices.length > 0) {
        if (thisDevice && thisDevice.status === 'approved') {
            finalizeLogin(session.user);
        } else if (thisDevice && thisDevice.status === 'pending') {
            setPendingUser(session.user);
            setIsAwaitingApproval(true);
        } else {
            const meta = getDeviceMetadata();
            onAddDevice({
                id: currentId,
                userId: session.user.id,
                deviceName: meta.name,
                deviceType: meta.type,
                location: 'New Detected Station',
                lastActive: 'Just Now',
                isCurrent: true,
                isPrimary: false, // Not primary because user has existing devices
                status: 'pending',
                browser: meta.browser
            });
            setPendingUser(session.user);
            setIsAwaitingApproval(true);
        }
    } else {
        // No devices found for this user, so this is the First Device -> Make Primary
        const meta = getDeviceMetadata();
        onAddDevice({
            id: currentId,
            userId: session.user.id,
            deviceName: meta.name,
            deviceType: meta.type,
            location: 'Primary Station',
            lastActive: 'Active Now',
            isCurrent: true,
            isPrimary: true, // PRIMARY
            status: 'approved',
            browser: meta.browser
        });
        finalizeLogin(session.user);
    }
  };

  const checkApprovalStatus = () => {
    if (!pendingUser) return;
    const currentId = getDeviceId();
    const approved = existingDevices.find(d => d.id === currentId && d.userId === pendingUser.id && d.status === 'approved');
    if (approved) {
        finalizeLogin(pendingUser);
    }
  };

  const finalizeLogin = (user: any) => {
    const metaRole = user.user_metadata.role;
    let role = UserRole.READER;

    if (metaRole) {
        role = metaRole as UserRole;
    } else {
        // Fallback based on current tab selection if metadata missing (edge case)
        if (activeTab === 'admin') role = UserRole.ADMIN;
        else if (activeTab === 'editor') role = UserRole.EDITOR;
        else role = UserRole.WRITER;
    }

    onLogin(role, user.user_metadata.full_name, user.user_metadata.avatar_url);
    
    if (role === UserRole.ADMIN || role === UserRole.EDITOR) onNavigate('/editor');
    else if (role === UserRole.WRITER) onNavigate('/writer');
    else onNavigate('/');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    let role = UserRole.READER;
    if (activeTab === 'admin') role = UserRole.ADMIN;
    else if (activeTab === 'editor') role = UserRole.EDITOR;
    else role = UserRole.WRITER;

    try {
      if (isRegistering) {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
                full_name: name, 
                role: role, 
                avatar_url: avatar
            }
          }
        });
        if (signUpErr) throw signUpErr;

        if (data.session) {
            handleSessionFound(data.session);
        } else {
            setIsVerifyingEmail(true);
        }

      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        handleSessionFound({ user: data.user });
      }
    } catch (err: any) {
      setError(err.message || "Access denied.");
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
        const { data, error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'signup'
        });
        if (error) throw error;
        if (data.session) {
            handleSessionFound(data.session);
        }
    } catch (err: any) {
        setError(err.message || "Invalid code.");
    } finally {
        setLoading(false);
    }
  };

  if (isVerifyingEmail) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
             <div className="bg-[#141414] rounded-2xl p-10 max-w-lg w-full text-center border border-white/5 shadow-2xl space-y-6 animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-news-gold text-black rounded-full flex items-center justify-center mx-auto">
                      <Mail size={32} />
                  </div>
                  <div>
                      <h2 className="text-3xl font-black text-white mb-2">Verify Credential</h2>
                      <p className="text-gray-400 text-sm">A verification code has been sent to {email}. Enter it to finalize staff registration.</p>
                  </div>
                  
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <input 
                          type="text" 
                          placeholder="000000" 
                          value={otp} 
                          onChange={e => setOtp(e.target.value)}
                          className="w-full bg-black/50 border border-news-gold/30 text-news-gold text-center text-4xl font-mono tracking-widest p-4 rounded-xl focus:outline-none focus:border-news-gold"
                      />
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-news-gold text-black rounded-xl font-bold uppercase tracking-widest hover:bg-yellow-500 transition-colors"
                      >
                          {loading ? <Loader2 className="animate-spin inline mr-2"/> : null} Verify Identity
                      </button>
                  </form>
                  
                  <button onClick={() => setIsVerifyingEmail(false)} className="text-xs text-gray-500 hover:text-white">Go Back</button>
             </div>
        </div>
      );
  }

  if (isAwaitingApproval) {
      return (
        <div className="min-h-screen bg-news-black flex items-center justify-center p-4">
             <div className="bg-[#141414] rounded-2xl p-10 md:p-14 max-w-xl w-full text-center border border-white/5 shadow-2xl space-y-8 animate-in fade-in zoom-in-95">
                  <div className="relative inline-block">
                       <div className="absolute inset-0 bg-news-gold/10 rounded-full animate-ping"></div>
                       <div className="relative bg-news-gold text-black p-8 rounded-full">
                           <Shield size={64} />
                       </div>
                  </div>
                  <div className="space-y-4">
                      <h2 className="text-3xl font-black text-white">Handshake Pending</h2>
                      <p className="text-gray-500 text-sm leading-relaxed">
                          Terminal unauthorized for administrative access. Please approve this connection from your <b>Primary Device Dashboard</b>.
                      </p>
                  </div>
                  <div className="bg-white/5 py-4 rounded-xl border border-white/5 text-news-gold font-bold text-xs uppercase tracking-[0.3em] flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" /> Authorization Awaited
                      </div>
                      <button onClick={checkApprovalStatus} className="text-white/40 hover:text-news-gold transition-colors flex items-center gap-2">
                          <RotateCw size={14} /> Force Refresh Status
                      </button>
                  </div>

                  <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                      <button onClick={onEmergencyReset} className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-[0.2em] transition-colors py-2 px-4 border border-red-900/30 rounded-lg">
                          Factory Reset: Reclaim Primary Access
                      </button>
                      <button onClick={async () => { await supabase.auth.signOut(); setIsAwaitingApproval(false); setPendingUser(null); }} className="text-gray-600 hover:text-white text-[10px] font-bold uppercase tracking-widest">Sign Out & Disconnect</button>
                  </div>
             </div>
        </div>
      );
  }

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
                 <h1 className="text-white font-serif text-2xl font-black tracking-tight uppercase">DIGITAL</h1>
              </div>
              <p className="text-news-gold text-[10px] font-bold uppercase tracking-[0.3em] mb-12">Staff Secure Portal</p>
              <div className="space-y-4">
                 <button onClick={() => { setActiveTab('admin'); setIsRegistering(false); }} className={`w-full text-left p-5 rounded-xl border transition-all ${activeTab === 'admin' ? 'bg-white/5 border-red-500/30 shadow-lg' : 'bg-transparent border-transparent text-gray-500'}`}>
                    <Server size={22} className={activeTab === 'admin' ? 'text-red-500' : ''} />
                    <div className="mt-2"><span className={`block font-bold text-sm ${activeTab === 'admin' ? 'text-white' : ''}`}>Administrator</span></div>
                 </button>
                 <button onClick={() => { setActiveTab('editor'); setIsRegistering(false); }} className={`w-full text-left p-5 rounded-xl border transition-all ${activeTab === 'editor' ? 'bg-white/5 border-news-gold/30 shadow-lg' : 'bg-transparent border-transparent text-gray-500'}`}>
                    <Shield size={22} className={activeTab === 'editor' ? 'text-news-gold' : ''} />
                    <div className="mt-2"><span className={`block font-bold text-sm ${activeTab === 'editor' ? 'text-white' : ''}`}>Editor Admin</span></div>
                 </button>
                 <button onClick={() => { setActiveTab('publisher'); setIsRegistering(false); }} className={`w-full text-left p-5 rounded-xl border transition-all ${activeTab === 'publisher' ? 'bg-white/5 border-blue-500/30 shadow-lg' : 'bg-transparent border-transparent text-gray-500'}`}>
                    <Feather size={22} className={activeTab === 'publisher' ? 'text-blue-500' : ''} />
                    <div className="mt-2"><span className={`block font-bold text-sm ${activeTab === 'publisher' ? 'text-white' : ''}`}>Writer Panel</span></div>
                 </button>
              </div>
           </div>
           <div className="pt-8 mt-10 border-t border-white/5">
              <button onClick={onEmergencyReset} className="text-[9px] text-gray-700 hover:text-white font-bold uppercase tracking-[0.4em] transition-colors">
                  System Security Reset
              </button>
           </div>
        </div>

        <div className="w-full md:w-7/12 p-8 md:p-14 bg-[#1a1a1a]">
           <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-black text-white mb-2">{isRegistering ? 'Account Initialization' : 'Authorized Access'}</h2>
              <p className="text-sm text-gray-500 font-medium">Verified credentials for internal Digital Newsroom tools.</p>
           </div>
           {error && <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 text-red-500 text-xs rounded-xl flex items-center gap-3"><AlertCircle size={16}/> {error}</div>}
           {message && <div className="mb-6 p-4 bg-green-900/20 border border-green-900/30 text-green-500 text-xs rounded-xl flex items-center gap-3"><CheckCircle size={16}/> {message}</div>}

           <form onSubmit={handleSubmit} className="space-y-6">
              {isRegistering && (
                  <>
                      <div className="flex items-center gap-6 mb-2 p-4 bg-white/5 rounded-2xl border border-white/5">
                           <div className="w-16 h-16 rounded-full bg-black border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                               {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <Lock size={24} className="text-gray-700" />}
                           </div>
                           <div className="flex-1">
                               <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="staff-id-up" />
                               <label htmlFor="staff-id-up" className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-black px-4 py-2 rounded-lg cursor-pointer border border-white/5 transition-colors">IDENTIFICATION UPLOAD</label>
                           </div>
                       </div>
                       <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Full Legal Name" className="w-full bg-black/40 border border-white/10 rounded-xl text-white py-4 px-5 focus:border-news-gold outline-none transition-all" />
                  </>
              )}
              
              <div className="relative">
                <Mail className="absolute left-4 top-4.5 text-gray-500" size={18}/>
                <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl text-white py-4 pl-12 pr-5 focus:border-news-gold outline-none transition-all" 
                    placeholder={activeTab === 'admin' ? "admin@newsroom.com" : "staff@internal.news"}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-4.5 text-gray-500" size={18}/>
                <input 
                    type="password" 
                    required 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-xl text-white py-4 pl-12 pr-5 focus:border-news-gold outline-none transition-all" 
                    placeholder="Security Password" 
                />
              </div>
              
              <button type="submit" disabled={loading} className={`w-full py-5 px-6 rounded-xl text-xs font-black tracking-[0.2em] transition-all flex justify-center items-center gap-3 shadow-2xl ${activeTab === 'admin' ? 'bg-red-600 text-white hover:bg-red-500' : activeTab === 'editor' ? 'bg-news-gold text-black hover:bg-yellow-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>{isRegistering ? 'REGISTER CREDENTIALS' : 'REQUEST HANDSHAKE'} <ArrowRight size={18}/></>}
              </button>
              
              <div className="text-center pt-4">
                  <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] font-bold text-gray-600 hover:text-white uppercase tracking-widest transition-colors">
                      {isRegistering ? 'Back to Login' : 'Request New Staff ID'}
                  </button>
              </div>
              <div className="pt-8 text-center">
                  <button type="button" onClick={() => onNavigate('/')} className="text-[10px] text-gray-700 hover:text-gray-400 font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto">
                      <ArrowRight size={14} className="rotate-180" /> Reader Homepage
                  </button>
              </div>
           </form>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
