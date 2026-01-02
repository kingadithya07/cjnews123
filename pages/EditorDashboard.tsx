
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, UserRole } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, RotateCcw, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Calendar, Loader2, Library, User as UserIcon, Lock,
  Check, Scissors, Camera, Monitor, Smartphone, Tablet, ShieldCheck, AlertTriangle, Code, Copy, RefreshCcw, Type, Star, Save, Award, ChevronDown, Maximize, MapPin, DollarSign, Phone, Filter
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
}

const EditorDashboard: React.FC<EditorDashboardProps> = ({ 
  articles, ePaperPages, categories, tags = [], adCategories, classifieds, advertisements,
  onAddPage, onDeletePage, onDeleteArticle, onSaveArticle, 
  onAddCategory, onDeleteCategory, onAddTag, onDeleteTag, onAddAdCategory, onDeleteAdCategory, onSaveTaxonomy,
  onAddClassified, onDeleteClassified, onAddAdvertisement, onDeleteAdvertisement,
  onNavigate, watermarkSettings, onUpdateWatermarkSettings, userName, userAvatar,
  devices, onApproveDevice, onRejectDevice, onRevokeDevice, globalAdsEnabled, onToggleGlobalAds
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
  // Default to today or the most recent date in the list
  const availableEpaperDates = useMemo(() => {
      const dates = Array.from(new Set(ePaperPages.map(p => p.date))).sort().reverse();
      return dates;
  }, [ePaperPages]);
  
  const [epaperFilterDate, setEpaperFilterDate] = useState<string>(availableEpaperDates[0] || new Date().toISOString().split('T')[0]);

  // Update filter if pages change and current filter is invalid (unless it's just empty)
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

  // Sync local state when global settings change via props
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
          const fileName = `${generateId()}.${fileExt}`;
          // Ensure folder string ends with a clean path structure
          const safeFolder = folder.replace(/\/$/, ''); 
          const filePath = `${safeFolder}/${fileName}`; 
          
          const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('images').getPublicUrl(filePath);
          setter(data.publicUrl);
      } catch (error: any) {
          alert("Upload failed: " + error.message);
      } finally {
          loader(false);
      }
  };

  const handleContentImageUpload = async (file: File): Promise<string> => {
      const fileExt = file.name.split('.').pop();
      const fileName = `articles/${generateId()}.${fileExt}`;
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
          title: modalTitle,
          subline: modalSubline,
          content: modalContent,
          author: modalAuthor,
          categories: modalCategories.length > 0 ? modalCategories : ['General'],
          imageUrl: modalImageUrl || 'https://placehold.co/800x400?text=No+Image',
          publishedAt: editArticleId ? articles.find(a => a.id === editArticleId)?.publishedAt || new Date().toISOString() : new Date().toISOString(),
          status: modalStatus,
          isFeatured: modalIsFeatured,
          isEditorsChoice: modalIsEditorsChoice
      };
      onSaveArticle(article);
      setShowArticleModal(false);
  };

  const handleAddPageInternal = () => {
      if (!newPageImage) { alert("Page image required"); return; }
      const page: EPaperPage = {
          id: generateId(), date: newPageDate, pageNumber: Number(newPageNumber), imageUrl: newPageImage, regions: []
      };
      onAddPage(page);
      setShowAddPageModal(false);
      setNewPageImage('');
      // Optionally switch filter to the new page date so user sees what they just added
      setEpaperFilterDate(newPageDate);
  };

  const handleSaveProfile = async () => {
      setIsSavingSettings(true);
      try {
          const updates: any = { data: { full_name: profileName, avatar_url: profileAvatar } };
          if (newPassword) updates.password = newPassword;
          const { error } = await supabase.auth.updateUser(updates);
          if (error) throw error;
          alert("Profile updated successfully.");
          setNewPassword('');
      } catch (e: any) {
          alert("Error updating profile: " + e.message);
      } finally {
          setIsSavingSettings(false);
      }
  };

  const handleUpdateBranding = async () => {
      setIsSavingBranding(true);
      try {
          await onUpdateWatermarkSettings({ ...watermarkSettings, text: watermarkText, logoUrl: watermarkLogo, fontSize: watermarkFontSize });
          alert("Branding settings updated globally (Status: PUBLISHED).");
      } catch (e: any) {
          alert("Error updating branding: " + e.message);
      } finally {
          setIsSavingBranding(false);
      }
  };

  const handleTaxonomySave = async () => {
      setIsSavingTaxonomy(true);
      try {
          await onSaveTaxonomy();
          alert("Taxonomy changes saved and synced globally.");
      } catch (e: any) {
          alert("Failed to save taxonomy: " + e.message);
      } finally {
          setIsSavingTaxonomy(false);
      }
  };

  const handleForceSaveDevices = async () => {
      setIsSavingDevices(true);
      try {
          alert("Devices are synced with backend table 'trusted_devices'.");
      } catch (e: any) {
          alert("Error: " + e.message);
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
      />
      <CategorySelector 
        isOpen={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        options={categories}
        selected={modalCategories}
        onChange={setModalCategories}
      />
      
      <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
          {/* SIDEBAR */}
          <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
              <div className="flex justify-between items-center p-6 border-b border-gray-800">
                  <h1 className="font-serif text-2xl font-bold text-white">Editor<span className="text-news-gold">.</span></h1>
                  <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                  <SidebarItem id="articles" label="Articles" icon={FileText} />
                  <SidebarItem id="epaper" label="E-Paper" icon={Newspaper} />
                  <SidebarItem id="ads" label="Advertising" icon={Megaphone} />
                  <SidebarItem id="taxonomy" label="Taxonomy" icon={Tag} />
                  <SidebarItem id="analytics" label="Analytics" icon={BarChart3} />
                  <SidebarItem id="settings" label="System" icon={Settings} />
              </div>
              <div className="p-6 border-t border-gray-800">
                  <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center mb-2">
                      <Globe size={16} /> View Site
                  </button>
                  <button onClick={() => { supabase.auth.signOut(); onNavigate('/login'); }} className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center">
                      <Lock size={16} /> Logout
                  </button>
              </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-1 flex flex-col md:ml-72 h-full overflow-hidden bg-[#f8f9fa]">
              <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                  <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600"><Menu size={24}/></button>
                  <span className="font-serif font-bold text-lg">Dashboard</span>
                  <div className="w-8"></div>
              </div>

              <div className="md:p-8 overflow-y-auto flex-1 p-4">
                  {/* Articles Tab Content (unchanged) */}
                  {activeTab === 'articles' && (
                      <div className="max-w-7xl mx-auto">
                          <div className="flex justify-between items-center mb-6">
                              <h2 className="text-xl md:text-2xl font-serif font-bold">All Articles</h2>
                              <button onClick={openNewArticle} className="bg-news-black text-white px-4 py-2 rounded text-xs md:text-sm font-bold flex items-center gap-2">
                                  <Plus size={16}/> <span className="hidden sm:inline">New Article</span><span className="sm:hidden">New</span>
                              </button>
                          </div>
                          <div className="hidden md:block bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                              <table className="w-full text-left">
                                  <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                      <tr>
                                          <th className="px-6 py-4">Title</th>
                                          <th className="px-6 py-4">Author</th>
                                          <th className="px-6 py-4">Category</th>
                                          <th className="px-6 py-4">Status</th>
                                          <th className="px-6 py-4 text-right">Actions</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {articles.map(article => (
                                          <tr key={article.id} className="hover:bg-gray-50">
                                              <td className="px-6 py-4">
                                                  <div className="flex flex-col">
                                                      <span className="font-bold text-gray-900 text-sm line-clamp-1">{article.title}</span>
                                                      <div className="flex gap-2 mt-1">
                                                          {article.isFeatured && <span className="text-[10px] text-news-accent font-bold uppercase flex items-center gap-1"><Star size={10} fill="currentColor"/> Featured</span>}
                                                          {article.isEditorsChoice && <span className="text-[10px] text-news-gold font-bold uppercase flex items-center gap-1"><Award size={10} fill="currentColor"/> Editorial</span>}
                                                      </div>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4 text-sm text-gray-600">{article.author}</td>
                                              <td className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                                                  <div className="flex flex-wrap gap-1">
                                                    {article.categories.slice(0, 2).map(c => <span key={c} className="bg-gray-100 px-1 rounded">{c}</span>)}
                                                    {article.categories.length > 2 && <span>+{article.categories.length - 2}</span>}
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{article.status}</span></td>
                                              <td className="px-6 py-4 text-right flex justify-end gap-3">
                                                  <button onClick={() => openEditArticle(article)} className="text-blue-600 hover:text-blue-800"><PenSquare size={16}/></button>
                                                  <button onClick={() => onDeleteArticle(article.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                          <div className="md:hidden space-y-4">
                                {articles.map(article => (
                                    <div key={article.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                                    {article.categories.map(c => (
                                                        <span key={c} className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-50 px-1 rounded">{c}</span>
                                                    ))}
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{article.title}</h3>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {article.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                            <button onClick={() => openEditArticle(article)} className="p-2 bg-blue-50 text-blue-600 rounded-md"><PenSquare size={16}/></button>
                                            <button onClick={() => onDeleteArticle(article.id)} className="p-2 bg-red-50 text-red-500 rounded-md"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                          </div>
                      </div>
                  )}

                  {/* EPaper Tab Content (unchanged) */}
                  {activeTab === 'epaper' && (
                      <div className="max-w-7xl mx-auto">
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                              <h2 className="text-2xl font-serif font-bold">E-Paper Pages</h2>
                              <div className="flex gap-4 w-full md:w-auto">
                                <div className="relative flex-1 md:w-auto">
                                    <select 
                                        value={epaperFilterDate} 
                                        onChange={(e) => setEpaperFilterDate(e.target.value)}
                                        className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-4 pr-10 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-news-black"
                                    >
                                        {availableEpaperDates.length > 0 ? (
                                            availableEpaperDates.map(date => <option key={date} value={date}>{date}</option>)
                                        ) : (
                                            <option value="">No Editions</option>
                                        )}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-3 text-gray-500 pointer-events-none" />
                                </div>
                                <button onClick={() => { setShowAddPageModal(true); setNewPageDate(new Date().toISOString().split('T')[0]); }} className="bg-news-black text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 whitespace-nowrap"><Plus size={16}/> Upload Page</button>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                              {filteredPages.map(page => (
                                  <div key={page.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden group shadow-sm">
                                      <div className="aspect-[1/1.4] relative bg-gray-100">
                                          <img src={page.imageUrl} className="w-full h-full object-cover" />
                                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                              <button onClick={() => onDeletePage(page.id)} className="p-2 bg-red-600 text-white rounded-full"><Trash2 size={16}/></button>
                                          </div>
                                          <div className="absolute top-2 right-2 bg-black text-white text-xs font-bold px-2 py-1 rounded">P.{page.pageNumber}</div>
                                      </div>
                                      <div className="p-3 text-center border-t border-gray-100">
                                          <p className="text-xs font-bold text-gray-600 uppercase">{page.date}</p>
                                      </div>
                                  </div>
                              ))}
                              {filteredPages.length === 0 && (
                                  <div className="col-span-full py-16 text-center text-gray-400 bg-white rounded-lg border-2 border-dashed border-gray-200">
                                      <Newspaper size={40} className="mx-auto mb-4 opacity-20"/>
                                      <p className="text-sm font-bold">No pages found for {epaperFilterDate}.</p>
                                      <p className="text-xs mt-1">Upload a page to start this edition.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}

                  {/* Ads Tab Content (Updated with new sizes) */}
                  {activeTab === 'ads' && (
                      <div className="max-w-7xl mx-auto space-y-8 pb-20">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                              <div>
                                  <h2 className="text-2xl font-serif font-bold text-gray-900">Ad Campaigns</h2>
                                  <p className="text-gray-500 text-xs mt-1">Manage banners across desktop and mobile layouts.</p>
                              </div>
                              <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Master Switch</span>
                                      <button 
                                          onClick={() => onToggleGlobalAds(!globalAdsEnabled)}
                                          className={`w-12 h-6 rounded-full transition-colors relative ${globalAdsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                      >
                                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${globalAdsEnabled ? 'left-7' : 'left-1'}`}></div>
                                      </button>
                                  </div>
                                  <button onClick={() => { 
                                      setNewAd({ size: 'RECTANGLE', placement: 'GLOBAL', isActive: true, title: '', linkUrl: '' }); 
                                      setIsCustomSize(false);
                                      setShowAdModal(true); 
                                  }} className="bg-news-black text-white px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2">
                                      <Plus size={16} /> New Ad
                                  </button>
                              </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {advertisements.map(ad => (
                                  <div key={ad.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden group hover:shadow-md transition-all">
                                      <div className="relative h-40 bg-gray-100 flex items-center justify-center p-4">
                                          <img src={ad.imageUrl} className="max-w-full max-h-full object-contain" alt={ad.title} />
                                          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                              <span className="bg-black/70 backdrop-blur text-white text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-1">
                                                  {ad.customWidth ? `${ad.customWidth}x${ad.customHeight}` : ad.size.replace(/_/g, ' ')}
                                              </span>
                                              <span className="bg-white/90 text-black text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider border border-gray-200">
                                                  {ad.placement} {ad.placement === 'CATEGORY' ? `(${ad.targetCategory})` : ''}
                                              </span>
                                          </div>
                                      </div>
                                      <div className="p-5">
                                          <div className="flex justify-between items-start mb-2">
                                              <h3 className="font-bold text-gray-900 truncate pr-2">{ad.title}</h3>
                                              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ad.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                          </div>
                                          <p className="text-xs text-gray-500 truncate mb-4 flex items-center gap-1">
                                              <Globe size={12}/> {ad.linkUrl || "Offline / Display Only"}
                                          </p>
                                          
                                          <div className="flex gap-2 pt-3 border-t border-gray-100">
                                              <button onClick={() => onDeleteAdvertisement(ad.id)} className="flex-1 text-red-600 hover:bg-red-50 py-2 rounded text-xs font-bold uppercase border border-transparent hover:border-red-100 transition-colors flex items-center justify-center gap-2">
                                                  <Trash2 size={14} /> Delete
                                              </button>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                              {advertisements.length === 0 && (
                                  <div className="col-span-full py-20 text-center text-gray-400 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                                      <Megaphone size={40} className="mx-auto mb-4 opacity-20" />
                                      <p className="text-sm font-medium">No active ad campaigns.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
                  {/* ... (Other tabs kept same) ... */}
                  {activeTab === 'taxonomy' && (
                      <div className="max-w-7xl mx-auto pb-20">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <h2 className="text-2xl font-serif font-bold">Taxonomy</h2>
                            <button onClick={handleTaxonomySave} disabled={isSavingTaxonomy} className="bg-news-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow hover:bg-gray-800 disabled:opacity-50">
                                {isSavingTaxonomy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Changes
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              {/* Categories, Tags, Classified Sections columns */}
                              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText size={18}/> Categories</h3>
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
                              {/* ... other taxonomy columns ... */}
                          </div>
                      </div>
                  )}
                  {activeTab === 'analytics' && <div className="max-w-7xl mx-auto"><AnalyticsDashboard articles={articles} role={UserRole.EDITOR} /></div>}
                  {activeTab === 'settings' && (
                      <div className="max-w-4xl mx-auto space-y-8 pb-20">
                          {/* Profile and Settings sections... */}
                          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                              <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><UserIcon size={20} className="text-news-gold"/> My Profile</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                 {/* ... profile inputs ... */}
                                 <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Display Name</label>
                                        <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" />
                                    </div>
                                    <div>
                                        <button onClick={handleSaveProfile} disabled={isSavingSettings} className="w-full bg-news-black text-white py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg">
                                            {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Update Profile
                                        </button>
                                    </div>
                                 </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* ARTICLE MODAL (unchanged) */}
      {/* ... */}
      
      {/* AD CAMPAIGN MODAL (Updated) */}
      {showAdModal && (
        <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 shadow-2xl max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900">New Ad Campaign</h3>
                    <button onClick={() => setShowAdModal(false)}><X size={20}/></button>
                </div>
                <div className="p-6 space-y-5 overflow-y-auto">
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Creative Banner</label>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
                                {newAd.imageUrl ? <img src={newAd.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-300" />}
                            </div>
                            <div className="flex-1">
                                <label className="block w-full cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-2 px-4 rounded-lg text-center text-xs transition-colors mb-2">
                                    Upload Image
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => setNewAd({...newAd, imageUrl: url}), setIsLogoUploading, 'ads')} />
                                </label>
                                <p className="text-[10px] text-gray-400 leading-tight">Supported: JPG, PNG, GIF. Ensure correct aspect ratio for selected size.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Target Ad Slot</label>
                            <select 
                                value={newAd.size === 'CUSTOM' ? 'RECTANGLE' : newAd.size} 
                                onChange={(e) => setNewAd({...newAd, size: e.target.value as any})}
                                className="w-full p-2.5 border rounded-lg text-xs font-bold bg-white focus:border-news-black outline-none"
                            >
                                <optgroup label="Mobile Layouts (Strictly Mobile)">
                                    <option value="MOBILE_BANNER">Standard Banner (320x50)</option>
                                    <option value="LARGE_MOBILE_BANNER">Large Banner (320x100)</option>
                                </optgroup>
                                <optgroup label="Desktop Layouts (Strictly Desktop)">
                                    <option value="BILLBOARD">Billboard (970x250)</option>
                                    <option value="LARGE_LEADERBOARD">Large Leaderboard (970x90)</option>
                                    <option value="LEADERBOARD">Leaderboard (728x90)</option>
                                    <option value="SKYSCRAPER">Skyscraper (160x600)</option>
                                    <option value="HALF_PAGE">Half Page (300x600)</option>
                                    <option value="LARGE_RECTANGLE">Large Rectangle (336x280)</option>
                                </optgroup>
                                <optgroup label="Universal Layouts (Cross-Device)">
                                    <option value="RECTANGLE">Medium Rectangle (300x250)</option>
                                </optgroup>
                            </select>
                            <p className="text-[10px] text-gray-400">Select where this ad should appear on the layout.</p>
                        </div>
                        
                        {/* Custom Dimensions UI */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                             <div className="flex justify-between items-center mb-3">
                                 <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Dimensions Strategy</label>
                                 <div className="flex bg-white rounded border border-gray-200 p-0.5">
                                     <button 
                                        onClick={() => setIsCustomSize(false)}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${!isCustomSize ? 'bg-news-black text-white' : 'text-gray-500 hover:text-black'}`}
                                     >
                                         Standard
                                     </button>
                                     <button 
                                        onClick={() => setIsCustomSize(true)}
                                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-sm transition-colors ${isCustomSize ? 'bg-news-black text-white' : 'text-gray-500 hover:text-black'}`}
                                     >
                                         Custom
                                     </button>
                                 </div>
                             </div>
                             
                             {isCustomSize && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Width (px)</label>
                                        <input type="number" value={newAd.customWidth || ''} onChange={(e) => setNewAd({...newAd, customWidth: Number(e.target.value)})} className="w-full p-2 border rounded-md text-sm outline-none focus:border-news-black" placeholder="e.g. 980" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 mb-1">Height (px)</label>
                                        <input type="number" value={newAd.customHeight || ''} onChange={(e) => setNewAd({...newAd, customHeight: Number(e.target.value)})} className="w-full p-2 border rounded-md text-sm outline-none focus:border-news-black" placeholder="e.g. 300" />
                                    </div>
                                </div>
                             )}
                        </div>

                        {/* Placement Scope */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Placement Scope</label>
                            <select 
                                value={newAd.placement} 
                                onChange={(e) => setNewAd({...newAd, placement: e.target.value as any})}
                                className="w-full p-2.5 border rounded-lg text-xs font-bold bg-white focus:border-news-black outline-none"
                            >
                                <option value="GLOBAL">Run Everywhere</option>
                                <option value="HOME">Home Page Only</option>
                                <option value="ARTICLE">Article Pages Only</option>
                                <option value="EPAPER">E-Paper Section</option>
                                <option value="EDITORIAL">Editorial Section</option>
                                <option value="CLASSIFIEDS">Classifieds Section</option>
                                <option value="CATEGORY">Specific Category</option>
                            </select>
                        </div>
                    </div>

                    {newAd.placement === 'CATEGORY' && (
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Select Category</label>
                            <select 
                                value={newAd.targetCategory || ''} 
                                onChange={(e) => setNewAd({...newAd, targetCategory: e.target.value})}
                                className="w-full p-2.5 border rounded-lg text-xs font-bold bg-white focus:border-news-black outline-none"
                            >
                                <option value="">-- Choose Category --</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Campaign Title</label>
                        <input type="text" value={newAd.title || ''} onChange={(e) => setNewAd({...newAd, title: e.target.value})} className="w-full p-3 border rounded-lg text-sm outline-none focus:border-news-black" placeholder="e.g. Summer Sale 2024" />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Destination URL (Optional)</label>
                        <input type="url" value={newAd.linkUrl || ''} onChange={(e) => setNewAd({...newAd, linkUrl: e.target.value})} className="w-full p-3 border rounded-lg text-sm outline-none focus:border-news-black" placeholder="https://... (Leave empty for offline/display-only)" />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 mt-auto">
                    <button onClick={() => setShowAdModal(false)} className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-black">Cancel</button>
                    <button 
                        onClick={() => {
                            if (newAd.title && newAd.imageUrl) {
                                if (isCustomSize && (!newAd.customWidth || !newAd.customHeight)) {
                                    alert("Please specify dimensions for custom size.");
                                    return;
                                }
                                if (newAd.placement === 'CATEGORY' && !newAd.targetCategory) {
                                    alert("Please select a target category.");
                                    return;
                                }
                                
                                // Clean up dimensions if standard is selected
                                const finalCustomWidth = isCustomSize ? newAd.customWidth : undefined;
                                const finalCustomHeight = isCustomSize ? newAd.customHeight : undefined;

                                onAddAdvertisement({
                                    id: generateId(),
                                    title: newAd.title,
                                    imageUrl: newAd.imageUrl,
                                    linkUrl: newAd.linkUrl || undefined, 
                                    size: newAd.size as any,
                                    customWidth: finalCustomWidth,
                                    customHeight: finalCustomHeight,
                                    placement: newAd.placement as any,
                                    targetCategory: newAd.targetCategory,
                                    isActive: true
                                });
                                setShowAdModal(false);
                            } else {
                                alert("Please fill required fields (Title & Image).");
                            }
                        }} 
                        className="px-6 py-2.5 bg-news-black text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2"
                    >
                        <Upload size={14} /> Launch Campaign
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default EditorDashboard;
