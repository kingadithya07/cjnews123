
import React, { useState, useRef } from 'react';
import { 
  Article, EPaperPage, ArticleStatus, ClassifiedAd, Advertisement, 
  WatermarkSettings, TrustedDevice, ReporterProfile, AdSize, AdPlacement 
} from '../types';
import { 
  LayoutDashboard, FileText, Newspaper, Tags, Megaphone, Settings, Users, 
  Plus, Trash2, Edit, Save, X, Search, Filter, Upload, Image as ImageIcon, 
  Check, AlertCircle, Smartphone, Monitor, Globe, Shield, CreditCard, RotateCw, Download,
  MoreHorizontal, Eye, Printer, Share2, PenTool, Layout, Box, Activity, LogOut,
  ChevronDown, ChevronUp, MapPin, Mail, Phone, Calendar, Droplet, User as UserIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { generateId } from '../utils';
import { supabase } from '../supabaseClient';
import Link from '../components/Link';

interface EditorDashboardProps {
  articles: Article[];
  ePaperPages: EPaperPage[];
  categories: string[];
  tags: string[];
  adCategories: string[];
  classifieds: ClassifiedAd[];
  advertisements: Advertisement[];
  globalAdsEnabled: boolean;
  watermarkSettings: WatermarkSettings;
  onToggleGlobalAds: (enabled: boolean) => void;
  onUpdateWatermarkSettings: (settings: WatermarkSettings) => void;
  onUpdatePage: (page: EPaperPage) => void;
  onAddPage: (page: EPaperPage) => void;
  onDeletePage: (id: string) => void;
  onDeleteArticle: (id: string) => void;
  onSaveArticle: (article: Article) => void;
  onAddCategory: (cat: string) => void;
  onDeleteCategory: (cat: string) => void;
  onAddTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
  onAddAdCategory: (cat: string) => void;
  onDeleteAdCategory: (cat: string) => void;
  onSaveTaxonomy: () => void;
  onAddClassified: (ad: any) => void;
  onDeleteClassified: (id: string) => void;
  onAddAdvertisement: (ad: Advertisement) => void;
  onUpdateAdvertisement: (ad: Advertisement) => void;
  onDeleteAdvertisement: (id: string) => void;
  onNavigate: (path: string) => void;
  userAvatar?: string | null;
  userName?: string | null;
  devices: TrustedDevice[];
  onApproveDevice: (id: string) => void;
  onRejectDevice: (id: string) => void;
  onRevokeDevice: (id: string) => void;
  userId: string | null;
  activeVisitors?: number;
  reporters: ReporterProfile[];
  onSaveReporter: (reporter: ReporterProfile) => void;
  onDeleteReporter: (id: string) => void;
}

const EditorDashboard: React.FC<EditorDashboardProps> = ({
  articles, ePaperPages, categories, tags, adCategories, classifieds, advertisements,
  globalAdsEnabled, watermarkSettings, onToggleGlobalAds, onUpdateWatermarkSettings,
  onUpdatePage, onAddPage, onDeletePage, onDeleteArticle, onSaveArticle,
  onAddCategory, onDeleteCategory, onAddTag, onDeleteTag, onAddAdCategory, onDeleteAdCategory,
  onSaveTaxonomy, onAddClassified, onDeleteClassified, onAddAdvertisement, onUpdateAdvertisement,
  onDeleteAdvertisement, onNavigate, userAvatar, userName, devices, onApproveDevice, onRejectDevice,
  onRevokeDevice, userId, activeVisitors, reporters, onSaveReporter, onDeleteReporter
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Reporter State
  const [activeReporter, setActiveReporter] = useState<ReporterProfile | null>(null);
  const [showIdCard, setShowIdCard] = useState(false);
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');
  
  const cardDisclaimer = "This card is the property of CJ NEWSHUB. If found, please return to the nearest bureau office. Misuse of this identification is a punishable offense.";

  const handleOpenIdCard = (reporter: ReporterProfile) => {
    setActiveReporter(reporter);
    setShowIdCard(true);
  };

  const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
    <button 
        onClick={() => setActiveTab(id)}
        className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${activeTab === id ? 'text-white border-l-4 border-news-gold bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'}`}
    >
        <Icon size={18} />
        <span className="text-xs font-bold uppercase tracking-widest hidden md:inline">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-20 md:w-64 bg-[#111] flex flex-col border-r border-gray-800 shrink-0">
         <div className="p-6 flex items-center gap-3 border-b border-gray-800 h-20">
             <LayoutDashboard className="text-news-gold" size={24} />
             <span className="font-serif font-bold text-xl hidden md:block">Newsroom</span>
         </div>
         <div className="flex-1 overflow-y-auto py-4">
             <SidebarItem id="overview" label="Overview" icon={Activity} />
             <SidebarItem id="articles" label="Articles" icon={FileText} />
             <SidebarItem id="epaper" label="E-Paper" icon={Newspaper} />
             <SidebarItem id="reporters" label="Staff ID" icon={Users} />
             <SidebarItem id="ads" label="Advertising" icon={Megaphone} />
             <SidebarItem id="settings" label="Settings" icon={Settings} />
         </div>
         <div className="p-4 border-t border-gray-800">
             <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white w-full px-4 py-3 justify-center md:justify-start">
                 <Globe size={18} /> <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">Live Site</span>
             </button>
             <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-red-500 hover:text-red-400 w-full px-4 py-3 justify-center md:justify-start">
                 <LogOut size={18} /> <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">Logout</span>
             </button>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 text-gray-900">
        
        {/* Top Bar */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
             <h2 className="text-xl font-bold uppercase tracking-tight text-gray-800">{activeTab}</h2>
             <div className="flex items-center gap-4">
                 {activeVisitors !== undefined && (
                     <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 animate-pulse">
                         <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                         {activeVisitors} Readers Online
                     </div>
                 )}
                 <div className="flex items-center gap-3 pl-6 border-l border-gray-100">
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                          {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover"/> : <UserIcon className="p-1.5 w-full h-full text-gray-400"/>}
                      </div>
                      <div className="hidden md:block">
                          <p className="text-sm font-bold text-gray-900 leading-none">{userName}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Editor in Chief</p>
                      </div>
                 </div>
             </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><FileText size={24}/></div>
                            <span className="text-xs font-bold text-gray-400 uppercase">Total</span>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900">{articles.length}</h3>
                        <p className="text-sm text-gray-500">Articles Published</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                         <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-green-50 text-green-600 rounded-lg"><Users size={24}/></div>
                            <span className="text-xs font-bold text-gray-400 uppercase">Staff</span>
                        </div>
                        <h3 className="text-3xl font-black text-gray-900">{reporters.length}</h3>
                        <p className="text-sm text-gray-500">Active Reporters</p>
                    </div>
                </div>
            )}

            {activeTab === 'articles' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase text-gray-500">
                            <tr>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Author</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {articles.map(article => (
                                <tr key={article.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900 text-sm line-clamp-1">{article.title}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{article.author}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 
                                            article.status === ArticleStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                        }`}>{article.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(article.publishedAt), 'MMM d, yyyy')}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => onDeleteArticle(article.id)} className="text-red-500 hover:text-red-700 p-2"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'reporters' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-900">Staff Management</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reporters.map(reporter => (
                            <div key={reporter.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-6 flex items-start gap-4">
                                    <img src={reporter.photoUrl} className="w-16 h-16 rounded-full object-cover bg-gray-100" />
                                    <div>
                                        <h3 className="font-bold text-gray-900">{reporter.fullName}</h3>
                                        <p className="text-xs text-news-gold font-bold uppercase tracking-wider">{reporter.role}</p>
                                        <p className="text-xs text-gray-500 mt-1">{reporter.department}</p>
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-between items-center mt-auto">
                                    <div className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${reporter.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {reporter.status}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleOpenIdCard(reporter)} className="p-2 text-blue-600 hover:bg-blue-50 rounded" title="View ID Card"><CreditCard size={16}/></button>
                                        <button onClick={() => onDeleteReporter(reporter.id)} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Delete"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Placeholder for other tabs */}
            {(activeTab !== 'overview' && activeTab !== 'articles' && activeTab !== 'reporters') && (
                <div className="flex items-center justify-center h-full text-gray-400">
                    <p className="uppercase tracking-widest font-bold text-sm">Module {activeTab} coming soon</p>
                </div>
            )}
        </main>

        {/* --- ID CARD MODAL --- */}
        {showIdCard && activeReporter && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row h-[600px] animate-in zoom-in-95">
                    {/* Controls Sidebar */}
                    <div className="w-full md:w-80 bg-gray-50 border-r border-gray-200 p-8 flex flex-col">
                        <h3 className="font-serif font-bold text-xl mb-6">ID Card Studio</h3>
                        
                        <div className="space-y-4 flex-1">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Card Face</label>
                                <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                                    <button 
                                        onClick={() => setCardSide('front')} 
                                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${cardSide === 'front' ? 'bg-news-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        Front
                                    </button>
                                    <button 
                                        onClick={() => setCardSide('back')} 
                                        className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${cardSide === 'back' ? 'bg-news-black text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        Back
                                    </button>
                                </div>
                            </div>

                            <div className="p-4 bg-white rounded-lg border border-gray-200 mt-4">
                                <h4 className="font-bold text-sm mb-2">{activeReporter.fullName}</h4>
                                <div className="space-y-2 text-xs text-gray-500">
                                    <div className="flex justify-between"><span>Role:</span> <span className="font-medium text-gray-900">{activeReporter.role}</span></div>
                                    <div className="flex justify-between"><span>Dept:</span> <span className="font-medium text-gray-900">{activeReporter.department}</span></div>
                                    <div className="flex justify-between"><span>Status:</span> <span className={`font-bold uppercase ${activeReporter.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>{activeReporter.status}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto space-y-3">
                             <button className="w-full py-3 bg-news-gold text-black rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-yellow-500 transition-colors flex items-center justify-center gap-2">
                                 <Download size={16} /> Download {cardSide === 'front' ? 'Front' : 'Back'}
                             </button>
                             <button onClick={() => setShowIdCard(false)} className="w-full py-3 bg-gray-200 text-gray-600 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-gray-300 transition-colors">
                                 Close
                             </button>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 bg-gray-200 p-8 flex items-center justify-center overflow-auto relative">
                        <div className="bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] absolute inset-0 opacity-10 pointer-events-none"></div>
                        
                        {/* THE CARD */}
                        <div className="w-[350px] h-[550px] bg-white rounded-xl shadow-2xl relative overflow-hidden flex flex-col shrink-0 transition-all duration-500 transform hover:scale-[1.02]">
                            {cardSide === 'front' ? (
                                // FRONT SIDE
                                <>
                                   {/* Header */}
                                   <div className="h-32 bg-[#0a0a0a] relative overflow-hidden">
                                       <div className="absolute top-0 right-0 w-32 h-32 bg-news-gold rounded-full blur-[50px] opacity-20 transform translate-x-10 -translate-y-10"></div>
                                       <div className="relative z-10 flex flex-col items-center justify-center h-full pt-4">
                                           <h1 className="text-white font-serif text-3xl font-black uppercase italic tracking-tighter">CJ <span className="not-italic text-white">NEWSHUB</span></h1>
                                           <p className="text-news-gold text-[8px] font-bold uppercase tracking-[0.4em] mt-1">Global Press Pass</p>
                                       </div>
                                   </div>

                                   {/* Photo Area */}
                                   <div className="relative -mt-10 mb-4 flex justify-center">
                                       <div className="w-32 h-32 rounded-full p-1.5 bg-white shadow-lg z-10">
                                            <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 border border-gray-100">
                                                <img src={activeReporter.photoUrl} className="w-full h-full object-cover" />
                                            </div>
                                       </div>
                                       {activeReporter.status === 'active' && (
                                           <div className="absolute bottom-1 right-1/2 translate-x-12 z-20 bg-green-500 text-white p-1 rounded-full border-4 border-white">
                                               <Check size={14} strokeWidth={4} />
                                           </div>
                                       )}
                                   </div>

                                   {/* Content */}
                                   <div className="flex-1 flex flex-col items-center px-6 text-center">
                                       <h2 className="text-2xl font-black text-gray-900 uppercase leading-none mb-1">{activeReporter.fullName}</h2>
                                       <div className="bg-news-gold/10 text-news-black text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
                                           {activeReporter.role}
                                       </div>

                                       <div className="w-full grid grid-cols-2 gap-y-4 text-left border-t border-gray-100 pt-4">
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Bureau</p>
                                                <p className="text-xs font-bold text-gray-800">{activeReporter.department}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">ID Number</p>
                                                <p className="text-xs font-bold text-gray-800 font-mono">{activeReporter.idNumber}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Blood Group</p>
                                                <p className="text-xs font-bold text-gray-800">{activeReporter.bloodGroup || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Expires</p>
                                                <p className="text-xs font-bold text-red-600">{format(new Date(activeReporter.validUntil), 'MM/yy')}</p>
                                            </div>
                                       </div>
                                   </div>

                                   {/* Footer Bar Code Placeholder */}
                                   <div className="h-12 bg-gray-50 border-t border-gray-100 flex items-center justify-between px-6">
                                       <div className="h-6 w-24 bg-gray-800 mask-barcode"></div> 
                                       {/* Simulated Barcode Visual */}
                                       <div className="flex gap-0.5 h-4 opacity-50">
                                           {[...Array(20)].map((_,i) => <div key={i} className={`w-[2px] bg-black ${i%2===0?'h-full':'h-2'}`}></div>)}
                                       </div>
                                       <span className="text-[8px] font-mono text-gray-400">{activeReporter.idNumber}</span>
                                   </div>
                                </>
                            ) : (
                                // BACK SIDE
                                <div className="w-full h-full p-8 flex flex-col bg-white text-left relative">
                                    <div className="mb-6">
                                        <h3 className="text-xs font-bold text-red-600 uppercase mb-2">OFFICE ADDRESS:</h3>
                                        <p className="text-xs font-medium text-gray-800 uppercase leading-relaxed max-w-[80%]">
                                            {activeReporter.officeAddress || activeReporter.location || 'SUJATHA NAGAR, VISAKHAPATNAM, ANDHRA PRADESH -530051.'}
                                        </p>
                                    </div>

                                    <div className="mb-8 flex-1">
                                        <h3 className="text-xs font-bold text-red-600 uppercase mb-2">Disclaimer:</h3>
                                        <p className="text-[10px] text-gray-600 leading-relaxed text-justify">
                                            {cardDisclaimer}
                                        </p>
                                    </div>

                                    <div className="mt-auto flex justify-end items-end">
                                         <div className="relative">
                                             {/* Signature and Stamp Container */}
                                             <div className="relative w-64 h-32 mb-1 flex items-end justify-center">
                                                 {/* Stamp Layer */}
                                                 {activeReporter.stampUrl ? (
                                                     <div className="absolute top-0 left-0 w-28 h-28 opacity-85 transform -rotate-12 mix-blend-multiply z-0 pointer-events-none">
                                                         <img src={activeReporter.stampUrl} className="w-full h-full object-contain" alt="Stamp" />
                                                     </div>
                                                 ) : (
                                                     <div className="absolute top-2 left-4 w-24 h-24 border-4 border-red-200 rounded-full flex items-center justify-center transform -rotate-12 opacity-40 z-0 pointer-events-none">
                                                         <span className="text-[8px] font-bold text-red-300 text-center uppercase">Official<br/>Stamp</span>
                                                     </div>
                                                 )}

                                                 {/* Signature Layer */}
                                                 {activeReporter.signatureUrl && (
                                                     <img 
                                                         src={activeReporter.signatureUrl} 
                                                         className="w-full h-full object-contain object-bottom mix-blend-multiply z-10 relative"
                                                         alt="Authorized Signature" 
                                                     />
                                                 )}
                                             </div>
                                             
                                             {/* Line and Label */}
                                             <div className="w-64 border-b-2 border-black mb-1"></div>
                                             <h3 className="text-sm font-bold text-black uppercase tracking-widest text-right">AUTHORIZED BY</h3>
                                         </div>
                                    </div>
                                    
                                    <div className="absolute bottom-4 left-4">
                                        <div className="w-16 h-16 bg-gray-100 p-1">
                                            {/* QR Code Placeholder */}
                                            <div className="w-full h-full border-2 border-black flex items-center justify-center">
                                                <div className="w-8 h-8 bg-black"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default EditorDashboard;
