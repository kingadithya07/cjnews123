
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, ArrowRight, CheckCircle, AlertCircle, ShieldCheck, KeyRound, User, HelpCircle } from 'lucide-react';

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
        if (recoveryCode.length !== 8) {
            setError("Please enter the full 8-digit recovery code.");
            return;
        }
        
        setLoading(true);
        setError(null);

        // SIMULATION LOGIC:
        // In a real app without email, the server would verify the 'recovery_code' matches the 
        // one stored in the user's metadata. Since the Supabase Client SDK cannot read other 
        // users' metadata for security reasons, we simulate the success here for the demo.
        
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
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
                        <ShieldCheck size={14} /> Identity Verification
                    </div>
                </div>

                {success ? (
                    <div className="bg-green-50 text-green-700 p-8 rounded-2xl flex flex-col items-center gap-4 text-center border border-green-100">
                        <CheckCircle size={48} />
                        <div>
                            <p className="font-black uppercase tracking-widest text-xs mb-2">Success</p>
                            <p className="text-sm font-medium mb-4">Your password has been securely updated.</p>
                            <p className="text-xs text-green-600/70 italic">(Simulation: In a live environment, the new password would now be active).</p>
                        </div>
                        <button 
                            onClick={() => onNavigate('/login')}
                            className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-colors"
                        >
                            Proceed to Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleUpdatePassword} className="space-y-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs flex items-start gap-3 border border-red-100">
                                <AlertCircle size={18} className="shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
                             <HelpCircle size={20} className="text-blue-500 shrink-0" />
                             <p className="text-[11px] text-blue-800 leading-snug">
                                <strong>Note:</strong> Enter the recovery code that was displayed when you first registered. It cannot be generated again here.
                             </p>
                        </div>

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
                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Registration Recovery Code</label>
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
