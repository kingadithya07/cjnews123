
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, ArrowRight, CheckCircle, AlertCircle, ShieldCheck, KeyRound, User, HelpCircle, RefreshCw, Copy } from 'lucide-react';
import { generateVerificationCode } from '../utils';

interface ResetPasswordProps {
    onNavigate: (path: string) => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
    const [step, setStep] = useState<'identify' | 'verify'>('identify');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [inputCode, setInputCode] = useState('');
    
    // The code generated during this session
    const [sessionCode, setSessionCode] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleGenerateCode = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            setError("Please enter your username first.");
            return;
        }
        
        setLoading(true);
        setError(null);

        // Simulate secure code generation handshake
        // In a real app with backend, this would check if the user exists first
        setTimeout(() => {
            const newCode = generateVerificationCode();
            setSessionCode(newCode);
            setLoading(false);
            setStep('verify');
        }, 1000);
    };

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
        if (inputCode !== sessionCode) {
            setError("Invalid verification code. Please try again.");
            return;
        }
        
        setLoading(true);
        setError(null);

        try {
            // Attempt to update the password in Supabase Real-time
            const { data, error } = await supabase.auth.updateUser({ 
                password: password 
            });

            if (error) {
                // Handle specific Supabase auth errors
                if (error.status === 401 || error.message.includes("session")) {
                    throw new Error("Security Restriction: You are not currently logged in. To reset a password without the old one, you must use an Email Magic Link or contact an Admin. (Client-side API limitation)");
                }
                throw error;
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to update password in database.");
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
                    <h2 className="text-3xl font-serif font-black text-gray-900">Secure Account Recovery</h2>
                    <div className="flex items-center justify-center gap-2 mt-3 text-news-accent font-bold text-[10px] uppercase tracking-[0.2em]">
                        <ShieldCheck size={14} /> Identity Verification
                    </div>
                </div>

                {success ? (
                    <div className="bg-green-50 text-green-700 p-8 rounded-2xl flex flex-col items-center gap-4 text-center border border-green-100">
                        <CheckCircle size={48} />
                        <div>
                            <p className="font-black uppercase tracking-widest text-xs mb-2">Success</p>
                            <p className="text-sm font-medium mb-4">Your password has been updated in the database.</p>
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
                            <form onSubmit={handleGenerateCode} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3.5 text-gray-400" size={16}/>
                                        <input 
                                            type="text" required value={username} onChange={e => setUsername(e.target.value)}
                                            className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                            placeholder="Enter your username"
                                            autoFocus
                                        />
                                    </div>
                                    <p className="mt-2 text-[10px] text-gray-400 leading-relaxed">
                                        Enter your registered username. We will generate a secure one-time verification code to prove your identity.
                                    </p>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="w-full py-4 bg-news-black text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] hover:bg-gray-800 disabled:opacity-30 shadow-xl transition-all flex items-center justify-center gap-3"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={18} /> : "Generate Verification Code"}
                                    {!loading && <ArrowRight size={18} />}
                                </button>
                            </form>
                        )}

                        {step === 'verify' && (
                            <form onSubmit={handleUpdatePassword} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                                
                                {/* SIMULATION BOX: SHOWING THE CODE */}
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center space-y-2 relative group">
                                     <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Simulated Secure Channel</span>
                                     <div className="text-3xl font-mono font-bold text-blue-900 tracking-[0.2em]">{sessionCode}</div>
                                     <p className="text-[10px] text-blue-600/70">
                                        (In production, this code would be sent via Email/SMS)
                                     </p>
                                     <button 
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(sessionCode || '')}
                                        className="absolute right-2 top-2 p-2 text-blue-300 hover:text-blue-600 transition-colors"
                                        title="Copy Code"
                                     >
                                         <Copy size={14} />
                                     </button>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Verification Code</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={inputCode} 
                                        onChange={e => setInputCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 8))}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all font-mono tracking-widest text-center text-lg"
                                        placeholder="00000000"
                                    />
                                </div>
                                
                                <div className="border-t border-gray-100 pt-5 mt-5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">New Secure Password</label>
                                        <input 
                                            type="password" required value={password} onChange={e => setPassword(e.target.value)}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Confirm Password</label>
                                        <input 
                                            type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                            placeholder="••••••••"
                                        />
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
                                        onClick={() => { setStep('identify'); setError(null); setSessionCode(null); }}
                                        className="text-[10px] font-bold text-gray-400 hover:text-news-black uppercase tracking-widest"
                                    >
                                        Start Over
                                    </button>
                                </div>
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
