
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, TrustedDevice } from '../types';
import { Shield, Feather, Lock, ArrowRight, CheckCircle, AlertCircle, Upload, Newspaper, Loader2, RotateCw, Mail, Server, Eye, EyeOff, UserPlus } from 'lucide-react';
import { APP_NAME } from '../constants';
import { supabase } from '../supabaseClient';
import { getDeviceId, getDeviceMetadata } from '../utils';

type StaffType = 'admin' | 'editor' | 'publisher';

const StaffLogin: React.FC<any> = ({ onLogin, onNavigate, existingDevices, onAddDevice, onEmergencyReset }) => {
  const [activeTab, setActiveTab] = useState<StaffType>('admin');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isMounted = useRef(true);

  // Invite State
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [invitedRole, setInvitedRole] = useState<UserRole | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  
  const [pendingUser, setPendingUser] = useState<any>(null);

  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  // Initialization Logic
  useEffect(() => {
      const init = async () => {
          // 1. Extract Token from URL (Standard or Hash)
          let token: string | null = null;
          const searchParams = new URLSearchParams(window.location.search);
          token = searchParams.get('invite');

          if (!token && window.location.hash.includes('?')) {
              const hashParts = window.location.hash.split('?');
              if (hashParts.length > 1) {
                  const hashParams = new URLSearchParams(hashParts[1]);
                  token = hashParams.get('invite');
              }
          }

          // 2. Prioritize Invite Validation
          if (token) {
              // If there's an invite token, we ignore existing session to allow registration
              // or handle the invite flow specifically.
              await validateInvite(token);
          } else {
              // 3. Otherwise check for existing session
              const { data: { session } } = await supabase.auth.getSession();
              if (session && isMounted.current) {
                  handleSessionFound(session);
              }
          }
      };

      init();
  }, []); // Run once on mount

  // Watch for approval only if in that state
  useEffect(() => {
    let interval: any;
    if (isAwaitingApproval && pendingUser) {
        interval = setInterval(() => {
            checkApprovalStatus();
        }, 3000);
    }
    return () => clearInterval(interval);
  }, [isAwaitingApproval, existingDevices, pendingUser]);

  const validateInvite = async (token: string) => {
      setCheckingInvite(true);
      setError(null);
      try {
          // Force sign out if a session exists to ensure clean registration
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
              await supabase.auth.signOut();
          }

          const { data, error } = await supabase
              .from('staff_invitations')
              .select('*')
              .eq('token', token)
              .is('used_at', null)
              .gt('expires_at', new Date().toISOString())
              .maybeSingle();

          if (error) throw error;

          if (data) {
              setInviteToken(token);
              setInvitedRole(data.role);
              setIsRegistering(true); // Switch to registration UI
              setMessage("Invitation accepted. Please complete your enrollment.");
          } else {
              setError("Invitation link invalid or expired. Please contact your administrator.");
          }
      } catch (err: any) {
          console.error("Invite validation error:", err);
          // Check for missing table error specifically to help dev
          if (err.message?.includes('relation "public.staff_invitations" does not exist')) {
              setError("System Error: Database not configured. Please run SUPABASE_SETUP.sql.");
          } else {
              setError("Failed to validate invitation.");
          }
      } finally {
          setCheckingInvite(false);
      }
  };

  const handleSessionFound = async (session: any) => {
    // Prevent redirect loop if we are currently validating an invite
    if (checkingInvite || inviteToken) return;

    const currentId = getDeviceId();
    
    // Fetch fresh device list directly from DB
    const { data: freshDevices, error } = await supabase
        .from('trusted_devices')
        .select('*')
        .eq('user_id', session.user.id);

    const userDevices = freshDevices || existingDevices.filter((d: any) => d.userId === session.user.id);
    const thisDevice = userDevices.find((d: any) => d.id === currentId);

    if (userDevices.length > 0) {
        if (thisDevice) {
            if (thisDevice.status === 'approved') {
                finalizeLogin(session.user);
            } else {
                setPendingUser(session.user);
                setIsAwaitingApproval(true);
            }
        } else {
            finalizeLogin(session.user);
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
    setMessage(null);

    try {
      if (isRegistering) {
        if (!inviteToken || !invitedRole) {
            throw new Error("Registration requires a valid invitation link.");
        }

        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, role: invitedRole, avatar_url: avatar }
          }
        });
        if (signUpErr) throw signUpErr;
        
        // Mark invite as used
        await supabase.from('staff_invitations').update({ used_at: new Date().toISOString() }).eq('token', inviteToken);

        if (data.session) handleSessionFound(data.session);
        else setIsVerifyingEmail(true);
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
        const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'signup' });
        if (error) throw error;
        if (data.session) handleSessionFound(data.session);
    } catch (err: any) {
        setError(err.message || "Invalid code.");
    } finally {
        setLoading(false);
    }
  };

  if (checkingInvite) {
      return (
          <div className="min-h-screen bg-news-black flex items-center justify-center">
              <div className="text-white flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-news-gold" size={32} />
                  <p className="text-xs font-black uppercase tracking-widest">Verifying Invite Token...</p>
              </div>
          </div>
      );
  }

  if (isVerifyingEmail) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
             <div className="bg-[#141414] rounded-2xl p-10 max-w-lg w-full text-center border border-white/5 shadow-2xl space-y-6 animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-news-gold text-black rounded-full flex items-center justify-center mx-auto">
                      <Mail size={32} />
                  </div>
                  <div>
                      <h2 className="text-3xl font-black text-white mb-2">Verify Identity</h2>
                      <p className="text-gray-400 text-sm">A security code has been dispatched to {email}. Required for CJ NEWSHUB staff registration.</p>
                  </div>
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                      <input type="text" placeholder="000000" value={otp} onChange={e => setOtp(e.target.value)} className="w-full bg-black/50 border border-news-gold/30 text-news-gold text-center text-4xl font-mono tracking-widest p-4 rounded-xl focus:outline-none focus:border-news-gold" />
                      <button type="submit" disabled={loading} className="w-full py-4 bg-news-gold text-black rounded-xl font-bold uppercase tracking-widest hover:bg-yellow-500 transition-colors">
                          {loading ? <Loader2 className="animate-spin inline mr-2"/> : null} Verify Credentials
                      </button>
                  </form>
                  <button onClick={() => setIsVerifyingEmail(false)} className="text-xs text-gray-500 hover:text-white">Abort Registration</button>
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
                      <h2 className="text-3xl font-black text-white">Terminal Handshake</h2>
                      <p className="text-gray-500 text-sm leading-relaxed">
                          Secure station connection pending. Authorization required from your <b>Primary CJ NEWSHUB Terminal</b>.
                      </p>
                  </div>
                  <div className="bg-white/5 py-4 rounded-xl border border-white/5 text-news-gold font-bold text-xs uppercase tracking-[0.3em] flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" /> Authorization Awaited
                      </div>
                      <button onClick={checkApprovalStatus} className="text-white/40 hover:text-news-gold transition-colors flex items-center gap-2">
                          <RotateCw size={14} /> Manually Verify
                      </button>
                  </div>
                  <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                      <button onClick={onEmergencyReset} className="text-[10px] text-red-500 hover:text-red-400 font-bold uppercase tracking-[0.2em] transition-colors py-2 px-4 border border-red-900/30 rounded-lg">
                          Factory Reset: Emergency Reclaim
                      </button>
                      <button onClick={async () => { await supabase.auth.signOut(); setIsAwaitingApproval(false); setPendingUser(null); }} className="text-gray-600 hover:text-white text-[10px] font-bold uppercase tracking-widest">Sign Out</button>
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
                 <h1 className="text-white font-serif text-2xl font-black tracking-tighter uppercase italic">CJ <span className="not-italic text-white">NEWSHUB</span></h1>
              </div>
              <p className="text-news-gold text-[10px] font-bold uppercase tracking-[0.3em] mb-12">Authorized Personnel Only</p>
              
              {!isRegistering && (
                  <div className="space-y-4">
                     <button onClick={() => { setActiveTab('admin'); setIsRegistering(false); }} className={`w-full text-left p-5 rounded-xl border transition-all ${activeTab === 'admin' ? 'bg-white/5 border-red-500/30 shadow-lg' : 'bg-transparent border-transparent text-gray-500'}`}>
                        <Server size={22} className={activeTab === 'admin' ? 'text-red-500' : ''} />
                        <div className="mt-2"><span className={`block font-bold text-sm ${activeTab === 'admin' ? 'text-white' : ''}`}>Global Admin</span></div>
                     </button>
                     <button onClick={() => { setActiveTab('editor'); setIsRegistering(false); }} className={`w-full text-left p-5 rounded-xl border transition-all ${activeTab === 'editor' ? 'bg-white/5 border-news-gold/30 shadow-lg' : 'bg-transparent border-transparent text-gray-500'}`}>
                        <Shield size={22} className={activeTab === 'editor' ? 'text-news-gold' : ''} />
                        <div className="mt-2"><span className={`block font-bold text-sm ${activeTab === 'editor' ? 'text-white' : ''}`}>Chief Editor</span></div>
                     </button>
                     <button onClick={() => { setActiveTab('publisher'); setIsRegistering(false); }} className={`w-full text-left p-5 rounded-xl border transition-all ${activeTab === 'publisher' ? 'bg-white/5 border-blue-500/30 shadow-lg' : 'bg-transparent border-transparent text-gray-500'}`}>
                        <Feather size={22} className={activeTab === 'publisher' ? 'text-blue-500' : ''} />
                        <div className="mt-2"><span className={`block font-bold text-sm ${activeTab === 'publisher' ? 'text-white' : ''}`}>Editorial Writer</span></div>
                     </button>
                  </div>
              )}
              {isRegistering && (
                  <div className="bg-white/5 p-6 rounded-xl border border-news-gold/30 animate-in fade-in">
                      <div className="flex items-center gap-2 text-news-gold font-bold uppercase text-xs tracking-widest mb-2">
                          <UserPlus size={16} /> Invitation Active
                      </div>
                      <p className="text-white text-sm font-bold">Enrolling as: {invitedRole}</p>
                      <p className="text-gray-500 text-xs mt-1">This invitation expires in 15 minutes.</p>
                  </div>
              )}
           </div>
           <div className="pt-8 mt-10 border-t border-white/5">
              <button onClick={onEmergencyReset} className="text-[9px] text-gray-700 hover:text-white font-bold uppercase tracking-[0.4em] transition-colors">
                  System Security Protocol
              </button>
           </div>
        </div>

        <div className="w-full md:w-7/12 p-8 md:p-14 bg-[#1a1a1a]">
           <div className="mb-10 text-center md:text-left">
              <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">{isRegistering ? ' Enrollment' : 'Staff Login'}</h2>
              <p className="text-sm text-gray-500 font-medium">Verified credentials required for internal CJ NEWSHUB stations.</p>
           </div>
           
           {error && <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 text-red-500 text-xs rounded-xl flex items-center gap-3"><AlertCircle size={16}/> {error}</div>}
           
           <form onSubmit={handleSubmit} className="space-y-6">
              {isRegistering && (
                  <div className="animate-in slide-in-from-right-4">
                      <div className="relative mb-6">
                          <UserPlus className="absolute left-4 top-4.5 text-gray-500" size={18}/>
                          <input 
                            type="text" 
                            required 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            placeholder="Full Staff Name" 
                            className="w-full bg-black/40 border border-white/10 rounded-xl text-white py-4 pl-12 pr-5 focus:border-news-gold outline-none transition-all" 
                          />
                      </div>
                  </div>
              )}
              
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
              
              <button type="submit" disabled={loading} className={`w-full py-5 px-6 rounded-xl text-xs font-black tracking-[0.2em] transition-all flex justify-center items-center gap-3 shadow-2xl ${isRegistering ? 'bg-news-gold text-black' : activeTab === 'admin' ? 'bg-red-600 text-white' : activeTab === 'editor' ? 'bg-news-gold text-black' : 'bg-blue-600 text-white'}`}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>{isRegistering ? 'COMPLETE ENROLLMENT' : 'STAFF HANDSHAKE'} <ArrowRight size={18}/></>}
              </button>
              
              {!isRegistering && (
                  <div className="text-center pt-4 opacity-30 text-[10px] uppercase text-gray-600">
                      Public registration closed. Invite required.
                  </div>
              )}
              {isRegistering && (
                  <div className="text-center pt-4">
                      <button type="button" onClick={() => { setIsRegistering(false); setInviteToken(null); }} className="text-gray-500 hover:text-white text-xs uppercase tracking-widest">
                          Cancel Enrollment
                      </button>
                  </div>
              )}
           </form>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;
