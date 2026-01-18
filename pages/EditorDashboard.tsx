
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, UserRole, AdSize, AdPlacement, ActivityLog } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, RotateCcw, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Calendar, Loader2, Library, User as UserIcon, Lock,
  Check, Scissors, Camera, Monitor, Smartphone, Tablet, ShieldCheck, AlertTriangle, Code, Copy, RefreshCcw, Type, Star, Save, Award, ChevronDown, Maximize, MapPin, DollarSign, Phone, Filter, Layout as LayoutIcon, Sparkles, Key, Eye, EyeOff, Mail, ShieldAlert, FileClock, UserPlus, Timer
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
  onSaveTaxonomy: () => Promise<void>;
  onAddClassified: (ad: ClassifiedAd) => void;
  onDeleteClassified: (id: string) => void;
  onAddAdvertisement: (ad: Advertisement) => void;
  onUpdateAdvertisement: (ad: Advertisement) => void;
  onDeleteAdvertisement: (id: string) => void;
  onNavigate: (path: string) => void;
  userAvatar?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  devices: TrustedDevice[];
  onApproveDevice: (id: string) => void;
  onRejectDevice: (id: string) => void;
  onRevokeDevice: (id: string) => void;
  userId?: string | null;
  activeVisitors?: number;
  logs?: ActivityLog[];
}

const EditorDashboard: React.FC<EditorDashboardProps> = ({ 
  articles, ePaperPages, categories, tags = [], adCategories, classifieds, advertisements,
  onAddPage, onDeletePage, onDeleteArticle, onSaveArticle, 
  onAddCategory, onDeleteCategory, onAddTag, onDeleteTag, onAddAdCategory, onDeleteAdCategory, onSaveTaxonomy,
  onAddClassified, onDeleteClassified, onAddAdvertisement, onUpdateAdvertisement, onDeleteAdvertisement,
  onNavigate, watermarkSettings, onUpdateWatermarkSettings, userName, userAvatar, userEmail,
  devices, onApproveDevice, onRejectDevice, onRevokeDevice, globalAdsEnabled, onToggleGlobalAds, userId, activeVisitors,
  logs = []
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'epaper' | 'ads' | 'taxonomy' | 'analytics' | 'settings'>('articles');

  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalEnglishTitle, setModalEnglishTitle] = useState('');
  const [modalSubline, setModalSubline] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalAuthor, setModalAuthor] = useState('Editor');
  const [modalCategories, setModalCategories] = useState<string[]>([]);
  const [modalTags, setModalTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalStatus, setModalStatus] = useState<ArticleStatus>(ArticleStatus.PUBLISHED);
  const [modalIsFeatured, setModalIsFeatured] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [modalPublishedAt, setModalPublishedAt] = useState<string>(new Date().toISOString());
  
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageDate, setNewPageDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [newPageImage, setNewPageImage] = useState('');
  const [isPageUploading, setIsPageUploading] = useState(false);
  
  const availableEpaperDates = useMemo(() => {
      return Array.from(new Set(ePaperPages.map(p => p.date))).sort().reverse();
  }, [ePaperPages]);
  
  const [epaperFilterDate, setEpaperFilterDate] = useState<string>(availableEpaperDates[0] || new Date().toISOString().split('T')[0]);

  useEffect(() => {
      if (availableEpaperDates.length > 0 && !availableEpaperDates.includes(epaperFilterDate)) setEpaperFilterDate(availableEpaperDates[0]);
  }, [availableEpaperDates]);

  const filteredPages = useMemo(() => {
      return ePaperPages.filter(p => p.date === epaperFilterDate).sort((a, b) => a.pageNumber - b.pageNumber);
  }, [ePaperPages, epaperFilterDate]);

  const [showAdModal, setShowAdModal] = useState(false);
  const [newAd, setNewAd] = useState<Partial<Advertisement>>({ size: 'RECTANGLE', placement: 'GLOBAL', isActive: true });
  const [showClassifiedModal, setShowClassifiedModal] = useState(false);
  const [newClassified, setNewClassified] = useState<Partial<ClassifiedAd>>({});
  const [showAdImageGallery, setShowAdImageGallery] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);

  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [isSavingTaxonomy, setIsSavingTaxonomy] = useState(false);

  const [profileName, setProfileName] = useState(userName || '');
  const [profileEmail, setProfileEmail] = useState(userEmail || '');
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [watermarkText, setWatermarkText] = useState(watermarkSettings.text);
  const [watermarkLogo, setWatermarkLogo] = useState(watermarkSettings.logoUrl);
  const [watermarkFontSize, setWatermarkFontSize] = useState(watermarkSettings.fontSize || 30);
  const [isSavingDevices, setIsSavingDevices] = useState(false);

  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.WRITER);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  const isPrimaryDevice = devices.find(d => d.isCurrent)?.isPrimary || false;
  const [customApiKey, setCustomApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
      const storedKey = localStorage.getItem('newsroom_custom_api_key');
      if (storedKey) setCustomApiKey(storedKey);
  }, []);

  const handleSaveApiKey = () => {
      localStorage.setItem('newsroom_custom_api_key', customApiKey);
      setShowKeyInput(false);
      alert("API Key saved locally.");
  };

  useEffect(() => {
    setWatermarkText(watermarkSettings.text);
    setWatermarkLogo(watermarkSettings.logoUrl);
    setWatermarkFontSize(watermarkSettings.fontSize || 30);
  }, [watermarkSettings]);

  const handleSaveSettings = async () => {
    if (!profileName.trim()) { alert("Name is required."); return; }
    setIsSavingSettings(true);
    try {
      const updates: any = { 
          data: { 
              full_name: profileName.trim(), 
              avatar_url: profileAvatar.trim() 
          } 
      };
      if (newPassword.trim()) updates.password = newPassword.trim();
      if (profileEmail.trim() !== userEmail) updates.email = profileEmail.trim();

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      
      alert(profileEmail.trim() !== userEmail ? "Settings updated! Check your new email for confirmation." : "Profile updated successfully!");
      setNewPassword('');
    } catch (err: any) {
      alert("Error updating profile: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAvatarUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/avatars/${generateId()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        setProfileAvatar(data.publicUrl);
    } catch (error: any) {
        alert("Upload Failed: " + error.message);
    } finally {
        setIsAvatarUploading(false);
    }
  };

  const SidebarItem = ({ id, label, icon: Icon, badge }: { id: typeof activeTab, label: string, icon: any, badge?: number }) => (
    <button 
        onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${activeTab === id ? 'text-white border-l-4 border-news-gold bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'}`}
    >
        <Icon size={18} />
        <span className="text-xs font-bold uppercase tracking-widest flex-1 text-left">{label}</span>
        {badge ? <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{badge}</span> : null}
    </button>
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, loader: (loading: boolean) => void, folder: string = 'gallery') => {
      const file = e.target.files?.[0];
      if (!file) return;
      loader(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${userId}/${folder}/${generateId()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          setter(data.publicUrl);
      } catch (error: any) { alert("Upload failed: " + error.message); } finally { loader(false); }
  };

  const handleSaveArticleInternal = () => {
      if (!modalTitle) { alert("Title required"); return; }
      const article: Article = {
          id: editArticleId || generateId(), userId: userId || undefined, title: modalTitle, englishTitle: modalEnglishTitle, subline: modalSubline, author: modalAuthor, content: modalContent, categories: modalCategories.length > 0 ? modalCategories : ['General'], tags: modalTags, imageUrl: modalImageUrl || 'https://placehold.co/800x400?text=No+Image', publishedAt: modalPublishedAt, status: modalStatus, isFeatured: modalIsFeatured, authorAvatar: userAvatar || undefined
      };
      onSaveArticle(article);
      setShowArticleModal(false);
  };

  const handleSaveAd = () => {
      if (!newAd.title || !newAd.imageUrl) { alert("Title and Image are required."); return; }
      const adPayload: Advertisement = {
          id: editingAdId || generateId(), title: newAd.title!, imageUrl: newAd.imageUrl!, linkUrl: newAd.linkUrl,
          size: newAd.size as AdSize, placement: newAd.placement as AdPlacement, targetCategory: newAd.targetCategory, isActive: newAd.isActive !== undefined ? newAd.isActive : true
      };
      if (editingAdId) onUpdateAdvertisement(adPayload); else onAddAdvertisement(adPayload);
      setShowAdModal(false); setNewAd({ size: 'RECTANGLE', placement: 'GLOBAL', isActive: true }); setEditingAdId(null);
  };

  return (
    <>
    <ImageGalleryModal isOpen={showImageGallery} onClose={() => setShowImageGallery(false)} onSelectImage={(url) => { setModalImageUrl(url); setShowImageGallery(false); }} uploadFolder="articles" userId={userId} />
    <ImageGalleryModal isOpen={showAdImageGallery} onClose={() => setShowAdImageGallery(false)} onSelectImage={(url) => { setNewAd({...newAd, imageUrl: url}); setShowAdImageGallery(false); }} uploadFolder="ads" userId={userId} />
    <CategorySelector isOpen={showCategorySelector} onClose={() => setShowCategorySelector(false)} options={categories} selected={modalCategories} onChange={setModalCategories} />

    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h1 className="font-serif text-2xl font-bold text-white">Editor<span className="text-news-gold">.</span></h1>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
              <SidebarItem id="articles" label="Editorial Content" icon={FileText} />
              <SidebarItem id="epaper" label="E-Paper Manager" icon={Newspaper} />
              <SidebarItem id="ads" label="Ads & Classifieds" icon={Megaphone} />
              <SidebarItem id="taxonomy" label="Categories & Tags" icon={Tag} />
              <SidebarItem id="analytics" label="Analytics" icon={BarChart3} />
              <SidebarItem id="settings" label="System Settings" icon={Settings} badge={devices.filter(d => d.status === 'pending').length} />
          </div>
          <div className="p-6 border-t border-gray-800">
              <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center mb-2"><Globe size={16} /> Website</button>
              <button onClick={() => { supabase.auth.signOut(); onNavigate('/login'); }} className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center"><Lock size={16} /> Logout</button>
          </div>
      </div>

      <div className="flex-1 flex flex-col md:ml-64 h-full overflow-hidden bg-[#f8f9fa]">
           <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0 sticky top-0 z-40 shadow-sm">
                <button onClick={() => setIsSidebarOpen(true)} className="text-gray-700"><Menu size={24}/></button>
                <h1 className="font-serif text-lg font-bold text-gray-900">Editor Dashboard</h1>
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                     {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover"/> : <UserIcon className="p-1.5 text-gray-400 w-full h-full"/>}
                </div>
           </div>

           <div className="md:p-6 overflow-y-auto flex-1 p-4">
              {activeTab === 'articles' && (
                  <div className="max-w-6xl mx-auto space-y-6">
                      <div className="flex justify-between items-center">
                           <h1 className="font-serif text-2xl font-bold text-gray-900">Article Manager</h1>
                           <button onClick={() => { setEditArticleId(null); setModalTitle(''); setModalEnglishTitle(''); setModalSubline(''); setModalContent(''); setModalAuthor(userName || 'Editor'); setModalCategories([categories[0] || 'General']); setModalTags([]); setModalImageUrl(''); setModalStatus(ArticleStatus.PUBLISHED); setModalIsFeatured(false); setModalPublishedAt(new Date().toISOString()); setShowArticleModal(true); }} className="bg-news-black text-white text-xs font-bold uppercase px-4 py-3 rounded flex items-center gap-2 hover:bg-gray-800"><Plus size={16} /> New Article</button>
                      </div>
                      <div className="bg-white rounded border overflow-x-auto shadow-sm">
                          <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                    <tr><th className="px-6 py-4">Article Details</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {articles.map((article) => (
                                        <tr key={article.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden shrink-0 border border-gray-200"><img src={article.imageUrl} className="w-full h-full object-cover" /></div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm line-clamp-1">{article.title}</p>
                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">{article.categories[0]}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{article.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => { setEditArticleId(article.id); setModalTitle(article.title); setModalEnglishTitle(article.englishTitle || ''); setModalSubline(article.subline || ''); setModalContent(article.content); setModalAuthor(article.author); setModalCategories(article.categories); setModalTags(article.tags || []); setModalImageUrl(article.imageUrl); setModalStatus(article.status); setModalIsFeatured(article.isFeatured || false); setModalPublishedAt(article.publishedAt); setShowArticleModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><PenSquare size={16}/></button>
                                                    <button onClick={() => onDeleteArticle(article.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                                </div>
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
                           <h1 className="font-serif text-2xl font-bold text-gray-900">E-Paper Editions</h1>
                           <div className="flex items-center gap-2 bg-white p-1 rounded border shadow-sm">
                               <select value={epaperFilterDate} onChange={(e) => setEpaperFilterDate(e.target.value)} className="p-2 bg-transparent text-sm font-bold outline-none border-r pr-4">
                                   {availableEpaperDates.map(d => <option key={d} value={d}>{format(new Date(d), 'MMM dd, yyyy')}</option>)}
                               </select>
                               <button onClick={() => setShowAddPageModal(true)} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-800"><Upload size={14}/> Upload Page</button>
                           </div>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                           {filteredPages.map(page => (
                               <div key={page.id} className="group relative bg-white rounded-lg shadow-sm border overflow-hidden aspect-[3/4]">
                                   <img src={page.imageUrl} className="w-full h-full object-cover" />
                                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><button onClick={() => onDeletePage(page.id)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"><Trash2 size={16}/></button></div>
                                   <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/50 text-white text-center text-[10px] font-bold">Page {page.pageNumber}</div>
                               </div>
                           ))}
                       </div>
                  </div>
              )}

              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-12 pb-20 pt-4">
                      <div className={`bg-white rounded-xl border p-6 md:p-8 shadow-sm relative overflow-hidden ${!isPrimaryDevice ? 'opacity-80' : ''}`}>
                          {!isPrimaryDevice && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center p-6 text-center">
                                  <ShieldAlert className="text-gray-400 mb-2" size={48} />
                                  <h3 className="font-bold text-gray-800">Profile Locked</h3>
                                  <p className="text-xs text-gray-500 mt-1 max-w-sm">Security Policy: Profile modifications are restricted to the <b>Primary Device</b> only.</p>
                              </div>
                          )}
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><UserIcon className="text-news-gold" /> Profile Settings</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Display Name</label>
                                    <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Avatar</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">{profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-3 text-gray-300" />}</div>
                                        <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                                            {isAvatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />} <span>Upload</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isAvatarUploading} />
                                        </label>
                                    </div>
                                    <input type="text" value={profileAvatar} onChange={e => setProfileAvatar(e.target.value)} className="w-full mt-2 p-2 border border-gray-200 rounded-lg text-xs text-gray-500 outline-none" placeholder="Image URL..." />
                                </div>
                             </div>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Change Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 pr-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" placeholder="New Password" />
                                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full bg-news-black text-news-gold py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg">
                                        {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Update Profile
                                    </button>
                                </div>
                             </div>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><Settings className="text-news-gold" /> System Configuration</h2>
                          <div className="space-y-6">
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                  <div><h3 className="font-bold text-sm text-gray-900">Global Ad Delivery</h3><p className="text-xs text-gray-500 mt-1">Master switch to enable/disable ads site-wide.</p></div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={globalAdsEnabled} onChange={(e) => onToggleGlobalAds(e.target.checked)} className="sr-only peer" />
                                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-news-black"></div>
                                  </label>
                              </div>
                              <div>
                                  <h3 className="font-bold text-sm text-gray-900 mb-4">Watermark Branding</h3>
                                  <div className="flex gap-2">
                                      <input type="text" value={watermarkText} onChange={e => setWatermarkText(e.target.value)} className="flex-1 p-2 border rounded text-sm" placeholder="Watermark Text" />
                                      <button onClick={() => onUpdateWatermarkSettings({ ...watermarkSettings, text: watermarkText, logoUrl: watermarkLogo, fontSize: watermarkFontSize })} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase">Save</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
           </div>
      </div>
    </div>
    </>
  );
};

export default EditorDashboard;
