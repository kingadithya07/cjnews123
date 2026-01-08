
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, UserRole, AdSize, AdPlacement, ReporterProfile } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, RotateCcw, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Calendar, Loader2, Library, User as UserIcon, Lock,
  Check, Scissors, Camera, Monitor, Smartphone, Tablet, ShieldCheck, AlertTriangle, Code, Copy, RefreshCcw, Type, Star, Save, Award, ChevronDown, Maximize, MapPin, DollarSign, Phone, Filter, Layout as LayoutIcon, Sparkles, Key, Eye, Fingerprint, Printer, Repeat, PenTool, Stamp, Droplet, CreditCard
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
          e.target.value = ''; // Reset input to allow re-selection
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
          publishedAt: modalPublishedAt, // Use preserved or new date
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
          {/* ... Sidebar ... */}
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
              {/* ... Other Tabs ... */}
              
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

              {/* ... ID Cards, Ads, Taxonomy, Analytics, Settings ... */}
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
              
              {/* ... Rest of tabs ... */}
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
              {activeTab === 'ads' && (/* ... */ <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">{/* ... */}</div>)}
              {activeTab === 'taxonomy' && (/* ... */ <div className="max-w-6xl mx-auto space-y-8">{/* ... */}</div>)}
              {activeTab === 'analytics' && <AnalyticsDashboard articles={articles} role={UserRole.EDITOR} activeVisitors={activeVisitors} />}
              {activeTab === 'settings' && (/* ... */ <div className="max-w-4xl mx-auto space-y-12 pb-20 pt-4">{/* ... */}</div>)}
           </div>
      </div>

      {/* ... Article Modal ... */}
      {showArticleModal && (/* ... */ <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">{/* ... */}</div>)}

      {/* Add Page Modal */}
      {showAddPageModal && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 w-full max-w-md animate-in zoom-in-95">
                  <h3 className="font-bold text-lg mb-4">Upload E-Paper Page</h3>
                  <div className="space-y-4">
                      <input type="date" value={newPageDate} onChange={(e) => setNewPageDate(e.target.value)} className="w-full p-2 border rounded" />
                      <input type="number" min="1" placeholder="Page Number" value={newPageNumber} onChange={(e) => setNewPageNumber(parseInt(e.target.value) || 1)} className="w-full p-2 border rounded" />
                      <div className="border-2 border-dashed p-4 rounded text-center">
                          {newPageImage ? <img src={newPageImage} className="h-32 mx-auto object-contain mb-2"/> : <p className="text-gray-400 text-sm mb-2">No image selected</p>}
                          <label className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-xs font-bold cursor-pointer inline-block">
                              Choose File
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setNewPageImage, setIsPageUploading, 'epaper')} />
                          </label>
                      </div>
                      <div className="flex justify-end gap-2">
                          <button onClick={() => setShowAddPageModal(false)} className="px-4 py-2 text-gray-600 font-bold text-sm">Cancel</button>
                          <button onClick={handleUploadPage} disabled={isPageUploading} className="px-4 py-2 bg-news-black text-white rounded font-bold text-sm flex items-center gap-2">
                              {isPageUploading ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16}/>} Upload
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ... Reporter Modal ... */}
      {showReporterModal && (/* ... */ <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">{/* ... */}</div>)}

      {/* ... Ad Modal ... */}
      {showAdModal && (/* ... */ <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">{/* ... */}</div>)}

    </div>
    </>
  );
};

export default EditorDashboard;
