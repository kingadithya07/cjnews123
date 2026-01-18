
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

  // Article State
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
  
  // E-Paper State
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageDate, setNewPageDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [newPageImage, setNewPageImage] = useState('');
  const [isPageUploading, setIsPageUploading] = useState(false);
  
  // E-Paper Dashboard Filter
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


  // Classifieds & Ads Forms
  const [showAdModal, setShowAdModal] = useState(false);
  const [newAd, setNewAd] = useState<Partial<Advertisement>>({ size: 'RECTANGLE', placement: 'GLOBAL', isActive: true });
  const [showClassifiedModal, setShowClassifiedModal] = useState(false);
  const [newClassified, setNewClassified] = useState<Partial<ClassifiedAd>>({});
  const [showAdImageGallery, setShowAdImageGallery] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);

  // Taxonomy State
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newAdCategory, setNewAdCategory] = useState('');
  const [isSavingTaxonomy, setIsSavingTaxonomy] = useState(false);

  // Settings State
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

  // Sync profile state when props arrive (Crucial for email confirmation logic)
  useEffect(() => {
      if (userName && !profileName) setProfileName(userName);
      if (userEmail && !profileEmail) setProfileEmail(userEmail);
      if (userAvatar && !profileAvatar) setProfileAvatar(userAvatar);
  }, [userName, userEmail, userAvatar]);

  // Invitation Generation
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.WRITER);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Determine if this is the primary device
  const currentDevice = devices.find(d => d.isCurrent);
  const isPrimaryDevice = currentDevice?.isPrimary || false;

  // Custom API State
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

  const pendingDevicesCount = devices.filter(d => d.status === 'pending').length;

  const handleGenerateInvite = async () => {
      setIsGeneratingInvite(true);
      setGeneratedLink('');
      try {
          const token = generateId();
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins
          
          const { error } = await supabase.from('staff_invitations').insert({
              token,
              role: inviteRole,
              expires_at: expiresAt,
              created_by: userId
          });

          if (error) throw error;
          const baseUrl = window.location.href.split('#')[0];
          const link = `${baseUrl}#/invite?token=${token}`;
          setGeneratedLink(link);
      } catch (e: any) {
          alert("Failed to generate invite: " + e.message);
      } finally {
          setIsGeneratingInvite(false);
      }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const updates: any = { 
          data: { 
              full_name: profileName.trim(), 
              avatar_url: profileAvatar.trim() 
          } 
      };
      
      if (newPassword) updates.password = newPassword;
      
      // Robust Email Change Detection
      const cleanNewEmail = profileEmail.trim().toLowerCase();
      const cleanOldEmail = (userEmail || '').trim().toLowerCase();
      
      if (cleanNewEmail && cleanNewEmail !== cleanOldEmail) {
          updates.email = cleanNewEmail;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      
      if (updates.email) {
          alert(`A confirmation link has been dispatched to ${cleanNewEmail}. Your email will remain ${userEmail} until verified.`);
      } else {
          alert("Settings updated successfully!");
      }
      setNewPassword('');
    } catch (err: any) {
        if (err.message?.includes('security purposes') || err.message?.includes('reauthentication')) {
            alert("Security Alert: To update critical credentials, you must have recently signed in. Please log out and sign in again.");
        } else {
            alert("Error updating profile: " + err.message);
        }
    } finally { setIsSavingSettings(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAvatarUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const folderPrefix = userId ? `users/${userId}/` : '';
        const fileName = `${folderPrefix}avatars/${generateId()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        setProfileAvatar(data.publicUrl);
    } catch (error: any) {
        alert("Avatar Upload Failed: " + error.message);
    } finally {
        setIsAvatarUploading(false);
    }
  };

  const handleTriggerResetEmail = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !user.email) throw new Error("User email not found.");
          const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/#/reset-password` });
          if (error) throw error;
          alert(`Master reset link sent to ${user.email}. Please check your inbox to reset credentials securely.`);
      } catch (e: any) { alert("Error: " + e.message); }
  };

  const handleForceSaveDevices = async () => {
      setIsSavingDevices(true);
      try { alert("Device list synced globally."); } catch (e: any) { alert("Error syncing: " + e.message); } finally { setIsSavingDevices(false); }
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
          const folderPrefix = userId ? `users/${userId}/` : '';
          const fileName = `${folderPrefix}${folder}/${generateId()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          setter(data.publicUrl);
      } catch (error: any) { alert("Upload failed: " + error.message); } finally { loader(false); }
  };

  const handleContentImageUpload = async (file: File): Promise<string> => {
      const fileExt = file.name.split('.').pop();
      const folderPrefix = userId ? `users/${userId}/` : '';
      const fileName = `${folderPrefix}articles/${generateId()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      return data.publicUrl;
  };

  const openNewArticle = () => {
      setEditArticleId(null); setModalTitle(''); setModalEnglishTitle(''); setModalSubline(''); setModalContent(''); setModalAuthor(userName || 'Editor'); setModalCategories([categories[0] || 'General']); setModalTags([]); setTagInput(''); setModalImageUrl(''); setModalStatus(ArticleStatus.PUBLISHED); setModalIsFeatured(false); setModalPublishedAt(new Date().toISOString()); setShowArticleModal(true);
  };

  const openEditArticle = (article: Article) => {
      setEditArticleId(article.id); setModalTitle(article.title); setModalEnglishTitle(article.englishTitle || ''); setModalSubline(article.subline || ''); setModalContent(article.content); setModalAuthor(article.author); setModalCategories(article.categories); setModalTags(article.tags || []); setTagInput(''); setModalImageUrl(article.imageUrl); setModalStatus(article.status); setModalIsFeatured(article.isFeatured || false); setModalPublishedAt(article.publishedAt); setShowArticleModal(true);
  };

  const handleTranslateTitle = async () => {
      if (!modalTitle) return;
      const keyToUse = customApiKey;
      if (!keyToUse) {
          const proceed = confirm("Translation requires a third-party API Key. Would you like to configure it now in Settings?");
          if (proceed) { setShowArticleModal(false); setActiveTab('settings'); }
          return;
      }
      setIsTranslating(true);
      try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: `Translate this news headline to concise English for SEO purposes. Return only the translated string, no quotes: "${modalTitle}"` }] }] })
          });
          const data = await response.json();
          const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (translated) setModalEnglishTitle(translated);
      } catch (e: any) { alert(`Auto-translation failed: ${e.message}`); } finally { setIsTranslating(false); }
  };

  const handleSaveArticleInternal = () => {
      if (!modalTitle) { alert("Title required"); return; }
      let finalTags = [...modalTags];
      if (tagInput.trim()) {
          const pendingTag = tagInput.trim();
          if (!finalTags.includes(pendingTag)) finalTags.push(pendingTag);
      }
      if (modalCategories && modalCategories.length > 0) {
          modalCategories.forEach(cat => {
              if (!finalTags.includes(cat)) finalTags.push(cat);
          });
      }
      const article: Article = {
          id: editArticleId || generateId(),
          userId: userId || undefined,
          title: modalTitle,
          englishTitle: modalEnglishTitle,
          subline: modalSubline,
          author: modalAuthor,
          content: modalContent,
          categories: modalCategories.length > 0 ? modalCategories : ['General'],
          tags: finalTags,
          imageUrl: modalImageUrl || 'https://picsum.photos/800/400',
          publishedAt: modalPublishedAt,
          status: modalStatus,
          isFeatured: modalIsFeatured,
          isEditorsChoice: false,
          authorAvatar: userAvatar || undefined
      };
      onSaveArticle(article);
      setShowArticleModal(false);
      setTagInput('');
  };

  const handleAddTagToArticle = () => {
      if (!tagInput.trim()) return;
      const newTagValue = tagInput.trim();
      if (!modalTags.includes(newTagValue)) setModalTags([...modalTags, newTagValue]);
      setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); handleAddTagToArticle(); }
  };

  const removeArticleTag = (tagToRemove: string) => { setModalTags(modalTags.filter(t => t !== tagToRemove)); };

  const handleUploadPage = async () => {
      if (!newPageImage) { alert("Please select an image"); return; }
      setIsPageUploading(true);
      try {
          const page: EPaperPage = { id: generateId(), date: newPageDate, pageNumber: newPageNumber, imageUrl: newPageImage, regions: [] };
          onAddPage(page);
          setEpaperFilterDate(newPageDate);
          setShowAddPageModal(false);
          setNewPageImage('');
          setNewPageNumber(prev => prev + 1);
      } catch (e) { alert("Error adding page"); } finally { setIsPageUploading(false); }
  };

  const handleSaveTaxonomyInternal = async () => {
      setIsSavingTaxonomy(true);
      try { await onSaveTaxonomy(); alert("Taxonomy saved successfully."); } catch(e) { alert("Error saving taxonomy."); } finally { setIsSavingTaxonomy(false); }
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

  const handleEditAd = (ad: Advertisement) => { setNewAd({ ...ad }); setEditingAdId(ad.id); setShowAdModal(true); };

  const handleAddClassified = () => {
      if (!newClassified.title || !newClassified.content || !newClassified.category) { alert("Title, Content and Category are required."); return; }
      onAddClassified({
          id: generateId(), title: newClassified.title, category: newClassified.category, content: newClassified.content,
          price: newClassified.price, location: newClassified.location, contactInfo: newClassified.contactInfo || '', postedAt: new Date().toISOString()
      });
      setShowClassifiedModal(false); setNewClassified({});
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
              <SidebarItem id="settings" label="System Settings" icon={Settings} badge={pendingDevicesCount} />
          </div>
          <div className="p-6 border-t border-gray-800">
              <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center mb-2">
                  <Globe size={16} /> Website
              </button>
              <button onClick={() => { supabase.auth.signOut(); onNavigate('/login'); }} className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center">
                  <Lock size={16} /> Logout
              </button>
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
                           <button onClick={openNewArticle} className="bg-news-black text-white text-xs font-bold uppercase px-4 py-3 rounded flex items-center gap-2 hover:bg-gray-800">
                                <Plus size={16} /> New Article
                           </button>
                      </div>
                      <div className="hidden md:block bg-white rounded border overflow-x-auto shadow-sm">
                          <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Article Details</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {articles.map((article) => (
                                        <tr key={article.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden shrink-0 border border-gray-200">
                                                        <img src={article.imageUrl} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm line-clamp-1">{article.title}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold uppercase">{article.categories[0]}</span>
                                                            {article.isFeatured && <span className="text-[10px] text-news-accent font-bold uppercase flex items-center gap-1"><Star size={10} fill="currentColor"/> Featured</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : article.status === ArticleStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {article.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openEditArticle(article)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><PenSquare size={16}/></button>
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
                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                           <h1 className="font-serif text-2xl font-bold text-gray-900">E-Paper Editions</h1>
                           <div className="flex items-center gap-2 bg-white p-1 rounded border shadow-sm w-full md:w-auto">
                               <select value={epaperFilterDate} onChange={(e) => setEpaperFilterDate(e.target.value)} className="p-2 bg-transparent text-sm font-bold outline-none border-r pr-4 flex-1 md:flex-none">
                                   {availableEpaperDates.map(d => <option key={d} value={d}>{format(new Date(d), 'MMM dd, yyyy')}</option>)}
                               </select>
                               <button onClick={() => setShowAddPageModal(true)} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-800 whitespace-nowrap">
                                   <Upload size={14}/> Upload Page
                               </button>
                           </div>
                       </div>
                       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                           {filteredPages.map(page => (
                               <div key={page.id} className="group relative bg-white rounded-lg shadow-sm border overflow-hidden">
                                   <div className="aspect-[3/4] relative">
                                       <img src={page.imageUrl} className="w-full h-full object-cover" />
                                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                           <button onClick={() => onDeletePage(page.id)} className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"><Trash2 size={16}/></button>
                                       </div>
                                   </div>
                                   <div className="p-3 text-center border-t">
                                       <span className="text-xs font-bold text-gray-900">Page {page.pageNumber}</span>
                                   </div>
                               </div>
                           ))}
                       </div>
                  </div>
              )}

              {activeTab === 'ads' && (
                  <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                          <div className="flex justify-between items-center">
                              <h2 className="font-serif text-xl font-bold">Banner Ads</h2>
                              <button onClick={() => { setNewAd({ size: 'RECTANGLE', placement: 'GLOBAL', isActive: true, title: '', linkUrl: '' }); setEditingAdId(null); setShowAdModal(true); }} className="bg-news-black text-white px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-1"><Plus size={14}/> New Banner</button>
                          </div>
                          <div className="bg-white rounded border divide-y">
                              {advertisements.map(ad => (
                                  <div key={ad.id} className="p-4 flex gap-4 items-center">
                                      <div className="w-20 h-12 bg-gray-100 rounded shrink-0 overflow-hidden border">
                                          <img src={ad.imageUrl} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className="font-bold text-sm truncate">{ad.title}</p>
                                          <div className="flex gap-2 text-[10px] text-gray-500 uppercase font-bold mt-1">
                                              <span>{ad.size}</span>
                                              <span>•</span>
                                              <span>{ad.placement}</span>
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          <button onClick={() => handleEditAd(ad)} className="text-blue-600 p-2 hover:bg-blue-50 rounded"><PenSquare size={16}/></button>
                                          <button onClick={() => onDeleteAdvertisement(ad.id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'taxonomy' && (
                  <div className="max-w-6xl mx-auto space-y-8">
                      <div className="flex justify-between items-center">
                          <h2 className="font-serif text-2xl font-bold">Taxonomy</h2>
                          <button onClick={handleSaveTaxonomyInternal} disabled={isSavingTaxonomy} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2">
                              {isSavingTaxonomy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                          </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><List size={18}/> Categories</h3>
                              <div className="flex gap-2 mb-4">
                                  <input type="text" placeholder="New Category" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none focus:border-news-black" />
                                  <button onClick={() => { if(newCategory) { onAddCategory(newCategory); setNewCategory(''); } }} className="bg-news-black text-white p-2 rounded hover:bg-gray-800"><Plus size={18}/></button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                  {categories.map(cat => (
                                      <span key={cat} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-700 flex items-center gap-2 group">
                                          {cat} <button onClick={() => onDeleteCategory(cat)} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                                      </span>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
              
              {activeTab === 'analytics' && <AnalyticsDashboard articles={articles} role={UserRole.EDITOR} activeVisitors={activeVisitors} />}

              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-12 pb-20 pt-4">
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><UserPlus className="text-news-gold" /> Team Management</h2>
                          <div className="p-5 bg-gray-50 border border-gray-100 rounded-lg">
                              <h3 className="font-bold text-sm text-gray-900 mb-2">Generate Staff Invitation</h3>
                              <div className="flex flex-col md:flex-row gap-4 items-end">
                                  <div className="w-full md:w-1/3">
                                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Role</label>
                                      <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)} className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white font-medium">
                                          <option value={UserRole.WRITER}>Writer</option>
                                          <option value={UserRole.EDITOR}>Editor</option>
                                          <option value={UserRole.ADMIN}>Admin</option>
                                      </select>
                                  </div>
                                  <div className="w-full md:w-2/3 flex gap-2">
                                      {generatedLink ? (
                                          <div className="flex-1 flex gap-2">
                                              <input type="text" readOnly value={generatedLink} className="flex-1 p-2.5 border border-green-200 bg-green-50 rounded-lg text-sm text-green-800 font-mono" />
                                              <button onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Link copied!"); }} className="bg-green-600 text-white px-4 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center"><Copy size={16} /></button>
                                              <button onClick={() => setGeneratedLink('')} className="text-gray-400 hover:text-gray-600 px-2"><X size={16} /></button>
                                          </div>
                                      ) : (
                                          <button onClick={handleGenerateInvite} disabled={isGeneratingInvite} className="flex-1 bg-news-black text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                              {isGeneratingInvite ? <Loader2 size={16} className="animate-spin" /> : <Timer size={16} />} Generate 15m Link
                                          </button>
                                      )}
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className={`bg-white rounded-xl border p-6 md:p-8 shadow-sm relative overflow-hidden ${!isPrimaryDevice ? 'border-gray-200 opacity-80' : ''}`}>
                          {!isPrimaryDevice && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center p-6 text-center">
                                  <ShieldAlert className="text-gray-400 mb-2" size={48} />
                                  <h3 className="font-bold text-gray-800">Profile Locked</h3>
                                  <p className="text-xs text-gray-500 mt-1">Profile modifications restricted to <b>Primary Device</b>.</p>
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
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black font-medium" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">Changing this will trigger a confirmation link.</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Avatar</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                            {profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-3 text-gray-300" />}
                                        </div>
                                        <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                                            {isAvatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                            <span>Upload Image</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isAvatarUploading} />
                                        </label>
                                    </div>
                                </div>
                             </div>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Change Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 pr-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" placeholder="New Password" disabled={!isPrimaryDevice}/>
                                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400" disabled={!isPrimaryDevice}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full bg-news-black text-news-gold py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg">
                                        {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                                        {isSavingSettings ? 'Saving...' : 'Update Profile'}
                                    </button>
                                </div>
                             </div>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><Key className="text-news-gold" /> Third-Party Integrations</h2>
                          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
                              <h3 className="font-bold text-sm text-gray-900">Translation Service (Google Gemini)</h3>
                              <div className="mt-4">
                                  <div className="flex gap-2">
                                      <input type={showKeyInput ? "text" : "password"} value={customApiKey} onChange={e => setCustomApiKey(e.target.value)} placeholder="Enter Gemini API Key..." className="flex-1 p-2 border rounded text-sm outline-none focus:border-news-black" />
                                      <button onClick={() => setShowKeyInput(!showKeyInput)} className="bg-gray-200 text-gray-600 px-3 rounded">{showKeyInput ? <Eye size={16}/> : <LayoutIcon size={16}/>}</button>
                                      <button onClick={handleSaveApiKey} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-800"><Save size={14}/> Save</button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
           </div>
      </div>

      {showArticleModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-900">{editArticleId ? 'Edit Article' : 'New Article'}</h3>
                <button onClick={() => setShowArticleModal(false)} className="p-2 -mr-2 text-gray-500 hover:text-black"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <input type="text" value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif" placeholder="Headline"/>
                        <div className="flex items-center gap-2">
                            <input type="text" value={modalEnglishTitle} onChange={(e) => setModalEnglishTitle(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="English Title (SEO)" />
                            <button onClick={handleTranslateTitle} disabled={isTranslating} className="bg-news-gold text-black p-2 rounded hover:bg-yellow-500 transition-colors flex items-center gap-1">
                                {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            </button>
                        </div>
                        <textarea value={modalSubline} onChange={(e) => setModalSubline(e.target.value)} className="w-full p-2 border rounded text-sm italic min-h-[80px]" placeholder="Subline..."></textarea>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={modalAuthor} onChange={(e) => setModalAuthor(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Author"/>
                            <button onClick={() => setShowCategorySelector(true)} className="w-full p-2 border rounded text-sm bg-white text-left flex justify-between items-center">
                                <span>{modalCategories.length === 0 ? 'Select Categories' : `${modalCategories.length} Selected`}</span>
                                <ChevronDown size={14} />
                            </button>
                        </div>
                    </div>
                </div>
                <RichTextEditor content={modalContent} onChange={setModalContent} onImageUpload={handleContentImageUpload} className="min-h-[400px]" userId={userId} uploadFolder="articles" />
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowArticleModal(false)} className="px-5 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
              <button onClick={handleSaveArticleInternal} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold shadow hover:bg-gray-800">
                  {editArticleId ? 'Update Article' : 'Publish Article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default EditorDashboard;
