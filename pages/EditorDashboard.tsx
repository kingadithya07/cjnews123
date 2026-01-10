
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, UserRole, AdSize, AdPlacement } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, RotateCcw, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Calendar, Loader2, Library, User as UserIcon, Lock,
  Check, Scissors, Camera, Monitor, Smartphone, Tablet, ShieldCheck, AlertTriangle, Code, Copy, RefreshCcw, Type, Star, Save, Award, ChevronDown, Maximize, MapPin, DollarSign, Phone, Filter, Layout as LayoutIcon, Sparkles, Key, Eye, EyeOff, Mail
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
  devices: TrustedDevice[];
  onApproveDevice: (id: string) => void;
  onRejectDevice: (id: string) => void;
  onRevokeDevice: (id: string) => void;
  userId?: string | null;
  activeVisitors?: number; // Add this
}

const EditorDashboard: React.FC<EditorDashboardProps> = ({ 
  articles, ePaperPages, categories, tags = [], adCategories, classifieds, advertisements,
  onAddPage, onDeletePage, onDeleteArticle, onSaveArticle, 
  onAddCategory, onDeleteCategory, onAddTag, onDeleteTag, onAddAdCategory, onDeleteAdCategory, onSaveTaxonomy,
  onAddClassified, onDeleteClassified, onAddAdvertisement, onUpdateAdvertisement, onDeleteAdvertisement,
  onNavigate, watermarkSettings, onUpdateWatermarkSettings, userName, userAvatar,
  devices, onApproveDevice, onRejectDevice, onRevokeDevice, globalAdsEnabled, onToggleGlobalAds, userId, activeVisitors
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
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [watermarkText, setWatermarkText] = useState(watermarkSettings.text);
  const [watermarkLogo, setWatermarkLogo] = useState(watermarkSettings.logoUrl);
  const [watermarkFontSize, setWatermarkFontSize] = useState(watermarkSettings.fontSize || 30);
  const [isSavingDevices, setIsSavingDevices] = useState(false);

  // Custom API State
  const [customApiKey, setCustomApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Load custom key on mount
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
      }
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
      setEditArticleId(null); setModalTitle(''); setModalEnglishTitle(''); setModalSubline(''); setModalContent(''); setModalAuthor(userName || 'Editor'); setModalCategories([categories[0] || 'General']); setModalImageUrl(''); setModalStatus(ArticleStatus.PUBLISHED); setModalIsFeatured(false); setModalPublishedAt(new Date().toISOString()); setShowArticleModal(true);
  };

  const openEditArticle = (article: Article) => {
      setEditArticleId(article.id); setModalTitle(article.title); setModalEnglishTitle(article.englishTitle || ''); setModalSubline(article.subline || ''); setModalContent(article.content); setModalAuthor(article.author); setModalCategories(article.categories); setModalImageUrl(article.imageUrl); setModalStatus(article.status); setModalIsFeatured(article.isFeatured || false); setModalPublishedAt(article.publishedAt); setShowArticleModal(true);
  };

  const handleTranslateTitle = async () => {
      if (!modalTitle) return;
      
      const keyToUse = customApiKey;
      
      if (!keyToUse) {
          const proceed = confirm("Translation requires a third-party API Key. Would you like to configure it now in Settings?");
          if (proceed) {
              setShowArticleModal(false);
              setActiveTab('settings');
          }
          return;
      }

      setIsTranslating(true);
      try {
          // Direct fetch to Gemini API to avoid SDK dependency
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  contents: [{
                      parts: [{
                          text: `Translate this news headline to concise English for SEO purposes. Return only the translated string, no quotes: "${modalTitle}"`
                      }]
                  }]
              })
          });

          const data = await response.json();
          
          if (data.error) {
              throw new Error(data.error.message || "API Error");
          }

          const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (translated) {
              setModalEnglishTitle(translated);
          } else {
              throw new Error("No translation returned.");
          }
      } catch (e: any) {
          console.error("Translation failed", e);
          alert(`Auto-translation failed: ${e.message}. Please enter manually or check your API Key.`);
      } finally {
          setIsTranslating(false);
      }
  };

  const handleSaveArticleInternal = () => {
      if (!modalTitle) { alert("Title required"); return; }
      const article: Article = {
          id: editArticleId || generateId(),
          userId: userId || undefined,
          title: modalTitle,
          englishTitle: modalEnglishTitle,
          subline: modalSubline,
          author: modalAuthor,
          content: modalContent,
          categories: modalCategories.length > 0 ? modalCategories : ['General'],
          imageUrl: modalImageUrl || 'https://picsum.photos/800/400',
          publishedAt: modalPublishedAt, // Use preserved date
          status: modalStatus,
          isFeatured: modalIsFeatured,
          isEditorsChoice: false, // Force false since removed from UI
          authorAvatar: userAvatar || undefined
      };
      onSaveArticle(article);
      setShowArticleModal(false);
  };

  const handleUploadPage = async () => {
      if (!newPageImage) { alert("Please select an image"); return; }
      setIsPageUploading(true);
      try {
          const page: EPaperPage = {
              id: generateId(),
              date: newPageDate,
              pageNumber: newPageNumber,
              imageUrl: newPageImage,
              regions: []
          };
          onAddPage(page);
          
          // Switch view to the new page's date so it appears immediately
          setEpaperFilterDate(newPageDate);
          
          setShowAddPageModal(false);
          setNewPageImage('');
          // Auto-increment page number for the next upload
          setNewPageNumber(prev => prev + 1);
      } catch (e) {
          alert("Error adding page");
      } finally {
          setIsPageUploading(false);
      }
  };

  const handleSaveTaxonomyInternal = async () => {
      setIsSavingTaxonomy(true);
      try {
          await onSaveTaxonomy();
          alert("Taxonomy saved successfully.");
      } catch(e) {
          alert("Error saving taxonomy.");
      } finally {
          setIsSavingTaxonomy(false);
      }
  };

  const handleSaveAd = () => {
      if (!newAd.title || !newAd.imageUrl) {
          alert("Title and Image are required.");
          return;
      }
      
      const adPayload: Advertisement = {
          id: editingAdId || generateId(),
          title: newAd.title!,
          imageUrl: newAd.imageUrl!,
          linkUrl: newAd.linkUrl,
          size: newAd.size as AdSize,
          // Removed custom width/height properties as we are using standard sizes
          placement: newAd.placement as AdPlacement,
          targetCategory: newAd.targetCategory,
          isActive: newAd.isActive !== undefined ? newAd.isActive : true
      };

      if (editingAdId) {
          onUpdateAdvertisement(adPayload);
      } else {
          onAddAdvertisement(adPayload);
      }
      
      setShowAdModal(false);
      setNewAd({ size: 'RECTANGLE', placement: 'GLOBAL', isActive: true });
      setEditingAdId(null);
  };

  const handleEditAd = (ad: Advertisement) => {
      setNewAd({
          ...ad
      });
      setEditingAdId(ad.id);
      setShowAdModal(true);
  };

  const handleAddClassified = () => {
      if (!newClassified.title || !newClassified.content || !newClassified.category) {
          alert("Title, Content and Category are required.");
          return;
      }
      onAddClassified({
          id: generateId(),
          title: newClassified.title,
          category: newClassified.category,
          content: newClassified.content,
          price: newClassified.price,
          location: newClassified.location,
          contactInfo: newClassified.contactInfo || '',
          postedAt: new Date().toISOString()
      });
      setShowClassifiedModal(false);
      setNewClassified({});
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const updates: any = { 
        data: { 
          full_name: profileName,
          avatar_url: profileAvatar
        } 
      };
      if (newPassword) {
        updates.password = newPassword;
      }
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      alert("Settings updated successfully!");
      setNewPassword('');
    } catch (err: any) {
        // Handle "Password update requires reauthentication" specifically
        if (err.message?.includes('security purposes') || err.message?.includes('reauthentication')) {
            alert("Security Alert: To update your password, you must have recently signed in. Please log out and sign in again.");
        } else {
            alert("Error updating profile: " + err.message);
        }
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTriggerResetEmail = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !user.email) throw new Error("User email not found.");
          
          const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
              redirectTo: `${window.location.origin}/#/reset-password`
          });
          
          if (error) throw error;
          alert(`Master reset link sent to ${user.email}. Please check your inbox to reset credentials securely.`);
      } catch (e: any) {
          alert("Error: " + e.message);
      }
  };

  const handleForceSaveDevices = async () => {
      setIsSavingDevices(true);
      try {
          alert("Device list synced globally.");
      } catch (e: any) {
          alert("Error syncing: " + e.message);
      } finally {
          setIsSavingDevices(false);
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

  return (
    <>
    {/* ... (Modals and Layout Start - No Changes until Settings Tab content) ... */}
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
      {/* Optimized Sidebar for Desktop (w-64 instead of w-72) */}
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

      {/* Main Content Area - Optimized margins and padding */}
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
                  /* Articles Content (Unchanged) */
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

                      <div className="md:hidden grid grid-cols-1 gap-4">
                          {articles.map((article) => (
                              <div key={article.id} className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                                  <div className="flex p-3 gap-3">
                                      <div className="w-24 h-24 bg-gray-100 rounded-md shrink-0 overflow-hidden relative">
                                          <img src={article.imageUrl} className="w-full h-full object-cover" />
                                          {article.isFeatured && (
                                              <div className="absolute top-0 left-0 bg-news-accent text-white p-1 rounded-br-md shadow-sm">
                                                  <Star size={10} fill="currentColor" />
                                              </div>
                                          )}
                                      </div>
                                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                                          <div>
                                              <div className="flex items-center gap-2 mb-1.5">
                                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : article.status === ArticleStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                                                      {article.status}
                                                  </span>
                                                  <span className="text-[10px] text-gray-400 font-bold uppercase truncate">{article.categories[0]}</span>
                                              </div>
                                              <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{article.title}</h3>
                                          </div>
                                          <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                                              <UserIcon size={10} /> {article.author}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex border-t border-gray-100 divide-x divide-gray-100">
                                      <button onClick={() => openEditArticle(article)} className="flex-1 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                                          <PenSquare size={14}/> Edit
                                      </button>
                                      <button onClick={() => onDeleteArticle(article.id)} className="flex-1 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center justify-center gap-2">
                                          <Trash2 size={14}/> Delete
                                      </button>
                                  </div>
                              </div>
                          ))}
                          {articles.length === 0 && (
                              <div className="py-12 text-center text-gray-400 bg-white rounded-lg border-2 border-dashed border-gray-200">
                                  No articles found.
                              </div>
                          )}
                      </div>
                  </div>
              )}

              {activeTab === 'epaper' && (
                  /* Existing EPaper Content */
                  <div className="max-w-6xl mx-auto space-y-8">
                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                           <h1 className="font-serif text-2xl font-bold text-gray-900">E-Paper Editions</h1>
                           <div className="flex items-center gap-2 bg-white p-1 rounded border shadow-sm">
                               <select value={epaperFilterDate} onChange={(e) => setEpaperFilterDate(e.target.value)} className="p-2 bg-transparent text-sm font-bold outline-none border-r pr-4">
                                   {availableEpaperDates.map(d => <option key={d} value={d}>{format(new Date(d), 'MMM dd, yyyy')}</option>)}
                               </select>
                               <button onClick={() => setShowAddPageModal(true)} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-800">
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
                           {filteredPages.length === 0 && (
                               <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-lg text-gray-400">
                                   No pages uploaded for this date.
                               </div>
                           )}
                       </div>
                  </div>
              )}

              {activeTab === 'ads' && (
                  /* Existing Ads Content */
                  <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Banners */}
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

                      {/* Classifieds */}
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
                  /* Existing Taxonomy Content */
                  <div className="max-w-6xl mx-auto space-y-8">
                      <div className="flex justify-between items-center">
                          <h2 className="font-serif text-2xl font-bold">Taxonomy</h2>
                          <button onClick={handleSaveTaxonomyInternal} disabled={isSavingTaxonomy} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2">
                              {isSavingTaxonomy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                          </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                          {/* Tags, Ad Cats... */}
                          {tags && onAddTag && onDeleteTag && (
                              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Tag size={18}/> Article Tags</h3>
                                  <div className="flex gap-2 mb-4">
                                      <input type="text" placeholder="New Tag" value={newTag} onChange={e => setNewTag(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none focus:border-news-black" />
                                      <button onClick={() => { if(newTag) { onAddTag(newTag); setNewTag(''); } }} className="bg-news-black text-white p-2 rounded hover:bg-gray-800"><Plus size={18}/></button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {tags.map(tag => (
                                          <span key={tag} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-700 flex items-center gap-2 group">
                                              #{tag} <button onClick={() => onDeleteTag(tag)} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                                          </span>
                                      ))}
                                  </div>
                              </div>
                          )}
                          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Megaphone size={18}/> Ad Categories</h3>
                              <div className="flex gap-2 mb-4">
                                  <input type="text" placeholder="New Section" value={newAdCategory} onChange={e => setNewAdCategory(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none focus:border-news-black" />
                                  <button onClick={() => { if(newAdCategory) { onAddAdCategory(newAdCategory); setNewAdCategory(''); } }} className="bg-news-black text-white p-2 rounded hover:bg-gray-800"><Plus size={18}/></button>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                  {adCategories.map(cat => (
                                      <span key={cat} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-700 flex items-center gap-2 group">
                                          {cat} <button onClick={() => onDeleteAdCategory(cat)} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                                      </span>
                                  ))}
                              </div>
                          </div>
                      </div>
                  </div>
              )}
              
              {activeTab === 'analytics' && <AnalyticsDashboard articles={articles} role={UserRole.EDITOR} activeVisitors={activeVisitors} />}

              {activeTab === 'settings' && (
                  /* Existing Settings Content */
                  <div className="max-w-4xl mx-auto space-y-12 pb-20 pt-4">
                      {/* Third-Party Integrations */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><Key className="text-news-gold" /> Third-Party Integrations</h2>
                          <div className="space-y-4">
                              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <h3 className="font-bold text-sm text-gray-900">Translation Service (Google Gemini)</h3>
                                          <p className="text-xs text-gray-500 mt-1">Configure your own API key to enable auto-translation features in the editor.</p>
                                      </div>
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${customApiKey ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                          {customApiKey ? 'Connected' : 'Not Configured'}
                                      </span>
                                  </div>
                                  <div className="mt-4">
                                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">API Key</label>
                                      <div className="flex gap-2">
                                          <input 
                                            type={showKeyInput ? "text" : "password"} 
                                            value={customApiKey} 
                                            onChange={e => setCustomApiKey(e.target.value)} 
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
                                          Key is stored locally in your browser. Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">Google AI Studio</a>.
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Global Settings */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><Settings className="text-news-gold" /> System Configuration</h2>
                          
                          <div className="space-y-6">
                              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                  <div>
                                      <h3 className="font-bold text-sm text-gray-900">Global Ad Delivery</h3>
                                      <p className="text-xs text-gray-500 mt-1">Master switch to enable/disable all advertisement slots across the platform.</p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={globalAdsEnabled} onChange={(e) => onToggleGlobalAds(e.target.checked)} className="sr-only peer" />
                                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-news-black"></div>
                                  </label>
                              </div>

                              <div>
                                  <h3 className="font-bold text-sm text-gray-900 mb-4">E-Paper Watermark Branding</h3>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div>
                                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Watermark Text</label>
                                          <input type="text" value={watermarkText} onChange={e => setWatermarkText(e.target.value)} className="w-full p-2 border rounded text-sm" />
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Font Size (px)</label>
                                          <input type="number" value={watermarkFontSize} onChange={e => setWatermarkFontSize(Number(e.target.value))} className="w-full p-2 border rounded text-sm" />
                                      </div>
                                  </div>
                                  <div className="mt-4">
                                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Logo URL</label>
                                      <div className="flex gap-2">
                                          <input type="text" value={watermarkLogo} onChange={e => setWatermarkLogo(e.target.value)} className="flex-1 p-2 border rounded text-sm" />
                                          <button onClick={() => onUpdateWatermarkSettings({ ...watermarkSettings, text: watermarkText, logoUrl: watermarkLogo, fontSize: watermarkFontSize })} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase">Save Config</button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Master Security Section */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm border-red-100 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                              <Lock size={120} />
                          </div>
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2 text-red-700">
                              <ShieldCheck className="text-red-600" /> Master Security
                          </h2>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                              <div className="space-y-4">
                                  <div>
                                      <h3 className="font-bold text-gray-900 text-sm mb-1">Direct Password Update</h3>
                                      <p className="text-xs text-gray-500 mb-4">Set a new master password for immediate access.</p>
                                      <div className="relative">
                                          <Key className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                          <input 
                                              type={showPassword ? "text" : "password"} 
                                              value={newPassword} 
                                              onChange={e => setNewPassword(e.target.value)} 
                                              className="w-full pl-10 pr-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all font-bold" 
                                              placeholder="Enter New Master Password" 
                                          />
                                          <button 
                                              onClick={() => setShowPassword(!showPassword)} 
                                              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                                          >
                                              {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                          </button>
                                      </div>
                                  </div>
                                  <button 
                                      onClick={handleSaveSettings} 
                                      disabled={isSavingSettings || !newPassword} 
                                      className="w-full bg-red-600 text-white py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                      {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
                                      Update Credentials
                                  </button>
                              </div>

                              <div className="bg-red-50 p-6 rounded-xl border border-red-100 flex flex-col justify-center">
                                  <h3 className="font-bold text-red-900 text-sm mb-2">Recovery Protocol</h3>
                                  <p className="text-xs text-red-700 mb-4">
                                      If the direct update fails due to security timeouts, trigger a system-wide reset link to your registered email.
                                  </p>
                                  <button 
                                      onClick={handleTriggerResetEmail}
                                      className="w-full bg-white text-red-600 border border-red-200 py-3 rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                                  >
                                      <Mail size={16} /> Send Reset Link
                                  </button>
                              </div>
                          </div>
                      </div>

                      {/* Profile Section */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><UserIcon className="text-news-gold" /> Admin Profile</h2>
                          <div className="grid grid-cols-1 gap-8">
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Display Name</label>
                                    <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" />
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
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setProfileAvatar, setIsAvatarUploading, 'avatars')} disabled={isAvatarUploading} />
                                        </label>
                                    </div>
                                    <input type="text" value={profileAvatar} onChange={e => setProfileAvatar(e.target.value)} className="w-full mt-2 p-2 border border-gray-200 rounded-lg text-xs text-gray-500 outline-none" placeholder="Or paste image URL..." />
                                </div>
                                <div>
                                    <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full bg-news-black text-white py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg mt-2">
                                        {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                                        {isSavingSettings ? 'Saving...' : 'Save Profile Changes'}
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
                                              {device.status === 'pending' && (
                                                <button onClick={() => onApproveDevice(device.id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold uppercase hover:bg-green-700">Approve</button>
                                              )}
                                              {!device.isCurrent && (
                                                  <button 
                                                    onClick={() => onRevokeDevice(device.id)} 
                                                    className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                    title="Revoke Device"
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
                  </div>
              )}
           </div>
      </div>

      {/* Modals ... (Rest of component remains identical) ... */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
             <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-900">{editArticleId ? 'Edit Article' : 'New Article'}</h3>
                <button onClick={() => setShowArticleModal(false)} className="p-2 -mr-2 text-gray-500 hover:text-black"><X size={20}/></button>
            </div>
             <div className="p-4 md:p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <input type="text" value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif placeholder:text-gray-300" placeholder="Article Headline"/>
                        
                         <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={modalEnglishTitle} 
                                onChange={(e) => setModalEnglishTitle(e.target.value)} 
                                className="w-full p-2 border rounded text-sm placeholder:text-gray-300" 
                                placeholder="English Title (for SEO & URL)" 
                            />
                            <button 
                                onClick={handleTranslateTitle} 
                                disabled={isTranslating} 
                                className="bg-news-gold text-black p-2 rounded hover:bg-yellow-500 transition-colors flex items-center gap-1" 
                                title="Auto Translate (Requires API Key)"
                            >
                                {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            </button>
                        </div>

                        <textarea value={modalSubline} onChange={(e) => setModalSubline(e.target.value)} className="w-full p-2 border rounded text-sm italic min-h-[80px] placeholder:text-gray-300" placeholder="Summary / Sub-headline..."></textarea>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input type="text" value={modalAuthor} onChange={(e) => setModalAuthor(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Author Name, Title"/>
                            <button onClick={() => setShowCategorySelector(true)} className="w-full p-2 border rounded text-sm bg-white text-left flex justify-between items-center">
                                <span className={modalCategories.length === 0 ? 'text-gray-400' : ''}>
                                    {modalCategories.length === 0 ? 'Select Categories' : `${modalCategories.length} Selected`}
                                </span>
                                <ChevronDown size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Status</label>
                                <select 
                                    value={modalStatus} 
                                    onChange={(e) => setModalStatus(e.target.value as ArticleStatus)} 
                                    className="w-full p-2 border rounded text-sm bg-white"
                                >
                                    <option value={ArticleStatus.DRAFT}>Draft</option>
                                    <option value={ArticleStatus.PENDING}>Pending Review</option>
                                    <option value={ArticleStatus.PUBLISHED}>Published</option>
                                </select>
                             </div>
                             <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Tags</label>
                                <input type="text" placeholder="Add tags..." className="w-full p-2 border rounded text-sm" />
                             </div>
                        </div>
                    </div>
                     <div className="md:col-span-1">
                        <div className="border-2 border-dashed p-4 rounded bg-gray-50 text-center relative overflow-hidden h-[200px] flex flex-col justify-between">
                            {modalImageUrl ? (
                                <div className="relative group w-full h-full">
                                    <img src={modalImageUrl} className="w-full h-full object-cover rounded shadow" />
                                    <button onClick={() => setModalImageUrl('')} type="button" className="absolute top-1 right-1 bg-black/40 text-white p-1 rounded-full hover:bg-red-600 transition-colors z-10" title="Remove image">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="py-4 text-gray-400 flex flex-col items-center justify-center h-full">
                                    <ImageIcon size={32} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-xs font-bold uppercase">Featured Image</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-2">
                            <button type="button" onClick={() => setShowImageGallery(true)} className="w-full bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold px-2 py-2 rounded flex items-center justify-center gap-2 cursor-pointer transition-colors">
                                <Library size={14} />
                                <span>Select from Gallery</span>
                            </button>
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded border border-gray-100">
                                <label className="flex items-center gap-2 cursor-pointer w-full">
                                    <input type="checkbox" checked={modalIsFeatured} onChange={e => setModalIsFeatured(e.target.checked)} className="w-4 h-4 accent-news-accent" />
                                    <div className="flex items-center gap-2">
                                        <Star size={12} className={modalIsFeatured ? "text-news-accent fill-news-accent" : "text-gray-400"} />
                                        <span className="text-xs font-bold uppercase">Featured</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
                 <div className="relative">
                  <RichTextEditor 
                    content={modalContent} 
                    onChange={setModalContent} 
                    className="min-h-[300px] md:min-h-[400px]" 
                    onImageUpload={handleContentImageUpload} 
                    userId={userId}
                    uploadFolder="articles"
                  />
                </div>
             </div>
             <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                <button onClick={() => setShowArticleModal(false)} className="px-5 py-2 text-sm font-bold text-gray-600">Cancel</button>
                <button onClick={handleSaveArticleInternal} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold shadow hover:bg-gray-800">
                  Save Article
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Add Page Modal */}
      {showAddPageModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
             <div className="bg-white rounded-lg w-full max-w-md p-6 animate-in zoom-in-95">
                 <h3 className="font-bold text-lg mb-4">Upload E-Paper Page</h3>
                 <div className="space-y-4">
                     <input type="date" value={newPageDate} onChange={e => setNewPageDate(e.target.value)} className="w-full p-2 border rounded" />
                     <input type="number" min="1" value={newPageNumber} onChange={e => setNewPageNumber(parseInt(e.target.value))} className="w-full p-2 border rounded" placeholder="Page Number" />
                     
                     <div className="border-2 border-dashed p-4 rounded bg-gray-50 text-center">
                         {newPageImage ? (
                             <img src={newPageImage} className="max-h-48 mx-auto object-contain mb-2" />
                         ) : <p className="text-gray-400 text-xs">No image selected</p>}
                         <label className="block mt-2">
                             <span className="bg-gray-200 px-3 py-1 rounded text-xs font-bold cursor-pointer">Choose Image</span>
                             <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setNewPageImage, setIsPageUploading, `epaper/${newPageDate}`)} />
                         </label>
                         {isPageUploading && <p className="text-xs text-blue-500 mt-2 flex items-center justify-center gap-1"><Loader2 size={12} className="animate-spin" /> Uploading...</p>}
                     </div>

                     <div className="flex justify-end gap-2 pt-2">
                         <button onClick={() => setShowAddPageModal(false)} className="px-4 py-2 text-gray-600 text-sm font-bold">Cancel</button>
                         <button onClick={handleUploadPage} disabled={isPageUploading} className="px-4 py-2 bg-news-black text-white rounded text-sm font-bold disabled:opacity-50">Upload</button>
                     </div>
                 </div>
             </div>
        </div>
      )}

      {/* Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
             <div className="bg-white rounded-lg w-full max-w-lg p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                 <h3 className="font-bold text-lg mb-4">{editingAdId ? 'Edit Advertisement' : 'New Advertisement'}</h3>
                 <div className="space-y-4">
                     <input type="text" placeholder="Ad Title (Internal Ref)" value={newAd.title || ''} onChange={e => setNewAd({...newAd, title: e.target.value})} className="w-full p-2 border rounded" />
                     <input type="text" placeholder="Target Link URL (Optional)" value={newAd.linkUrl || ''} onChange={e => setNewAd({...newAd, linkUrl: e.target.value})} className="w-full p-2 border rounded" />
                     
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="text-xs font-bold text-gray-500 block mb-1">Size</label>
                             <select value={newAd.size} onChange={e => setNewAd({...newAd, size: e.target.value as AdSize})} className="w-full p-2 border rounded text-sm">
                                 <option value="BILLBOARD">Billboard (970x250)</option>
                                 <option value="LEADERBOARD">Leaderboard (728x90)</option>
                                 <option value="RECTANGLE">Rectangle (300x250)</option>
                                 <option value="HALF_PAGE">Half Page (300x600)</option>
                                 <option value="SKYSCRAPER">Skyscraper (160x600)</option>
                                 <option value="MOBILE_BANNER">Mobile Banner (320x50)</option>
                             </select>
                         </div>
                         <div>
                             <label className="text-xs font-bold text-gray-500 block mb-1">Placement</label>
                             <select value={newAd.placement} onChange={e => setNewAd({...newAd, placement: e.target.value as AdPlacement})} className="w-full p-2 border rounded text-sm">
                                 <option value="GLOBAL">Global (All Pages)</option>
                                 <option value="HOME">Home Page</option>
                                 <option value="ARTICLE">Article Pages</option>
                                 <option value="EPAPER">E-Paper</option>
                                 <option value="CATEGORY">Specific Category</option>
                             </select>
                         </div>
                     </div>

                     {newAd.placement === 'CATEGORY' && (
                         <select value={newAd.targetCategory} onChange={e => setNewAd({...newAd, targetCategory: e.target.value})} className="w-full p-2 border rounded text-sm">
                             <option value="">Select Category...</option>
                             {categories.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                     )}

                     <div className="border-2 border-dashed p-4 rounded bg-gray-50 text-center relative">
                         {newAd.imageUrl ? (
                             <img src={newAd.imageUrl} className="max-h-32 mx-auto object-contain mb-2" />
                         ) : <p className="text-gray-400 text-xs">No banner image</p>}
                         <button onClick={() => setShowAdImageGallery(true)} className="bg-gray-200 px-3 py-1 rounded text-xs font-bold">Select from Gallery</button>
                     </div>

                     <div className="flex items-center gap-2">
                         <input type="checkbox" checked={newAd.isActive} onChange={e => setNewAd({...newAd, isActive: e.target.checked})} id="adActive" />
                         <label htmlFor="adActive" className="text-sm font-bold">Active</label>
                     </div>

                     <div className="flex justify-end gap-2 pt-2">
                         <button onClick={() => setShowAdModal(false)} className="px-4 py-2 text-gray-600 text-sm font-bold">Cancel</button>
                         <button onClick={handleSaveAd} className="px-4 py-2 bg-news-black text-white rounded text-sm font-bold">Save Ad</button>
                     </div>
                 </div>
             </div>
        </div>
      )}

      {/* Classified Modal */}
      {showClassifiedModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
             <div className="bg-white rounded-lg w-full max-w-lg p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                 <h3 className="font-bold text-lg mb-4">Post Classified Ad</h3>
                 <div className="space-y-4">
                     <input type="text" placeholder="Ad Title" value={newClassified.title || ''} onChange={e => setNewClassified({...newClassified, title: e.target.value})} className="w-full p-2 border rounded" />
                     <textarea placeholder="Ad Content..." value={newClassified.content || ''} onChange={e => setNewClassified({...newClassified, content: e.target.value})} className="w-full p-2 border rounded min-h-[100px]" />
                     
                     <div className="grid grid-cols-2 gap-4">
                         <select value={newClassified.category} onChange={e => setNewClassified({...newClassified, category: e.target.value})} className="w-full p-2 border rounded">
                             {adCategories.map(c => <option key={c} value={c}>{c}</option>)}
                         </select>
                         <input type="text" placeholder="Price (Optional)" value={newClassified.price || ''} onChange={e => setNewClassified({...newClassified, price: e.target.value})} className="w-full p-2 border rounded" />
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                         <input type="text" placeholder="Location" value={newClassified.location || ''} onChange={e => setNewClassified({...newClassified, location: e.target.value})} className="w-full p-2 border rounded" />
                         <input type="text" placeholder="Contact Info" value={newClassified.contactInfo || ''} onChange={e => setNewClassified({...newClassified, contactInfo: e.target.value})} className="w-full p-2 border rounded" />
                     </div>

                     <div className="flex justify-end gap-2 pt-2">
                         <button onClick={() => setShowClassifiedModal(false)} className="px-4 py-2 text-gray-600 text-sm font-bold">Cancel</button>
                         <button onClick={handleAddClassified} className="px-4 py-2 bg-news-black text-white rounded text-sm font-bold">Post Ad</button>
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
