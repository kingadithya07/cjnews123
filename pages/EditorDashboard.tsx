import React, { useState, useEffect } from 'react';
import { Article, EPaperPage, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, ReporterProfile, ArticleStatus, UserRole, AdSize, AdPlacement } from '../types';
import { 
  LayoutDashboard, FileText, Newspaper, Megaphone, Users, Settings, 
  Plus, Search, Filter, Edit, Trash2, Save, X, Upload, 
  User as UserIcon, CheckCircle, AlertCircle, Clock, Globe, LogOut, 
  Menu, Shield, Check, Image as ImageIcon, Link as LinkIcon, 
  Layout, Type, Palette, Printer, Repeat, Camera, PenTool, 
  Stamp, Briefcase, DollarSign, MapPin, Tag, Eye, BarChart3,
  Monitor, Smartphone, Tablet, ShieldCheck, Key, RefreshCcw
} from 'lucide-react';
import { generateId } from '../utils';
import ImageGalleryModal from '../components/ImageGalleryModal';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { format } from 'date-fns';
import { supabase } from '../supabaseClient';
import CategorySelector from '../components/CategorySelector';

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
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onAddTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
  onAddAdCategory: (category: string) => void;
  onDeleteAdCategory: (category: string) => void;
  onSaveTaxonomy: () => void;
  onAddClassified: (ad: ClassifiedAd) => void;
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
  userId?: string | null;
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
    onDeleteAdvertisement, onNavigate, userAvatar, userName, devices, onApproveDevice, 
    onRejectDevice, onRevokeDevice, userId, activeVisitors, reporters, onSaveReporter, onDeleteReporter 
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Reporter State
  const [showReporterModal, setShowReporterModal] = useState(false);
  const [activeReporter, setActiveReporter] = useState<Partial<ReporterProfile>>({});
  const [cardDisclaimer, setCardDisclaimer] = useState('This card is the property of CJ NEWSHUB. If found, please return to the nearest bureau.');
  const [showCardBack, setShowCardBack] = useState(false);
  const [showProfileImageGallery, setShowProfileImageGallery] = useState(false);
  const [imageSelectorTarget, setImageSelectorTarget] = useState<'photo' | 'signature' | 'stamp'>('photo');

  // Article State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Settings State
  const [activeSettingsTab, setActiveSettingsTab] = useState<'watermark' | 'taxonomy' | 'security'>('watermark');
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newAdCategory, setNewAdCategory] = useState('');
  
  // E-Paper State
  const [showPageUpload, setShowPageUpload] = useState(false);
  const [newPageDate, setNewPageDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [isUploadingPage, setIsUploadingPage] = useState(false);

  // Filtered Articles
  const filteredArticles = articles.filter(a => {
      const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.author.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
  });

  const handlePrintCard = () => {
    const printContent = document.getElementById('id-card-preview');
    if (printContent) {
        const win = window.open('', '', 'height=700,width=1000');
        if (win) {
          win.document.write('<html><head><title>Print ID Card</title>');
          // Inject basic styles for proper printing layout
          win.document.write(`
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @page { size: auto; margin: 0mm; }
              body { margin: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            </style>
          `);
          win.document.write('</head><body>');
          win.document.write(printContent.outerHTML);
          win.document.write('</body></html>');
          win.document.close();
          // Delay print to allow styles to load
          setTimeout(() => {
              win.print();
              win.close();
          }, 500);
        }
    }
  };

  const handleSelectImage = (url: string) => {
      if (imageSelectorTarget === 'photo') setActiveReporter({ ...activeReporter, photoUrl: url });
      if (imageSelectorTarget === 'signature') setActiveReporter({ ...activeReporter, signatureUrl: url });
      if (imageSelectorTarget === 'stamp') setActiveReporter({ ...activeReporter, stampUrl: url });
      setShowProfileImageGallery(false);
  };

  const handleSaveReporterProfile = () => {
      if (!activeReporter.fullName || !activeReporter.email) {
          alert("Name and Email are required.");
          return;
      }
      const newProfile: ReporterProfile = {
          id: activeReporter.id || generateId(),
          fullName: activeReporter.fullName,
          role: activeReporter.role || 'Correspondent',
          department: activeReporter.department || 'General',
          idNumber: activeReporter.idNumber || generateId().substring(0,6).toUpperCase(),
          email: activeReporter.email,
          phone: activeReporter.phone,
          bloodGroup: activeReporter.bloodGroup,
          photoUrl: activeReporter.photoUrl || '',
          joinedAt: activeReporter.joinedAt || new Date().toISOString(),
          validUntil: activeReporter.validUntil || new Date(Date.now() + 31536000000).toISOString(),
          location: activeReporter.location || 'Headquarters',
          status: activeReporter.status || 'active',
          cardTemplate: activeReporter.cardTemplate || 'classic',
          emergencyContact: activeReporter.emergencyContact,
          officeAddress: activeReporter.officeAddress,
          signatureUrl: activeReporter.signatureUrl,
          stampUrl: activeReporter.stampUrl
      };
      onSaveReporter(newProfile);
      setShowReporterModal(false);
  };

  const handlePageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploadingPage(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `epaper/${newPageDate}/${generateId()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          
          onAddPage({
              id: generateId(),
              date: newPageDate,
              pageNumber: newPageNumber,
              imageUrl: data.publicUrl,
              regions: []
          });
          setShowPageUpload(false);
          setNewPageNumber(prev => prev + 1);
      } catch (err: any) {
          alert("Page upload failed: " + err.message);
      } finally {
          setIsUploadingPage(false);
      }
  };

  const SidebarItem = ({ id, label, icon: Icon }: { id: string, label: string, icon: any }) => (
    <button 
        onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-1 ${activeTab === id ? 'bg-news-gold text-black font-bold' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
    >
        <Icon size={18} />
        <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <>
    <ImageGalleryModal 
        isOpen={showProfileImageGallery}
        onClose={() => setShowProfileImageGallery(false)}
        onSelectImage={handleSelectImage}
        uploadFolder="branding"
        userId={userId}
    />

    <div className="flex h-screen bg-[#111] overflow-hidden font-sans text-gray-100">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="flex justify-between items-center p-6 border-b border-white/5">
              <div className="flex items-center gap-2">
                 <ShieldCheck className="text-news-gold" size={24} />
                 <h1 className="font-serif text-xl font-bold text-white tracking-wide">Editor</h1>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={20} /></button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-6">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-4">Overview</p>
                  <SidebarItem id="dashboard" label="Dashboard" icon={LayoutDashboard} />
                  <SidebarItem id="analytics" label="Analytics" icon={BarChart3} />
              </div>
              
              <div className="mb-6">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-4">Editorial</p>
                  <SidebarItem id="articles" label="Articles" icon={FileText} />
                  <SidebarItem id="epaper" label="E-Paper" icon={Newspaper} />
                  <SidebarItem id="reporters" label="Press Corps" icon={Users} />
              </div>

              <div className="mb-6">
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-4">Commercial</p>
                  <SidebarItem id="classifieds" label="Classifieds" icon={Layout} />
                  <SidebarItem id="advertisements" label="Ad Manager" icon={Megaphone} />
              </div>

              <div>
                  <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2 px-4">System</p>
                  <SidebarItem id="settings" label="Configuration" icon={Settings} />
              </div>
          </div>

          <div className="p-4 border-t border-white/5 bg-[#050505]">
              <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 rounded transition-colors mb-2 hover:bg-white/5">
                  <Globe size={16} /> Website
              </button>
              <button onClick={() => { supabase.auth.signOut(); onNavigate('/login'); }} className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 rounded transition-colors hover:bg-white/5">
                  <LogOut size={16} /> Logout
              </button>
          </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-64 h-full overflow-hidden bg-[#111]">
          {/* Header */}
          <div className="h-16 border-b border-white/5 bg-[#141414] flex justify-between items-center px-6 shrink-0">
               <div className="flex items-center gap-4">
                   <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-400"><Menu size={24}/></button>
                   <h2 className="font-bold text-white capitalize">{activeTab.replace('-', ' ')}</h2>
               </div>
               <div className="flex items-center gap-4">
                   {userAvatar ? (
                       <img src={userAvatar} className="w-8 h-8 rounded-full border border-gray-600" alt="Profile" />
                   ) : (
                       <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-gray-400">
                           <UserIcon size={16} />
                       </div>
                   )}
                   <span className="text-sm font-bold text-gray-300 hidden sm:inline">{userName || 'Editor'}</span>
               </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
              
              {activeTab === 'dashboard' && (
                  <div className="space-y-8">
                       <AnalyticsDashboard articles={articles} role={UserRole.EDITOR} activeVisitors={activeVisitors} />
                  </div>
              )}

              {activeTab === 'articles' && (
                  <div className="max-w-7xl mx-auto space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex items-center gap-2 bg-[#1a1a1a] p-1 rounded-lg border border-white/10">
                              {['ALL', 'PUBLISHED', 'DRAFT', 'PENDING'].map(s => (
                                  <button 
                                    key={s} 
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-md transition-colors ${statusFilter === s ? 'bg-news-gold text-black' : 'text-gray-400 hover:text-white'}`}
                                  >
                                      {s}
                                  </button>
                              ))}
                          </div>
                          <div className="relative w-full sm:w-64">
                              <Search className="absolute left-3 top-2.5 text-gray-500" size={16}/>
                              <input 
                                type="text" 
                                placeholder="Search articles..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-news-gold outline-none"
                              />
                          </div>
                      </div>

                      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl overflow-hidden">
                          <table className="w-full text-left">
                              <thead className="bg-[#222] text-gray-400 text-[10px] font-black uppercase tracking-wider">
                                  <tr>
                                      <th className="px-6 py-4">Article</th>
                                      <th className="px-6 py-4">Author</th>
                                      <th className="px-6 py-4">Status</th>
                                      <th className="px-6 py-4">Date</th>
                                      <th className="px-6 py-4 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                  {filteredArticles.map(article => (
                                      <tr key={article.id} className="hover:bg-white/5 transition-colors">
                                          <td className="px-6 py-4">
                                              <p className="font-bold text-white text-sm line-clamp-1">{article.title}</p>
                                              <div className="flex gap-2 mt-1">
                                                  {article.categories.map(c => <span key={c} className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">{c}</span>)}
                                              </div>
                                          </td>
                                          <td className="px-6 py-4 text-sm text-gray-300">{article.author}</td>
                                          <td className="px-6 py-4">
                                              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                  article.status === 'PUBLISHED' ? 'bg-green-900/30 text-green-400' :
                                                  article.status === 'PENDING' ? 'bg-yellow-900/30 text-yellow-400' :
                                                  'bg-gray-700 text-gray-300'
                                              }`}>
                                                  {article.status}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-sm text-gray-500">{format(new Date(article.publishedAt), 'MMM d, yyyy')}</td>
                                          <td className="px-6 py-4 text-right">
                                              <div className="flex justify-end gap-2">
                                                  {article.status !== 'PUBLISHED' && (
                                                      <button onClick={() => onSaveArticle({ ...article, status: ArticleStatus.PUBLISHED })} className="p-2 bg-green-900/20 text-green-400 rounded hover:bg-green-900/40" title="Publish">
                                                          <CheckCircle size={16}/>
                                                      </button>
                                                  )}
                                                  <button onClick={() => onDeleteArticle(article.id)} className="p-2 bg-red-900/20 text-red-400 rounded hover:bg-red-900/40" title="Delete">
                                                      <Trash2 size={16}/>
                                                  </button>
                                              </div>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                          {filteredArticles.length === 0 && (
                              <div className="p-8 text-center text-gray-500">No articles found matching your criteria.</div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'epaper' && (
                  <div className="max-w-7xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-xl font-bold text-white">E-Paper Editions</h3>
                          <button onClick={() => setShowPageUpload(!showPageUpload)} className="bg-news-gold text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-white transition-colors">
                              {showPageUpload ? <X size={16}/> : <Plus size={16}/>} {showPageUpload ? 'Cancel' : 'Upload Page'}
                          </button>
                      </div>

                      {showPageUpload && (
                          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10 mb-8 animate-in slide-in-from-top-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                  <div>
                                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Edition Date</label>
                                      <input type="date" value={newPageDate} onChange={e => setNewPageDate(e.target.value)} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-news-gold outline-none"/>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Page Number</label>
                                      <input type="number" value={newPageNumber} onChange={e => setNewPageNumber(parseInt(e.target.value))} className="w-full bg-black border border-white/20 rounded-lg p-3 text-white focus:border-news-gold outline-none"/>
                                  </div>
                                  <div>
                                      <label className={`w-full flex items-center justify-center gap-2 bg-white/5 border border-dashed border-white/20 hover:border-news-gold hover:bg-white/10 text-gray-300 p-3 rounded-lg cursor-pointer transition-all ${isUploadingPage ? 'opacity-50 pointer-events-none' : ''}`}>
                                          {isUploadingPage ? <RefreshCcw className="animate-spin" size={20}/> : <Upload size={20}/>}
                                          <span className="text-sm font-bold uppercase">{isUploadingPage ? 'Uploading...' : 'Select Image'}</span>
                                          <input type="file" accept="image/*" className="hidden" onChange={handlePageUpload} disabled={isUploadingPage} />
                                      </label>
                                  </div>
                              </div>
                          </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                          {ePaperPages.map(page => (
                              <div key={page.id} className="group relative bg-[#1a1a1a] rounded-lg border border-white/10 overflow-hidden">
                                  <div className="aspect-[3/4] relative">
                                      <img src={page.imageUrl} className="w-full h-full object-cover" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <button onClick={() => onDeletePage(page.id)} className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700">
                                              <Trash2 size={16}/>
                                          </button>
                                      </div>
                                  </div>
                                  <div className="p-3 text-center">
                                      <p className="text-xs font-bold text-white uppercase">{page.date}</p>
                                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Page {page.pageNumber}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {activeTab === 'reporters' && (
                  <div className="max-w-7xl mx-auto">
                      <div className="flex justify-between items-center mb-8">
                          <div>
                              <h3 className="text-2xl font-bold text-white mb-1">Press Corps Manager</h3>
                              <p className="text-sm text-gray-500">Manage ID cards, profiles, and assignments.</p>
                          </div>
                          <button onClick={() => { setActiveReporter({}); setShowReporterModal(true); }} className="bg-news-gold text-black px-5 py-2.5 rounded-lg text-sm font-black uppercase tracking-wider flex items-center gap-2 hover:bg-white transition-colors">
                              <Plus size={18}/> Add Reporter
                          </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {reporters.map(reporter => (
                              <div key={reporter.id} className="bg-[#1a1a1a] rounded-xl border border-white/10 p-6 flex flex-col gap-4 hover:border-white/20 transition-colors">
                                  <div className="flex items-start gap-4">
                                      <div className="w-16 h-16 rounded-full bg-black border border-white/20 overflow-hidden shrink-0">
                                          {reporter.photoUrl ? <img src={reporter.photoUrl} className="w-full h-full object-cover"/> : <UserIcon className="p-3 text-gray-600 w-full h-full"/>}
                                      </div>
                                      <div className="min-w-0">
                                          <h4 className="text-lg font-bold text-white truncate">{reporter.fullName}</h4>
                                          <p className="text-news-gold text-xs uppercase font-bold tracking-wider">{reporter.role}</p>
                                          <p className="text-gray-500 text-xs mt-1">{reporter.department} • {reporter.location}</p>
                                      </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 border-t border-white/5 pt-4">
                                      <div>ID: <span className="text-white font-mono">{reporter.idNumber}</span></div>
                                      <div>Status: <span className={`uppercase font-bold ${reporter.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>{reporter.status}</span></div>
                                      <div>Expires: <span className="text-white">{format(new Date(reporter.validUntil), 'MMM yyyy')}</span></div>
                                      <div>Type: <span className="text-white capitalize">{reporter.cardTemplate || 'Classic'}</span></div>
                                  </div>

                                  <div className="flex gap-2 mt-auto pt-2">
                                      <button onClick={() => { setActiveReporter(reporter); setShowReporterModal(true); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2 rounded text-xs font-bold uppercase transition-colors">Edit Profile</button>
                                      <button onClick={() => onDeleteReporter(reporter.id)} className="p-2 bg-red-900/20 text-red-500 hover:bg-red-900/40 rounded transition-colors"><Trash2 size={16}/></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-10">
                      
                      {/* Sub-tabs */}
                      <div className="flex border-b border-white/10 mb-8">
                          <button onClick={() => setActiveSettingsTab('watermark')} className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeSettingsTab === 'watermark' ? 'border-news-gold text-news-gold' : 'border-transparent text-gray-500 hover:text-white'}`}>Brand & Watermark</button>
                          <button onClick={() => setActiveSettingsTab('taxonomy')} className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeSettingsTab === 'taxonomy' ? 'border-news-gold text-news-gold' : 'border-transparent text-gray-500 hover:text-white'}`}>Taxonomy</button>
                          <button onClick={() => setActiveSettingsTab('security')} className={`px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${activeSettingsTab === 'security' ? 'border-news-gold text-news-gold' : 'border-transparent text-gray-500 hover:text-white'}`}>Security & Devices</button>
                      </div>

                      {activeSettingsTab === 'watermark' && (
                          <div className="bg-[#1a1a1a] rounded-xl border border-white/10 p-8 space-y-6">
                              <h3 className="text-lg font-bold text-white mb-4">E-Paper Watermark Config</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Brand Text</label>
                                          <input type="text" value={watermarkSettings.text} onChange={(e) => onUpdateWatermarkSettings({ ...watermarkSettings, text: e.target.value })} className="w-full bg-black border border-white/20 p-3 rounded text-white focus:border-news-gold outline-none"/>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Logo URL</label>
                                          <input type="text" value={watermarkSettings.logoUrl} onChange={(e) => onUpdateWatermarkSettings({ ...watermarkSettings, logoUrl: e.target.value })} className="w-full bg-black border border-white/20 p-3 rounded text-white focus:border-news-gold outline-none"/>
                                      </div>
                                      <div className="flex gap-4">
                                          <div className="flex-1">
                                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">BG Color</label>
                                              <div className="flex items-center gap-2">
                                                  <input type="color" value={watermarkSettings.backgroundColor} onChange={(e) => onUpdateWatermarkSettings({ ...watermarkSettings, backgroundColor: e.target.value })} className="h-10 w-10 bg-transparent cursor-pointer rounded overflow-hidden" />
                                                  <span className="text-xs text-gray-400 font-mono">{watermarkSettings.backgroundColor}</span>
                                              </div>
                                          </div>
                                          <div className="flex-1">
                                              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Text Color</label>
                                              <div className="flex items-center gap-2">
                                                  <input type="color" value={watermarkSettings.textColor} onChange={(e) => onUpdateWatermarkSettings({ ...watermarkSettings, textColor: e.target.value })} className="h-10 w-10 bg-transparent cursor-pointer rounded overflow-hidden" />
                                                  <span className="text-xs text-gray-400 font-mono">{watermarkSettings.textColor}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col items-center justify-center border border-white/5">
                                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Preview</p>
                                      <div style={{ backgroundColor: watermarkSettings.backgroundColor }} className="w-full h-32 rounded flex flex-col items-center justify-center relative overflow-hidden">
                                          {watermarkSettings.showLogo && <img src={watermarkSettings.logoUrl} className="h-12 object-contain mb-2" alt="Logo"/>}
                                          <span style={{ color: watermarkSettings.textColor, fontSize: '18px', fontWeight: 'bold', fontFamily: 'serif' }}>{watermarkSettings.text}</span>
                                          <span className="text-[10px] text-white/70 absolute bottom-2 right-4 font-sans">CJ NEWSHUB GLOBAL ARCHIVE</span>
                                      </div>
                                  </div>
                              </div>
                              <div className="pt-6 border-t border-white/5 text-right">
                                  <button onClick={onSaveTaxonomy} className="bg-white text-black px-6 py-2 rounded font-bold uppercase text-xs hover:bg-news-gold transition-colors">Save Configuration</button>
                              </div>
                          </div>
                      )}

                      {activeSettingsTab === 'taxonomy' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10">
                                  <h3 className="text-lg font-bold text-white mb-4">News Categories</h3>
                                  <div className="flex gap-2 mb-4">
                                      <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 bg-black border border-white/20 rounded p-2 text-white text-sm outline-none focus:border-news-gold" placeholder="New Category..."/>
                                      <button onClick={() => { if(newCategory) { onAddCategory(newCategory); setNewCategory(''); }}} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded"><Plus size={20}/></button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {categories.map(c => (
                                          <span key={c} className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-gray-300 flex items-center gap-2">
                                              {c} <button onClick={() => onDeleteCategory(c)} className="hover:text-red-400"><X size={12}/></button>
                                          </span>
                                      ))}
                                  </div>
                              </div>
                              <div className="bg-[#1a1a1a] p-6 rounded-xl border border-white/10">
                                  <h3 className="text-lg font-bold text-white mb-4">Editorial Tags</h3>
                                  <div className="flex gap-2 mb-4">
                                      <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} className="flex-1 bg-black border border-white/20 rounded p-2 text-white text-sm outline-none focus:border-news-gold" placeholder="New Tag..."/>
                                      <button onClick={() => { if(newTag) { onAddTag(newTag); setNewTag(''); }}} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded"><Plus size={20}/></button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {tags.map(t => (
                                          <span key={t} className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs text-gray-300 flex items-center gap-2">
                                              #{t} <button onClick={() => onDeleteTag(t)} className="hover:text-red-400"><X size={12}/></button>
                                          </span>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      )}

                      {activeSettingsTab === 'security' && (
                          <div className="bg-[#1a1a1a] p-8 rounded-xl border border-white/10">
                              <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><ShieldCheck className="text-news-gold"/> Trusted Devices</h3>
                              <div className="space-y-4">
                                  {devices.map(device => {
                                      let Icon = Monitor;
                                      if (device.deviceType === 'mobile') Icon = Smartphone;
                                      if (device.deviceType === 'tablet') Icon = Tablet;
                                      
                                      return (
                                          <div key={device.id} className="flex items-center justify-between p-4 bg-black/50 border border-white/5 rounded-lg">
                                              <div className="flex items-center gap-4">
                                                  <div className={`p-3 rounded-full ${device.status === 'approved' ? 'bg-green-900/20 text-green-500' : 'bg-yellow-900/20 text-yellow-500'}`}>
                                                      <Icon size={20} />
                                                  </div>
                                                  <div>
                                                      <div className="flex items-center gap-2">
                                                          <span className="font-bold text-white text-sm">{device.deviceName}</span>
                                                          {device.status === 'pending' && <span className="text-[10px] bg-yellow-600 text-black px-1.5 py-0.5 rounded font-bold uppercase">Pending Approval</span>}
                                                          {device.isCurrent && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-bold uppercase">This Device</span>}
                                                      </div>
                                                      <div className="text-xs text-gray-500 mt-1">{device.location} • {device.browser} • {device.lastActive}</div>
                                                  </div>
                                              </div>
                                              <div className="flex gap-2">
                                                  {device.status === 'pending' && (
                                                      <button onClick={() => onApproveDevice(device.id)} className="p-2 bg-green-600 text-white rounded hover:bg-green-700" title="Approve"><Check size={16}/></button>
                                                  )}
                                                  <button onClick={() => onRevokeDevice(device.id)} className="p-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40" title="Revoke"><Trash2 size={16}/></button>
                                              </div>
                                          </div>
                                      );
                                  })}
                                  {devices.length === 0 && <p className="text-gray-500 italic text-sm">No devices registered.</p>}
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
      </div>

      {/* REPORTER MODAL */}
      {showReporterModal && (
          <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                  
                  {/* Left: Form */}
                  <div className="w-full md:w-1/2 p-8 overflow-y-auto bg-white">
                      <h2 className="font-serif text-2xl font-black text-gray-900 mb-6 uppercase tracking-tight flex items-center gap-2">
                          <Users className="text-news-gold"/> Reporter Profile
                      </h2>
                      
                      <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Full Name</label>
                                  <input type="text" value={activeReporter.fullName || ''} onChange={e => setActiveReporter({...activeReporter, fullName: e.target.value})} className="w-full p-3 border rounded-lg text-sm font-bold text-gray-900 outline-none focus:border-black transition-colors"/>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Role / Designation</label>
                                  <input type="text" value={activeReporter.role || ''} onChange={e => setActiveReporter({...activeReporter, role: e.target.value})} className="w-full p-3 border rounded-lg text-sm"/>
                              </div>
                          </div>

                          <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Email Address</label>
                              <input type="email" value={activeReporter.email || ''} onChange={e => setActiveReporter({...activeReporter, email: e.target.value})} className="w-full p-3 border rounded-lg text-sm"/>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Phone</label>
                                  <input type="text" value={activeReporter.phone || ''} onChange={e => setActiveReporter({...activeReporter, phone: e.target.value})} className="w-full p-3 border rounded-lg text-sm"/>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Department</label>
                                  <input type="text" value={activeReporter.department || ''} onChange={e => setActiveReporter({...activeReporter, department: e.target.value})} className="w-full p-3 border rounded-lg text-sm"/>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">ID Number</label>
                                  <input type="text" value={activeReporter.idNumber || ''} onChange={e => setActiveReporter({...activeReporter, idNumber: e.target.value})} className="w-full p-3 border rounded-lg text-sm font-mono"/>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Blood Group</label>
                                  <input type="text" value={activeReporter.bloodGroup || ''} onChange={e => setActiveReporter({...activeReporter, bloodGroup: e.target.value})} className="w-full p-3 border rounded-lg text-sm"/>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Date Issued</label>
                                  <input type="date" value={activeReporter.joinedAt?.split('T')[0] || ''} onChange={e => setActiveReporter({...activeReporter, joinedAt: e.target.value})} className="w-full p-3 border rounded-lg text-sm"/>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Valid Until</label>
                                  <input type="date" value={activeReporter.validUntil?.split('T')[0] || ''} onChange={e => setActiveReporter({...activeReporter, validUntil: e.target.value})} className="w-full p-3 border rounded-lg text-sm"/>
                              </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Location</label>
                                  <input type="text" value={activeReporter.location || ''} onChange={e => setActiveReporter({...activeReporter, location: e.target.value})} className="w-full p-3 border rounded-lg text-sm" placeholder="Base Station"/>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Emergency Contact</label>
                                  <input type="text" value={activeReporter.emergencyContact || ''} onChange={e => setActiveReporter({...activeReporter, emergencyContact: e.target.value})} className="w-full p-3 border rounded-lg text-sm" placeholder="8008129309"/>
                              </div>
                          </div>

                          <div className="space-y-4 pt-4">
                              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Office Address</label>
                              <input type="text" value={activeReporter.officeAddress || ''} onChange={e => setActiveReporter({...activeReporter, officeAddress: e.target.value})} className="w-full p-3 border rounded-lg text-sm" placeholder="Specific Office Address"/>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-gray-200">
                              <h4 className="font-bold text-sm text-gray-800">Card Design</h4>
                              <div className="flex gap-4 flex-wrap">
                                  <label className="flex items-center gap-3 cursor-pointer group">
                                      <input type="radio" name="template" checked={activeReporter.cardTemplate === 'classic' || !activeReporter.cardTemplate} onChange={() => setActiveReporter({...activeReporter, cardTemplate: 'classic'})} className="accent-news-black w-4 h-4"/>
                                      <div className={`p-3 border rounded-lg text-xs font-bold text-center w-24 group-hover:bg-white transition-colors ${activeReporter.cardTemplate === 'classic' || !activeReporter.cardTemplate ? 'bg-white border-news-black ring-1 ring-news-black' : 'bg-gray-100 border-transparent'}`}>
                                          Classic
                                      </div>
                                  </label>
                                  <label className="flex items-center gap-3 cursor-pointer group">
                                      <input type="radio" name="template" checked={activeReporter.cardTemplate === 'modern'} onChange={() => setActiveReporter({...activeReporter, cardTemplate: 'modern'})} className="accent-news-black w-4 h-4"/>
                                      <div className={`p-3 border rounded-lg text-xs font-bold text-center w-24 group-hover:bg-white transition-colors ${activeReporter.cardTemplate === 'modern' ? 'bg-news-black text-white border-news-black' : 'bg-gray-100 border-transparent'}`}>
                                          Press Pass
                                      </div>
                                  </label>
                                  <label className="flex items-center gap-3 cursor-pointer group">
                                      <input type="radio" name="template" checked={activeReporter.cardTemplate === 'agency'} onChange={() => setActiveReporter({...activeReporter, cardTemplate: 'agency'})} className="accent-news-black w-4 h-4"/>
                                      <div className={`p-3 border rounded-lg text-xs font-bold text-center w-24 group-hover:bg-white transition-colors ${activeReporter.cardTemplate === 'agency' ? 'bg-red-700 text-white border-red-700' : 'bg-gray-100 border-transparent'}`}>
                                          Agency
                                      </div>
                                  </label>
                                  <label className="flex items-center gap-3 cursor-pointer group">
                                      <input type="radio" name="template" checked={activeReporter.cardTemplate === 'official'} onChange={() => setActiveReporter({...activeReporter, cardTemplate: 'official'})} className="accent-news-black w-4 h-4"/>
                                      <div className={`p-3 border rounded-lg text-xs font-bold text-center w-24 group-hover:bg-white transition-colors ${activeReporter.cardTemplate === 'official' ? 'bg-blue-800 text-white border-blue-800' : 'bg-gray-100 border-transparent'}`}>
                                          Official
                                      </div>
                                  </label>
                              </div>
                          </div>

                          <div className="flex items-center gap-4 pt-4">
                              <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border-2 border-gray-300 flex items-center justify-center shrink-0">
                                  {activeReporter.photoUrl ? <img src={activeReporter.photoUrl} className="w-full h-full object-cover" /> : <UserIcon className="text-gray-400 w-10 h-10"/>}
                              </div>
                              <button onClick={() => { setImageSelectorTarget('photo'); setShowProfileImageGallery(true); }} className="px-4 py-2 bg-white border border-gray-300 rounded text-xs font-bold hover:bg-gray-100 flex items-center gap-2">
                                  <Camera size={14}/> Change Photo
                              </button>
                          </div>
                          
                          <div className="pt-4">
                              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Back Side Disclaimer</label>
                              <textarea 
                                  className="w-full p-3 border rounded-lg text-xs text-gray-600 h-24"
                                  value={cardDisclaimer}
                                  onChange={(e) => setCardDisclaimer(e.target.value)}
                              ></textarea>
                          </div>

                          <div className="pt-4 border-t border-gray-200">
                              <h4 className="font-bold text-sm text-gray-800 mb-3">Authorization Assets</h4>
                              <div className="flex gap-4">
                                  <button onClick={() => { setImageSelectorTarget('signature'); setShowProfileImageGallery(true); }} className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded text-xs font-bold hover:bg-gray-100 flex items-center justify-center gap-2">
                                      <PenTool size={14} /> {activeReporter.signatureUrl ? 'Update Signature' : 'Upload Signature'}
                                  </button>
                                  <button onClick={() => { setImageSelectorTarget('stamp'); setShowProfileImageGallery(true); }} className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded text-xs font-bold hover:bg-gray-100 flex items-center justify-center gap-2">
                                      <Stamp size={14} /> {activeReporter.stampUrl ? 'Update Stamp' : 'Upload Stamp'}
                                  </button>
                              </div>
                          </div>
                      </div>

                      <div className="sticky bottom-0 bg-white pt-6 pb-2 border-t border-gray-100 mt-6 flex justify-end gap-3 z-10">
                          <button onClick={() => setShowReporterModal(false)} className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-black">Cancel</button>
                          <button onClick={handleSaveReporterProfile} className="px-8 py-3 bg-news-black text-white rounded-lg text-sm font-bold shadow-xl hover:bg-gray-800 transition-transform active:scale-95">Save Profile</button>
                      </div>
                  </div>

                  {/* Right: Live Preview */}
                  <div className="w-full md:w-1/2 p-8 bg-gray-100 border-l border-gray-200 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-lg text-gray-700">Live Card Preview</h3>
                          <div className="flex gap-2">
                              {activeReporter.cardTemplate === 'official' && (
                                  <button onClick={() => setShowCardBack(!showCardBack)} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-50">
                                      <Repeat size={16} /> {showCardBack ? 'Show Front' : 'Show Back'}
                                  </button>
                              )}
                              <button onClick={handlePrintCard} disabled={!activeReporter.fullName} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50">
                                  <Printer size={16} /> Print
                              </button>
                              <button onClick={() => setShowReporterModal(false)} className="text-gray-500 hover:text-black hidden md:block"><X size={24}/></button>
                          </div>
                      </div>

                      <div className="flex-1 flex items-center justify-center min-h-[500px]">
                          {/* DYNAMIC CARD RENDERER */}
                          {activeReporter.fullName ? (
                              <div id="id-card-preview" className="relative group perspective">
                                  
                                  {/* CLASSIC MODEL */}
                                  {(!activeReporter.cardTemplate || activeReporter.cardTemplate === 'classic') && (
                                      <div className="w-[350px] h-[550px] bg-white rounded-2xl shadow-2xl overflow-hidden relative flex flex-col border border-gray-200 print:shadow-none">
                                          {/* Header */}
                                          <div className="h-28 bg-news-blue flex flex-col items-center justify-center relative overflow-hidden shrink-0">
                                              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                                              <div className="text-center z-10">
                                                  <h1 className="font-serif text-2xl font-black text-white tracking-tight uppercase italic">CJ <span className="not-italic text-news-gold">NEWSHUB</span></h1>
                                                  <p className="text-[9px] text-gray-300 font-bold uppercase tracking-[0.4em] mt-1">Global Press Corps</p>
                                              </div>
                                          </div>

                                          {/* Photo */}
                                          <div className="flex justify-center -mt-12 mb-4 relative z-10">
                                              <div className="w-32 h-32 rounded-full border-[6px] border-white shadow-lg bg-gray-200 overflow-hidden">
                                                  {activeReporter.photoUrl ? <img src={activeReporter.photoUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500"><UserIcon size={40}/></div>}
                                              </div>
                                          </div>

                                          {/* Details */}
                                          <div className="text-center px-8 flex-1">
                                              <h2 className="text-xl font-black text-gray-900 uppercase leading-none mb-1">{activeReporter.fullName}</h2>
                                              <div className="inline-block bg-news-gold text-black text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-6 mt-2">
                                                  {activeReporter.role}
                                              </div>
                                              
                                              <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-left text-[10px] border-t border-gray-100 pt-6">
                                                  <div>
                                                      <span className="block font-bold text-gray-400 uppercase tracking-wider text-[8px]">ID Number</span>
                                                      <span className="font-mono font-bold text-gray-800 text-sm">{activeReporter.idNumber}</span>
                                                  </div>
                                                  <div>
                                                      <span className="block font-bold text-gray-400 uppercase tracking-wider text-[8px]">Valid Until</span>
                                                      <span className="font-bold text-gray-800 text-sm">{activeReporter.validUntil ? format(new Date(activeReporter.validUntil), 'MMM d, yyyy') : 'N/A'}</span>
                                                  </div>
                                                  <div>
                                                      <span className="block font-bold text-gray-400 uppercase tracking-wider text-[8px]">Department</span>
                                                      <span className="font-bold text-gray-800 text-sm">{activeReporter.department}</span>
                                                  </div>
                                                  <div>
                                                      <span className="block font-bold text-gray-400 uppercase tracking-wider text-[8px]">Blood Group</span>
                                                      <span className="font-bold text-gray-800 text-sm">{activeReporter.bloodGroup || 'N/A'}</span>
                                                  </div>
                                              </div>
                                          </div>

                                          {/* Footer */}
                                          <div className="bg-gray-50 p-5 flex items-center justify-between border-t border-gray-200 mt-auto shrink-0">
                                              <div className="w-20 h-20 bg-white p-1 rounded border border-gray-200 shrink-0">
                                                  <img 
                                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/#/verify-id/${activeReporter.id || 'preview'}`)}`} 
                                                      className="w-full h-full object-contain"
                                                      alt="QR"
                                                  />
                                              </div>
                                              <div className="pl-4 text-right">
                                                  <p className="text-[7px] text-gray-400 leading-tight line-clamp-3">
                                                      {cardDisclaimer}
                                                  </p>
                                                  <div className="mt-2 text-[8px] font-black text-news-blue uppercase tracking-widest">Authorized Press</div>
                                              </div>
                                          </div>
                                      </div>
                                  )}

                                  {/* MODERN (PRESS PASS) MODEL */}
                                  {activeReporter.cardTemplate === 'modern' && (
                                      <div className="w-[350px] h-[550px] bg-[#111] rounded-xl shadow-2xl overflow-hidden relative flex flex-col border border-gray-800 text-white print:shadow-none print:border-black">
                                          {/* Background Elements */}
                                          <div className="absolute top-0 right-0 w-40 h-40 bg-news-gold/20 rounded-full blur-[60px] pointer-events-none"></div>
                                          
                                          {/* Header */}
                                          <div className="p-6 pb-0 z-10 flex justify-between items-start">
                                              <div>
                                                  <h1 className="font-serif text-xl font-black text-white uppercase italic tracking-tighter leading-none">CJ <span className="not-italic text-news-gold">NEWSHUB</span></h1>
                                                  <div className="h-1 w-8 bg-news-gold mt-2"></div>
                                              </div>
                                              <div className="border border-white/20 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest text-gray-400">
                                                  Media Access
                                              </div>
                                          </div>

                                          {/* Photo Section */}
                                          <div className="mt-6 mx-6 relative aspect-square bg-gray-800 rounded-lg overflow-hidden border border-white/10">
                                              {activeReporter.photoUrl ? <img src={activeReporter.photoUrl} className="w-full h-full object-cover grayscale contrast-125" /> : <div className="w-full h-full flex items-center justify-center text-gray-600"><UserIcon size={48}/></div>}
                                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-12">
                                                  <h2 className="text-2xl font-black uppercase text-white leading-none tracking-tight">{activeReporter.fullName}</h2>
                                                  <p className="text-news-gold font-bold uppercase text-[10px] tracking-widest mt-1">{activeReporter.role}</p>
                                              </div>
                                          </div>

                                          {/* Big PRESS Label */}
                                          <div className="absolute top-[45%] right-[-30px] rotate-90 origin-center text-[60px] font-black text-white/5 uppercase tracking-widest pointer-events-none select-none">
                                              PRESS
                                          </div>

                                          {/* Details */}
                                          <div className="flex-1 px-6 pt-6 z-10">
                                              <div className="grid grid-cols-2 gap-4 text-[10px]">
                                                  <div className="border-l-2 border-news-gold pl-3">
                                                      <span className="block text-gray-500 uppercase tracking-wider font-bold text-[8px] mb-0.5">Department</span>
                                                      <span className="font-bold text-white">{activeReporter.department}</span>
                                                  </div>
                                                  <div className="border-l-2 border-gray-700 pl-3">
                                                      <span className="block text-gray-500 uppercase tracking-wider font-bold text-[8px] mb-0.5">Valid Thru</span>
                                                      <span className="font-bold text-white">{activeReporter.validUntil ? format(new Date(activeReporter.validUntil), 'MM/yy') : 'N/A'}</span>
                                                  </div>
                                              </div>
                                              <div className="mt-6 border-t border-white/10 pt-4 flex justify-between items-end">
                                                  <div>
                                                      <p className="text-[12px] font-mono text-gray-400 mb-1">ID: <span className="text-white font-bold">{activeReporter.idNumber}</span></p>
                                                      <p className="text-[7px] text-gray-600 w-32 leading-tight uppercase">Authorized for editorial assignments globally.</p>
                                                  </div>
                                                  <div className="w-16 h-16 bg-white p-1 rounded-sm">
                                                      <img 
                                                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/#/verify-id/${activeReporter.id || 'preview'}`)}`} 
                                                          className="w-full h-full object-contain"
                                                          alt="QR"
                                                      />
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          <div className="bg-news-gold text-black text-center py-1 text-[9px] font-black uppercase tracking-[0.3em] mt-auto">
                                              Official Press Pass
                                          </div>
                                      </div>
                                  )}

                                  {/* AGENCY (BOLD) MODEL */}
                                  {activeReporter.cardTemplate === 'agency' && (
                                      <div className="w-[350px] h-[550px] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col border border-gray-300 print:shadow-none print:border-black">
                                          {/* Top Strip */}
                                          <div className="bg-red-700 text-white text-center py-2 font-black uppercase tracking-[0.5em] text-xl">
                                              PRESS
                                          </div>
                                          
                                          {/* Photo Section */}
                                          <div className="flex justify-center mt-8 mb-6">
                                              <div className="w-40 h-40 bg-gray-200 border-2 border-black overflow-hidden relative">
                                                  {activeReporter.photoUrl ? <img src={activeReporter.photoUrl} className="w-full h-full object-cover" /> : <UserIcon className="p-4 text-gray-400 w-full h-full"/>}
                                              </div>
                                          </div>

                                          {/* Main Content */}
                                          <div className="px-8 text-center flex-1">
                                              <h1 className="text-2xl font-black uppercase text-black leading-none mb-2">{activeReporter.fullName}</h1>
                                              <p className="text-red-700 font-bold uppercase text-sm tracking-wide border-b-2 border-black pb-4 mb-4 inline-block px-4">{activeReporter.role}</p>
                                              
                                              <div className="text-left space-y-2 text-xs font-mono">
                                                  <div className="flex justify-between border-b border-gray-200 pb-1">
                                                      <span className="font-bold text-gray-500 uppercase">Organization</span>
                                                      <span className="font-bold">CJ NEWSHUB</span>
                                                  </div>
                                                  <div className="flex justify-between border-b border-gray-200 pb-1">
                                                      <span className="font-bold text-gray-500 uppercase">Department</span>
                                                      <span className="font-bold">{activeReporter.department}</span>
                                                  </div>
                                                  <div className="flex justify-between border-b border-gray-200 pb-1">
                                                      <span className="font-bold text-gray-500 uppercase">ID No.</span>
                                                      <span className="font-bold">{activeReporter.idNumber}</span>
                                                  </div>
                                                  <div className="flex justify-between border-b border-gray-200 pb-1">
                                                      <span className="font-bold text-gray-500 uppercase">Expires</span>
                                                      <span className="font-bold text-red-600">{activeReporter.validUntil ? format(new Date(activeReporter.validUntil), 'dd MMM yyyy') : 'N/A'}</span>
                                                  </div>
                                              </div>
                                          </div>

                                          {/* Footer Area */}
                                          <div className="mt-auto px-6 pb-6 flex items-center justify-between">
                                              <div className="w-20 h-20 border border-black p-1">
                                                  <img 
                                                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/#/verify-id/${activeReporter.id || 'preview'}`)}`} 
                                                      className="w-full h-full object-contain"
                                                      alt="QR"
                                                  />
                                              </div>
                                              <div className="text-right">
                                                  <div className="h-10 w-24 bg-black mb-1"></div> {/* Fake Barcode Block */}
                                                  <p className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Official Credential</p>
                                              </div>
                                          </div>
                                          
                                          {/* Bottom Strip */}
                                          <div className="bg-black h-4 w-full"></div>
                                      </div>
                                  )}

                                  {/* OFFICIAL (LANDSCAPE) MODEL */}
                                  {activeReporter.cardTemplate === 'official' && (
                                      <div className={`w-[550px] h-[350px] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col border border-gray-200 print:shadow-none print:border-black transition-transform duration-500 preserve-3d ${showCardBack ? 'rotate-y-180' : ''}`}>
                                          {!showCardBack ? (
                                              // FRONT SIDE
                                              <>
                                                  {/* Watermark */}
                                                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none z-0">
                                                      <img src="https://cdn-icons-png.flaticon.com/512/21/21601.png" className="w-[250px] h-[250px] object-contain grayscale" />
                                                  </div>

                                                  {/* Curved Red Header with Logo Space */}
                                                  <div className="h-[70px] bg-[#d71920] relative w-full overflow-hidden shrink-0 z-10 flex justify-between items-center px-8">
                                                      <div className="flex-1 text-center">
                                                          <h1 className="text-4xl font-bold text-white uppercase tracking-wider font-sans drop-shadow-md">PRESS</h1>
                                                      </div>
                                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 border border-white/30 bg-white/10 rounded flex items-center justify-center text-[6px] text-white font-bold uppercase text-center leading-tight opacity-70">
                                                          Logo<br/>Space
                                                      </div>
                                                      {/* Decorative Curve Bottom Right */}
                                                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#1a1a1a] rounded-full z-0 opacity-20 pointer-events-none"></div>
                                                      <svg className="absolute bottom-0 left-0 w-full h-[20px] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                          <path d="M0 100 C 40 0 60 0 100 100 Z" fill="white" fillOpacity="0.1"/>
                                                          <path d="M50 100 Q 80 0 100 80 L 100 100 L 0 100 Z" fill="white" />
                                                      </svg>
                                                  </div>

                                                  <div className="flex-1 p-6 flex gap-6 relative z-10">
                                                      {/* Left Column: Photo Area + QR */}
                                                      <div className="flex flex-col items-center gap-3 shrink-0">
                                                          <div className="w-[90px] h-[110px] bg-gray-200 border border-gray-300 shadow-sm overflow-hidden">
                                                              {activeReporter.photoUrl ? <img src={activeReporter.photoUrl} className="w-full h-full object-cover" /> : <UserIcon className="p-4 text-gray-400 w-full h-full"/>}
                                                          </div>
                                                          <div className="w-[80px] h-[80px] bg-white p-1 border border-gray-200 shadow-sm">
                                                               <img 
                                                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/#/verify-id/${activeReporter.id || 'preview'}`)}`} 
                                                                  className="w-full h-full object-contain"
                                                                  alt="QR"
                                                              />
                                                          </div>
                                                      </div>

                                                      {/* Right Column: Fields Area */}
                                                      <div className="flex-1 space-y-2 pt-1">
                                                          {[
                                                              { label: 'Name', value: activeReporter.fullName },
                                                              { label: 'Designation', value: activeReporter.role },
                                                              { label: 'ID No', value: activeReporter.idNumber },
                                                              { label: 'Blood Group', value: activeReporter.bloodGroup || 'N/A' },
                                                              { label: 'Date Issued', value: activeReporter.joinedAt ? format(new Date(activeReporter.joinedAt), 'dd/MM/yyyy') : 'N/A' },
                                                              { label: 'Valid Until', value: activeReporter.validUntil ? format(new Date(activeReporter.validUntil), 'dd/MM/yyyy') : 'N/A' }
                                                          ].map((field, idx) => (
                                                              <div key={idx} className="flex text-sm items-baseline">
                                                                  <span className="w-24 font-bold text-gray-800 shrink-0 uppercase text-[10px] tracking-wider">{field.label}:</span>
                                                                  <span className="flex-1 border-b border-gray-300 text-gray-900 px-1 truncate h-5 font-bold">{field.value}</span>
                                                              </div>
                                                          ))}
                                                          <div className="flex text-sm items-baseline">
                                                              <span className="w-24 font-bold text-gray-800 shrink-0 uppercase text-[10px] tracking-wider">Contact:</span>
                                                              <span className="flex-1 border-b border-gray-300 text-gray-900 px-1 truncate h-5 font-bold text-xs">{activeReporter.phone || activeReporter.email}</span>
                                                          </div>
                                                      </div>
                                                  </div>

                                                  {/* Red Footer Curve */}
                                                  <div className="h-[40px] relative mt-auto w-full z-10">
                                                      <svg className="absolute top-[-15px] w-full h-[20px]" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                          <path d="M0 100 L 0 50 Q 50 100 100 30 L 100 100 Z" fill="#d71920" />
                                                      </svg>
                                                      <div className="bg-[#d71920] h-full w-full flex flex-col items-center justify-center z-10 relative">
                                                          <span className="text-[9px] font-bold text-white uppercase tracking-widest">EMERGENCY: {activeReporter.emergencyContact || 'N/A'}</span>
                                                      </div>
                                                  </div>
                                              </>
                                          ) : (
                                              // BACK SIDE
                                              <div className="w-full h-full p-8 flex flex-col bg-white text-left relative overflow-hidden">
                                                  {/* Watermark */}
                                                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none z-0">
                                                      <img src="https://cdn-icons-png.flaticon.com/512/21/21601.png" className="w-[250px] h-[250px] object-contain grayscale" />
                                                  </div>

                                                  <div className="relative z-10">
                                                      <div className="mb-6">
                                                          <h3 className="text-xs font-bold text-red-600 uppercase mb-2 border-b border-red-100 pb-1 inline-block">OFFICE ADDRESS:</h3>
                                                          <p className="text-xs font-medium text-gray-800 uppercase leading-relaxed max-w-[90%]">
                                                              {activeReporter.officeAddress || activeReporter.location || 'SUJATHA NAGAR, VISAKHAPATNAM, ANDHRA PRADESH -530051.'}
                                                          </p>
                                                      </div>

                                                      <div className="mb-4 flex-1">
                                                          <h3 className="text-xs font-bold text-red-600 uppercase mb-2 border-b border-red-100 pb-1 inline-block">Terms & Conditions:</h3>
                                                          <p className="text-[10px] text-gray-600 leading-relaxed text-justify">
                                                              {cardDisclaimer}
                                                          </p>
                                                      </div>
                                                  </div>

                                                  <div className="mt-auto flex justify-end items-end relative z-10">
                                                       <div className="relative">
                                                           {/* Signature and Stamp Container */}
                                                           <div className="relative w-64 h-36 mb-1 flex items-end justify-center">
                                                               {/* Signature Layer - Bottom */}
                                                               {activeReporter.signatureUrl && (
                                                                   <img 
                                                                       src={activeReporter.signatureUrl} 
                                                                       className="w-full h-24 object-contain object-bottom mix-blend-multiply z-10 relative mb-2"
                                                                       alt="Authorized Signature" 
                                                                   />
                                                               )}

                                                               {/* Stamp Layer - Large and overlapping */}
                                                               {activeReporter.stampUrl ? (
                                                                   <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 opacity-85 mix-blend-multiply z-20 pointer-events-none rotate-[-15deg]">
                                                                       <img src={activeReporter.stampUrl} className="w-full h-full object-contain" alt="Stamp" />
                                                                   </div>
                                                               ) : (
                                                                   <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-4 border-red-200 rounded-full flex items-center justify-center opacity-40 z-0 pointer-events-none rotate-[-15deg]">
                                                                       <span className="text-[10px] font-bold text-red-300 text-center uppercase">Official<br/>Stamp</span>
                                                                   </div>
                                                               )}
                                                           </div>
                                                           
                                                           {/* Line and Label */}
                                                           <div className="w-64 border-b-2 border-black mb-1"></div>
                                                           <h3 className="text-sm font-bold text-black uppercase tracking-widest text-center">AUTHORIZED SIGNATURE</h3>
                                                       </div>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  )}
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center text-gray-400 h-full">
                                  <UserIcon size={64} className="mb-4 opacity-20"/>
                                  <p className="font-serif text-lg">Start by entering profile details</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
    </>
  );
};

export default EditorDashboard;