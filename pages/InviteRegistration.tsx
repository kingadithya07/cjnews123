
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { UserRole } from '../types';
import { UserPlus, Mail, Lock, CheckCircle, AlertCircle, Loader2, ArrowRight, Shield } from 'lucide-react';

interface InviteRegistrationProps {
    onNavigate: (path: string) => void;
}

const InviteRegistration: React.FC<InviteRegistrationProps> = ({ onNavigate }) => {
    const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'success'>('validating');
    const [token, setToken] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const init = async () => {
            // 1. Extract Token (Robust Parsing)
            let extractedToken = null;

            // Try standard URL Search Params first (?token=...)
            const searchParams = new URLSearchParams(window.location.search);
            extractedToken = searchParams.get('token');
            
            // Try extracting from Hash if not found in Search
            // Example: /#/invite?token=xyz
            if (!extractedToken) {
                const hash = window.location.hash;
                const qIndex = hash.indexOf('?');
                if (qIndex !== -1) {
                    const hashParams = new URLSearchParams(hash.slice(qIndex));
                    extractedToken = hashParams.get('token');
                }
            }

            if (!extractedToken) {
                setStatus('invalid');
                setError("Missing invitation token.");
                return;
            }

            setToken(extractedToken);

            try {
                // 2. Force Sign Out to ensure clean registration
                await supabase.auth.signOut();

                // 3. Validate Token in DB
                const { data, error: dbError } = await supabase
                    .from('staff_invitations')
                    .select('*')
                    .eq('token', extractedToken)
                    .is('used_at', null)
                    .gt('expires_at', new Date().toISOString())
                    .maybeSingle();

                if (dbError) throw dbError;

                if (data) {
                    setRole(data.role);
                    setStatus('valid');
                } else {
                    setStatus('invalid');
                    setError("Invitation link is invalid, expired, or has already been used.");
                }
            } catch (err: any) {
                console.error("Invite Error:", err);
                setStatus('invalid');
                setError(err.message || "Failed to validate invitation.");
            }
        };

        init();
    }, []);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token || !role) return;
        
        setLoading(true);
        setError(null);

        try {
            // 1. Sign Up
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        role: role
                    }
                }
            });

            if (signUpError) throw signUpError;

            // 2. Mark Invitation as Used
            if (data.user) {
                await supabase
                    .from('staff_invitations')
                    .update({ used_at: new Date().toISOString() })
                    .eq('token', token);
                
                setStatus('success');
            } else {
                setStatus('success');
            }

        } catch (err: any) {
            setError(err.message || "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    if (status === 'validating') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-news-gold mx-auto mb-4" />
                    <p className="text-white text-xs font-bold uppercase tracking-widest">Verifying Secure Link...</p>
                </div>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl p-8 max-w-md w-full text-center border border-red-500/50 shadow-2xl">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
                    <p className="text-gray-600 text-sm mb-6">{error}</p>
                    <button onClick={() => onNavigate('/')} className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider">
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="bg-white rounded-xl p-8 max-w-md w-full text-center border-t-4 border-news-gold shadow-2xl animate-in zoom-in-95">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Created</h2>
                    <p className="text-gray-600 text-sm mb-6">
                        Welcome to CJ NEWSHUB. Your account with role <b>{role}</b> is ready. 
                        Please verify your email if required, then sign in.
                    </p>
                    <button 
                        onClick={() => onNavigate('/login')} 
                        className="w-full bg-news-black text-white px-6 py-3 rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                        Proceed to Login <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-news-gold rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center p-4 bg-news-gold/10 rounded-full mb-4">
                        <Shield size={32} className="text-news-gold" />
                    </div>
                    <h1 className="text-2xl font-serif font-bold text-white mb-2">Staff Enrollment</h1>
                    <div className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-news-gold">
                            Invited as: {role}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg text-red-400 text-xs mb-6 flex items-start gap-2">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Full Legal Name</label>
                        <div className="relative">
                            <UserPlus className="absolute left-3 top-3.5 text-gray-500" size={16} />
                            <input 
                                type="text" 
                                required 
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-news-gold focus:ring-1 focus:ring-news-gold outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3.5 text-gray-500" size={16} />
                            <input 
                                type="email" 
                                required 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-news-gold focus:ring-1 focus:ring-news-gold outline-none transition-all"
                                placeholder="staff@cjnewshub.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Secure Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 text-gray-500" size={16} />
                            <input 
                                type="password" 
                                required 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-news-gold focus:ring-1 focus:ring-news-gold outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-news-gold text-black py-4 rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-colors mt-4 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : "Complete Registration"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default InviteRegistration;
