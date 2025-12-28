
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, ArrowRight, CheckCircle, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';

interface ResetPasswordProps {
    onNavigate: (path: string) => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const [useOtp, setUseOtp] = useState(false);

    useEffect(() => {
        // Explicitly check session for recovery (crucial for mobile links)
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                setHasSession(true);
            } else if (!useOtp) {
                // If no session and not using OTP, try a small delay as mobile browsers
                // sometimes take a moment to finalize the internal Supabase session from the link
                setTimeout(async () => {
                    const { data: { secondSession } } = await (supabase.auth as any).getSession();
                    if (secondSession) setHasSession(true);
                }, 1000);
            }
        };
        checkSession();
    }, [useOtp]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            if (useOtp) {
                // Verify with OTP first if manual code entry is used
                const { error: otpError } = await supabase.auth.verifyOtp({
                    email,
                    token: otpCode,
                    type: 'recovery'
                });
                if (otpError) throw otpError;
            }

            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            
            setSuccess(true);
            setTimeout(() => onNavigate('/login'), 2000);
        } catch (err: any) {
            setError(err.message || "Failed to update password. Link may have expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4 bg-news-paper">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-news-gold/10 text-news-gold rounded-full mb-6">
                        {useOtp ? <KeyRound size={32} /> : <Lock size={32} />}
                    </div>
                    <h2 className="text-3xl font-serif font-black text-gray-900">Finalize Reset</h2>
                    <div className="flex items-center justify-center gap-2 mt-3 text-news-accent font-bold text-[10px] uppercase tracking-[0.2em]">
                        <ShieldCheck size={14} /> Security Protocol Active
                    </div>
                </div>

                {success ? (
                    <div className="bg-green-50 text-green-700 p-8 rounded-2xl flex flex-col items-center gap-4 text-center">
                        <CheckCircle size={48} />
                        <div>
                            <p className="font-black uppercase tracking-widest text-xs mb-2">Password Updated</p>
                            <p className="text-sm font-medium">Your credentials have been secured. Redirecting to login...</p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleUpdatePassword} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs flex items-start gap-3 border border-red-100">
                                <AlertCircle size={18} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {useOtp && (
                            <>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Staff Email</label>
                                    <input 
                                        type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                        placeholder="Enter your email"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Verification Code</label>
                                    <input 
                                        type="text" required value={otpCode} onChange={e => setOtpCode(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                        placeholder="6-digit code"
                                    />
                                </div>
                            </>
                        )}
                        
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Secure Password</label>
                            <input 
                                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                            <input 
                                type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading || (!hasSession && !useOtp)}
                            className="w-full py-4 bg-news-black text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 disabled:opacity-30 shadow-xl transition-all flex items-center justify-center gap-3"
                        >
                            {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Apply New Password"}
                            {!loading && <ArrowRight size={18} />}
                        </button>

                        {!hasSession && !useOtp && !loading && (
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-[10px] text-yellow-800 font-medium">
                                Link session not detected. If the auto-link didn't work, try entering your verification code manually below.
                            </div>
                        )}

                        <div className="flex flex-col gap-3 text-center pt-4">
                            <button 
                                type="button" 
                                onClick={() => setUseOtp(!useOtp)} 
                                className="text-[10px] font-black text-news-accent hover:underline uppercase tracking-widest"
                            >
                                {useOtp ? "Use Email Link Instead" : "Enter Verification Code Manually"}
                            </button>
                            <button type="button" onClick={() => onNavigate('/login')} className="text-[10px] font-bold text-gray-400 hover:text-news-black uppercase tracking-widest">Return to Login</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
