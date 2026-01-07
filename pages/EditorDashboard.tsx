import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, UserRole, AdSize, AdPlacement, ReporterProfile } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Loader2, User as UserIcon, Lock,
  Check, Scissors, Camera, Monitor, Smartphone, Tablet, ShieldCheck, Code, Copy, RefreshCcw, Type, Star, Save, Award, ChevronDown, Maximize, MapPin, DollarSign, Phone, Filter, Layout as LayoutIcon, Sparkles, Key, Eye, Fingerprint, Printer, Repeat, PenTool, Stamp, Droplet, CreditCard
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
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  
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
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [showClassifiedModal, setShowClassifiedModal] = useState(false);
  const [newClassified, setNewClassified] = useState<Partial<ClassifiedAd>>({});
  const [showAdImageGallery, setShowAdImageGallery] = useState(false);
  const [editingAdId, setEditingAdId] = useState<string | null>(null);

  // Taxonomy State
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newAdCategory, setNewAdCategory] = useState('');
  const [isSavingTaxonomy, setIsSavingTaxonomy] = useState(false);

  // ID Cards State
  const [showReporterModal, setShowReporterModal] = useState(false);
  const [activeReporter, setActiveReporter] = useState<Partial<ReporterProfile>>({});
  const [showProfileImageGallery, setShowProfileImageGallery] = useState(false);
  const [imageSelectorTarget, setImageSelectorTarget] = useState<'photo' | 'signature' | 'stamp' | 'logo' | 'cardWatermark'>('photo');
  const [cardDisclaimer, setCardDisclaimer] = useState('This press ID is the property of the issuing organization. Unauthorized use of this ID is strictly prohibited. Holder of this ID must comply with journalistic ethics while reporting and is subject to company policies and procedures.');
  const [showCardBack, setShowCardBack] = useState(false);

  // Settings State
  const [profileName, setProfileName] = useState(userName || '');
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
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
      setEditArticleId(null); setModalTitle(''); setModalEnglishTitle(''); setModalSubline(''); setModalContent(''); setModalAuthor(userName || 'Editor'); setModalCategories([categories[0] || 'General']); setModalImageUrl(''); setModalStatus(ArticleStatus.PUBLISHED); setModalIsFeatured(false); setShowArticleModal(true);
  };

  const openEditArticle = (article: Article) => {
      setEditArticleId(article.id); setModalTitle(article.title); setModalEnglishTitle(article.englishTitle || ''); setModalSubline(article.subline || ''); setModalContent(article.content); setModalAuthor(article.author); setModalCategories(article.categories); setModalImageUrl(article.imageUrl); setModalStatus(article.status); setModalIsFeatured(article.isFeatured || false); setShowArticleModal(true);
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
          publishedAt: new Date().toISOString(),
          status: modalStatus,
          isFeatured: modalIsFeatured,
          isEditorsChoice: false,
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
          setShowAddPageModal(false);
          setNewPageImage('');
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
          customWidth: isCustomSize ? newAd.customWidth : undefined,
          customHeight: isCustomSize ? newAd.customHeight : undefined,
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
      setIsCustomSize(false);
  };

  const handleEditAd = (ad: Advertisement) => {
      setNewAd({ ...ad });
      setEditingAdId(ad.id);
      setIsCustomSize(!!(ad.customWidth || ad.customHeight));
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

  const handleSaveReporterInternal = () => {
      if (!activeReporter.fullName || !activeReporter.role || !activeReporter.photoUrl) {
          alert("Name, Role and Photo are required.");
          return;
      }
      if (onSaveReporter) {
          const reporter: ReporterProfile = {
              id: activeReporter.id || generateId(),
              fullName: activeReporter.fullName,
              role: activeReporter.role,
              department: activeReporter.department || 'General',
              idNumber: activeReporter.idNumber || `CJ-${Math.floor(1000 + Math.random() * 9000)}`,
              bloodGroup: activeReporter.bloodGroup,
              phone: activeReporter.phone,
              email: activeReporter.email || 'staff@cjnewshub.com',
              photoUrl: activeReporter.photoUrl,
              joinedAt: activeReporter.joinedAt || new Date().toISOString(),
              validUntil: activeReporter.validUntil || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
              location: activeReporter.location || 'Headquarters',
              status: activeReporter.status || 'active',
              cardTemplate: activeReporter.cardTemplate || 'classic',
              emergencyContact: activeReporter.emergencyContact,
              officeAddress: activeReporter.officeAddress,
              signatureUrl: activeReporter.signatureUrl,
              stampUrl: activeReporter.stampUrl,
              logoUrl: activeReporter.logoUrl,
              watermarkUrl: activeReporter.watermarkUrl
          };
          onSaveReporter(reporter);
          setShowReporterModal(false);
          setActiveReporter({});
      }
  };

  const handleEditReporter = (rep: ReporterProfile) => {
      setActiveReporter(rep);
      setShowReporterModal(true);
  };

  const handlePrintCard = () => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          const cardHtml = document.getElementById('id-card-preview')?.innerHTML || '';
          printWindow.document.write(`
              <html>
                  <head>
                      <title>Print ID Card</title>
                      <link href="https://cdn.tailwindcss.com" rel="stylesheet">
                      <style>
                          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=Playfair+Display:wght@700&display=swap');
                          body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                          .print-container { transform: scale(1); }
                          @media print {
                              body { background: none; }
                              .print-container { transform: scale(1); }
                          }
                      </style>
                  </head>
                  <body>
                      <div class="print-container">${cardHtml}</div>
                      <script>
                          setTimeout(() => { window.print(); window.close(); }, 500);
                      </script>
                  </body>
              </html>
          `);
          printWindow.document.close();
      }
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
      alert("Error updating profile: " + err.message);
    } finally {
      setIsSavingSettings(false);
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

  const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button 
        onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${activeTab === id ? 'text-white border-l-4 border-news-gold bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'}`}
    >
        <Icon size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

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
    <ImageGalleryModal 
        isOpen={showProfileImageGallery}
        onClose={() => setShowProfileImageGallery(false)}
        onSelectImage={(url) => { 
            if (imageSelectorTarget === 'photo') setActiveReporter({...activeReporter, photoUrl: url});
            else if (imageSelectorTarget === 'signature') setActiveReporter({...activeReporter, signatureUrl: url});
            else if (imageSelectorTarget === 'stamp') setActiveReporter({...activeReporter, stampUrl: url});
            else if (imageSelectorTarget === 'logo') setActiveReporter({...activeReporter, logoUrl: url});
            else if (imageSelectorTarget === 'cardWatermark') setActiveReporter({...activeReporter, watermarkUrl: url});
            setShowProfileImageGallery(false); 
        }}
        uploadFolder="avatars"
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
              <SidebarItem id="ads" label="Ads & Classifieds" icon={Megaphone} />
              <SidebarItem id="idcards" label="ID Cards" icon={Fingerprint} />
              <SidebarItem id="taxonomy" label="Categories & Tags" icon={Tag} />
              <SidebarItem id="analytics" label="Analytics" icon={BarChart3} />
              <SidebarItem id="settings" label="System Settings" icon={Settings} />
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
                  </div>
              )}

              {activeTab === 'idcards' && (
                  <div className="max-w-7xl mx-auto space-y-8">
                      <div className="flex justify-between items-center">
                          <h2 className="font-serif text-2xl font-bold text-gray-900 flex items-center gap-2">
                              <Fingerprint className="text-news-gold" /> Identity Cards
                          </h2>
                          <button onClick={() => { setActiveReporter({ cardTemplate: 'official' }); setShowReporterModal(true); setShowCardBack(false); }} className="bg-news-black text-white text-xs font-bold uppercase px-4 py-3 rounded flex items-center gap-2 hover:bg-gray-800">
                              <Plus size={16} /> Add Reporter
                          </button>
                      </div>

                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                          <div className="p-4 bg-gray-50 border-b border-gray-100">
                              <h3 className="font-bold text-sm text-gray-700 uppercase tracking-wide">Staff Directory</h3>
                          </div>
                          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                              {reporters.map(rep => (
                                  <div key={rep.id} className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group" onClick={() => { setActiveReporter(rep); setShowReporterModal(true); setShowCardBack(false); }}>
                                      <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100">
                                              {rep.photoUrl ? <img src={rep.photoUrl} className="w-full h-full object-cover" /> : <UserIcon className="p-2 text-gray-400 w-full h-full"/>}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                              <h4 className="font-bold text-sm text-gray-900 truncate">{rep.fullName}</h4>
                                              <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">{rep.role}</p>
                                          </div>
                                          <div className="opacity-0 group-hover:opacity-100 flex gap-2">
                                              <button onClick={(e) => { e.stopPropagation(); handleEditReporter(rep); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><PenSquare size={14}/></button>
                                              {onDeleteReporter && <button onClick={(e) => { e.stopPropagation(); onDeleteReporter(rep.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14}/></button>}
                                          </div>
                                      </div>
                                  </div>
                              ))}
                              {reporters.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No reporters added.</div>}
                          </div>
                      </div>
                  </div>
              )}
              
              {activeTab === 'epaper' && (
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
                  <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-6">
                          <div className="flex justify-between items-center">
                              <h2 className="font-serif text-xl font-bold">Banner Ads</h2>
                              <button onClick={() => { setNewAd({ size: 'RECTANGLE', placement: 'GLOBAL', isActive: true, title: '', linkUrl: '' }); setIsCustomSize(false); setEditingAdId(null); setShowAdModal(true); }} className="bg-news-black text-white px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-1"><Plus size={14}/> New Banner</button>
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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                  <div className="max-w-4xl mx-auto space-y-12 pb-20 pt-4">
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
                          </div>
                      </div>
                  </div>
              )}
           </div>
      </div>

      {showReporterModal && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl animate-in zoom-in-95">
                  <div className="w-full md:w-1/2 p-8 overflow-y-auto bg-gray-50">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="font-bold text-2xl text-gray-900">{activeReporter.id ? 'Edit Reporter' : 'Add Reporter'}</h3>
                          <button onClick={() => setShowReporterModal(false)} className="md:hidden text-gray-500 hover:text-black"><X size={24}/></button>
                      </div>
                      
                      <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Full Name</label>
                                  <input type="text" value={activeReporter.fullName || ''} onChange={e => setActiveReporter({...activeReporter, fullName: e.target.value})} className="w-full p-3 border rounded-lg text-sm" placeholder="e.g. Jane Doe"/>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Role / Designation</label>
                                  <input type="text" value={activeReporter.role || ''} onChange={e => setActiveReporter({...activeReporter, role: e.target.value})} className="w-full p-3 border rounded-lg text-sm" placeholder="e.g. Senior Editor"/>
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Department</label>
                                  <input type="text" value={activeReporter.department || ''} onChange={e => setActiveReporter({...activeReporter, department: e.target.value})} className="w-full p-3 border rounded-lg text-sm" placeholder="e.g. Politics"/>
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
                                  {['classic', 'modern', 'agency', 'official'].map((tpl) => (
                                      <label key={tpl} className="flex items-center gap-3 cursor-pointer group">
                                          <input 
                                            type="radio" 
                                            name="template" 
                                            checked={activeReporter.cardTemplate === tpl || (!activeReporter.cardTemplate && tpl === 'classic')} 
                                            onChange={() => setActiveReporter({...activeReporter, cardTemplate: tpl as any})} 
                                            className="accent-news-black w-4 h-4"
                                          />
                                          <div className={`p-3 border rounded-lg text-xs font-bold text-center w-24 capitalize group-hover:bg-white transition-colors ${activeReporter.cardTemplate === tpl ? 'bg-news-black text-white border-news-black' : 'bg-gray-100 border-transparent'}`}>
                                              {tpl}
                                          </div>
                                      </label>
                                  ))}
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
                              <h4 className="font-bold text-sm text-gray-800 mb-3">Card Branding</h4>
                              <div className="flex gap-4">
                                  <button onClick={() => { setImageSelectorTarget('logo'); setShowProfileImageGallery(true); }} className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded text-xs font-bold hover:bg-gray-100 flex items-center justify-center gap-2">
                                      <ImageIcon size={14} /> {(activeReporter as any).logoUrl ? 'Change Logo' : 'Upload Logo'}
                                  </button>
                                  <button onClick={() => { setImageSelectorTarget('cardWatermark'); setShowProfileImageGallery(true); }} className="flex-1 px-4 py-2 bg-white border border-gray-300 rounded text-xs font-bold hover:bg-gray-100 flex items-center justify-center gap-2">
                                      <Droplet size={14} /> {(activeReporter as any).watermarkUrl ? 'Change Watermark' : 'Upload Watermark'}
                                  </button>
                              </div>
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
                  </div>

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
                          {activeReporter.fullName ? (
                              <div id="id-card-preview" className="relative group perspective">
                                  
                                  {activeReporter.cardTemplate === 'official' && (
                                      <div className={`w-[550px] h-[350px] bg-white rounded-xl shadow-2xl overflow-hidden relative flex flex-col border border-gray-200 print:shadow-none print:border-black transition-transform duration-500 preserve-3d ${showCardBack ? 'rotate-y-180' : ''}`}>
                                          {!showCardBack ? (
                                              <>
                                                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none z-0">
                                                      <img 
                                                          src={(activeReporter as any).watermarkUrl || (activeReporter as any).logoUrl || "https://cdn-icons-png.flaticon.com/512/21/21601.png"} 
                                                          className="w-[300px] h-[300px] object-contain grayscale" 
                                                      />
                                                  </div>

                                                  <div className="h-[70px] bg-[#d71920] relative w-full overflow-hidden shrink-0 z-10 flex justify-between items-center px-8">
                                                      <div className="flex-1 text-center">
                                                          <h1 className="text-4xl font-bold text-white uppercase tracking-wider font-sans drop-shadow-md">PRESS</h1>
                                                      </div>
                                                      
                                                      <div className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 bg-white rounded-lg border-2 border-white/50 flex items-center justify-center overflow-hidden shadow-lg p-1">
                                                           {(activeReporter as any).logoUrl ? (
                                                               <img src={(activeReporter as any).logoUrl} className="w-full h-full object-contain" />
                                                           ) : (
                                                               <div className="text-[8px] text-gray-400 font-bold text-center leading-tight">LOGO<br/>HERE</div>
                                                           )}
                                                      </div>
                                                      
                                                      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#1a1a1a] rounded-full z-0 opacity-20 pointer-events-none"></div>
                                                      <svg className="absolute bottom-0 left-0 w-full h-[20px] pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                          <path d="M0 100 C 40 0 60 0 100 100 Z" fill="white" fillOpacity="0.1"/>
                                                          <path d="M50 100 Q 80 0 100 80 L 100 100 L 0 100 Z" fill="white" />
                                                      </svg>
                                                  </div>

                                                  <div className="flex-1 p-6 flex gap-6 relative z-10">
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
                                              <div className="w-full h-full p-8 flex flex-col bg-white text-left relative overflow-hidden">
                                                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.08] pointer-events-none z-0">
                                                      <img 
                                                          src={(activeReporter as any).watermarkUrl || (activeReporter as any).logoUrl || "https://cdn-icons-png.flaticon.com/512/21/21601.png"} 
                                                          className="w-[300px] h-[300px] object-contain grayscale" 
                                                      />
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

                                                  <div className="mt-auto flex justify-end items-end relative z-10 pb-10">
                                                       <div className="relative">
                                                           <div className="relative w-64 h-36 mb-1 flex items-end justify-center">
                                                               {activeReporter.signatureUrl && (
                                                                   <img 
                                                                       src={activeReporter.signatureUrl} 
                                                                       className="w-full h-24 object-contain object-bottom mix-blend-multiply z-10 relative mb-2"
                                                                       alt="Authorized Signature" 
                                                                   />
                                                               )}
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
                                                           <div className="w-64 border-b-2 border-black mb-1"></div>
                                                           <h3 className="text-sm font-bold text-black uppercase tracking-widest text-center">AUTHORIZED SIGNATURE</h3>
                                                       </div>
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  )}
                                  
                                  {activeReporter.cardTemplate === 'classic' && (
                                      <div className="w-[350px] h-[550px] bg-white rounded-2xl shadow-2xl flex items-center justify-center border text-gray-400">Classic Preview</div>
                                  )}
                                  {activeReporter.cardTemplate === 'modern' && (
                                      <div className="w-[350px] h-[550px] bg-black rounded-xl shadow-2xl flex items-center justify-center border border-gray-800 text-gray-500">Modern Preview</div>
                                  )}
                                  {activeReporter.cardTemplate === 'agency' && (
                                      <div className="w-[350px] h-[550px] bg-white rounded-xl shadow-2xl flex items-center justify-center border text-gray-400">Agency Preview</div>
                                  )}
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-30">
                                  <CreditCard size={64} strokeWidth={1} />
                                  <p className="text-xs font-bold uppercase mt-4 tracking-widest">Enter details to preview ID card</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default EditorDashboard;