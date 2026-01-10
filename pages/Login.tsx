
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, TrustedDevice } from '../types';
import { Mail, Lock, User, ArrowRight, Newspaper, CheckCircle, Shield, AlertCircle, Loader2, KeyRound, Copy, RotateCw, Eye, EyeOff } from 'lucide-react';
import { APP_NAME } from '../constants';
import { supabase } from '../supabaseClient';
import { getDeviceId, getDeviceMetadata } from '../utils';

interface LoginProps {
  onLogin: (role: UserRole, name: string, avatar?: string) => void;
  onNavigate: (path: string) => void;
  existingDevices: TrustedDevice[];
  onAddDevice: (device: TrustedDevice) => Promise<void>;
  onEmergencyReset: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onNavigate, existingDevices, onAddDevice, onEmergencyReset }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'verify_email' | 'awaiting_approval'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isMounted = useRef(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.READER);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  
  const [pendingUser, setPendingUser] = useState<any>(null);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    const checkExistingSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted.current) {
            handleSessionFound(session);
        }
    };
    checkExistingSession();
  }, [existingDevices]); // Keep dependency for re-trigger if props change, though we fetch fresh data inside

  const handleSessionFound = async (session: any) => {
    const currentId = getDeviceId();
    
    // CRITICAL FIX: Fetch fresh device list for this specific user directly from DB.
    // Do not rely solely on 'existingDevices' prop as it might be stale or empty on first load.
    const { data: freshDevices, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', session.user.id);

    // If DB fetch fails, fall back to props, but prefer fresh data
    const userDevices = freshDevices || existingDevices.filter(d => d.userId === session.user.id);
    const thisDevice = userDevices.find((d: any) => d.id === currentId);

    if (userDevices.length > 0) {
        if (thisDevice && thisDevice.status === 'approved') {
            finalizeLogin(session.user);
        } else if (thisDevice && thisDevice.status === 'pending') {
            setPendingUser(session.user);
            setMode('awaiting_approval');
        } else {
            // User has devices, but THIS one is new -> It is SECONDARY (Pending)
            const meta = getDeviceMetadata();
            try {
                await onAddDevice({
                    id: currentId,
                    userId: session.user.id,
                    deviceName: meta.name,
                    deviceType: meta.type,
                    location: 'New Detected Station',
                    lastActive: 'Just Now',
                    isCurrent: true,
                    isPrimary: false,
                    status: 'pending',
                    browser: meta.browser
                });
            } catch (e) {
                console.error("Failed to register device", e);
            }
            setPendingUser(session.user);
            setMode('awaiting_approval');
        }
    } else {
        // No devices found for this user in DB -> This is the FIRST device -> PRIMARY
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
            console.error("Failed to register primary device", e);
        }
        finalizeLogin(session.user);
    }
  };

  const manualRefresh = async () => {
      await supabase.auth.refreshSession();
  };

  const finalizeLogin = (user: any) => {
    const role = user.user_metadata.role || UserRole.READER;
    onLogin(role as UserRole, user.user_metadata.full_name, user.user_metadata.avatar_url);
    if (role === UserRole.EDITOR || role === UserRole.ADMIN) onNavigate('/editor');
    else if (role === UserRole.WRITER) onNavigate('/writer');
    else onNavigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
                full_name: name, 
                role: selectedRole, 
                avatar_url: avatar
            }
          }
        });
        if (error) throw error;
        
        if (data.session) {
             handleSessionFound(data.session);
        } else {
             setMode('verify_email');
             setMessage(`Verification code sent to ${email}`);
        }

      } else if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        handleSessionFound({ user: data.user });
      }
    } catch (err: any) {
      setError(err.message || "An authentication error occurred.");
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

  const handleRecoveryClick = () => {
      onNavigate('/reset-password');
  };

  if (mode === 'verify_email') {
      return (
          <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 bg-news-paper">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-6 border border-gray-200 animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail size={32} />
                  </div>
                  <div>
                      <h2 className="text-2xl font-serif font-black text-gray-900 mb-2">Verify Staff Email</h2>
                      <p className="text-gray-500 text-sm">We've dispatched a code to <b>{email}</b>. Please input it below.</p>
                  </div>
                  
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <input 
                          type="text" 
                          placeholder="000000" 
                          value={otp} 
                          onChange={e => setOtp(e.target.value)}
                          className="w-full text-center text-2xl font-mono tracking-widest p-3 border border-gray-300 rounded-lg focus:border-news-black outline-none"
                      />
                      <button 
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-news-black text-white rounded-xl font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors flex justify-center items-center gap-2"
                      >
                          {loading ? <Loader2 className="animate-spin" /> : "Verify Identity"}
                      </button>
                  </form>

                  <button 
                    onClick={() => setMode('signin')}
                    className="text-xs text-gray-400 hover:text-black underline"
                  >
                      Back to Sign In
                  </button>
              </div>
          </div>
      );
  }

  if (mode === 'awaiting_approval') {
      return (
          <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 bg-news-paper">
              <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-lg w-full text-center space-y-8 border border-gray-100 animate-in fade-in zoom-in-95">
                  <div className="relative inline-block">
                      <div className="absolute inset-0 bg-news-gold/20 rounded-full animate-ping"></div>
                      <div className="relative bg-news-gold text-white p-6 rounded-full">
                          <Shield size={48} />
                      </div>
                  </div>
                  <div>
                      <h2 className="text-3xl font-serif font-black text-gray-900 mb-4 uppercase">CJ NEWSHUB Access</h2>
                      <p className="text-gray-500 leading-relaxed text-sm">
                          Handshake initiated for <b>{pendingUser?.user_metadata?.full_name || 'User'}</b>. Authorization required from your <b>Primary Device</b>.
                      </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-3">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          <span>Terminal ID</span>
                          <span className="text-gray-900 font-mono">{getDeviceId()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          <span>Metadata</span>
                          <span className="text-gray-900">{getDeviceMetadata().name}</span>
                      </div>
                  </div>
                  <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-center gap-3 text-news-accent font-bold text-xs animate-pulse">
                          <Loader2 size={14} className="animate-spin" /> Awaiting Handshake...
                      </div>
                      <button onClick={manualRefresh} className="flex items-center justify-center gap-2 text-news-gold font-bold text-[10px] uppercase tracking-[0.2em] hover:text-news-black transition-colors">
                          <RotateCw size={14} /> Re-verify Approval Status
                      </button>
                      
                      <div className="pt-4 border-t border-gray-100">
                        <button onClick={onEmergencyReset} className="text-[10px] font-black text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors border border-red-100 uppercase tracking-widest">
                            Factory Reset: System Recovery
                        </button>
                      </div>
                      
                      <button onClick={async () => { await supabase.auth.signOut(); setMode('signin'); setPendingUser(null); }} className="text-gray-400 hover:text-news-black text-[10px] font-bold uppercase tracking-widest">Abort & Sign Out</button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-news-paper">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-5xl w-full flex flex-col md:flex-row min-h-[600px] border border-gray-200">
        <div className="w-full md:w-1/2 bg-news-black relative p-12 flex flex-col justify-between text-white overflow-hidden">
           <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-64 h-64 bg-news-accent rounded-full filter blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
           </div>
           <div className="relative z-10">
              <div className="flex items-center space-x-3 mb-8 text-news-gold">
                 <Newspaper size={28} />
                 <span className="font-serif text-3xl font-black tracking-tighter text-white uppercase italic">CJ <span className="not-italic text-white">NEWSHUB</span></span>
              </div>
              <h2 className="text-4xl font-serif font-black leading-tight mb-6 uppercase">
                {mode === 'signup' ? "Staff Enrollment" : "Editorial Access"}
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed font-light">Secure gateway to the CJ NEWSHUB global publishing suite. Professional editorial tools for modern journalism.</p>
           </div>
           <div className="relative z-10 pt-8 border-t border-white/10">
               <button onClick={onEmergencyReset} className="text-[10px] text-gray-500 hover:text-white font-bold uppercase tracking-[0.3em] transition-colors">
                   System Security Protocol
               </button>
           </div>
        </div>

        <div className="w-full md:w-1/2 p-8 md:p-12 bg-white flex flex-col justify-center">
           <div className="max-w-md mx-auto w-full">
              {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs mb-4 flex items-center gap-3 border border-red-100"><AlertCircle size={18} /> {error}</div>}
              {message && <div className="bg-green-50 text-green-700 p-4 rounded-xl text-xs mb-4 flex items-center gap-3 border border-green-100"><CheckCircle size={18} /> {message}</div>}

              <form onSubmit={handleSubmit} className="space-y-5">
                 {mode === 'signup' && (
                    <>
                       <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Staff Legal Name</label>
                          <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"/>
                       </div>
                       <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Station Role</label>
                          <div className="grid grid-cols-3 gap-2">
                             {[UserRole.READER, UserRole.WRITER, UserRole.EDITOR].map((role) => (
                                <button key={role} type="button" onClick={() => setSelectedRole(role)} className={`py-2 text-[10px] font-bold uppercase rounded-lg border transition-all ${selectedRole === role ? 'bg-news-black text-white border-news-black shadow-lg' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>{role}</button>
                             ))}
                          </div>
                       </div>
                    </>
                 )}

                 <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Editorial Email</label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-3.5 text-gray-400" size={16}/>
                        <input 
                            type="email" 
                            required 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all font-medium" 
                            placeholder="staff@cjnewshub.com"
                        />
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Security Credential</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={16}/>
                        <input 
                            type={showPassword ? "text" : "password"} 
                            required 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            className="w-full pl-10 pr-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                        />
                        <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3.5 text-gray-400 hover:text-news-black transition-colors"
                        >
                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                        </button>
                    </div>
                 </div>

                 {mode === 'signin' && (
                    <div className="text-right">
                       <button type="button" onClick={handleRecoveryClick} className="text-[10px] text-news-accent hover:underline font-black uppercase tracking-widest">Account Recovery</button>
                    </div>
                 )}

                 <button type="submit" disabled={loading} className="w-full py-4 bg-news-black text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 flex justify-center items-center gap-3 shadow-xl transition-all">
                    {loading ? <Loader2 className="animate-spin" size={20}/> : (mode === 'signup' ? "Complete Enrollment" : "Verified Sign In")}
                    {!loading && <ArrowRight size={18} />}
                 </button>
              </form>

              <div className="mt-8 text-center text-xs text-gray-500">
                 {mode === 'signin' ? <p>New staff member? <button onClick={() => setMode('signup')} className="font-black text-news-black hover:underline uppercase">Enroll Now</button></p> : <p>Existing staff? <button onClick={() => setMode('signin')} className="font-black text-news-black hover:underline uppercase">Sign In</button></p>}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
