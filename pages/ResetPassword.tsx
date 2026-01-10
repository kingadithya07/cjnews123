
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, ArrowRight, CheckCircle, AlertCircle, ShieldCheck, KeyRound, Mail, RefreshCw, Smartphone, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { TrustedDevice } from '../types';
import { getDeviceId } from '../utils';

interface ResetPasswordProps {
    onNavigate: (path: string) => void;
    devices?: TrustedDevice[];
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate, devices = [] }) => {
    const [step, setStep] = useState<'identify' | 'verify' | 'reset'>('identify');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [inputCode, setInputCode] = useState('');
    
    // Visibility Toggles
    const [showPass, setShowPass] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    
    // Check device trust on mount
    useEffect(() => {
        const checkSession = async () => {
             const { data: { session } } = await supabase.auth.getSession();
             if (session) {
                 // If already logged in via magic link, skip check
                 setStep('reset');
                 setEmail(session.user.email || '');
             }
        };
        checkSession();
    }, []);

    const handleSendResetCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes('@')) {
            setError("Please enter a valid email address.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            // Trigger Supabase to send a recovery email
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/#/reset-password`
            });
            if (error) throw error;
            
            setStep('verify');
        } catch (err: any) {
            setError(err.message || "Failed to send verification code.");
        } finally {
            setLoading(false);
        }
    };

    // Scenario A: Manual OTP Entry
    const handleVerifyAndUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (inputCode.length < 6) {
            setError("Please enter the complete verification code.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            // 1. Verify the OTP
            const { error: verifyError } = await supabase.auth.verifyOtp({
                email,
                token: inputCode,
                type: 'recovery'
            });

            if (verifyError) throw verifyError;

            // 2. Update Password
            const { error: updateError } = await supabase.auth.updateUser({ 
                password: password 
            });

            if (updateError) throw updateError;

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Invalid code or expired session.");
        } finally {
            setLoading(false);
        }
    };

    // Scenario B: Magic Link (Already Authenticated)
    const handleDirectUpdate = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to update password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4 bg-news-paper">
            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border border-gray-100 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-news-gold/10 text-news-gold rounded-full mb-6">
                        <KeyRound size={32} />
                    </div>
                    <h2 className="text-3xl font-serif font-black text-gray-900">Account Recovery</h2>
                    <div className="flex items-center justify-center gap-2 mt-3 text-news-accent font-bold text-[10px] uppercase tracking-[0.2em]">
                        <ShieldCheck size={14} /> Identity Verification
                    </div>
                </div>

                {success ? (
                    <div className="bg-green-50 text-green-700 p-8 rounded-2xl flex flex-col items-center gap-4 text-center border border-green-100">
                        <CheckCircle size={48} />
                        <div>
                            <p className="font-black uppercase tracking-widest text-xs mb-2">Success</p>
                            <p className="text-sm font-medium mb-4">Your password has been updated.</p>
                        </div>
                        <button 
                            onClick={() => onNavigate('/login')}
                            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-colors"
                        >
                            Proceed to Login
                        </button>
                    </div>
                ) : (
                    <>
                         {error && (
                            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-xs flex items-start gap-3 border border-red-100 animate-in slide-in-from-top-2">
                                <AlertCircle size={18} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {step === 'identify' && (
                            <form onSubmit={handleSendResetCode} className="space-y-6 animate-in fade-in">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 text-gray-400" size={16}/>
                                        <input 
                                            type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                            className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                            placeholder="you@example.com"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="mt-2 text-[10px] text-gray-400 leading-relaxed">
                                        Enter your registered email address. Verification will be sent to your <b>Primary Account</b>.
                                    </p>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-4 bg-news-black text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 disabled:opacity-30 shadow-xl transition-all flex items-center justify-center gap-3"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={18} /> : "Send Verification to Primary"}
                                    {!loading && <ArrowRight size={18} />}
                                </button>
                                
                                <div className="text-center pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setStep('verify')}
                                        className="text-[10px] font-bold text-gray-400 hover:text-news-black uppercase tracking-widest"
                                    >
                                        I have a code
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 'verify' && (
                            <form onSubmit={handleVerifyAndUpdate} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                                
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
                                     <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-1"><Mail size={16} /></div>
                                     <div>
                                        <p className="text-xs text-blue-900 font-bold mb-1">Check Primary Account</p>
                                        <p className="text-[10px] text-blue-700 leading-relaxed">
                                            We've sent a 6-digit verification code to <b>{email}</b>. Approval from the primary account is required to reset on this device.
                                        </p>
                                     </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Verification Code (OTP)</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={inputCode} 
                                        onChange={e => setInputCode(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all font-mono tracking-widest text-center text-lg"
                                        placeholder="000000"
                                    />
                                </div>
                                
                                <div className="border-t border-gray-100 pt-5 mt-5">
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Secure Password</label>
                                        <input 
                                            type={showPass ? "text" : "password"} 
                                            required value={password} onChange={e => setPassword(e.target.value)}
                                            className="w-full p-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                                            {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                                        </button>
                                    </div>
                                    <div className="mt-4 relative">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                                        <input 
                                            type={showConfirm ? "text" : "password"} 
                                            required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full p-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                                            {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                                        </button>
                                    </div>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-4 bg-news-black text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 disabled:opacity-30 shadow-xl transition-all flex items-center justify-center gap-3"
                                >
                                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Reset Credentials"}
                                    {!loading && <CheckCircle size={18} />}
                                </button>
                                
                                <div className="text-center pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => { setStep('identify'); setError(null); }}
                                        className="text-[10px] font-bold text-gray-400 hover:text-news-black uppercase tracking-widest"
                                    >
                                        Change Email
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 'reset' && (
                             <form onSubmit={handleDirectUpdate} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3 items-start">
                                     <div className="bg-green-100 p-2 rounded-full text-green-600 mt-1"><ShieldCheck size={16} /></div>
                                     <div>
                                        <p className="text-xs text-green-900 font-bold mb-1">Identity Verified</p>
                                        <p className="text-[10px] text-green-700 leading-relaxed">
                                            You are securely authenticated via the recovery link. Please set your new password below.
                                        </p>
                                     </div>
                                </div>

                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Secure Password</label>
                                    <input 
                                        type={showPass ? "text" : "password"}
                                        required value={password} onChange={e => setPassword(e.target.value)}
                                        className="w-full p-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                                        {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                                <div className="mt-4 relative">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                                    <input 
                                        type={showConfirm ? "text" : "password"}
                                        required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full p-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                        placeholder="••••••••"
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                                        {showConfirm ? <EyeOff size={18}/> : <Eye size={18}/>}
                                    </button>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-4 bg-news-black text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 disabled:opacity-30 shadow-xl transition-all flex items-center justify-center gap-3"
                                >
                                    {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : "Update Password"}
                                    {!loading && <CheckCircle size={18} />}
                                </button>
                            </form>
                        )}

                        <div className="flex flex-col gap-3 text-center pt-8 border-t border-gray-100 mt-8">
                            <button type="button" onClick={() => onNavigate('/login')} className="text-[10px] font-bold text-gray-400 hover:text-news-black uppercase tracking-widest">Return to Login</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
