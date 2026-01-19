import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { TrustedDevice } from '../types';
import { getDeviceId } from '../utils';

interface ResetPasswordProps {
  onNavigate: (path: string) => void;
  devices?: TrustedDevice[];
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate, devices = [] }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Helper to ensure the current device is trusted after a password reset (security best practice)
  const promoteCurrentDevice = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const currentId = getDeviceId();
    const userId = session.user.id;
    
    // Check if device exists in list
    const existing = devices.find(d => d.id === currentId && d.userId === userId);
    
    if (existing) {
        // If it exists but is pending, verify it
        if (existing.status !== 'approved') {
            await supabase.from('trusted_devices').update({ status: 'approved' }).eq('id', currentId);
        }
    } else {
        // If it doesn't exist (new device performing recovery), add it as trusted
        await supabase.from('trusted_devices').insert({
            id: currentId,
            user_id: userId,
            device_name: 'Recovery Device',
            device_type: 'desktop', // fallback
            location: 'Unknown',
            status: 'approved',
            is_primary: true, // Promote to primary since they have the password
            last_active: new Date().toISOString()
        });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
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
      await promoteCurrentDevice();
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-news-paper flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center border-t-4 border-green-500">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
             <CheckCircle size={32} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Password Updated</h2>
          <p className="text-gray-600 text-sm mb-6">Your account is secure. You can now sign in with your new credentials.</p>
          <button onClick={() => onNavigate('/login')} className="w-full bg-news-black text-white py-3 rounded-lg font-bold uppercase tracking-widest text-xs">
             Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-news-paper flex items-center justify-center p-4">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
           <h1 className="text-2xl font-serif font-black text-gray-900 mb-2 uppercase tracking-tight">Set New Password</h1>
           <p className="text-gray-500 text-sm">Create a strong password to secure your station.</p>
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs mb-6 flex items-start gap-2 border border-red-100">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
            </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-5">
           <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={18}/>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="New Password"
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-news-black transition-all"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-black">
                 {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
              </button>
           </div>
           <div className="relative">
              <Lock className="absolute left-3 top-3.5 text-gray-400" size={18}/>
              <input 
                type={showPassword ? "text" : "password"} 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-news-black transition-all"
                required
                minLength={6}
              />
           </div>
           <button 
             type="submit" 
             disabled={loading}
             className="w-full bg-news-gold text-black py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-news-black hover:text-white transition-all shadow-lg flex items-center justify-center gap-2"
           >
             {loading ? <Loader2 className="animate-spin" size={18}/> : "Update Password"}
           </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;