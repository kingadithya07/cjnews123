
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, UserRole, AdSize, AdPlacement, ReporterProfile } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, RotateCcw, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Calendar, Loader2, Library, User as UserIcon, Lock,
  Check, Scissors, Camera, Monitor, Smartphone, Tablet, ShieldCheck, AlertTriangle, Code, Copy, RefreshCcw, Type, Star, Save, Award, ChevronDown, Maximize, MapPin, DollarSign, Phone, Filter, Layout as LayoutIcon, Sparkles, Key, Eye, Fingerprint, Printer, Droplet, Palette
} from 'lucide-react';
import { format } from 'date-fns';
import EPaperViewer from '../components/EPaperViewer';
import RichTextEditor from '../components/RichTextEditor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { generateId } from '../utils';
import { supabase } from '../supabaseClient';
import ImageGalleryModal from '../components/ImageGalleryModal';
import CategorySelector from '../components/CategorySelector';

interface EditorDashboardProps {
  articles: Article[];
  ePaperPages: EPaperPage[];
  categories: string[];
  tags?: string[];
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
  onAddTag?: (tag: string) => void;
  onDeleteTag?: (tag: string) => void;
  onAddAdCategory: (category: string) => void;
  onDeleteAdCategory: (category: string) => void;
  onSaveTaxonomy: () => Promise<void> | void;
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
  reporters?: ReporterProfile[];
  onSaveReporter?: (reporter: ReporterProfile) => void;
  onDeleteReporter?: (id: string) => void;
}

const EditorDashboard: React.FC<EditorDashboardProps> = ({ 
  articles, ePaperPages, categories, tags = [], adCategories, classifieds, advertisements,
  onAddPage, onDeletePage, onDeleteArticle, onSaveArticle, 
  onAddCategory, onDeleteCategory, onAddTag, onDeleteTag, onAddAdCategory, onDeleteAdCategory, onSaveTaxonomy,
  onAddClassified, onDeleteClassified, onAddAdvertisement, onUpdateAdvertisement, onDeleteAdvertisement,
  onNavigate, watermarkSettings, onUpdateWatermarkSettings, userName, userAvatar,
  devices, onApproveDevice, onRejectDevice, onRevokeDevice, globalAdsEnabled, onToggleGlobalAds, userId, activeVisitors,
  reporters = [], onSaveReporter, onDeleteReporter
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'epaper' | 'ads' | 'taxonomy' | 'analytics' | 'settings' | 'idcards'>('articles');

  // Article State
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalEnglishTitle, setModalEnglishTitle] = useState('');
  const [modalSubline, setModalSubline] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalAuthor, setModalAuthor] = useState('Editor');
  const [modalCategories, setModalCategories] = useState<string[]>([]);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalStatus, setModalStatus] = useState<ArticleStatus>(ArticleStatus.PUBLISHED);
  const [modalIsFeatured, setModalIsFeatured] = useState(false);
  const [modalPublishedAt, setModalPublishedAt] = useState<string>(new Date().toISOString());
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
  // E-Paper State
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageDate, setNewPageDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [newPageImage, setNewPageImage] = useState('');
  const [isPageUploading, setIsPageUploading] = useState(false);
  const epaperFileInputRef = useRef<HTMLInputElement>(null);
  
  const availableEpaperDates = useMemo(() => {
      const dates = Array.from(new Set(ePaperPages.map(p => p.date))).sort().reverse();
      return dates;
  }, [ePaperPages]);
  
  const [epaperFilterDate, setEpaperFilterDate] = useState<string>(availableEpaperDates[0] || new Date().toISOString().split('T')[0]);

  useEffect(() => {
      if (availableEpaperDates.length > 0 && !availableEpaperDates.includes(epaperFilterDate)) {
          setEpaperFilterDate(availableEpaperDates[0]);
      }
  }, [availableEpaperDates]);

  const filteredPages = useMemo(() => {
      return ePaperPages.filter(p => p.date === epaperFilterDate).sort((a, b) => a.pageNumber - b.pageNumber);
  }, [ePaperPages, epaperFilterDate]);

  // Settings State
  const [profileName, setProfileName] = useState(userName || '');
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  
  const [wText, setWText] = useState(watermarkSettings.text);
  const [wLogo, setWLogo] = useState(watermarkSettings.logoUrl);
  const [wFontSize, setWFontSize] = useState(watermarkSettings.fontSize || 30);
  const [wBgColor, setWBgColor] = useState(watermarkSettings.backgroundColor || '#1a1a1a');
  const [wTextColor, setWTextColor] = useState(watermarkSettings.textColor || '#bfa17b');

  useEffect(() => {
      setWText(watermarkSettings.text);
      setWLogo(watermarkSettings.logoUrl);
      setWFontSize(watermarkSettings.fontSize || 30);
      setWBgColor(watermarkSettings.backgroundColor || '#1a1a1a');
      setWTextColor(watermarkSettings.textColor || '#bfa17b');
  }, [watermarkSettings]);

  const handleUpdateBranding = () => {
      setIsSavingBranding(true);
      onUpdateWatermarkSettings({
          text: wText,
          logoUrl: wLogo,
          fontSize: wFontSize,
          backgroundColor: wBgColor,
          textColor: wTextColor,
          showLogo: true,
          logoSize: 80
      });
      setTimeout(() => setIsSavingBranding(false), 800);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, loader: (loading: boolean) => void, folder: string = 'gallery') => {
      const file = e.target.files?.[0];
      if (!file) return;
      loader(true);
      try {
          const fileExt = file.name.split('.').pop();
          const folderPrefix = userId ? `users/${userId}/` : '';
          const fileName = `${folderPrefix}${folder}/${generateId()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          setter(data.publicUrl);
      } catch (error: any) {
          alert("Upload failed: " + error.message);
      } finally {
          loader(false);
          // FORCE RESET input value so it triggers every time
          e.target.value = '';
      }
  };

  const openNewArticle = () => {
      setEditArticleId(null); setModalTitle(''); setModalEnglishTitle(''); setModalSubline(''); setModalContent(''); setModalAuthor(userName || 'Editor'); setModalCategories([categories[0] || 'General']); setModalImageUrl(''); setModalStatus(ArticleStatus.PUBLISHED); setModalIsFeatured(false); setModalPublishedAt(new Date().toISOString()); setShowArticleModal(true);
  };

  const openEditArticle = (article: Article) => {
      setEditArticleId(article.id); setModalTitle(article.title); setModalEnglishTitle(article.englishTitle || ''); setModalSubline(article.subline || ''); setModalContent(article.content); setModalAuthor(article.author); setModalCategories(article.categories); setModalImageUrl(article.imageUrl); setModalStatus(article.status); setModalIsFeatured(article.isFeatured || false); setModalPublishedAt(article.publishedAt); setShowArticleModal(true);
  };

  const handleSaveArticleInternal = () => {
      if (!modalTitle) { alert("Title required"); return; }
      onSaveArticle({
          id: editArticleId || generateId(),
          userId: userId || undefined,
          title: modalTitle,
          englishTitle: modalEnglishTitle,
          subline: modalSubline,
          author: modalAuthor,
          content: modalContent,
          categories: modalCategories.length > 0 ? modalCategories : ['General'],
          imageUrl: modalImageUrl || 'https://picsum.photos/800/400',
          publishedAt: modalPublishedAt,
          status: modalStatus,
          isFeatured: modalIsFeatured,
          isEditorsChoice: false,
          authorAvatar: userAvatar || undefined
      });
      setShowArticleModal(false);
  };

  const handleUploadPage = () => {
      if (!newPageImage) { alert("Please select an image"); return; }
      setIsPageUploading(true);
      onAddPage({ id: generateId(), date: newPageDate, pageNumber: newPageNumber, imageUrl: newPageImage, regions: [] });
      setShowAddPageModal(false);
      setNewPageImage('');
      setIsPageUploading(false);
  };

  const SidebarItem = ({ id, label, icon: Icon }: any) => (
    <button onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${activeTab === id ? 'text-white border-l-4 border-news-gold bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'}`}>
        <Icon size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <>
    <ImageGalleryModal isOpen={showImageGallery} onClose={() => setShowImageGallery(false)} onSelectImage={setModalImageUrl} uploadFolder="articles" userId={userId} />
    <CategorySelector isOpen={showCategorySelector} onClose={() => setShowCategorySelector(false)} options={categories} selected={modalCategories} onChange={setModalCategories} />

    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h1 className="font-serif text-2xl font-bold text-white">Editor<span className="text-news-gold">.</span></h1>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
              <SidebarItem id="articles" label="Content Feed" icon={FileText} />
              <SidebarItem id="epaper" label="E-Paper Manager" icon={Newspaper} />
              <SidebarItem id="idcards" label="Identity Cards" icon={Fingerprint} />
              <SidebarItem id="settings" label="System Settings" icon={Settings} />
          </div>
          <div className="p-6 border-t border-gray-800">
              <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded justify-center mb-2"><Globe size={16} /> Website</button>
              <button onClick={() => { supabase.auth.signOut(); onNavigate('/login'); }} className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded justify-center"><Lock size={16} /> Logout</button>
          </div>
      </div>

      <div className="flex-1 flex flex-col md:ml-64 h-full overflow-hidden bg-[#f8f9fa]">
           <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0">
                <button onClick={() => setIsSidebarOpen(true)} className="text-gray-700"><Menu size={24}/></button>
                <h1 className="font-serif text-lg font-bold text-gray-900">Editor</h1>
           </div>

           <div className="md:p-6 overflow-y-auto flex-1 p-4">
              {activeTab === 'articles' && (
                  <div className="max-w-6xl mx-auto space-y-6">
                      <div className="flex justify-between items-center">
                           <h1 className="font-serif text-2xl font-bold text-gray-900">Editorial Manager</h1>
                           <button onClick={openNewArticle} className="bg-news-black text-white text-xs font-bold uppercase px-4 py-3 rounded flex items-center gap-2 hover:bg-gray-800"><Plus size={16} /> New Dispatch</button>
                      </div>
                      <div className="bg-white rounded border overflow-x-auto shadow-sm">
                          <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                    <tr><th className="px-6 py-4">Article</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Action</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {articles.map((article) => (
                                        <tr key={article.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <img src={article.imageUrl} className="w-12 h-10 object-cover rounded border" />
                                                    <span className="font-bold text-sm text-gray-900 truncate max-w-xs">{article.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4"><span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700">{article.status}</span></td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button onClick={() => openEditArticle(article)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><PenSquare size={16}/></button>
                                                <button onClick={() => onDeleteArticle(article.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                          </table>
                      </div>
                  </div>
              )}

              {activeTab === 'epaper' && (
                  <div className="max-w-6xl mx-auto space-y-8">
                       <div className="flex justify-between items-center">
                           <h1 className="font-serif text-2xl font-bold text-gray-900">E-Paper Archive</h1>
                           <div className="flex gap-2 bg-white p-1 rounded border shadow-sm">
                               <select value={epaperFilterDate} onChange={(e) => setEpaperFilterDate(e.target.value)} className="p-2 bg-transparent text-sm font-bold outline-none border-r pr-4">
                                   {availableEpaperDates.map(d => <option key={d} value={d}>{format(new Date(d), 'MMM dd, yyyy')}</option>)}
                               </select>
                               <button onClick={() => setShowAddPageModal(true)} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-800"><Upload size={14}/> Add Page</button>
                           </div>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                           {filteredPages.map(page => (
                               <div key={page.id} className="group relative bg-white rounded-lg shadow-sm border overflow-hidden">
                                   <img src={page.imageUrl} className="aspect-[3/4] object-cover w-full" />
                                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                       <button onClick={() => onDeletePage(page.id)} className="p-2 bg-red-600 text-white rounded-full"><Trash2 size={16}/></button>
                                   </div>
                                   <div className="p-2 text-center text-xs font-bold">Page {page.pageNumber}</div>
                               </div>
                           ))}
                       </div>
                  </div>
              )}

              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-12 pb-20">
                      {/* E-PAPER BRANDING TOOLS */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><Palette className="text-news-gold" /> E-Paper Branded Clippings</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Watermark Branding Text</label>
                                    <input type="text" value={wText} onChange={e => setWText(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Branding Logo URL</label>
                                    <input type="text" value={wLogo} onChange={e => setWLogo(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Label Scale (%)</label>
                                    <input type="range" min="10" max="60" value={wFontSize} onChange={e => setWFontSize(parseInt(e.target.value))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-news-gold" />
                                    <div className="text-right text-[10px] font-bold mt-1 text-gray-400">{wFontSize}%</div>
                                </div>
                             </div>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Footer Background</label>
                                    <div className="flex gap-2">
                                        <input type="color" value={wBgColor} onChange={e => setWBgColor(e.target.value)} className="w-12 h-10 rounded border p-1 cursor-pointer" />
                                        <input type="text" value={wBgColor} onChange={e => setWBgColor(e.target.value)} className="flex-1 p-2 border rounded font-mono text-xs" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Label Color</label>
                                    <div className="flex gap-2">
                                        <input type="color" value={wTextColor} onChange={e => setWTextColor(e.target.value)} className="w-12 h-10 rounded border p-1 cursor-pointer" />
                                        <input type="text" value={wTextColor} onChange={e => setWTextColor(e.target.value)} className="flex-1 p-2 border rounded font-mono text-xs" />
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <button onClick={handleUpdateBranding} disabled={isSavingBranding} className="w-full bg-news-black text-news-gold py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg">
                                        {isSavingBranding ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} Update Branding
                                    </button>
                                </div>
                             </div>
                          </div>
                      </div>

                      {/* TRUSTED DEVICES */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><ShieldCheck className="text-green-600" /> Authorized Hardware</h2>
                          <div className="space-y-4">
                              {devices.map(device => (
                                  <div key={device.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                                      <div className="flex items-center gap-4">
                                          <div className="p-3 bg-white rounded-full border text-news-blue shadow-sm">
                                              {device.deviceType === 'mobile' ? <Smartphone size={20}/> : device.deviceType === 'tablet' ? <Tablet size={20}/> : <Monitor size={20}/>}
                                          </div>
                                          <div>
                                              <div className="flex items-center gap-2">
                                                  <span className="font-bold text-sm text-gray-900">{device.deviceName}</span>
                                                  {device.isCurrent && <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Current</span>}
                                              </div>
                                              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{device.browser} • {device.location} • Active {device.lastActive}</p>
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          {device.status === 'pending' ? (
                                              <>
                                                <button onClick={() => onApproveDevice(device.id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest">Approve</button>
                                                <button onClick={() => onRejectDevice(device.id)} className="bg-red-600 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest">Reject</button>
                                              </>
                                          ) : (
                                              !device.isPrimary && <button onClick={() => onRevokeDevice(device.id)} className="text-red-500 text-[10px] font-black uppercase tracking-widest p-2 hover:bg-red-50 rounded">Revoke Access</button>
                                          )}
                                      </div>
                                  </div>
                              ))}
                              {devices.length === 0 && <div className="text-center py-10 text-gray-400 text-xs italic">No hardware profiles registered.</div>}
                          </div>
                      </div>
                  </div>
              )}
           </div>
      </div>

      {showArticleModal && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                      <h3 className="font-bold">{editArticleId ? 'Edit Draft' : 'New Dispatch'}</h3>
                      <button onClick={() => setShowArticleModal(false)}><X size={20}/></button>
                  </div>
                  <div className="flex-1 p-6 overflow-y-auto space-y-6">
                      <input type="text" value={modalTitle} onChange={e => setModalTitle(e.target.value)} placeholder="Main Headline" className="w-full text-2xl font-serif font-bold outline-none border-b-2 border-gray-100 focus:border-news-gold pb-2" />
                      <RichTextEditor content={modalContent} onChange={setModalContent} onImageUpload={async () => ''} className="min-h-[400px]" />
                  </div>
                  <div className="px-6 py-4 border-t flex justify-end gap-3 bg-gray-50">
                      <button onClick={() => setShowArticleModal(false)} className="px-6 py-2 text-sm font-bold text-gray-500">Close</button>
                      <button onClick={handleSaveArticleInternal} className="px-8 py-2 bg-news-black text-white rounded text-sm font-black uppercase tracking-widest shadow-lg">Save & Publish</button>
                  </div>
              </div>
          </div>
      )}

      {showAddPageModal && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-in zoom-in-95">
              <div className="bg-white rounded-xl w-full max-w-md p-8 shadow-2xl">
                  <h3 className="text-xl font-serif font-bold mb-6">Archive Upload</h3>
                  <div className="space-y-5">
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Edition Date</label>
                          <input type="date" value={newPageDate} onChange={e => setNewPageDate(e.target.value)} className="w-full p-3 border rounded-lg focus:border-news-gold outline-none" />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Page Number</label>
                          <input type="number" value={newPageNumber} onChange={e => setNewPageNumber(parseInt(e.target.value))} className="w-full p-3 border rounded-lg focus:border-news-gold outline-none" />
                      </div>
                      <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50 group hover:border-news-gold transition-colors">
                          {newPageImage ? (
                              <div className="relative inline-block">
                                  <img src={newPageImage} className="h-40 rounded shadow-md mx-auto" />
                                  <button onClick={() => setNewPageImage('')} className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full"><X size={12}/></button>
                              </div>
                          ) : (
                              <label className="cursor-pointer flex flex-col items-center">
                                  <Upload size={32} className="text-gray-300 group-hover:text-news-gold transition-colors mb-3" />
                                  <span className="text-xs font-bold text-gray-500">Click to Browse Scans</span>
                                  <input type="file" ref={epaperFileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setNewPageImage, setIsPageUploading, 'epaper')} />
                              </label>
                          )}
                      </div>
                      <div className="flex gap-3 pt-4">
                          <button onClick={() => setShowAddPageModal(false)} className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-black transition-colors">Cancel</button>
                          <button onClick={handleUploadPage} disabled={isPageUploading || !newPageImage} className="flex-1 bg-news-black text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-gray-800 transition-all disabled:opacity-50">
                              {isPageUploading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'Upload Scan'}
                          </button>
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
