
import React, { useState, useRef, useEffect } from 'react';
import { EPaperPage, Article, EPaperRegion, ArticleStatus, ClassifiedAd, Advertisement, AdSize, AdPlacement, WatermarkSettings, TrustedDevice, UserRole } from '../types';
import { 
  Trash2, Upload, Plus, Save, FileText, Image as ImageIcon, 
  Layout, Settings, X, Check, MousePointer2, RotateCcw, ZoomIn, ZoomOut, RotateCw, Crop, Eye, BarChart3, Search, Filter, AlertCircle, CheckCircle, PenSquare, Tag, Megaphone, MonitorPlay, ToggleLeft, ToggleRight, Globe, Home, Menu, Grid, Users, Contact, LogOut, Inbox, List, Newspaper, DollarSign, MapPin, ChevronDown, ShieldCheck, Monitor, Smartphone, Tablet, ExternalLink, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import EPaperViewer from '../components/EPaperViewer';
import RichTextEditor from '../components/RichTextEditor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { generateId, getDeviceId } from '../utils';
import { supabase } from '../supabaseClient';

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
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState<'articles' | 'epaper' | 'users' | 'idcards' | 'classifieds' | 'categories' | 'ads' | 'analytics' | 'settings' | 'inbox' | 'approvals'>('articles');

  const getDeviceIcon = (type: string) => {
    switch(type) {
      case 'desktop': return <Monitor size={20} />;
      case 'tablet': return <Tablet size={20} />;
      default: return <Smartphone size={20} />;
    }
  };

  // --- Article Wire State ---
  const [statusFilter, setStatusFilter] = useState<'ALL' | ArticleStatus>('ALL');

  // --- Modals State ---
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showClassifiedModal, setShowClassifiedModal] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [showPageModal, setShowPageModal] = useState(false);

  // --- Article Form State ---
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

  // --- Classified Form State ---
  const [clsTitle, setClsTitle] = useState('');
  const [clsCategory, setClsCategory] = useState(adCategories[0] || 'General');
  const [clsContent, setClsContent] = useState('');
  const [clsPrice, setClsPrice] = useState('');
  const [clsLocation, setClsLocation] = useState('');
  const [clsContact, setClsContact] = useState('');

  // --- Ad Form State ---
  const [adTitle, setAdTitle] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adLinkUrl, setAdLinkUrl] = useState('');
  const [adSize, setAdSize] = useState<AdSize>('RECTANGLE');
  const [adPlacement, setAdPlacement] = useState<AdPlacement>('GLOBAL');

  // --- E-Paper Form State ---
  const [pageImageUrl, setPageImageUrl] = useState('');
  const [pageDate, setPageDate] = useState(new Date().toISOString().split('T')[0]);
  const [pageNumber, setPageNumber] = useState(1);

  // --- Category Tab State ---
  const [newArticleCategory, setNewArticleCategory] = useState('');
  const [newAdCategory, setNewAdCategory] = useState('');
  const [newTagName, setNewTagName] = useState('');

  // --- E-Paper Region Editing State ---
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [regionInput, setRegionInput] = useState<{ x: string, y: string, w: string, h: string, articleId: string }>({ x: '', y: '', w: '', h: '', articleId: '' });

  // Current user primary check
  const myCurrentDeviceId = getDeviceId();
  const amIPrimary = devices.find(d => d.id === myCurrentDeviceId)?.isPrimary;

  // --- Article Handlers ---
  const openCreateArticleModal = () => { 
      setModalMode('create'); 
      setEditArticleId(null); 
      setModalTitle(''); 
      setModalSubline('');
      setModalContent(''); 
      setModalAuthor('Editor'); 
      setModalCategory(categories[0] || 'General'); 
      setModalImageUrl(`https://picsum.photos/800/400?random=${Math.floor(Math.random() * 100)}`); 
      setModalStatus(ArticleStatus.PUBLISHED); 
      setShowArticleModal(true); 
  };

  const openEditArticleModal = (article: Article) => { 
      setModalMode('edit'); 
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      setModalImageUrl(data.publicUrl);
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleArticleModalSubmit = () => {
    if (!modalTitle) { alert("Headline is required"); return; }
    const articleData: Article = { 
        id: editArticleId || generateId(), 
        title: modalTitle, 
        subline: modalSubline,
        author: modalAuthor, 
        content: modalContent || '<p>Content pending...</p>', 
        category: modalCategory, 
        publishedAt: new Date().toISOString(), 
        imageUrl: modalImageUrl, 
        status: modalStatus 
    };
    onSaveArticle(articleData);
    setShowArticleModal(false); setEditArticleId(null);
  };
  
  const filteredArticles = articles.filter(a => { if (statusFilter === 'ALL') return true; return a.status === statusFilter; });

  // --- Classified Handlers ---
  const openClassifiedModal = () => {
    setClsTitle(''); setClsCategory(adCategories[0] || 'General'); setClsContent(''); setClsPrice(''); setClsLocation(''); setClsContact('');
    setShowClassifiedModal(true);
  };

  const handleClassifiedSubmit = () => {
    if(!clsTitle || !clsContact) { alert("Title and Contact info are required"); return; }
    const newAd: ClassifiedAd = {
      id: generateId(), title: clsTitle, category: clsCategory, content: clsContent, price: clsPrice, location: clsLocation, contactInfo: clsContact, postedAt: new Date().toISOString()
    };
    onAddClassified(newAd);
    setShowClassifiedModal(false);
  };

  // --- Ad Handlers ---
  const openAdModal = () => {
    setAdTitle(''); setAdImageUrl('https://picsum.photos/300/250'); setAdLinkUrl('#'); setAdSize('RECTANGLE'); setAdPlacement('GLOBAL');
    setShowAdModal(true);
  };

  const handleAdSubmit = () => {
    if(!adTitle || !adImageUrl) { alert("Title and Image URL required"); return; }
    const newAd: Advertisement = {
      id: generateId(), title: adTitle, imageUrl: adImageUrl, linkUrl: adLinkUrl, size: adSize, placement: adPlacement, isActive: true
    };
    onAddAdvertisement(newAd);
    setShowAdModal(false);
  };

  // --- Page Handlers ---
  const openPageModal = () => {
    setPageImageUrl('https://picsum.photos/1200/1800?grayscale'); setPageDate(new Date().toISOString().split('T')[0]); setPageNumber(ePaperPages.length + 1);
    setShowPageModal(true);
  };

  const handlePageSubmit = () => {
    const newPage: EPaperPage = {
      id: generateId(), date: pageDate, pageNumber: pageNumber, imageUrl: pageImageUrl, regions: []
    };
    onAddPage(newPage);
    setShowPageModal(false);
  };

  // --- Region Logic ---
  const handleRegionClickInAdmin = (region: EPaperRegion) => {
      setEditingRegionId(region.id);
      setRegionInput({
          x: region.x.toString(),
          y: region.y.toString(),
          w: region.width.toString(),
          h: region.height.toString(),
          articleId: region.linkedArticleId || ''
      });
  };

  const handleSaveRegion = () => {
      if (!activePageId) return;
      const page = ePaperPages.find(p => p.id === activePageId);
      if (!page) return;

      const x = parseFloat(regionInput.x);
      const y = parseFloat(regionInput.y);
      const w = parseFloat(regionInput.w);
      const h = parseFloat(regionInput.h);

      if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
          alert("Invalid coordinates");
          return;
      }

      let updatedRegions = [...page.regions];

      if (editingRegionId) {
          // Update existing
          updatedRegions = updatedRegions.map(r => r.id === editingRegionId ? {
              ...r, x, y, width: w, height: h, linkedArticleId: regionInput.articleId || undefined
          } : r);
      } else {
          // Add new
          updatedRegions.push({
              id: generateId(),
              x, y, width: w, height: h, linkedArticleId: regionInput.articleId || undefined
          });
      }

      onUpdatePage({ ...page, regions: updatedRegions });
      // Reset form
      setEditingRegionId(null);
      setRegionInput({ x: '', y: '', w: '', h: '', articleId: '' });
  };

  const handleDeleteRegion = () => {
      if (!activePageId || !editingRegionId) return;
      const page = ePaperPages.find(p => p.id === activePageId);
      if (!page) return;
      
      const updatedRegions = page.regions.filter(r => r.id !== editingRegionId);
      onUpdatePage({ ...page, regions: updatedRegions });
      
      setEditingRegionId(null);
      setRegionInput({ x: '', y: '', w: '', h: '', articleId: '' });
  };

  const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button 
        onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${
            activeTab === id 
            ? 'text-white border-l-4 border-news-gold bg-white/5' 
            : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
        }`}
    >
        <Icon size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  const pendingDevices = devices.filter(d => d.status === 'pending');

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* SIDEBAR */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h1 className="font-serif text-2xl font-bold text-white">Admin</h1>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                  <X size={24} />
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
              <SidebarItem id="analytics" label="Analytics" icon={BarChart3} />
              <SidebarItem id="articles" label="Articles" icon={FileText} />
              <SidebarItem id="epaper" label="E-Paper" icon={Newspaper} />
              <SidebarItem id="classifieds" label="Classifieds" icon={Megaphone} />
              <SidebarItem id="ads" label="Monetization" icon={MonitorPlay} />
              <SidebarItem id="categories" label="Categories" icon={Tag} />
              <SidebarItem id="settings" label="Settings" icon={Settings} />
          </div>

          <div className="p-6 border-t border-gray-800 space-y-2">
              <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded hover:border-gray-500 transition-colors justify-center">
                  <Globe size={16} /> View Website
              </button>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  onNavigate('/login');
                }} 
                className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded hover:border-red-500 transition-colors justify-center"
              >
                  <LogOut size={16} /> Logout
              </button>
          </div>
      </div>

      {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col md:ml-72 h-full overflow-hidden relative bg-[#f8f9fa]">
          
          <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
             <div className="flex items-center gap-3">
                 <button onClick={() => setIsSidebarOpen(true)} className="text-gray-700"><Menu size={24} /></button>
                 <span className="font-serif text-xl font-bold text-gray-900 capitalize">{activeTab}</span>
             </div>
             <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden border">
                 {userAvatar ? <img src={userAvatar} alt="Admin" className="w-full h-full object-cover" /> : <span className="font-bold text-xs">A</span>}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
              
              {activeTab === 'analytics' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <div className="flex items-center gap-3">
                               <BarChart3 size={24} className="text-gray-900" />
                               <h1 className="font-serif text-3xl font-bold text-gray-900">Platform Analytics</h1>
                           </div>
                      </div>
                      <AnalyticsDashboard articles={articles} role={UserRole.EDITOR} />
                  </div>
              )}

              {activeTab === 'articles' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <div className="flex items-center gap-3">
                               <Menu size={24} className="text-gray-900 hidden md:block" />
                               <h1 className="font-serif text-3xl font-bold text-gray-900">Articles</h1>
                           </div>
                           <button onClick={openCreateArticleModal} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded uppercase tracking-wide flex items-center gap-2"><Plus size={16} /> Add New</button>
                      </div>

                      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                          <div className="flex-1 overflow-x-auto">
                              <table className="w-full text-left">
                                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                      <tr>
                                          <th className="px-6 py-4">Title</th>
                                          <th className="px-6 py-4">Category</th>
                                          <th className="px-6 py-4">Status</th>
                                          <th className="px-6 py-4 text-right">Actions</th>
                                      </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                      {filteredArticles.map((article) => (
                                          <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                                              <td className="px-6 py-4">
                                                  <div className="flex items-center gap-3">
                                                      <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden border"><img src={article.imageUrl} className="w-full h-full object-cover"/></div>
                                                      <span className="font-medium text-gray-900 text-sm line-clamp-1 max-w-[200px]">{article.title}</span>
                                                  </div>
                                              </td>
                                              <td className="px-6 py-4"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">{article.category}</span></td>
                                              <td className="px-6 py-4">
                                                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{article.status}</span>
                                              </td>
                                              <td className="px-6 py-4 text-right">
                                                  <div className="flex justify-end gap-3">
                                                      <button onClick={() => openEditArticleModal(article)} className="text-gray-400 hover:text-blue-600"><PenSquare size={16} /></button>
                                                      <button onClick={() => onDeleteArticle(article.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                                                  </div>
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                      <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <Menu size={24} className="text-gray-900 hidden md:block" />
                                <h1 className="font-serif text-3xl font-bold text-gray-900">System Settings</h1>
                            </div>
                      </div>

                       {/* PENDING DEVICE APPROVALS */}
                       {amIPrimary && pendingDevices.length > 0 && (
                           <div className="bg-news-gold/10 border-2 border-news-gold rounded-xl overflow-hidden animate-pulse-slow">
                               <div className="p-6 border-b border-news-gold/20 flex justify-between items-center">
                                   <div className="flex items-center gap-3">
                                       <div className="bg-news-gold text-black p-2 rounded-lg"><ShieldCheck size={20} /></div>
                                       <div>
                                           <h3 className="font-black text-news-black uppercase tracking-tight">Security Handshake Required</h3>
                                           <p className="text-xs text-news-black/70 font-medium">New devices are attempting to access your account.</p>
                                       </div>
                                   </div>
                               </div>
                               <div className="divide-y divide-news-gold/10 bg-white/50">
                                   {pendingDevices.map(device => (
                                       <div key={device.id} className="p-6 flex items-center justify-between">
                                           <div className="flex items-center gap-4">
                                               <div className="text-news-gold">{getDeviceIcon(device.deviceType)}</div>
                                               <div>
                                                   <p className="font-bold text-news-black">{device.deviceName}</p>
                                                   <p className="text-[10px] uppercase font-bold tracking-widest text-news-black/40">{device.browser} • {device.location}</p>
                                               </div>
                                           </div>
                                           <div className="flex gap-2">
                                               <button onClick={() => onRejectDevice(device.id)} className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-600 hover:bg-red-50 rounded-lg">Reject</button>
                                               <button onClick={() => onApproveDevice(device.id)} className="px-6 py-2 bg-news-gold text-black text-xs font-bold uppercase tracking-widest rounded-lg hover:shadow-lg transition-all">Approve Login</button>
                                           </div>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       )}

                       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                              <div>
                                  <h3 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2"><DollarSign size={20} className="text-green-600"/> Global Monetization</h3>
                                  <p className="text-sm text-gray-500">Control advertisement visibility across the platform.</p>
                              </div>
                              <button onClick={() => onToggleGlobalAds(!globalAdsEnabled)} className={`w-14 h-8 rounded-full relative transition-colors ${globalAdsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                                  <span className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${globalAdsEnabled ? 'left-7' : 'left-1'}`}></span>
                              </button>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="p-6 border-b border-gray-100">
                              <h3 className="font-bold text-gray-800 text-lg mb-2">Watermark Configuration</h3>
                              <p className="text-sm text-gray-500">Customize the footer strip added to E-Paper clippings.</p>
                          </div>
                          <div className="p-6 space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-4">
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brand Name</label>
                                          <input type="text" value={watermarkSettings.text} onChange={(e) => onUpdateWatermarkSettings({...watermarkSettings, text: e.target.value})} className="w-full p-2 border rounded text-sm"/>
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between"><span>Font Size</span><span>{watermarkSettings.fontSize}px</span></label>
                                          <input type="range" min="12" max="72" value={watermarkSettings.fontSize} onChange={(e) => onUpdateWatermarkSettings({...watermarkSettings, fontSize: parseInt(e.target.value)})} className="w-full"/>
                                      </div>
                                  </div>
                                  <div className="bg-gray-50 p-4 rounded border border-gray-100 space-y-4">
                                      <div className="flex items-center justify-between">
                                          <label className="text-xs font-bold text-gray-700 uppercase">Enable Logo</label>
                                          <button onClick={() => onUpdateWatermarkSettings({...watermarkSettings, showLogo: !watermarkSettings.showLogo})} className={`w-10 h-5 rounded-full relative transition-colors ${watermarkSettings.showLogo ? 'bg-green-500' : 'bg-gray-300'}`}>
                                              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${watermarkSettings.showLogo ? 'left-5.5' : 'left-0.5'}`}></span>
                                          </button>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-12">
                          <div className="p-6 border-b border-gray-100 bg-gray-50">
                              <h3 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2"><ShieldCheck size={20} className="text-news-accent"/> Trusted Devices</h3>
                              <p className="text-sm text-gray-500">Security history of Administrative sessions.</p>
                          </div>
                          <div className="divide-y divide-gray-100">
                                {devices.filter(d => d.status === 'approved').map(device => (
                                    <div key={device.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${device.id === myCurrentDeviceId ? 'bg-news-gold/10 text-news-gold' : 'bg-gray-100 text-gray-400'}`}>
                                                {getDeviceIcon(device.deviceType)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900">{device.deviceName}</span>
                                                    {device.id === myCurrentDeviceId && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Current Station</span>}
                                                    {device.isPrimary && <span className="text-[10px] bg-news-gold text-black px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Primary Locked</span>}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">{device.browser} • {device.location} • {device.lastActive}</p>
                                            </div>
                                        </div>
                                        {!device.isPrimary && (
                                            <button onClick={() => onRevokeDevice(device.id)} className="p-2 text-gray-300 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                                        )}
                                    </div>
                                ))}
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'epaper' && (
                  <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <Menu size={24} className="text-gray-900 hidden md:block" />
                            <h1 className="font-serif text-3xl font-bold text-gray-900">E-Paper Pages</h1>
                        </div>
                    </div>
                    <div className="mb-6 flex justify-end">
                         <button onClick={openPageModal} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded uppercase tracking-wide flex items-center gap-2"><Plus size={16} /> Add Page</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        <div className="md:col-span-3 space-y-4 max-h-[600px] overflow-y-auto">
                           {ePaperPages.map(page => (
                               <div key={page.id} onClick={() => setActivePageId(page.id)} className={`bg-white rounded border p-2 cursor-pointer transition-all ${activePageId === page.id ? 'border-news-accent ring-2 ring-news-accent/20' : 'border-gray-200 hover:border-gray-300'}`}>
                                   <div className="aspect-[2/3] bg-gray-100 mb-2 overflow-hidden border">
                                       <img src={page.imageUrl} className="w-full h-full object-cover" alt={`Page ${page.pageNumber}`} />
                                   </div>
                                   <div className="flex justify-between items-center px-1">
                                       <div><h4 className="font-bold text-xs text-gray-900">Page {page.pageNumber}</h4><p className="text-[10px] text-gray-500">{page.date}</p></div>
                                       <button onClick={(e) => { e.stopPropagation(); onDeletePage(page.id); }} className="text-gray-300 hover:text-red-600"><Trash2 size={14} /></button>
                                   </div>
                               </div>
                           ))}
                        </div>
                        <div className="md:col-span-9 bg-gray-100 rounded-lg border border-gray-200 min-h-[600px] flex items-center justify-center relative p-4">
                           {activePageId ? (
                               <div className="flex flex-col md:flex-row gap-4 w-full h-full">
                                    <div className="flex-1 bg-white shadow-lg overflow-hidden relative"><EPaperViewer page={ePaperPages.find(p => p.id === activePageId)!} onRegionClick={handleRegionClickInAdmin} /></div>
                                    <div className="w-64 bg-white p-4 rounded shadow-sm border flex flex-col gap-4">
                                        <h3 className="font-bold text-gray-800 border-b pb-2">{editingRegionId ? 'Update Region' : 'Add Region'}</h3>
                                        <div><label className="text-xs font-bold text-gray-500">X (%)</label><input type="text" value={regionInput.x} onChange={e => setRegionInput({...regionInput, x: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                        <div><label className="text-xs font-bold text-gray-500">Y (%)</label><input type="text" value={regionInput.y} onChange={e => setRegionInput({...regionInput, y: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                        <div><label className="text-xs font-bold text-gray-500">Width (%)</label><input type="text" value={regionInput.w} onChange={e => setRegionInput({...regionInput, w: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                        <div><label className="text-xs font-bold text-gray-500">Height (%)</label><input type="text" value={regionInput.h} onChange={e => setRegionInput({...regionInput, h: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                        <div><label className="text-xs font-bold text-gray-500">Linked Article ID</label><input type="text" value={regionInput.articleId} onChange={e => setRegionInput({...regionInput, articleId: e.target.value})} className="w-full p-2 border rounded text-sm"/></div>
                                        <div className="flex gap-2"><button onClick={handleSaveRegion} className="flex-1 bg-blue-600 text-white py-2 rounded text-sm font-bold hover:bg-blue-700">{editingRegionId ? 'Update' : 'Add'}</button></div>
                                    </div>
                               </div>
                           ) : <div className="text-center text-gray-400"><Newspaper size={48} className="mx-auto mb-2 opacity-30"/><p>Select a page to manage regions</p></div>}
                        </div>
                    </div>
                  </div>
              )}
          </div>
      </div>
      
      {/* Article Modal */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">{modalMode === 'create' ? 'Add New Article' : 'Edit Article'}</h3>
                <button onClick={() => setShowArticleModal(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Headline</label><input type="text" value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} className="w-full p-3 border rounded font-serif text-lg"/></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subline</label><input type="text" value={modalSubline} onChange={(e) => setModalSubline(e.target.value)} className="w-full p-2 border rounded text-sm italic"/></div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Author</label><input type="text" value={modalAuthor} onChange={(e) => setModalAuthor(e.target.value)} className="w-full p-2 border rounded text-sm"/></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label><select value={modalCategory} onChange={(e) => setModalCategory(e.target.value)} className="w-full p-2 border rounded bg-white">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>

                {/* Added Image Upload for Editors */}
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Featured Image</label>
                   <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors relative group">
                        {modalImageUrl ? (
                            <div className="relative w-full h-48 rounded-md overflow-hidden bg-gray-200">
                                <img src={modalImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <div className="relative">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            disabled={isUploading}
                                        />
                                        <button className="bg-white text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                                            <Upload size={14} /> Change Image
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 relative w-full">
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 size={32} className="animate-spin text-news-gold" />
                                        <span className="text-xs font-bold text-gray-400 uppercase">Uploading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <ImageIcon size={32} className="mx-auto text-gray-300 mb-2" />
                                        <p className="text-xs text-gray-500 font-medium">Click to upload or drag and drop</p>
                                    </>
                                )}
                            </div>
                        )}
                   </div>
                </div>

                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Content</label><div className="h-64 border rounded"><RichTextEditor content={modalContent} onChange={setModalContent} className="h-full border-none"/></div></div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3"><button onClick={() => setShowArticleModal(false)} className="px-5 py-2 text-gray-600 font-bold">Cancel</button><button onClick={handleArticleModalSubmit} disabled={isUploading} className="px-6 py-2 bg-green-600 text-white rounded font-bold disabled:opacity-50">Save Article</button></div>
          </div>
        </div>
      )}

      {/* Classified Modal */}
      {showClassifiedModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-900">New Classified Ad</h3><button onClick={() => setShowClassifiedModal(false)}><X size={20}/></button></div>
                <div className="p-6 space-y-4">
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ad Title</label><input type="text" value={clsTitle} onChange={(e) => setClsTitle(e.target.value)} className="w-full p-2 border rounded"/></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label><select value={clsCategory} onChange={(e) => setClsCategory(e.target.value)} className="w-full p-2 border rounded bg-white">{adCategories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price</label><input type="text" value={clsPrice} onChange={(e) => setClsPrice(e.target.value)} className="w-full p-2 border rounded" placeholder="$..."/></div>
                    </div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label><textarea value={clsContent} onChange={(e) => setClsContent(e.target.value)} className="w-full p-2 border rounded h-24"></textarea></div>
                    <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contact Info</label><input type="text" value={clsContact} onChange={(e) => setClsContact(e.target.value)} className="w-full p-2 border rounded"/></div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3"><button onClick={() => setShowClassifiedModal(false)} className="px-4 py-2 text-gray-600 font-bold">Cancel</button><button onClick={handleClassifiedSubmit} className="px-4 py-2 bg-green-600 text-white font-bold rounded">Post Ad</button></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EditorDashboard;
