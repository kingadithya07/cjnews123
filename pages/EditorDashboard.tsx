
import React, { useState, useRef, useEffect } from 'react';
import { EPaperPage, Article, EPaperRegion, ArticleStatus, ClassifiedAd, Advertisement, AdSize, AdPlacement, WatermarkSettings, TrustedDevice, UserRole } from '../types';
import { 
  Trash2, Upload, Plus, Save, FileText, Image as ImageIcon, 
  Layout, Settings, X, Check, MousePointer2, RotateCcw, ZoomIn, ZoomOut, RotateCw, Crop, Eye, BarChart3, Search, Filter, AlertCircle, CheckCircle, PenSquare, Tag, Megaphone, MonitorPlay, ToggleLeft, ToggleRight, Globe, Home, Menu, Grid, Users, Contact, LogOut, Inbox, List, Newspaper, DollarSign, MapPin, ChevronDown, ShieldCheck, Monitor, Smartphone, Tablet, ExternalLink, Loader2, Lock, Library
} from 'lucide-react';
import { format } from 'date-fns';
import EPaperViewer from '../components/EPaperViewer';
import RichTextEditor from '../components/RichTextEditor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { generateId, getDeviceId } from '../utils';
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
  devices: TrustedDevice[];
  onApproveDevice: (id: string) => void;
  onRejectDevice: (id: string) => void;
  onRevokeDevice: (id: string) => void;
}

const EditorDashboard: React.FC<EditorDashboardProps> = ({ 
  articles, ePaperPages, categories, tags = [], adCategories, classifieds, advertisements, globalAdsEnabled, watermarkSettings,
  onToggleGlobalAds, onUpdateWatermarkSettings,
  onUpdatePage, onAddPage, onDeletePage, onDeleteArticle, onSaveArticle, 
  onAddCategory, onDeleteCategory, onAddTag, onDeleteTag, onAddAdCategory, onDeleteAdCategory, 
  onAddClassified, onDeleteClassified, onAddAdvertisement, onDeleteAdvertisement,
  onNavigate, userAvatar,
  devices, onApproveDevice, onRejectDevice, onRevokeDevice
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'epaper' | 'users' | 'idcards' | 'classifieds' | 'categories' | 'ads' | 'analytics' | 'settings' | 'inbox' | 'approvals'>('articles');

  // Article Modal State
  const [statusFilter, setStatusFilter] = useState<'ALL' | ArticleStatus>('ALL');
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editArticleId, setEditArticleId] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalSubline, setModalSubline] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalAuthor, setModalAuthor] = useState('Editor');
  const [modalCategory, setModalCategory] = useState(categories[0] || 'General');
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [modalStatus, setModalStatus] = useState<ArticleStatus>(ArticleStatus.PUBLISHED);
  const [isUploading, setIsUploading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  
  // E-Paper State
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const activePage = ePaperPages.find(p => p.id === activePageId);

  // Classifieds State
  const [showClassifiedModal, setShowClassifiedModal] = useState(false);
  const [editingClassified, setEditingClassified] = useState<ClassifiedAd | null>(null);

  // Advertisement State
  const [showAdModal, setShowAdModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);

  useEffect(() => {
    if (modalContent) {
      const text = modalContent.replace(/<[^>]*>/g, '').trim();
      const count = text ? text.split(/\s+/).length : 0;
      setWordCount(count);
    } else {
      setWordCount(0);
    }
  }, [modalContent]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${generateId()}.${fileExt}`;
      const filePath = `articles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      setModalImageUrl(data.publicUrl);
    } catch (error: any) {
      console.error('Storage Error:', error.message);
      alert("Bucket Upload Failed: Ensure the 'images' bucket is created and public in Supabase.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleContentImageUpload = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${generateId()}.${fileExt}`;
    const filePath = `content/${fileName}`; // Use a different folder for content images

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleArticleModalSubmit = () => {
    if (!modalTitle) { alert("Headline is required"); return; }
    const articleData: Article = { 
        id: editArticleId || generateId(), 
        title: modalTitle, 
        subline: modalSubline,
        author: modalAuthor, 
        content: modalContent, 
        category: modalCategory, 
        publishedAt: new Date().toISOString(), 
        imageUrl: modalImageUrl || 'https://placehold.co/800x400?text=No+Image', 
        status: modalStatus 
    };
    onSaveArticle(articleData);
    setShowArticleModal(false);
  };

  const openCreateArticleModal = () => { 
      setModalMode('create'); setEditArticleId(null); setModalTitle(''); setModalSubline(''); setModalContent(''); setModalImageUrl(''); setModalAuthor('Editor'); setModalStatus(ArticleStatus.PUBLISHED); setShowArticleModal(true); 
  };

  const openEditArticleModal = (article: Article) => { 
      setModalMode('edit'); setEditArticleId(article.id); setModalTitle(article.title); setModalSubline(article.subline || ''); setModalContent(article.content); setModalCategory(article.category); setModalImageUrl(article.imageUrl); setModalAuthor(article.author); setModalStatus(article.status); setShowArticleModal(true); 
  };
  
  const handleSelectFromGallery = (url: string) => {
    setModalImageUrl(url);
    setShowImageGallery(false);
  };
  
  const handleSaveRegion = (page: EPaperPage, region: EPaperRegion) => {
      const updatedRegions = page.regions.map(r => r.id === region.id ? region : r);
      onUpdatePage({ ...page, regions: updatedRegions });
  };
  
  const handleAddRegion = (page: EPaperPage) => {
      const newRegion: EPaperRegion = {
          id: generateId(),
          x: 10, y: 10, width: 20, height: 20,
          linkedArticleId: articles[0]?.id || ''
      };
      onUpdatePage({ ...page, regions: [...page.regions, newRegion] });
  };
  
  const handleDeleteRegion = (page: EPaperPage, regionId: string) => {
      onUpdatePage({ ...page, regions: page.regions.filter(r => r.id !== regionId) });
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
        onSelectImage={handleSelectFromGallery}
    />
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h1 className="font-serif text-2xl font-bold text-white">Admin</h1>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
              <SidebarItem id="analytics" label="Analytics" icon={BarChart3} />
              <SidebarItem id="articles" label="Articles" icon={FileText} />
              <SidebarItem id="epaper" label="E-Paper" icon={Newspaper} />
              <SidebarItem id="classifieds" label="Classifieds" icon={Tag} />
              <SidebarItem id="ads" label="Advertisements" icon={Megaphone} />
              <SidebarItem id="inbox" label="Communication" icon={Inbox} />
              <SidebarItem id="settings" label="Settings" icon={Settings} />
          </div>
          <div className="p-6 border-t border-gray-800">
              <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center">
                  <Globe size={16} /> View Website
              </button>
          </div>
      </div>

      <div className="flex-1 flex flex-col md:ml-72 h-full overflow-hidden bg-[#f8f9fa]">
          <div className="p-4 md:p-8 overflow-y-auto">
              {activeTab === 'articles' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <h1 className="font-serif text-3xl font-bold text-gray-900">Articles</h1>
                           <button onClick={openCreateArticleModal} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> Add New</button>
                      </div>
                      <div className="bg-white rounded border overflow-hidden">
                          <table className="w-full text-left">
                              <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                  <tr>
                                      <th className="px-6 py-4">Title</th>
                                      <th className="px-6 py-4">Category</th>
                                      <th className="px-6 py-4">Status</th>
                                      <th className="px-6 py-4 text-right">Actions</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y">
                                  {articles.map(a => (
                                      <tr key={a.id} className="hover:bg-gray-50">
                                          <td className="px-6 py-4 flex items-center gap-3">
                                              <img src={a.imageUrl} className="w-10 h-10 object-cover rounded"/>
                                              <span className="text-sm font-medium">{a.title}</span>
                                          </td>
                                          <td className="px-6 py-4 text-xs font-bold">{a.category}</td>
                                          <td className="px-6 py-4 text-xs">
                                              <span className={`px-2 py-1 rounded ${a.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{a.status}</span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                              <button onClick={() => openEditArticleModal(a)} className="text-blue-600 mr-4"><PenSquare size={16}/></button>
                                              <button onClick={() => { if(window.confirm('Are you sure you want to delete this article? This cannot be undone.')) onDeleteArticle(a.id) }} className="text-red-600"><Trash2 size={16}/></button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
              {activeTab === 'epaper' && (
                 <div className="max-w-7xl mx-auto">
                      <h1 className="font-serif text-3xl font-bold text-gray-900 mb-6">E-Paper Editor</h1>
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          <div className="lg:col-span-3 bg-white p-4 border rounded-lg h-fit max-h-[70vh] overflow-y-auto">
                              <h3 className="font-bold text-gray-800 border-b pb-2 mb-2">Pages</h3>
                              {ePaperPages.map(p => (
                                <button key={p.id} onClick={() => setActivePageId(p.id)} className={`w-full text-left p-2 rounded text-sm ${activePageId === p.id ? 'bg-news-accent/10 text-news-accent font-bold' : 'hover:bg-gray-50'}`}>
                                    {p.date} - Page {p.pageNumber}
                                </button>
                              ))}
                          </div>
                          <div className="lg:col-span-9">
                            {activePage ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <div className="bg-white p-4 border rounded-lg">
                                        <EPaperViewer page={activePage} />
                                    </div>
                                    <div className="bg-white p-4 border rounded-lg max-h-[70vh] overflow-y-auto">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-gray-800">Regions</h3>
                                            <button onClick={() => handleAddRegion(activePage)} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Add Region</button>
                                        </div>
                                        <div className="space-y-2">
                                            {activePage.regions.map(region => (
                                                <RegionEditor key={region.id} region={region} page={activePage} articles={articles} onSave={handleSaveRegion} onDelete={handleDeleteRegion}/>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-96 flex items-center justify-center bg-gray-50 border-2 border-dashed rounded-lg text-gray-400">Select a page to edit</div>
                            )}
                          </div>
                      </div>
                 </div>
              )}
              {activeTab === 'classifieds' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <h1 className="font-serif text-3xl font-bold text-gray-900">Classifieds</h1>
                           <button onClick={() => onAddClassified({ id: generateId(), title: "New Ad", category: adCategories[0], content: "", contactInfo: "", postedAt: new Date().toISOString()})} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> Add New</button>
                      </div>
                      <div className="bg-white rounded border overflow-hidden">
                          <table className="w-full text-left">
                             <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase"><tr><th className="px-6 py-4">Title</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                             <tbody className="divide-y">{classifieds.map(c => <tr key={c.id} className="hover:bg-gray-50"><td className="px-6 py-4">{c.title}</td><td className="px-6 py-4">{c.category}</td><td className="px-6 py-4">{c.contactInfo}</td><td className="px-6 py-4 text-right"><button onClick={() => onDeleteClassified(c.id)} className="text-red-600"><Trash2 size={16}/></button></td></tr>)}</tbody>
                          </table>
                      </div>
                  </div>
              )}
               {activeTab === 'ads' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <h1 className="font-serif text-3xl font-bold text-gray-900">Advertisements</h1>
                           <button onClick={() => onAddAdvertisement({id: generateId(), title: "New Banner", size: "RECTANGLE", placement: "GLOBAL", isActive: true, imageUrl: 'https://placehold.co/300x250?text=Ad+Space', linkUrl: '#'})} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> Add New</button>
                      </div>
                      <div className="bg-white rounded border overflow-hidden">
                           <table className="w-full text-left">
                             <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase"><tr><th className="px-6 py-4">Title</th><th className="px-6 py-4">Size</th><th className="px-6 py-4">Placement</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                             <tbody className="divide-y">{advertisements.map(ad => <tr key={ad.id} className="hover:bg-gray-50"><td className="px-6 py-4 flex items-center gap-3"><img src={ad.imageUrl} className="w-16 h-10 object-cover bg-gray-100 rounded"/>{ad.title}</td><td className="px-6 py-4">{ad.size}</td><td className="px-6 py-4">{ad.placement}</td><td className="px-6 py-4">{ad.isActive ? 'Active' : 'Inactive'}</td><td className="px-6 py-4 text-right"><button onClick={() => onDeleteAdvertisement(ad.id)} className="text-red-600"><Trash2 size={16}/></button></td></tr>)}</tbody>
                          </table>
                      </div>
                  </div>
              )}
               {activeTab === 'inbox' && (
                  <div className="max-w-6xl mx-auto text-center py-20 bg-white border rounded-lg">
                      <Inbox size={48} className="mx-auto text-gray-300 mb-4" />
                      <h1 className="font-serif text-2xl font-bold text-gray-800">Communication Center</h1>
                      <p className="text-gray-500 mt-2">This feature is under development.</p>
                  </div>
              )}
          </div>
      </div>

      {showArticleModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold">{modalMode === 'create' ? 'New Article' : 'Edit Article'}</h3>
                <button onClick={() => setShowArticleModal(false)}><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <input type="text" value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif" placeholder="Headline"/>
                        <textarea value={modalSubline} onChange={(e) => setModalSubline(e.target.value)} className="w-full p-2 border rounded text-sm italic min-h-[80px]" placeholder="Summary / Sub-headline..."></textarea>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={modalAuthor} onChange={(e) => setModalAuthor(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Author Name, Title"/>
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
                             <div className="flex gap-2 mt-2">
                                <label className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold px-2 py-2 rounded flex items-center justify-center gap-2 cursor-pointer transition-colors relative">
                                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                    <span>{isUploading ? '...' : 'Upload'}</span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0" disabled={isUploading} />
                                </label>
                                <button type="button" onClick={() => setShowImageGallery(true)} className="flex-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold px-2 py-2 rounded flex items-center justify-center gap-2 cursor-pointer transition-colors">
                                    <Library size={14} />
                                    <span>Gallery</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <RichTextEditor content={modalContent} onChange={setModalContent} onImageUpload={handleContentImageUpload} className="min-h-[400px]"/>
                    <div className="absolute bottom-2 right-3 bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded">
                        {wordCount} Words
                    </div>
                </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button onClick={() => setShowArticleModal(false)} className="px-5 py-2 text-sm font-bold">Cancel</button>
              <button onClick={handleArticleModalSubmit} disabled={isUploading} className="px-6 py-2 bg-green-600 text-white rounded text-sm font-bold shadow disabled:opacity-50">
                  {isUploading ? 'Please wait...' : 'Save Article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

const RegionEditor: React.FC<{region: EPaperRegion, page: EPaperPage, articles: Article[], onSave: (p: EPaperPage, r: EPaperRegion) => void, onDelete: (p: EPaperPage, id: string) => void}> = ({ region, page, articles, onSave, onDelete }) => {
    const [localRegion, setLocalRegion] = useState(region);
    useEffect(() => setLocalRegion(region), [region]);
    
    const handleSave = () => onSave(page, localRegion);

    return (
        <div className="p-3 bg-gray-50 rounded border text-xs space-y-3">
            <div className="flex justify-between items-center">
                <p className="font-bold text-gray-600">Region #{region.id.substring(0,4)}</p>
                <div>
                     <button onClick={handleSave} className="text-blue-600 px-2 py-1 rounded hover:bg-blue-100 mr-2"><Save size={14}/></button>
                     <button onClick={() => onDelete(page, region.id)} className="text-red-600 px-2 py-1 rounded hover:bg-red-100"><Trash2 size={14}/></button>
                </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <input type="number" value={localRegion.x} onChange={e => setLocalRegion(r => ({...r, x: parseInt(e.target.value)}))} className="w-full p-1 border rounded" placeholder="X" />
                <input type="number" value={localRegion.y} onChange={e => setLocalRegion(r => ({...r, y: parseInt(e.target.value)}))} className="w-full p-1 border rounded" placeholder="Y" />
                <input type="number" value={localRegion.width} onChange={e => setLocalRegion(r => ({...r, width: parseInt(e.target.value)}))} className="w-full p-1 border rounded" placeholder="W" />
                <input type="number" value={localRegion.height} onChange={e => setLocalRegion(r => ({...r, height: parseInt(e.target.value)}))} className="w-full p-1 border rounded" placeholder="H" />
            </div>
            <select value={localRegion.linkedArticleId} onChange={e => setLocalRegion(r => ({...r, linkedArticleId: e.target.value}))} className="w-full p-1 border rounded bg-white">
                <option value="">No Linked Article</option>
                {articles.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
        </div>
    );
};

export default EditorDashboard;
