
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, UserRole } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, RotateCcw, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Calendar, Loader2, Library, User as UserIcon, Lock,
  Check, Scissors, Camera, Monitor, Smartphone, Tablet, ShieldCheck, AlertTriangle, Code, Copy, RefreshCcw, Type, Star, Save, Award, ChevronDown, Maximize, MapPin, DollarSign, Phone, Filter, Layout as LayoutIcon
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
  onDeleteAdvertisement: (id: string) => void;
  onNavigate: (path: string) => void;
  userAvatar?: string | null;
  userName?: string | null;
  devices: TrustedDevice[];
  onApproveDevice: (id: string) => void;
  onRejectDevice: (id: string) => void;
  onRevokeDevice: (id: string) => void;
  userId?: string | null;
}

const EditorDashboard: React.FC<EditorDashboardProps> = ({ 
  articles, ePaperPages, categories, tags = [], adCategories, classifieds, advertisements,
  onAddPage, onDeletePage, onDeleteArticle, onSaveArticle, 
  onAddCategory, onDeleteCategory, onAddTag, onDeleteTag, onAddAdCategory, onDeleteAdCategory, onSaveTaxonomy,
  onAddClassified, onDeleteClassified, onAddAdvertisement, onDeleteAdvertisement,
  onNavigate, watermarkSettings, onUpdateWatermarkSettings, userName, userAvatar,
  devices, onApproveDevice, onRejectDevice, onRevokeDevice, globalAdsEnabled, onToggleGlobalAds, userId
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'epaper' | 'ads' | 'taxonomy' | 'analytics' | 'settings'>('articles');

  // Article State
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubline, setModalSubline] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalAuthor, setModalAuthor] = useState('Editor');
  const [modalCategories, setModalCategories] = useState<string[]>([]);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalStatus, setModalStatus] = useState<ArticleStatus>(ArticleStatus.PUBLISHED);
  const [modalIsFeatured, setModalIsFeatured] = useState(false);
  const [modalIsEditorsChoice, setModalIsEditorsChoice] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  
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

  // Taxonomy State
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newAdCategory, setNewAdCategory] = useState('');
  const [isSavingTaxonomy, setIsSavingTaxonomy] = useState(false);

  // Settings State
  const [profileName, setProfileName] = useState(userName || '');
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [watermarkText, setWatermarkText] = useState(watermarkSettings.text);
  const [watermarkLogo, setWatermarkLogo] = useState(watermarkSettings.logoUrl);
  const [watermarkFontSize, setWatermarkFontSize] = useState(watermarkSettings.fontSize || 30);
  const [isSavingDevices, setIsSavingDevices] = useState(false);

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
      setEditArticleId(null); setModalTitle(''); setModalSubline(''); setModalContent(''); setModalAuthor(userName || 'Editor'); setModalCategories([categories[0] || 'General']); setModalImageUrl(''); setModalStatus(ArticleStatus.PUBLISHED); setModalIsFeatured(false); setModalIsEditorsChoice(false); setShowArticleModal(true);
  };

  const openEditArticle = (article: Article) => {
      setEditArticleId(article.id); setModalTitle(article.title); setModalSubline(article.subline || ''); setModalContent(article.content); setModalAuthor(article.author); setModalCategories(article.categories); setModalImageUrl(article.imageUrl); setModalStatus(article.status); setModalIsFeatured(article.isFeatured || false); setModalIsEditorsChoice(article.isEditorsChoice || false); setShowArticleModal(true);
  };

  const handleSaveArticleInternal = () => {
      if (!modalTitle) { alert("Title required"); return; }
      const article: Article = {
          id: editArticleId || generateId(),
          userId: userId || undefined,
          title: modalTitle,
          subline: modalSubline,
          author: modalAuthor,
          content: modalContent,
          categories: modalCategories.length > 0 ? modalCategories : ['General'],
          imageUrl: modalImageUrl || 'https://picsum.photos/800/400',
          publishedAt: new Date().toISOString(),
          status: modalStatus,
          isFeatured: modalIsFeatured,
          isEditorsChoice: modalIsEditorsChoice,
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
    <CategorySelector 
        isOpen={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        options={categories}
        selected={modalCategories}
        onChange={setModalCategories}
    />

    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
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

      <div className="flex-1 flex flex-col md:ml-72 h-full overflow-hidden bg-[#f8f9fa]">
           <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0 sticky top-0 z-40">
                <button onClick={() => setIsSidebarOpen(true)} className="text-gray-700"><Menu size={24}/></button>
                <h1 className="font-serif text-lg font-bold text-gray-900">Editor Dashboard</h1>
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                     {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover"/> : <UserIcon className="p-1.5 text-gray-400 w-full h-full"/>}
                </div>
           </div>

           <div className="md:p-8 overflow-y-auto flex-1 p-4">
              {activeTab === 'articles' && (
                  <div className="max-w-6xl mx-auto space-y-6">
                      <div className="flex justify-between items-center">
                           <h1 className="font-serif text-2xl font-bold text-gray-900">Article Manager</h1>
                           <button onClick={openNewArticle} className="bg-news-black text-white text-xs font-bold uppercase px-4 py-3 rounded flex items-center gap-2 hover:bg-gray-800">
                                <Plus size={16} /> New Article
                           </button>
                      </div>
                      <div className="bg-white rounded border overflow-hidden shadow-sm">
                          <table className="w-full text-left">
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
                                                    <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden shrink-0">
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
                      {/* Banners */}
                      <div className="space-y-6">
                          <div className="flex justify-between items-center">
                              <h2 className="font-serif text-xl font-bold">Banner Ads</h2>
                              <button onClick={() => setShowAdModal(true)} className="bg-news-black text-white px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-1"><Plus size={14}/> New Banner</button>
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
                                      <button onClick={() => onDeleteAdvertisement(ad.id)} className="text-red-500 p-2 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                                  </div>
                              ))}
                              {advertisements.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">No active banners.</div>}
                          </div>
                      </div>

                      {/* Classifieds */}
                      <div className="space-y-6">
                          <div className="flex justify-between items-center">
                              <h2 className="font-serif text-xl font-bold">Classifieds</h2>
                              <button onClick={() => setShowClassifiedModal(true)} className="bg-news-black text-white px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-1"><Plus size={14}/> New Listing</button>
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
              
              {activeTab === 'analytics' && <AnalyticsDashboard articles={articles} role={UserRole.EDITOR} />}

              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-12 pb-20 pt-4">
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

                      {/* Profile Section */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><UserIcon className="text-news-gold" /> Admin Profile</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                             </div>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Change Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" placeholder="New Password" />
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <button disabled={isSavingSettings} className="w-full bg-news-black text-news-gold py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg">
                                        {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                                        {isSavingSettings ? 'Saving...' : 'Update Profile'}
                                    </button>
                                </div>
                             </div>
                          </div>
                      </div>

                      {/* Device Management */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm">
                          <h3 className="font-bold text-lg flex items-center gap-2 mb-6"><ShieldCheck size={20} className="text-green-600"/> Authorized Devices</h3>
                          <div className="space-y-4">
                              {devices.map(device => (
                                  <div key={device.id} className="flex items-center justify-between p-4 bg-gray-50 rounded border">
                                      <div className="flex items-center gap-3">
                                          <div className={`p-2 rounded-full ${device.isCurrent ? 'bg-news-black text-white' : 'bg-white border'}`}>
                                              {device.deviceType === 'mobile' ? <Smartphone size={16}/> : device.deviceType === 'tablet' ? <Tablet size={16}/> : <Monitor size={16}/>}
                                          </div>
                                          <div>
                                              <p className="text-sm font-bold">{device.deviceName} {device.isCurrent && '(Current)'}</p>
                                              <p className="text-xs text-gray-500">{device.location} • {device.lastActive}</p>
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          {device.status === 'pending' && (
                                              <button onClick={() => onApproveDevice(device.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold uppercase">Approve</button>
                                          )}
                                          <button onClick={() => onRevokeDevice(device.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                                      </div>
                                  </div>
                              ))}
                              {devices.length === 0 && <p className="text-gray-400 italic text-sm">No devices found.</p>}
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
            <div className="p-4 md:p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <input type="text" value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif placeholder:text-gray-300" placeholder="Article Headline"/>
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
                            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded border border-gray-100">
                                <label className="flex items-center gap-2 cursor-pointer w-full">
                                    <input type="checkbox" checked={modalIsEditorsChoice} onChange={e => setModalIsEditorsChoice(e.target.checked)} className="w-4 h-4 accent-news-gold" />
                                    <div className="flex items-center gap-2">
                                        <Award size={12} className={modalIsEditorsChoice ? "text-news-gold fill-news-gold" : "text-gray-400"} />
                                        <span className="text-xs font-bold uppercase">Editor's Pick</span>
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

      {showAddPageModal && (
          <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <h3 className="font-bold text-lg mb-4">Upload E-Paper Page</h3>
                  <div className="space-y-4">
                      <input type="date" value={newPageDate} onChange={e => setNewPageDate(e.target.value)} className="w-full p-2 border rounded" />
                      <input type="number" min="1" value={newPageNumber} onChange={e => setNewPageNumber(Number(e.target.value))} className="w-full p-2 border rounded" placeholder="Page Number" />
                      <div className="border-2 border-dashed p-4 rounded text-center">
                          {newPageImage ? <img src={newPageImage} className="max-h-32 mx-auto" /> : <p className="text-sm text-gray-400">No image selected</p>}
                          <label className="block mt-2 text-blue-600 text-sm font-bold cursor-pointer">
                              {isPageUploading ? 'Uploading...' : 'Choose Image'}
                              <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setNewPageImage, setIsPageUploading, 'epaper')} disabled={isPageUploading} />
                          </label>
                      </div>
                      <button onClick={handleUploadPage} disabled={isPageUploading} className="w-full bg-news-black text-white py-2 rounded font-bold uppercase text-xs">
                          {isPageUploading ? <Loader2 className="animate-spin inline mr-2" size={14}/> : 'Add Page'}
                      </button>
                      <button onClick={() => setShowAddPageModal(false)} className="w-full text-gray-500 text-xs font-bold uppercase mt-2">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      {/* Ad & Classified Modals would go here similar to Article Modal */}
      {/* Omitted for brevity, but would follow same pattern */}

    </div>
    </>
  );
};

export default EditorDashboard;
