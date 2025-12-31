
import React, { useState, useRef, useEffect } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, UserRole } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, RotateCcw, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Calendar, Loader2, Library, User as UserIcon, Lock,
  Check, Scissors, Camera, Monitor, Smartphone, Tablet, ShieldCheck, AlertTriangle, Code, Copy, RefreshCcw
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
  articles, ePaperPages, categories, classifieds, advertisements,
  onAddPage, onDeletePage, onDeleteArticle, onSaveArticle, 
  onAddClassified, onDeleteClassified, onAddAdvertisement, onDeleteAdvertisement,
  onNavigate, watermarkSettings, onUpdateWatermarkSettings, userName, userAvatar,
  devices, onApproveDevice, onRejectDevice, onRevokeDevice, globalAdsEnabled, onToggleGlobalAds
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'epaper' | 'classifieds' | 'ads' | 'analytics' | 'settings'>('articles');

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
  const [isUploading, setIsUploading] = useState(false);
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

  // Sync local state when global settings change via props
  useEffect(() => {
    setWatermarkText(watermarkSettings.text);
    setWatermarkLogo(watermarkSettings.logoUrl);
  }, [watermarkSettings]);

  // -- SQL HELPERS --
  const phoneFormatSQL = `-- SQL Query to format phone numbers\nSELECT \n  FORMAT(contact_info, '##-###-####') \nFROM classifieds;`;
  const dateFormatSQL = `-- SQL Query to format edition dates\nSELECT \n  to_char(published_at, 'DD-Mon-YYYY') \nFROM articles;`;

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      alert("SQL copied to clipboard!");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, loader: (loading: boolean) => void) => {
      const file = e.target.files?.[0];
      if (!file) return;
      loader(true);
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${generateId()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('images').upload(`uploads/${fileName}`, file);
          if (uploadError) throw uploadError;
          const { data } = supabase.storage.from('images').getPublicUrl(`uploads/${fileName}`);
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
          status: modalStatus
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
              logoUrl: watermarkLogo
          });
          alert("Branding settings updated and synced globally.");
      } catch (e: any) {
          alert("Error updating branding: " + e.message);
      } finally {
          setIsSavingBranding(false);
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
                          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
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
                                              <td className="px-6 py-4"><span className="font-bold text-gray-900 text-sm line-clamp-1">{article.title}</span></td>
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
                      </div>
                  )}

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

                  {/* --- ANALYTICS TAB --- */}
                  {activeTab === 'analytics' && (
                      <div className="max-w-7xl mx-auto">
                          <AnalyticsDashboard articles={articles} role={UserRole.EDITOR} />
                      </div>
                  )}

                  {/* --- SETTINGS TAB --- */}
                  {activeTab === 'settings' && (
                      <div className="max-w-4xl mx-auto space-y-10 pb-20">
                          
                          {/* Database Management / SQL Helper */}
                          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                              <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Code size={20} className="text-blue-600"/> Database Management</h3>
                              <p className="text-sm text-gray-500 mb-6 font-medium">Use these SQL formatting snippets for direct database queries to ensure consistent data presentation across all platforms.</p>
                              
                              <div className="space-y-6">
                                  <div>
                                      <div className="flex justify-between items-center mb-2">
                                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">SQL Phone Formatting (##-###-####)</label>
                                          <button onClick={() => copyToClipboard(phoneFormatSQL)} className="text-[9px] font-bold bg-gray-100 px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-200">
                                              <Copy size={10}/> Copy SQL
                                          </button>
                                      </div>
                                      <pre className="bg-gray-900 text-news-gold p-4 rounded-lg font-mono text-xs overflow-x-auto border border-white/5">
                                          {phoneFormatSQL}
                                      </pre>
                                  </div>
                                  
                                  <div>
                                      <div className="flex justify-between items-center mb-2">
                                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">SQL Date Formatting (DD-Mon-YYYY)</label>
                                          <button onClick={() => copyToClipboard(dateFormatSQL)} className="text-[9px] font-bold bg-gray-100 px-2 py-1 rounded flex items-center gap-1 hover:bg-gray-200">
                                              <Copy size={10}/> Copy SQL
                                          </button>
                                      </div>
                                      <pre className="bg-gray-900 text-news-gold p-4 rounded-lg font-mono text-xs overflow-x-auto border border-white/5">
                                          {dateFormatSQL}
                                      </pre>
                                  </div>
                              </div>
                          </div>

                          {/* Profile Settings */}
                          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                              <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><UserIcon size={20} className="text-news-gold"/> My Profile</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Display Name</label>
                                          <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-2 border rounded" />
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Avatar URL</label>
                                          <div className="flex gap-2">
                                              <input type="text" value={profileAvatar} onChange={e => setProfileAvatar(e.target.value)} className="w-full p-2 border rounded" />
                                              <label className="bg-gray-100 hover:bg-gray-200 border px-3 py-2 rounded cursor-pointer">
                                                  {isAvatarUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setProfileAvatar, setIsAvatarUploading)} />
                                              </label>
                                          </div>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">New Password</label>
                                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-2 border rounded" placeholder="Leave empty to keep current" />
                                  </div>
                              </div>
                              <div className="mt-6 flex justify-end">
                                  <button onClick={handleSaveProfile} disabled={isSavingSettings} className="bg-news-black text-white px-6 py-2 rounded text-sm font-bold flex items-center gap-2">
                                      {isSavingSettings ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>} Save Profile Changes
                                  </button>
                              </div>
                          </div>

                          {/* Watermark Settings */}
                          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                              <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Scissors size={20} className="text-news-gold"/> Watermark & Branding</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Default Footer Text</label>
                                          <input type="text" value={watermarkText} onChange={e => setWatermarkText(e.target.value)} className="w-full p-2 border rounded" />
                                      </div>
                                      <div>
                                          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Brand Logo URL</label>
                                          <div className="flex gap-2">
                                              <input type="text" value={watermarkLogo} onChange={e => setWatermarkLogo(e.target.value)} className="w-full p-2 border rounded" />
                                              <label className="bg-gray-100 hover:bg-gray-200 border px-3 py-2 rounded cursor-pointer">
                                                  {isLogoUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16}/>}
                                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setWatermarkLogo, setIsLogoUploading)} />
                                              </label>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex flex-col">
                                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 text-center">Live Preview</label>
                                      <div className="bg-gray-100 rounded-lg p-4 flex flex-col items-center justify-center flex-1 border border-gray-200">
                                          <div 
                                              style={{ backgroundColor: watermarkSettings.backgroundColor, color: watermarkSettings.textColor }}
                                              className="w-full p-3 rounded flex justify-between items-center shadow-sm border border-black/5"
                                          >
                                              <div className="flex items-center gap-2">
                                                  {watermarkLogo && (
                                                      <img src={watermarkLogo} className="h-6 w-auto object-contain mix-blend-multiply" />
                                                  )}
                                                  <span className="font-serif font-bold text-[10px] tracking-tight">{watermarkText.toUpperCase()}</span>
                                              </div>
                                              <span className="text-[8px] opacity-60">Archive Edition: {format(new Date(), 'MMM d, yyyy')}</span>
                                          </div>
                                          <p className="mt-2 text-[8px] text-gray-400 uppercase tracking-widest">This branding appears on paper clips.</p>
                                      </div>
                                  </div>
                              </div>
                              <div className="mt-6 flex justify-end">
                                  <button onClick={handleUpdateBranding} disabled={isSavingBranding} className="bg-news-black text-white px-6 py-2 rounded text-sm font-bold flex items-center gap-2">
                                      {isSavingBranding ? <Loader2 size={16} className="animate-spin"/> : <Check size={16}/>} Update Global Branding
                                  </button>
                              </div>
                          </div>

                          {/* Trusted Devices */}
                          <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                              <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><ShieldCheck size={20} className="text-green-600"/> Trusted Devices</h3>
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
                                                      <button onClick={() => onRevokeDevice(device.id)} className="text-red-500 hover:text-red-700 text-xs font-bold border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded">Revoke Access</button>
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
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
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
                                <div className="flex gap-2 mt-2">
                                    <label className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold px-2 py-2 rounded flex items-center justify-center gap-2 cursor-pointer transition-colors relative">
                                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        <span>Upload</span>
                                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setModalImageUrl, setIsUploading)} className="absolute inset-0 opacity-0" disabled={isUploading} />
                                    </label>
                                    <button onClick={() => setShowImageGallery(true)} className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold px-2 py-2 rounded flex items-center justify-center gap-2">
                                        <Library size={14}/> Gallery
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <RichTextEditor content={modalContent} onChange={setModalContent} onImageUpload={handleContentImageUpload} className="min-h-[400px]" />
                    <div className="flex items-center gap-4">
                        <label className="font-bold text-sm">Status:</label>
                        <div className="flex gap-2">
                            {[ArticleStatus.DRAFT, ArticleStatus.PENDING, ArticleStatus.PUBLISHED].map(s => (
                                <button key={s} onClick={() => setModalStatus(s)} className={`px-3 py-1 rounded text-xs font-bold uppercase border ${modalStatus === s ? 'bg-news-black text-white border-news-black' : 'bg-white text-gray-500 border-gray-200'}`}>{s}</button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={() => setShowArticleModal(false)} className="px-5 py-2 text-sm font-bold">Cancel</button>
                    <button onClick={handleSaveArticleInternal} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold shadow hover:bg-gray-800">Save Article</button>
                </div>
            </div>
        </div>
      )}

      {/* PAGE UPLOAD MODAL */}
      {showAddPageModal && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg w-full max-w-md p-6">
                  <h3 className="font-bold text-lg mb-4">Upload E-Paper Page</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold uppercase mb-1">Date</label>
                          <input type="date" value={newPageDate} onChange={e => setNewPageDate(e.target.value)} className="w-full p-2 border rounded" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase mb-1">Page Number</label>
                          <input type="number" min="1" value={newPageNumber} onChange={e => setNewPageNumber(Number(e.target.value))} className="w-full p-2 border rounded" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase mb-1">Page Image</label>
                          <div className="border-2 border-dashed p-4 rounded text-center">
                              {newPageImage ? <img src={newPageImage} className="max-h-48 mx-auto mb-2" /> : <ImageIcon className="mx-auto text-gray-300 mb-2" size={32} />}
                              <label className="bg-black text-white px-4 py-2 rounded text-xs font-bold cursor-pointer inline-block">
                                  {isPageUploading ? <Loader2 size={14} className="animate-spin" /> : "Choose Image"}
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setNewPageImage, setIsPageUploading)} />
                              </label>
                          </div>
                      </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                      <button onClick={() => setShowAddPageModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
                      <button onClick={handleAddPageInternal} disabled={isPageUploading} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold">Upload</button>
                  </div>
              </div>
          </div>
      )}

      {/* CLASSIFIED AD MODAL */}
      {showClassifiedModal && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg w-full max-w-lg p-6">
                  <h3 className="font-bold text-lg mb-4">Add Classified Ad</h3>
                  <div className="space-y-4">
                      <input type="text" placeholder="Ad Title" className="w-full p-2 border rounded" value={newClassified.title || ''} onChange={e => setNewClassified({...newClassified, title: e.target.value})} />
                      <textarea placeholder="Content" className="w-full p-2 border rounded" rows={3} value={newClassified.content || ''} onChange={e => setNewClassified({...newClassified, content: e.target.value})}></textarea>
                      <div className="grid grid-cols-2 gap-4">
                           <input type="text" placeholder="Price (Optional)" className="w-full p-2 border rounded" value={newClassified.price || ''} onChange={e => setNewClassified({...newClassified, price: e.target.value})} />
                           <input type="text" placeholder="Contact Info" className="w-full p-2 border rounded" value={newClassified.contactInfo || ''} onChange={e => setNewClassified({...newClassified, contactInfo: e.target.value})} />
                      </div>
                      <select className="w-full p-2 border rounded" value={newClassified.category || ''} onChange={e => setNewClassified({...newClassified, category: e.target.value})}>
                          <option value="">Select Category</option>
                          {['Jobs', 'Real Estate', 'For Sale', 'Services', 'Community'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                      <button onClick={() => setShowClassifiedModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
                      <button onClick={() => { 
                          if(newClassified.title && newClassified.content) {
                             onAddClassified({...newClassified, id: generateId(), postedAt: new Date().toISOString()} as ClassifiedAd);
                             setShowClassifiedModal(false);
                          }
                      }} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold">Post Ad</button>
                  </div>
              </div>
          </div>
      )}

      {/* ADVERTISEMENT MODAL */}
      {showAdModal && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg w-full max-w-lg p-6">
                  <h3 className="font-bold text-lg mb-4">Add Display Ad</h3>
                  <div className="space-y-4">
                      <input type="text" placeholder="Internal Title (Ref)" className="w-full p-2 border rounded" value={newAd.title || ''} onChange={e => setNewAd({...newAd, title: e.target.value})} />
                      <input type="text" placeholder="Target Link URL" className="w-full p-2 border rounded" value={newAd.linkUrl || ''} onChange={e => setNewAd({...newAd, linkUrl: e.target.value})} />
                      <div className="grid grid-cols-2 gap-4">
                           <select className="w-full p-2 border rounded" value={newAd.size || 'RECTANGLE'} onChange={e => setNewAd({...newAd, size: e.target.value as any})}>
                               <option value="RECTANGLE">Rectangle (300x250)</option>
                               <option value="LEADERBOARD">Leaderboard (728x90)</option>
                               <option value="BILLBOARD">Billboard (970x250)</option>
                               <option value="HALF_PAGE">Half Page (300x600)</option>
                               <option value="MOBILE_BANNER">Mobile Banner (320x50)</option>
                           </select>
                           <select className="w-full p-2 border rounded" value={newAd.placement || 'GLOBAL'} onChange={e => setNewAd({...newAd, placement: e.target.value as any})}>
                               <option value="GLOBAL">Global</option>
                               <option value="HOME">Home Only</option>
                               <option value="ARTICLE">Article Only</option>
                           </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold uppercase mb-1">Banner Image</label>
                          <div className="border border-gray-300 p-2 rounded flex gap-2 items-center">
                              <input type="text" placeholder="Image URL" className="flex-1 outline-none text-sm" value={newAd.imageUrl || ''} onChange={e => setNewAd({...newAd, imageUrl: e.target.value})} />
                              <label className="bg-gray-100 px-3 py-1 rounded cursor-pointer text-xs font-bold">
                                  Upload
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, (url) => setNewAd({...newAd, imageUrl: url}), setIsUploading)} />
                              </label>
                          </div>
                      </div>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                      <button onClick={() => setShowAdModal(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
                      <button onClick={() => {
                           if(newAd.title && newAd.imageUrl) {
                               onAddAdvertisement({...newAd, id: generateId()} as Advertisement);
                               setShowAdModal(false);
                           }
                      }} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold">Save Banner</button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
};

export default EditorDashboard;
