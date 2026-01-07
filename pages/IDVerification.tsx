
import React, { useEffect, useState } from 'react';
import { ReporterProfile } from '../types';
import { ShieldCheck, AlertTriangle, User, Calendar, MapPin, Phone, Droplet, Mail, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface IDVerificationProps {
  reporters: ReporterProfile[];
  reporterId: string;
  onNavigate: (path: string) => void;
}

const IDVerification: React.FC<IDVerificationProps> = ({ reporters, reporterId, onNavigate }) => {
  const [profile, setProfile] = useState<ReporterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API lookup delay for dramatic effect
    setTimeout(() => {
        const found = reporters.find(r => r.id === reporterId);
        setProfile(found || null);
        setLoading(false);
    }, 800);
  }, [reporterId, reporters]);

  if (loading) {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-news-gold mb-4"></div>
              <p className="text-news-black font-bold uppercase tracking-widest text-xs">Verifying Digital Signature...</p>
          </div>
      );
  }

  if (!profile) {
      return (
          <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-red-100 p-6 rounded-full mb-6 text-red-600">
                  <AlertTriangle size={48} />
              </div>
              <h1 className="text-2xl font-serif font-black text-red-900 mb-2">Invalid or Expired ID</h1>
              <p className="text-red-700 text-sm mb-8">The digital identity token you scanned does not match any active reporter record in our system.</p>
              <button onClick={() => onNavigate('/')} className="bg-news-black text-white px-6 py-3 rounded-lg font-bold uppercase tracking-widest text-xs">
                  Return to Newsroom
              </button>
          </div>
      );
  }

  const isValid = profile.status === 'active' && new Date(profile.validUntil) > new Date();

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 relative">
            
            {/* Status Banner */}
            <div className={`py-4 text-center text-white font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2 ${isValid ? 'bg-green-600' : 'bg-red-600'}`}>
                {isValid ? <><ShieldCheck size={16} /> Identity Verified</> : <><AlertTriangle size={16} /> Credentials Suspended</>}
            </div>

            <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h2 className="font-serif text-2xl font-black text-news-blue uppercase tracking-tighter">CJ <span className="text-news-gold">NEWSHUB</span></h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.4em] mt-1">Official Press Accreditation</p>
                </div>

                {/* Profile Photo */}
                <div className="flex justify-center mb-8 relative">
                    <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-br from-news-gold to-news-blue shadow-xl">
                        <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-gray-200">
                            <img src={profile.photoUrl || 'https://placehold.co/400?text=NO+IMG'} className="w-full h-full object-cover" alt="Profile" />
                        </div>
                    </div>
                    {isValid && (
                        <div className="absolute bottom-0 right-1/2 translate-x-12 bg-blue-500 text-white p-1.5 rounded-full border-4 border-white" title="Verified">
                            <CheckCircle size={16} strokeWidth={3} />
                        </div>
                    )}
                </div>

                {/* Main Info */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{profile.fullName}</h1>
                    <p className="text-news-gold font-bold uppercase text-xs tracking-wider">{profile.role}</p>
                    <div className="mt-2 inline-block px-3 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-500 uppercase">
                        {profile.department} Bureau
                    </div>
                </div>

                {/* Details Grid */}
                <div className="space-y-4 border-t border-gray-100 pt-6">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-gray-400 shrink-0"><User size={16}/></div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Employee ID</p>
                            <p className="text-sm font-bold text-gray-800 font-mono">{profile.idNumber}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-gray-400 shrink-0"><MapPin size={16}/></div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base Location</p>
                            <p className="text-sm font-bold text-gray-800">{profile.location}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-gray-400 shrink-0"><Calendar size={16}/></div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Valid Until</p>
                            <p className="text-sm font-bold text-gray-800">{format(new Date(profile.validUntil), 'MMMM d, yyyy')}</p>
                        </div>
                    </div>

                    {(profile.phone || profile.email) && (
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-gray-400 shrink-0"><Phone size={16}/></div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact</p>
                                <p className="text-sm font-bold text-gray-800">{profile.phone || profile.email}</p>
                            </div>
                        </div>
                    )}
                    
                    {profile.bloodGroup && (
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center text-gray-400 shrink-0"><Droplet size={16}/></div>
                            <div className="flex-1">
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Blood Group</p>
                                <p className="text-sm font-bold text-gray-800">{profile.bloodGroup}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-6 text-center border-t border-gray-200">
                <p className="text-[9px] text-gray-400 leading-relaxed max-w-xs mx-auto">
                    This digital ID card is the property of CJ NEWSHUB. If found, please return to the nearest bureau or contact support. 
                    <br/><br/>
                    Verified via Blockchain Security Protocol.
                </p>
            </div>
        </div>
    </div>
  );
};

export default IDVerification;
