
import React, { useState, useRef, useEffect } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, UserRole } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, RotateCcw, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Calendar, Loader2, Library, User as UserIcon, Lock,
  Check, Scissors, Camera, Monitor, Smartphone, Tablet, ShieldCheck, AlertTriangle, Code, Copy, RefreshCcw, Type, Star, Save
} from 'lucide-react';
import { format } from 'date-fns';
import EPaperViewer from '../components/EPaperViewer';
import RichTextEditor from '../components/RichTextEditor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { generateId } from '../utils';
import { supabase } from '../supabaseClient';
import ImageGalleryModal from '../components/ImageGalleryModal';

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
  const [activeTab, setActiveTab] = useState<'articles' | 'epaper' | 'classifieds' | 'ads' | 'taxonomy' | 'analytics' | 'settings'>('articles');

  // Article State
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubline, setModalSubline] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalAuthor, setModalAuthor] = useState('Editor');
  const [modalCategory, setModalCategory] = useState(categories[0] || 'General');
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalStatus, setModalStatus] = useState<ArticleStatus>(ArticleStatus.PUBLISHED);
  const [modalIsFeatured, setModalIsFeatured] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  
  // E-Paper State
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageDate, setNewPageDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [newPageImage, setNewPageImage] = useState('');
  const [isPageUploading, setIsPageUploading] = useState(false);

  // Classifieds & Ads Forms
  const [showClassifiedModal, setShowClassifiedModal] = useState(false);
  const [newClassified, setNewClassified] = useState<Partial<ClassifiedAd>>({});
  const [showAdModal, setShowAdModal] = useState(false);
  const [newAd, setNewAd] = useState<Partial<Advertisement>>({ size: 'RECTANGLE', placement: 'GLOBAL', isActive: true });

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

  // Sync local state when global settings change via props
  useEffect(() => {
    setWatermarkText(watermarkSettings.text);
    setWatermarkLogo(watermarkSettings.logoUrl);
    setWatermarkFontSize(watermarkSettings.fontSize || 30);
  }, [watermarkSettings]);

  // -- SQL HELPERS --
  const phoneFormatSQL = `SELECT\n   FORMAT(0112223333, '##-###-####') -- replace format with what is shown in the table below.`;
  const dateFormatSQL = `-- Standard SQL for date formatting\nSELECT \n  to_char(published_at, 'DD-Mon-YYYY') \nFROM articles;`;
  const fixPermissionsSQL = `-- FORCE PUBLISH CONFIGURATION\n-- Run this if watermark settings are not visible in Incognito mode\nUPDATE articles \nSET status = 'PUBLISHED' \nWHERE id = '00000000-0000-0000-0000-000000000000';`;

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("SQL code copied!");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, loader: (loading: boolean) => void) => {
      const file = e.target.files?.[0];
      if (!file) return;
      loader(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${generateId()}.${fileExt}`;
          // Fixed path to 'gallery' to ensure it shows in media library
          const filePath = `gallery/${fileName}`;
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
      const fileName = `content/${generateId()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      return data.publicUrl;
  };

  const openNewArticle = () => {
      setEditArticleId(null);
      setModalTitle('');
      setModalSubline('');
      setModalContent('');
      setModalAuthor(userName || 'Editor');
      setModalCategory(categories[0]);
      setModalImageUrl('');
      setModalStatus(ArticleStatus.PUBLISHED);
      setModalIsFeatured(false);
      setShowArticleModal(true);
  };

  const openEditArticle = (article: Article) => {
      setEditArticleId(article.id);
      setModalTitle(article.title);
      setModalSubline(article.subline || '');
      setModalContent(article.content);
      setModalAuthor(article.author);
      setModalCategory(article.category);
      setModalImageUrl(article.imageUrl);
      setModalStatus(article.status);
      setModalIsFeatured(article.isFeatured || false);
      setShowArticleModal(true);
  };

  const handleSaveArticleInternal = () => {
      if (!modalTitle) { alert("Title required"); return; }
      const article: Article = {
          id: editArticleId || generateId(),
          title: modalTitle,
          subline: modalSubline,
          content: modalContent,
          author: modalAuthor,
          category: modalCategory,
          imageUrl: modalImageUrl || 'https://placehold.co/800x400?text=No+Image',
          publishedAt: editArticleId ? articles.find(a => a.id === editArticleId)?.publishedAt || new Date().toISOString() : new Date().toISOString(),
          status: modalStatus,
          isFeatured: modalIsFeatured
      };
      onSaveArticle(article);
      setShowArticleModal(false);
  };

  const handleAddPageInternal = () => {
      if (!newPageImage) { alert("Page image required"); return; }
      const page: EPaperPage = {
          id: generateId(),
          date: newPageDate,
          pageNumber: Number(newPageNumber),
          imageUrl: newPageImage,
          regions: []
      };
      onAddPage(page);
      setShowAddPageModal(false);
      setNewPageImage('');
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
          await onUpdateWatermarkSettings({
              ...watermarkSettings,
              text: watermarkText,
              logoUrl: watermarkLogo,
              fontSize: watermarkFontSize
          });
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
      />
      
      <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
          {/* SIDEBAR */}
          <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
              <div className="flex justify-between items-center p-6 border-b border-gray-800">
                  <h1 className="font-serif text-2xl font-bold text-white">Editor<span className="text-news-gold">.</span></h1>
                  <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24} /></button>
              </div>
              <div className="flex-1 overflow-y-auto py-4">
                  <SidebarItem id="articles" label="Editorial" icon={FileText} />
                  <SidebarItem id="epaper" label="E-Paper" icon={Newspaper} />
                  <SidebarItem id="classifieds" label="Classifieds" icon={List} />
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
              
              {/* MOBILE HEADER */}
              <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                  <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600"><Menu size={24}/></button>
                  <span className="font-serif font-bold text-lg">Dashboard</span>
                  <div className="w-8"></div>
              </div>

              <div className="md:p-8 overflow-y-auto flex-1 p-4">
                  {/* --- ARTICLES TAB --- */}
                  {activeTab === 'articles' && (
                      <div className="max-w-7xl mx-auto">
                          <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-serif font-bold">Articles</h2>
                              <button onClick={openNewArticle} className="bg-news-black text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><Plus size={16}/> New Article</button>
                          </div>
                          
                          {/* Desktop Table */}
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
                                                      {article.isFeatured && <span className="text-[10px] text-news-accent font-bold uppercase flex items-center gap-1 mt-1"><Star size={10} fill="currentColor"/> Featured</span>}
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4 text-sm text-gray-600">{article.author}</td>
                                              <td className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">{article.category}</td>
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

                          {/* Mobile Card List */}
                          <div className="md:hidden space-y-4">
                                {articles.map(article => (
                                    <div key={article.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{article.category}</span>
                                                    {article.isFeatured && <Star size={10} className="text-news-gold" fill="currentColor"/>}
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{article.title}</h3>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase shrink-0 ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {article.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                            <span className="text-xs text-gray-400">{article.author}</span>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => openEditArticle(article)} className="p-2 bg-blue-50 text-blue-600 rounded-md">
                                                    <PenSquare size={16}/>
                                                </button>
                                                <button onClick={() => onDeleteArticle(article.id)} className="p-2 bg-red-50 text-red-500 rounded-md">
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                          </div>
                      </div>
                  )}

                  {/* ... (Other tabs remain unchanged) ... */}
                  {/* --- EPAPER TAB --- */}
                  {activeTab === 'epaper' && (
                      <div className="max-w-7xl mx-auto">
                           <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-serif font-bold">E-Paper Pages</h2>
                              <button onClick={() => setShowAddPageModal(true)} className="bg-news-black text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><Plus size={16}/> Upload Page</button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                              {ePaperPages.map(page => (
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
                          </div>
                      </div>
                  )}

                  {/* --- CLASSIFIEDS TAB --- */}
                  {activeTab === 'classifieds' && (
                      <div className="max-w-7xl mx-auto">
                          <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-serif font-bold">Classifieds</h2>
                              <button onClick={() => { setNewClassified({}); setShowClassifiedModal(true); }} className="bg-news-black text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><Plus size={16}/> New Ad</button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {classifieds.map(ad => (
                                  <div key={ad.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm relative group">
                                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => onDeleteClassified(ad.id)} className="text-red-500 bg-red-50 p-2 rounded-full"><Trash2 size={16}/></button>
                                      </div>
                                      <span className="text-[10px] font-bold uppercase text-news-accent tracking-widest bg-gray-50 px-2 py-1 rounded">{ad.category}</span>
                                      <h3 className="font-bold text-lg mt-2">{ad.title}</h3>
                                      <p className="text-sm text-gray-600 mt-2 line-clamp-3">{ad.content}</p>
                                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs font-bold text-gray-500">
                                          <span>{ad.contactInfo}</span>
                                          {ad.price && <span>{ad.price}</span>}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* --- ADS TAB --- */}
                  {activeTab === 'ads' && (
                      <div className="max-w-7xl mx-auto">
                          <div className="flex justify-between items-center mb-6">
                              <h2 className="text-2xl font-serif font-bold">Display Advertising</h2>
                              <div className="flex gap-4 items-center">
                                  <div className="flex items-center gap-2 text-sm font-bold mr-4">
                                      <label className="relative inline-flex items-center cursor-pointer">
                                          <input type="checkbox" checked={globalAdsEnabled} onChange={(e) => onToggleGlobalAds(e.target.checked)} className="sr-only peer" />
                                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                          <span className="ml-3 text-gray-900">Global Ads</span>
                                      </label>
                                  </div>
                                  <button onClick={() => { setNewAd({ size: 'RECTANGLE', placement: 'GLOBAL', isActive: true }); setShowAdModal(true); }} className="bg-news-black text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2"><Plus size={16}/> New Banner</button>
                              </div>
                          </div>
                          <div className="space-y-4">
                              {advertisements.map(ad => (
                                  <div key={ad.id} className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row gap-6 items-center">
                                      <div className="w-32 h-20 bg-gray-100 shrink-0 flex items-center justify-center overflow-hidden rounded border border-gray-300">
                                          <img src={ad.imageUrl} className="w-full h-full object-contain" />
                                      </div>
                                      <div className="flex-1">
                                          <h4 className="font-bold text-gray-900">{ad.title}</h4>
                                          <div className="flex gap-4 text-xs text-gray-500 mt-1">
                                              <span>Size: {ad.size}</span>
                                              <span>Placement: {ad.placement}</span>
                                              <a href={ad.linkUrl} target="_blank" className="text-blue-600 hover:underline truncate max-w-[200px]">{ad.linkUrl}</a>
                                          </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${ad.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{ad.isActive ? 'Active' : 'Inactive'}</span>
                                          <button onClick={() => onDeleteAdvertisement(ad.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={16}/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {/* --- TAXONOMY TAB --- */}
                  {activeTab === 'taxonomy' && (
                      <div className="max-w-7xl mx-auto pb-20">
                          <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-serif font-bold">Taxonomy Management</h2>
                            <button 
                                onClick={handleTaxonomySave} 
                                disabled={isSavingTaxonomy}
                                className="bg-news-black text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow hover:bg-gray-800 disabled:opacity-50"
                            >
                                {isSavingTaxonomy ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Changes
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                              {/* Article Categories */}
                              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText size={18}/> Article Categories</h3>
                                  <div className="flex gap-2 mb-4">
                                      <input type="text" placeholder="New Category" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none focus:border-news-black" />
                                      <button onClick={() => { if(newCategory) { onAddCategory(newCategory); setNewCategory(''); } }} className="bg-news-black text-white p-2 rounded hover:bg-gray-800"><Plus size={18}/></button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {categories.map(cat => (
                                          <span key={cat} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-700 flex items-center gap-2 group">
                                              {cat}
                                              <button onClick={() => onDeleteCategory(cat)} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                                          </span>
                                      ))}
                                  </div>
                              </div>

                              {/* Article Tags */}
                              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Tag size={18}/> Article Tags</h3>
                                  <div className="flex gap-2 mb-4">
                                      <input type="text" placeholder="New Tag" value={newTag} onChange={e => setNewTag(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none focus:border-news-black" />
                                      <button onClick={() => { if(newTag && onAddTag) { onAddTag(newTag); setNewTag(''); } }} className="bg-news-black text-white p-2 rounded hover:bg-gray-800"><Plus size={18}/></button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {tags.map(tag => (
                                          <span key={tag} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-700 flex items-center gap-2 group">
                                              #{tag}
                                              <button onClick={() => onDeleteTag && onDeleteTag(tag)} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                                          </span>
                                      ))}
                                  </div>
                              </div>

                              {/* Classified Categories */}
                              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><List size={18}/> Ad Categories</h3>
                                  <div className="flex gap-2 mb-4">
                                      <input type="text" placeholder="New Category" value={newAdCategory} onChange={e => setNewAdCategory(e.target.value)} className="flex-1 p-2 border rounded text-sm outline-none focus:border-news-black" />
                                      <button onClick={() => { if(newAdCategory) { onAddAdCategory(newAdCategory); setNewAdCategory(''); } }} className="bg-news-black text-white p-2 rounded hover:bg-gray-800"><Plus size={18}/></button>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                      {adCategories.map(cat => (
                                          <span key={cat} className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs font-bold text-gray-700 flex items-center gap-2 group">
                                              {cat}
                                              <button onClick={() => onDeleteAdCategory(cat)} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                                          </span>
                                      ))}
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* --- ANALYTICS TAB --- */}
                  {activeTab === 'analytics' && (
                      <div className="max-w-7xl mx-auto">
                          <AnalyticsDashboard articles={articles} role={UserRole.EDITOR} />
                      </div>
                  )}

                  {/* --- SETTINGS TAB --- */}
                  {activeTab === 'settings' && (
                      <div className="max-w-4xl mx-auto space-y-10 pb-20">
                          {/* ... (Other settings sections) ... */}
                          
                          {/* Trusted Devices */}
                          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                              <div className="flex justify-between items-center mb-6">
                                  <h3 className="font-bold text-lg flex items-center gap-2"><ShieldCheck size={20} className="text-green-600"/> Trusted Devices</h3>
                                  <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1 rounded text-gray-600">
                                      {devices.filter(d => d.status === 'approved').length} / 5 Active
                                  </span>
                              </div>
                              
                              <div className="space-y-4">
                                  {devices.length === 0 && <p className="text-gray-400 text-sm italic">No other devices registered.</p>}
                                  {devices.map(device => {
                                      let Icon = Monitor;
                                      if (device.deviceType === 'mobile') Icon = Smartphone;
                                      if (device.deviceType === 'tablet') Icon = Tablet;
                                      
                                      return (
                                          <div key={device.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                                              <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                                                  <div className={`p-3 rounded-full ${device.isCurrent ? 'bg-news-black text-news-gold' : 'bg-white border text-gray-500'}`}>
                                                      <Icon size={20} />
                                                  </div>
                                                  <div>
                                                      <div className="flex items-center gap-2">
                                                          <span className="font-bold text-sm text-gray-900">{device.deviceName}</span>
                                                          {device.isCurrent && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">THIS DEVICE</span>}
                                                          {device.isPrimary && <span className="bg-news-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded">PRIMARY</span>}
                                                      </div>
                                                      <div className="text-xs text-gray-500 mt-1 flex gap-3">
                                                          <span>{device.location}</span>
                                                          <span>•</span>
                                                          <span>{device.browser}</span>
                                                          <span>•</span>
                                                          <span>Last Active: {device.lastActive}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="flex items-center gap-3">
                                                  {device.status === 'pending' && (
                                                      <div className="flex items-center gap-2">
                                                          <button onClick={() => onApproveDevice(device.id)} className="bg-green-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700">Approve</button>
                                                          <button onClick={() => onRejectDevice(device.id)} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-700">Reject</button>
                                                      </div>
                                                  )}
                                                  {device.status === 'approved' && !device.isCurrent && (
                                                      <button onClick={() => onRevokeDevice(device.id)} className="text-red-500 hover:text-white hover:bg-red-500 transition-colors text-xs font-bold border border-red-200 bg-white px-3 py-1.5 rounded flex items-center gap-2">
                                                          <Trash2 size={12}/> Remove
                                                      </button>
                                                  )}
                                                  {device.status === 'approved' && device.isCurrent && (
                                                      <span className="text-green-600 text-xs font-bold flex items-center gap-1"><Check size={14}/> Active Session</span>
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
      </div>

      {/* ARTICLE MODAL */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="font-bold">{editArticleId ? 'Edit Article' : 'New Article'}</h3>
                    <button onClick={() => setShowArticleModal(false)}><X size={20}/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 space-y-4">
                            <input type="text" value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif" placeholder="Headline" />
                            <textarea value={modalSubline} onChange={(e) => setModalSubline(e.target.value)} className="w-full p-2 border rounded text-sm italic min-h-[80px]" placeholder="Summary / Sub-headline..."></textarea>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="text" value={modalAuthor} onChange={(e) => setModalAuthor(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Author" />
                                <select value={modalCategory} onChange={(e) => setModalCategory(e.target.value)} className="w-full p-2 border rounded text-sm bg-white">
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="md:col-span-1">
                            <div className="border-2 border-dashed p-4 rounded bg-gray-50 text-center relative overflow-hidden h-full flex flex-col justify-between">
                                {modalImageUrl ? (
                                    <div className="relative group aspect-video">
                                        <img src={modalImageUrl} className="w-full h-full object-cover rounded shadow" />
                                        <button onClick={() => setModalImageUrl('')} className="absolute top-1 right-1 bg-black/40 text-white p-1 rounded-full hover:bg-red-600 transition-colors z-10">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="py-4 text-gray-400 flex flex-col items-center justify-center h-full">
                                        <ImageIcon size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-bold uppercase">Featured Image</p>
                                    </div>
                                )}
                                <div className="mt-2">
                                    <button onClick={() => setShowImageGallery(true)} className="w-full bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold px-2 py-2 rounded flex items-center justify-center gap-2 transition-colors">
                                        <Library size={14}/> Select from Gallery
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <RichTextEditor content={modalContent} onChange={setModalContent} onImageUpload={handleContentImageUpload} className="min-h-[400px]" />
                    <div className="flex items-center gap-8 bg-gray-50 p-3 rounded border border-gray-100">
                        <div className="flex items-center gap-3">
                            <label className="font-bold text-sm">Status:</label>
                            <div className="flex gap-2">
                                {[ArticleStatus.DRAFT, ArticleStatus.PENDING, ArticleStatus.PUBLISHED].map(s => (
                                    <button key={s} onClick={() => setModalStatus(s)} className={`px-3 py-1 rounded text-xs font-bold uppercase border ${modalStatus === s ? 'bg-news-black text-white border-news-black' : 'bg-white text-gray-500 border-gray-200'}`}>{s}</button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pl-8 border-l border-gray-200">
                            <label className="font-bold text-sm">Feature Mode:</label>
                            <button 
                                onClick={() => setModalIsFeatured(!modalIsFeatured)}
                                className={`flex items-center gap-2 px-3 py-1 rounded text-xs font-bold uppercase border transition-colors ${modalIsFeatured ? 'bg-news-accent text-white border-news-accent' : 'bg-white text-gray-500 border-gray-200'}`}
                            >
                                <Star size={12} fill={modalIsFeatured ? "currentColor" : "none"} /> 
                                {modalIsFeatured ? "Featured" : "Standard"}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                    <button onClick={() => setShowArticleModal(false)} className="px-5 py-2 text-sm font-bold">Cancel</button>
                    <button onClick={handleSaveArticleInternal} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold shadow hover:bg-gray-800">Save Article</button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default EditorDashboard;
