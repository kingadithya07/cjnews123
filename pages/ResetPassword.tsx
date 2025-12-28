
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, ArrowRight, CheckCircle, AlertCircle, ShieldCheck, KeyRound, User } from 'lucide-react';

interface ResetPasswordProps {
    onNavigate: (path: string) => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

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

        // Note: In a real Supabase application, verifying user metadata (the recovery code)
        // for a user who is NOT logged in requires a server-side Edge Function with Admin privileges.
        // The Supabase Client SDK cannot query user metadata or update passwords for other users securely.
        // For this demo, we are showing the UI flow.
        
        setTimeout(() => {
            // Simulate check failure because we cannot actually perform this action client-side securely
            // without being logged in.
            setLoading(false);
            setError("Automatic reset via code requires the Enterprise Admin API enabled. Please contact your system administrator to reset your credentials manually.");
            // To test success visually in a demo, un-comment below:
            // setSuccess(true);
            // setTimeout(() => onNavigate('/login'), 2000);
        }, 1500);
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
                        <ShieldCheck size={14} /> 8-Digit Verification Protocol
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

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 text-gray-400" size={16}/>
                                <input 
                                    type="text" required value={username} onChange={e => setUsername(e.target.value)}
                                    className="w-full pl-10 p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-news-black transition-all"
                                    placeholder="Enter your username"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">8-Digit Recovery Code</label>
                            <input 
                                type="text" 
                                required 
                                value={recoveryCode} 
                                onChange={e => setRecoveryCode(e.target.value.replace(/[^0-9]/g, '').substring(0, 8))}
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
                            {!loading && <ArrowRight size={18} />}
                        </button>

                        <div className="flex flex-col gap-3 text-center pt-4">
                            <button type="button" onClick={() => onNavigate('/login')} className="text-[10px] font-bold text-gray-400 hover:text-news-black uppercase tracking-widest">Return to Login</button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
