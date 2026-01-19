
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, UserRole, AdSize, AdPlacement, ActivityLog, UserProfile } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, RotateCcw, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Calendar, Loader2, Library, User as UserIcon, Lock,
  Check, Scissors, Camera, Monitor, Smartphone, Tablet, ShieldCheck, AlertTriangle, Code, Copy, RefreshCcw, Type, Star, Save, Award, ChevronDown, Maximize, MapPin, DollarSign, Phone, Filter, Layout as LayoutIcon, Sparkles, Key, Eye, EyeOff, Mail, ShieldAlert, FileClock, UserPlus, Timer, ToggleLeft, Users
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
  users?: UserProfile[]; // List of registered users
  onBlockUser?: (userId: string) => void;
  translationApiKey?: string;
  onUpdateTranslationKey?: (key: string) => void;
}

const EditorDashboard: React.FC<EditorDashboardProps> = ({ 
  articles, ePaperPages, categories, tags = [], adCategories, classifieds, advertisements,
  onAddPage, onDeletePage, onDeleteArticle, onSaveArticle, 
  onAddCategory, onDeleteCategory, onAddTag, onDeleteTag, onAddAdCategory, onDeleteAdCategory, onSaveTaxonomy,
  onAddClassified, onDeleteClassified, onAddAdvertisement, onUpdateAdvertisement, onDeleteAdvertisement,
  onNavigate, watermarkSettings, onUpdateWatermarkSettings, userName, userAvatar, userEmail,
  devices, onApproveDevice, onRejectDevice, onRevokeDevice, globalAdsEnabled, onToggleGlobalAds, userId, activeVisitors,
  logs = [], users = [], onBlockUser, translationApiKey = '', onUpdateTranslationKey
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'epaper' | 'ads' | 'taxonomy' | 'analytics' | 'settings' | 'team'>('articles');

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

  // Invitation Generation
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.WRITER);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Determine if this is the primary device
  const currentDevice = devices.find(d => d.isCurrent);
  const isPrimaryDevice = currentDevice?.isPrimary || false;

  // Custom API State
  const [localApiKey, setLocalApiKey] = useState(translationApiKey);
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
      setLocalApiKey(translationApiKey);
  }, [translationApiKey]);

  const handleSaveApiKey = () => {
      if(onUpdateTranslationKey) {
          onUpdateTranslationKey(localApiKey);
          setShowKeyInput(false);
          alert("API Key updated globally.");
      }
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
          // Expiration set to 5 minutes
          const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); 
          
          const { error } = await supabase.from('staff_invitations').insert({
              token,
              role: inviteRole,
              expires_at: expiresAt,
              created_by: userId
          });

          if (error) throw error;

          // Robust Link Generation: Ensure absolute URL and correct hash formatting
          // Strips any existing hash from base URL to avoid double hash issues
          const baseUrl = window.location.href.split('#')[0];
          const link = `${baseUrl}#/invite?token=${token}`;
          setGeneratedLink(link);
      } catch (e: any) {
          if (e.message && (e.message.includes("Could not find the table") || e.message.includes("relation \"public.staff_invitations\" does not exist"))) {
              alert("SYSTEM ERROR: The invitations table is missing. Please execute the 'SUPABASE_SETUP.sql' script in your Supabase SQL Editor.");
          } else {
              alert("Failed to generate invite: " + e.message);
          }
      } finally {
          setIsGeneratingInvite(false);
      }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const updates: any = { data: { full_name: profileName, avatar_url: profileAvatar } };
      if (newPassword) updates.password = newPassword;
      if (profileEmail !== userEmail) updates.email = profileEmail;
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      if (profileEmail !== userEmail) alert("Settings updated! A confirmation link has been sent to your new email address.");
      else alert("Settings updated successfully!");
      setNewPassword('');
    } catch (err: any) {
        if (err.message?.includes('security purposes') || err.message?.includes('reauthentication')) alert("Security Alert: To update your password, you must have recently signed in. Please log out and sign in again.");
        else alert("Error updating profile: " + err.message);
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
          // IMPORTANT: Redirect to root origin. App.tsx will detect the 'type=recovery' in the hash
          // and correctly route to /reset-password. This avoids double-hash issues like /#/reset-password#access_token
          const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/` });
          if (error) throw error;
          alert(`Master reset link sent to ${user.email}. Please check your inbox to reset credentials securely.`);
      } catch (e: any) { alert("Error: " + e.message); }
  };

  const handleForceSaveDevices = async () => {
      setIsSavingDevices(true);
      try { alert("Device list synced globally."); } catch (e: any) { alert("Error syncing: " + e.message); } finally { setIsSavingDevices(false); }
  };

  const handleBlockUserInternal = (id: string) => {
      if (confirm("Are you sure you want to block this user? This will revoke all their trusted devices immediately.")) {
          if (onBlockUser) onBlockUser(id);
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
      const keyToUse = translationApiKey;
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
      
      // Auto-append any pending tag in the input field that wasn't entered
      let finalTags = [...modalTags];
      if (tagInput.trim()) {
          const pendingTag = tagInput.trim();
          if (!finalTags.includes(pendingTag)) {
              finalTags.push(pendingTag);
          }
      }

      // Auto-add selected categories as tags
      if (modalCategories && modalCategories.length > 0) {
          modalCategories.forEach(cat => {
              if (!finalTags.includes(cat)) {
                  finalTags.push(cat);
              }
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
      setTagInput(''); // Clear Input
  };

  const handleAddTagToArticle = () => {
      if (!tagInput.trim()) return;
      const newTagValue = tagInput.trim();
      if (!modalTags.includes(newTagValue)) {
          setModalTags([...modalTags, newTagValue]);
      }
      setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          handleAddTagToArticle();
      }
  };

  const removeArticleTag = (tagToRemove: string) => {
      setModalTags(modalTags.filter(t => t !== tagToRemove));
  };

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
    <ImageGalleryModal 
        isOpen={showImageGallery}
        onClose={() => setShowImageGallery(false)}
        onSelectImage={(url) => { setModalImageUrl(url); setShowImageGallery(false); }}
        uploadFolder="articles"
        userId={userId}
    />
    <ImageGalleryModal 
        isOpen={showAdImageGallery}
        onClose={() => setShowAdImageGallery(false)}
        onSelectImage={(url) => { setNewAd({...newAd, imageUrl: url}); setShowAdImageGallery(false); }}
        uploadFolder="ads"
        userId={userId}
    />
    <CategorySelector 
        isOpen={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        options={categories}
        selected={modalCategories}
        onChange={setModalCategories}
    />

    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h1 className="font-serif text-2xl font-bold text-white">Editor<span className="text-news-gold">.</span></h1>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
              <SidebarItem id="articles" label="Editorial Content" icon={FileText} />
              <SidebarItem id="epaper" label="E-Paper Manager" icon={Newspaper} />
              <SidebarItem id="team" label="Team" icon={Users} />
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
                                    {articles.length === 0 && <tr><td colSpan={3} className="text-center py-12 text-gray-400">No articles found.</td></tr>}
                                </tbody>
                          </table>
                      </div>
                      
                      <div className="md:hidden space-y-4">
                          {articles.map((article) => (
                              <div key={article.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                  <div className="flex gap-4">
                                      <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden shrink-0">
                                          <img src={article.imageUrl} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <h4 className="font-bold text-gray-900 text-sm line-clamp-2 leading-tight">{article.title}</h4>
                                          <div className="flex items-center gap-2 mt-2">
                                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                  {article.status}
                                              </span>
                                              <span className="text-[10px] text-gray-400 uppercase font-bold">{article.categories[0]}</span>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
                                      <button onClick={() => openEditArticle(article)} className="text-blue-600 text-xs font-bold uppercase flex items-center gap-1"><PenSquare size={14}/> Edit</button>
                                      <button onClick={() => onDeleteArticle(article.id)} className="text-red-500 text-xs font-bold uppercase flex items-center gap-1"><Trash2 size={14}/> Delete</button>
                                  </div>
                              </div>
                          ))}
                          {articles.length === 0 && <div className="text-center py-12 text-gray-400">No articles found.</div>}
                      </div>
                  </div>
              )}

              {/* TEAM TAB */}
              {activeTab === 'team' && (
                  <div className="max-w-6xl mx-auto space-y-8">
                      <div className="flex justify-between items-center">
                          <h1 className="font-serif text-2xl font-bold text-gray-900 flex items-center gap-2">
                              <Users className="text-news-gold" /> Team & Registrations
                          </h1>
                          <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                              {users.length} Active Accounts
                          </div>
                      </div>

                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                              <table className="w-full text-left min-w-[800px]">
                                  <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                                      <tr>
                                          <th className="px-6 py-4">User Details</th>
                                          <th className="px-6 py-4">Role</th>
                                          <th className="px-6 py-4">Registration / First Active</th>
                                          <th className="px-6 py-4">Last Known IP</th>
                                          <th className="px-6 py-4 text-right">Actions</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {users.map(user => (
                                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                              <td className="px-6 py-4">
                                                  <div className="flex items-center gap-3">
                                                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300 shrink-0">
                                                          {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" /> : <UserIcon className="p-1.5 text-gray-400 w-full h-full"/>}
                                                      </div>
                                                      <div>
                                                          <p className="font-bold text-gray-900 text-sm">{user.name}</p>
                                                          <p className="text-[10px] text-gray-500">{user.email || 'No email'}</p>
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                      user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                                                      user.role === 'EDITOR' ? 'bg-news-gold/20 text-news-black' :
                                                      'bg-blue-100 text-blue-700'
                                                  }`}>
                                                      {user.role}
                                                  </span>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <div className="flex flex-col">
                                                      <span className="text-xs font-bold text-gray-700">
                                                          {format(new Date(user.joinedAt), 'MMM dd, yyyy')}
                                                      </span>
                                                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                          <Timer size={10} /> {format(new Date(user.joinedAt), 'hh:mm a')}
                                                      </span>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4">
                                                  <div className="flex items-center gap-1.5">
                                                      <Globe size={12} className="text-gray-400" />
                                                      <span className="text-xs font-mono text-gray-600">{user.lastIp || 'Unknown'}</span>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4 text-right">
                                                  {user.id !== userId ? (
                                                      <button 
                                                          onClick={() => handleBlockUserInternal(user.id)}
                                                          className="text-red-500 hover:bg-red-50 p-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ml-auto"
                                                      >
                                                          <ShieldAlert size={14} /> Block / Remove
                                                      </button>
                                                  ) : (
                                                      <span className="text-gray-400 text-[10px] font-bold uppercase italic">Current User</span>
                                                  )}
                                              </td>
                                          </tr>
                                      ))}
                                      {users.length === 0 && (
                                          <tr>
                                              <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                                                  No registered staff found.
                                              </td>
                                          </tr>
                                      )}
                                  </tbody>
                              </table>
                          </div>
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
                           {filteredPages.length === 0 && <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400">No pages uploaded for this date.</div>}
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
                              {advertisements.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No active banners.</div>}
                          </div>
                      </div>

                      <div className="space-y-6">
                          <div className="flex justify-between items-center">
                              <h2 className="font-serif text-xl font-bold">Classifieds</h2>
                              <button onClick={() => { setNewClassified({category: adCategories[0] || 'General'}); setShowClassifiedModal(true); }} className="bg-news-black text-white px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-1"><Plus size={14}/> New Listing</button>
                          </div>
                          <div className="bg-white rounded border divide-y">
                              {classifieds.map(ad => (
                                  <div key={ad.id} className="p-4">
                                      <div className="flex justify-between items-start">
                                          <div>
                                              <p className="font-bold text-sm">{ad.title}</p>
                                              <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 font-bold uppercase">{ad.category}</span>
                                          </div>
                                          <button onClick={() => onDeleteClassified(ad.id)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                                      </div>
                                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{ad.content}</p>
                                  </div>
                              ))}
                              {classifieds.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No classifieds posted.</div>}
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
                          {/* Categories */}
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

                          {/* Tags */}
                          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Tag size={18}/> Tags</h3>
                              <div className="flex gap-2 mb-4">
                                  <input type="text" placeholder="New Tag" value={newTag} onChange={e => setNewTag(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none focus:border-news-black" />
                                  <button onClick={() => { if(newTag && onAddTag) { onAddTag(newTag); setNewTag(''); } }} className="bg-news-black text-white p-2 rounded hover:bg-gray-800"><Plus size={18}/></button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                  {tags.map(tag => (
                                      <span key={tag} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-700 flex items-center gap-2 group">
                                          #{tag} <button onClick={() => { if(onDeleteTag) onDeleteTag(tag); }} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
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
                      
                      {/* System Configuration - Restored */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><Settings className="text-news-gold" /> System Configuration</h2>
                          
                          <div className="space-y-6">
                              {/* Global Ads Toggle */}
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                  <div>
                                      <h3 className="font-bold text-sm text-gray-900">Global Advertisement System</h3>
                                      <p className="text-xs text-gray-500 mt-1">Master switch to enable or disable all ad slots across the platform.</p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={globalAdsEnabled} onChange={(e) => onToggleGlobalAds(e.target.checked)} className="sr-only peer" />
                                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-news-black"></div>
                                  </label>
                              </div>

                              {/* Watermark Settings */}
                              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                                  <h3 className="font-bold text-sm text-gray-900 border-b border-gray-200 pb-2 mb-2">E-Paper Watermark Settings</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Watermark Text</label>
                                          <input 
                                              type="text" 
                                              value={watermarkText} 
                                              onChange={(e) => setWatermarkText(e.target.value)} 
                                              onBlur={() => onUpdateWatermarkSettings({...watermarkSettings, text: watermarkText})}
                                              className="w-full p-2 border rounded text-sm bg-white"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Logo URL</label>
                                          <div className="flex gap-2">
                                              <input 
                                                  type="text" 
                                                  value={watermarkLogo} 
                                                  onChange={(e) => setWatermarkLogo(e.target.value)}
                                                  onBlur={() => onUpdateWatermarkSettings({...watermarkSettings, logoUrl: watermarkLogo})}
                                                  className="w-full p-2 border rounded text-sm bg-white"
                                              />
                                          </div>
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Font Size Base (%)</label>
                                          <input 
                                              type="number" 
                                              value={watermarkFontSize} 
                                              onChange={(e) => setWatermarkFontSize(Number(e.target.value))}
                                              onBlur={() => onUpdateWatermarkSettings({...watermarkSettings, fontSize: watermarkFontSize})}
                                              className="w-full p-2 border rounded text-sm bg-white"
                                          />
                                      </div>
                                  </div>
                              </div>

                              {/* Translation Service Settings - Visible only to Editor */}
                              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <h3 className="font-bold text-sm text-gray-900">Translation Service (Google Gemini)</h3>
                                          <p className="text-xs text-gray-500 mt-1">Configure your API key to enable auto-translation features for writers.</p>
                                      </div>
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${translationApiKey ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                          {translationApiKey ? 'Connected' : 'Not Configured'}
                                      </span>
                                  </div>
                                  <div className="mt-4">
                                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">API Key</label>
                                      <div className="flex gap-2">
                                          <input 
                                            type={showKeyInput ? "text" : "password"} 
                                            value={localApiKey} 
                                            onChange={e => setLocalApiKey(e.target.value)} 
                                            placeholder="Enter your Gemini API Key..."
                                            className="flex-1 p-2 border rounded text-sm outline-none focus:border-news-black"
                                          />
                                          <button onClick={() => setShowKeyInput(!showKeyInput)} className="bg-gray-200 text-gray-600 px-3 rounded hover:bg-gray-300">
                                              {showKeyInput ? <Eye size={16}/> : <LayoutIcon size={16}/>}
                                          </button>
                                          <button onClick={handleSaveApiKey} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-800">
                                              <Save size={14}/> Save
                                          </button>
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-2">
                                          Key is stored securely. Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">Google AI Studio</a>.
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* ... Staff Invitation ... */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><UserPlus className="text-news-gold" /> Team Management</h2>
                          <div className="p-5 bg-gray-50 border border-gray-100 rounded-lg">
                              <h3 className="font-bold text-sm text-gray-900 mb-2">Generate Staff Invitation</h3>
                              <p className="text-xs text-gray-500 mb-4">
                                  Create a one-time secure link to onboard new team members. The link expires automatically in 5 minutes.
                              </p>
                              
                              <div className="flex flex-col md:flex-row gap-4 items-end">
                                  <div className="w-full md:w-1/3">
                                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Role</label>
                                      <select 
                                          value={inviteRole} 
                                          onChange={e => setInviteRole(e.target.value as UserRole)}
                                          className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white font-medium"
                                      >
                                          <option value={UserRole.WRITER}>Writer</option>
                                          <option value={UserRole.EDITOR}>Editor</option>
                                          <option value={UserRole.ADMIN}>Admin</option>
                                      </select>
                                  </div>
                                  <div className="w-full md:w-2/3 flex gap-2">
                                      {generatedLink ? (
                                          <div className="flex-1 flex gap-2">
                                              <input type="text" readOnly value={generatedLink} className="flex-1 p-2.5 border border-green-200 bg-green-50 rounded-lg text-sm text-green-800 font-mono" />
                                              <button onClick={() => { navigator.clipboard.writeText(generatedLink); alert("Link copied!"); }} className="bg-green-600 text-white px-4 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center">
                                                  <Copy size={16} />
                                              </button>
                                              <button onClick={() => setGeneratedLink('')} className="text-gray-400 hover:text-gray-600 px-2">
                                                  <X size={16} />
                                              </button>
                                          </div>
                                      ) : (
                                          <button 
                                              onClick={handleGenerateInvite} 
                                              disabled={isGeneratingInvite}
                                              className="flex-1 bg-news-black text-white py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                          >
                                              {isGeneratingInvite ? <Loader2 size={16} className="animate-spin" /> : <Timer size={16} />}
                                              Generate 5m Link
                                          </button>
                                      )}
                                  </div>
                              </div>
                              {generatedLink && (
                                  <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1">
                                      <Check size={12} /> Link generated. Valid for 5 minutes. Single use only.
                                  </p>
                              )}
                          </div>
                      </div>

                      {/* Profile Section */}
                      <div className={`bg-white rounded-xl border p-6 md:p-8 shadow-sm relative overflow-hidden ${!isPrimaryDevice ? 'border-gray-200 opacity-80' : ''}`}>
                          {!isPrimaryDevice && (
                              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center p-6 text-center cursor-not-allowed">
                                  <ShieldAlert className="text-gray-400 mb-2" size={48} />
                                  <h3 className="font-bold text-gray-800">Profile Locked</h3>
                                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                                      Profile modifications are restricted to the <b>Primary Device</b> only.
                                  </p>
                              </div>
                          )}
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><UserIcon className="text-news-gold" /> Profile Settings</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pointer-events-auto">
                             <div className={`space-y-4 ${!isPrimaryDevice ? 'pointer-events-none filter blur-[1px]' : ''}`}>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Display Name</label>
                                    <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input 
                                            type="email" 
                                            value={profileEmail} 
                                            onChange={e => setProfileEmail(e.target.value)} 
                                            className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black font-medium" 
                                            placeholder="editor@example.com"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">Changing this will trigger a confirmation link to the new address.</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Avatar</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                            {profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-3 text-gray-300" />}
                                        </div>
                                        <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                                            {isAvatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                            <span className="hidden sm:inline">Upload Image</span>
                                            <span className="sm:hidden">Upload</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isAvatarUploading} />
                                        </label>
                                    </div>
                                    <input type="text" value={profileAvatar} onChange={e => setProfileAvatar(e.target.value)} className="w-full mt-2 p-2 border border-gray-200 rounded-lg text-xs text-gray-500 outline-none" placeholder="Or paste image URL..." />
                                </div>
                             </div>
                             <div className={`space-y-4 ${!isPrimaryDevice ? 'opacity-50 pointer-events-none' : ''}`}>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Change Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)} 
                                            className="w-full pl-10 pr-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" 
                                            placeholder="New Password" 
                                            disabled={!isPrimaryDevice}
                                        />
                                        <button 
                                            onClick={() => setShowPassword(!showPassword)} 
                                            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                                            disabled={!isPrimaryDevice}
                                        >
                                            {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                        </button>
                                    </div>
                                    {!isPrimaryDevice && (
                                        <p className="text-[10px] text-red-500 mt-2 flex items-center gap-1 font-bold">
                                            <ShieldAlert size={12}/> Security Restricted: Primary Device Only
                                        </p>
                                    )}
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

                      {/* Trusted Devices Section */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="font-bold text-lg flex items-center gap-2"><ShieldCheck size={20} className="text-green-600"/> Trusted Devices</h3>
                              <div className="flex items-center gap-2">
                                  <button onClick={handleForceSaveDevices} disabled={isSavingDevices} className="bg-news-black text-white p-2 rounded hover:bg-gray-800 transition-colors" title="Force Save Globally">
                                      {isSavingDevices ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                  </button>
                                  <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1 rounded text-gray-600">
                                      {devices.filter(d => d.status === 'approved').length} Active
                                  </span>
                              </div>
                          </div>
                          
                          <div className="space-y-4">
                              {devices.length === 0 && <p className="text-gray-400 text-sm italic">No devices registered.</p>}
                              {devices.map(device => {
                                  let Icon = Monitor;
                                  if (device.deviceType === 'mobile') Icon = Smartphone;
                                  if (device.deviceType === 'tablet') Icon = Tablet;
                                  
                                  return (
                                      <div key={device.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                                          <div className="flex items-center gap-4 w-full md:w-auto">
                                              <div className={`p-3 rounded-full ${device.isCurrent ? 'bg-news-black text-news-gold' : 'bg-white border text-gray-500'}`}>
                                                  <Icon size={20} />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                      <span className="font-bold text-sm text-gray-900 truncate">{device.deviceName}</span>
                                                      {device.isCurrent && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">THIS DEVICE</span>}
                                                      {device.isPrimary && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">PRIMARY DEVICE</span>}
                                                      {device.status === 'pending' && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">PENDING</span>}
                                                  </div>
                                                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2 items-center">
                                                      <span>{device.location}</span>
                                                      <span className="hidden md:inline">•</span>
                                                      <span>{device.browser}</span>
                                                      <span className="hidden md:inline">•</span>
                                                      <span>{device.lastActive}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="w-full md:w-auto flex justify-end gap-2">
                                              {/* Only Primary Device can delete other trusted devices */}
                                              {isPrimaryDevice && device.status === 'approved' && !device.isCurrent && onRevokeDevice && (
                                                  <button 
                                                    onClick={() => onRevokeDevice(device.id)} 
                                                    className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                    title="Delete Device"
                                                  >
                                                      <Trash2 size={18}/>
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>

                      <div className={`bg-white rounded-xl border p-6 md:p-8 shadow-sm relative overflow-hidden ${!isPrimaryDevice ? 'border-gray-200 opacity-70 pointer-events-none' : 'border-red-100'}`}>
                          {!isPrimaryDevice && (
                              <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[1px] z-20 flex flex-col items-center justify-center p-6 text-center">
                                  <ShieldAlert className="text-gray-400 mb-2" size={48} />
                                  <h3 className="font-bold text-gray-800">Profile Locked</h3>
                                  <p className="text-xs text-gray-500 mt-1 max-w-sm">
                                      Profile modifications are restricted to the <b>Primary Device</b> only.
                                  </p>
                              </div>
                          )}
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2 text-red-600"><ShieldAlert /> Danger Zone</h2>
                          <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between">
                              <div>
                                  <h3 className="font-bold text-sm text-red-900">Reset Credentials</h3>
                                  <p className="text-xs text-red-700 mt-1">Send a master password reset link to your email.</p>
                              </div>
                              <button onClick={handleTriggerResetEmail} className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded text-xs font-bold uppercase hover:bg-red-50">
                                  Trigger Reset
                              </button>
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
                        <input type="text" value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif placeholder:text-gray-300" placeholder="Headline"/>
                        
                        <div className="flex items-center gap-2">
                            <input type="text" value={modalEnglishTitle} onChange={(e) => setModalEnglishTitle(e.target.value)} className="w-full p-2 border rounded text-sm placeholder:text-gray-300" placeholder="English Title (SEO)" />
                            <button onClick={handleTranslateTitle} disabled={isTranslating} className="bg-news-gold text-black p-2 rounded hover:bg-yellow-500 transition-colors flex items-center gap-1" title="Auto Translate (Requires API Key)">
                                {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            </button>
                        </div>

                        <textarea value={modalSubline} onChange={(e) => setModalSubline(e.target.value)} className="w-full p-2 border rounded text-sm italic min-h-[80px] placeholder:text-gray-300" placeholder="Subline..."></textarea>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={modalAuthor} onChange={(e) => setModalAuthor(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Author"/>
                            <button onClick={() => setShowCategorySelector(true)} className="w-full p-2 border rounded text-sm bg-white text-left flex justify-between items-center">
                                <span className={modalCategories.length === 0 ? 'text-gray-400' : ''}>
                                    {modalCategories.length === 0 ? 'Select Categories' : `${modalCategories.length} Selected`}
                                </span>
                                <ChevronDown size={14} />
                            </button>
                        </div>

                        {/* Tags Input */}
                        <div className="flex items-center gap-2 border rounded p-2 bg-white flex-wrap">
                            {modalTags.map(tag => (
                                <span key={tag} className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                                    #{tag} <button onClick={() => removeArticleTag(tag)} className="hover:text-red-500"><X size={10}/></button>
                                </span>
                            ))}
                            <input 
                                type="text" 
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleTagInputKeyDown}
                                className="flex-1 outline-none text-sm min-w-[100px]"
                                placeholder="Add tag (Any Language/Symbol)..." 
                            />
                        </div>
                    </div>
                    <div className="md:col-span-1 space-y-4">
                        <div className="border-2 border-dashed p-4 rounded bg-gray-50 text-center h-[200px] flex flex-col justify-center relative overflow-hidden">
                            {modalImageUrl ? (
                                <img src={modalImageUrl} className="w-full h-full object-cover rounded" />
                            ) : (
                                <div className="text-gray-400">
                                    <ImageIcon size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-xs font-bold uppercase">Featured Image</p>
                                </div>
                            )}
                        </div>
                        <button onClick={() => setShowImageGallery(true)} className="w-full bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold px-2 py-2 rounded flex items-center justify-center gap-2">
                            <Library size={14} /> Select from Gallery
                        </button>
                        
                        <div className="bg-gray-50 p-3 rounded border border-gray-100 space-y-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Status</label>
                                <select value={modalStatus} onChange={(e) => setModalStatus(e.target.value as ArticleStatus)} className="w-full p-2 border rounded text-sm bg-white">
                                    <option value={ArticleStatus.DRAFT}>Draft</option>
                                    <option value={ArticleStatus.PENDING}>Pending</option>
                                    <option value={ArticleStatus.PUBLISHED}>Published</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Publish Date</label>
                                <input type="datetime-local" value={modalPublishedAt.substring(0, 16)} onChange={(e) => setModalPublishedAt(new Date(e.target.value).toISOString())} className="w-full p-2 border rounded text-sm bg-white" />
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={modalIsFeatured} onChange={e => setModalIsFeatured(e.target.checked)} className="w-4 h-4 accent-news-accent" />
                                <span className="text-xs font-bold uppercase">Featured Article</span>
                            </label>
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

      {showAddPageModal && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg w-full max-w-md p-6">
                  <h3 className="font-bold text-lg mb-4">Upload E-Paper Page</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Edition Date</label>
                          <input type="date" value={newPageDate} onChange={e => setNewPageDate(e.target.value)} className="w-full p-2 border rounded" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Page Number</label>
                          <input type="number" value={newPageNumber} onChange={e => setNewPageNumber(parseInt(e.target.value))} className="w-full p-2 border rounded" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Page Image</label>
                          <div className="flex gap-2">
                              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setNewPageImage, setIsPageUploading, 'epaper')} className="w-full text-sm" disabled={isPageUploading} />
                              {isPageUploading && <Loader2 size={20} className="animate-spin text-news-black" />}
                          </div>
                      </div>
                      {newPageImage && <img src={newPageImage} className="w-full h-40 object-contain bg-gray-100 rounded border" />}
                      <button onClick={handleUploadPage} disabled={isPageUploading} className="w-full bg-news-black text-white py-3 rounded font-bold uppercase text-xs">
                          {isPageUploading ? 'Uploading...' : 'Add Page'}
                      </button>
                      <button onClick={() => setShowAddPageModal(false)} className="w-full text-gray-500 py-2 text-xs font-bold uppercase">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {showAdModal && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg w-full max-w-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg">{editingAdId ? 'Edit Banner' : 'New Banner'}</h3>
                      <button onClick={() => setShowAdModal(false)}><X size={20}/></button>
                  </div>
                  <div className="space-y-4">
                      <input type="text" placeholder="Ad Title (Internal Ref)" value={newAd.title || ''} onChange={e => setNewAd({...newAd, title: e.target.value})} className="w-full p-2 border rounded" />
                      <div className="flex gap-4">
                          <div className="flex-1">
                              <label className="block text-xs font-bold text-gray-500 mb-1">Size</label>
                              <select value={newAd.size} onChange={e => setNewAd({...newAd, size: e.target.value as AdSize})} className="w-full p-2 border rounded bg-white">
                                  <option value="BILLBOARD">Billboard (970x250)</option>
                                  <option value="LEADERBOARD">Leaderboard (728x90)</option>
                                  <option value="RECTANGLE">Rectangle (300x250)</option>
                                  <option value="HALF_PAGE">Half Page (300x600)</option>
                                  <option value="SKYSCRAPER">Skyscraper (160x600)</option>
                                  <option value="MOBILE_BANNER">Mobile Banner (320x50)</option>
                              </select>
                          </div>
                          <div className="flex-1">
                              <label className="block text-xs font-bold text-gray-500 mb-1">Placement</label>
                              <select value={newAd.placement} onChange={e => setNewAd({...newAd, placement: e.target.value as AdPlacement})} className="w-full p-2 border rounded bg-white">
                                  <option value="GLOBAL">Global (All Pages)</option>
                                  <option value="HOME">Home Only</option>
                                  <option value="ARTICLE">Article Pages</option>
                                  <option value="EPAPER">E-Paper</option>
                                  <option value="CATEGORY">Specific Category</option>
                              </select>
                          </div>
                      </div>
                      {newAd.placement === 'CATEGORY' && (
                          <select value={newAd.targetCategory || ''} onChange={e => setNewAd({...newAd, targetCategory: e.target.value})} className="w-full p-2 border rounded bg-white">
                              <option value="">Select Category...</option>
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      )}
                      
                      <div className="border-2 border-dashed p-4 rounded text-center">
                          {newAd.imageUrl ? (
                              <img src={newAd.imageUrl} className="max-h-32 mx-auto" />
                          ) : <p className="text-gray-400 text-sm">No image selected</p>}
                          <button onClick={() => setShowAdImageGallery(true)} className="mt-2 text-xs bg-gray-100 px-3 py-1 rounded border hover:bg-gray-200">Select Image</button>
                      </div>

                      <input type="text" placeholder="Destination URL (Optional)" value={newAd.linkUrl || ''} onChange={e => setNewAd({...newAd, linkUrl: e.target.value})} className="w-full p-2 border rounded" />
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={newAd.isActive} onChange={e => setNewAd({...newAd, isActive: e.target.checked})} className="w-4 h-4" />
                          <span className="text-sm font-bold">Active</span>
                      </label>

                      <button onClick={handleSaveAd} className="w-full bg-news-black text-white py-3 rounded font-bold uppercase text-xs">Save Banner</button>
                  </div>
              </div>
          </div>
      )}

      {showClassifiedModal && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg w-full max-w-lg p-6">
                  <h3 className="font-bold text-lg mb-4">New Classified Ad</h3>
                  <div className="space-y-4">
                      <input type="text" placeholder="Title" value={newClassified.title || ''} onChange={e => setNewClassified({...newClassified, title: e.target.value})} className="w-full p-2 border rounded" />
                      <div className="flex gap-4">
                          <select value={newClassified.category || ''} onChange={e => setNewClassified({...newClassified, category: e.target.value})} className="flex-1 p-2 border rounded bg-white">
                              {adCategories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input type="text" placeholder="Price (e.g. $50)" value={newClassified.price || ''} onChange={e => setNewClassified({...newClassified, price: e.target.value})} className="flex-1 p-2 border rounded" />
                      </div>
                      <textarea placeholder="Description" value={newClassified.content || ''} onChange={e => setNewClassified({...newClassified, content: e.target.value})} className="w-full p-2 border rounded h-24"></textarea>
                      <div className="flex gap-4">
                          <input type="text" placeholder="Location" value={newClassified.location || ''} onChange={e => setNewClassified({...newClassified, location: e.target.value})} className="flex-1 p-2 border rounded" />
                          <input type="text" placeholder="Contact Info" value={newClassified.contactInfo || ''} onChange={e => setNewClassified({...newClassified, contactInfo: e.target.value})} className="flex-1 p-2 border rounded" />
                      </div>
                      <button onClick={handleAddClassified} className="w-full bg-news-black text-white py-3 rounded font-bold uppercase text-xs">Post Classified</button>
                      <button onClick={() => setShowClassifiedModal(false)} className="w-full text-gray-500 py-2 text-xs font-bold uppercase">Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
    </>
  );
};

export default EditorDashboard;
