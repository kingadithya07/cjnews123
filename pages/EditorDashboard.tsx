
import React, { useState, useRef, useEffect } from 'react';
import { EPaperPage, Article, EPaperRegion, ArticleStatus, ClassifiedAd, Advertisement, AdSize, AdPlacement, WatermarkSettings, TrustedDevice, UserRole } from '../types';
import { 
  Trash2, Upload, Plus, Save, FileText, Image as ImageIcon, 
  Layout, Settings, X, Check, MousePointer2, RotateCcw, ZoomIn, ZoomOut, RotateCw, Crop, Eye, BarChart3, Search, Filter, AlertCircle, CheckCircle, PenSquare, Tag, Megaphone, MonitorPlay, ToggleLeft, ToggleRight, Globe, Home, Menu, Grid, Users, Contact, LogOut, Inbox, List, Newspaper, DollarSign, MapPin, ChevronDown, ShieldCheck, Monitor, Smartphone, Tablet, ExternalLink, Loader2, Lock, Library, Calendar, Pencil, Ban, Type, Palette
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
  const [activeTab, setActiveTab] = useState<'articles' | 'epaper' | 'users' | 'idcards' | 'classifieds' | 'taxonomy' | 'ads' | 'analytics' | 'settings' | 'inbox' | 'approvals'>('articles');

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
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageDate, setNewPageDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [newPageImage, setNewPageImage] = useState('');
  const [isPageUploading, setIsPageUploading] = useState(false);
  
  // E-Paper Drawing State
  const [drawMode, setDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [drawPreview, setDrawPreview] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  const activePage = ePaperPages.find(p => p.id === activePageId);

  // Classifieds State
  const [showClassifiedModal, setShowClassifiedModal] = useState(false);
  const [editingClassified, setEditingClassified] = useState<ClassifiedAd | null>(null);

  // Advertisement State
  const [showAdModal, setShowAdModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);

  // Watermark State
  const [localWatermark, setLocalWatermark] = useState<WatermarkSettings>(watermarkSettings);
  
  // Taxonomy State
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    setLocalWatermark(watermarkSettings);
  }, [watermarkSettings]);

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
  
  const handleWatermarkLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
          const fileExt = file.name.split('.').pop();
          const fileName = `watermarks/${generateId()}.${fileExt}`;
          const { error } = await supabase.storage.from('images').upload(fileName, file);
          if (error) throw error;
          
          const { data } = supabase.storage.from('images').getPublicUrl(fileName);
          setLocalWatermark(prev => ({...prev, logoUrl: data.publicUrl}));
      } catch(err: any) {
          alert('Failed to upload logo: ' + err.message);
      }
  };

  const saveWatermarkSettings = () => {
      onUpdateWatermarkSettings(localWatermark);
      alert("Watermark settings saved!");
  };

  const handleContentImageUpload = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${generateId()}.${fileExt}`;
    const filePath = `content/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleEPaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPageUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `epaper/${newPageDate}/${newPageNumber}_${generateId()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images') 
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      setNewPageImage(data.publicUrl);
    } catch (error: any) {
      console.error('E-Paper Upload Error:', error.message);
      alert("Failed to upload E-Paper image: " + error.message);
    } finally {
      setIsPageUploading(false);
    }
  };

  const handleSubmitNewPage = () => {
      if (!newPageImage) {
          alert("Please upload an image first.");
          return;
      }
      const newPage: EPaperPage = {
          id: generateId(),
          date: newPageDate,
          pageNumber: newPageNumber,
          imageUrl: newPageImage,
          regions: []
      };
      onAddPage(newPage);
      setShowAddPageModal(false);
      setNewPageImage('');
      setNewPageNumber(prev => prev + 1);
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
  
  const handleSaveRegion = async (page: EPaperPage, region: EPaperRegion) => {
      const updatedRegions = page.regions.map(r => r.id === region.id ? region : r);
      onUpdatePage({ ...page, regions: updatedRegions });
      
      const { error } = await supabase.from('epaper_regions').upsert({
          id: region.id,
          page_id: page.id,
          x: region.x,
          y: region.y,
          width: region.width,
          height: region.height,
          linked_article_id: region.linkedArticleId || null
      });

      if (error) console.error("Region save failed:", error);
  };
  
  // MANUAL ADD (Static Square)
  const handleAddRegion = async (page: EPaperPage) => {
      const newRegion: EPaperRegion = {
          id: generateId(),
          x: 10, y: 10, width: 20, height: 20,
          linkedArticleId: ''
      };
      
      const updatedRegions = [...page.regions, newRegion];
      onUpdatePage({...page, regions: updatedRegions});

      await supabase.from('epaper_regions').insert({
          id: newRegion.id,
          page_id: page.id,
          x: newRegion.x, 
          y: newRegion.y, 
          width: newRegion.width, 
          height: newRegion.height
      });
  };

  // FREE STYLE DRAW ADD
  const handleDrawStart = (e: React.MouseEvent) => {
    if (!drawMode || !imageContainerRef.current) return;
    e.preventDefault();
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawPreview({ x, y, w: 0, h: 0 });
  };

  const handleDrawMove = (e: React.MouseEvent) => {
    if (!isDrawing || !drawStart || !imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Calculate top-left and size allowing drag in any direction
    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const w = Math.abs(currentX - drawStart.x);
    const h = Math.abs(currentY - drawStart.y);
    
    // Constrain to image boundaries (0-100%)
    const clampedX = Math.max(0, Math.min(x, 100));
    const clampedY = Math.max(0, Math.min(y, 100));
    const clampedW = Math.min(w, 100 - clampedX);
    const clampedH = Math.min(h, 100 - clampedY);

    setDrawPreview({ x: clampedX, y: clampedY, w: clampedW, h: clampedH });
  };

  // TOUCH SUPPORT for mobile drawing
  const handleTouchDrawStart = (e: React.TouchEvent) => {
    if (!drawMode || !imageContainerRef.current) return;
    const touch = e.touches[0];
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    
    setIsDrawing(true);
    setDrawStart({ x, y });
    setDrawPreview({ x, y, w: 0, h: 0 });
  };

  const handleTouchDrawMove = (e: React.TouchEvent) => {
    if (!isDrawing || !drawStart || !imageContainerRef.current) return;
    const touch = e.touches[0];
    const rect = imageContainerRef.current.getBoundingClientRect();
    const currentX = ((touch.clientX - rect.left) / rect.width) * 100;
    const currentY = ((touch.clientY - rect.top) / rect.height) * 100;
    
    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const w = Math.abs(currentX - drawStart.x);
    const h = Math.abs(currentY - drawStart.y);
    
    const clampedX = Math.max(0, Math.min(x, 100));
    const clampedY = Math.max(0, Math.min(y, 100));
    const clampedW = Math.min(w, 100 - clampedX);
    const clampedH = Math.min(h, 100 - clampedY);

    setDrawPreview({ x: clampedX, y: clampedY, w: clampedW, h: clampedH });
  };

  const handleDrawEnd = async () => {
    if (!isDrawing || !drawPreview || !activePage) {
        setIsDrawing(false);
        setDrawStart(null);
        setDrawPreview(null);
        return;
    }
    
    // Create region if size is significant (>1%)
    if (drawPreview.w > 1 && drawPreview.h > 1) {
        const newRegion: EPaperRegion = {
            id: generateId(),
            x: drawPreview.x,
            y: drawPreview.y,
            width: drawPreview.w,
            height: drawPreview.h,
            linkedArticleId: ''
        };
        
        // Optimistic Update
        const updatedRegions = [...activePage.regions, newRegion];
        onUpdatePage({...activePage, regions: updatedRegions});

        // Database Insert
        await supabase.from('epaper_regions').insert({
            id: newRegion.id,
            page_id: activePage.id,
            x: newRegion.x,
            y: newRegion.y,
            width: newRegion.width,
            height: newRegion.height
        });
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawPreview(null);
  };
  
  const handleDeleteRegion = async (page: EPaperPage, regionId: string) => {
      const updatedRegions = page.regions.filter(r => r.id !== regionId);
      onUpdatePage({ ...page, regions: updatedRegions });
      
      await supabase.from('epaper_regions').delete().eq('id', regionId);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newCategory && !categories.includes(newCategory)) {
          onAddCategory(newCategory);
          setNewCategory('');
      }
  };

  const handleAddTagSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newTag && tags && !tags.includes(newTag)) {
          onAddTag && onAddTag(newTag);
          setNewTag('');
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
        onSelectImage={handleSelectFromGallery}
    />
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Mobile Sidebar Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

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
              <SidebarItem id="taxonomy" label="Taxonomy" icon={List} />
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
           {/* Mobile Header */}
           <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between shrink-0 sticky top-0 z-30">
              <div className="flex items-center gap-3">
                  <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md">
                      <Menu size={24} />
                  </button>
                  <h1 className="font-serif text-xl font-bold text-gray-900">
                    {activeTab === 'articles' ? 'Articles' : 
                     activeTab === 'epaper' ? 'E-Paper' : 
                     activeTab === 'classifieds' ? 'Classifieds' : 
                     activeTab === 'taxonomy' ? 'Taxonomy' :
                     activeTab === 'ads' ? 'Ads' : 
                     activeTab === 'analytics' ? 'Analytics' : 
                     activeTab === 'settings' ? 'Settings' : 'Dashboard'}
                  </h1>
              </div>
           </div>

          <div className="p-4 md:p-8 overflow-y-auto flex-1">
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
                      <div className="flex justify-between items-center mb-6">
                        <h1 className="font-serif text-3xl font-bold text-gray-900">E-Paper Editor</h1>
                        <button 
                            onClick={() => { setShowAddPageModal(true); setNewPageImage(''); }}
                            className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-800"
                        >
                            <Plus size={16} /> Add New Page
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          <div className="lg:col-span-3 bg-white p-4 border rounded-lg h-fit max-h-60 lg:max-h-[70vh] overflow-y-auto">
                              <h3 className="font-bold text-gray-800 border-b pb-2 mb-2">Pages</h3>
                              {ePaperPages.length === 0 && <p className="text-xs text-gray-400 italic">No pages uploaded yet.</p>}
                              {ePaperPages.map(p => (
                                <div key={p.id} className="group relative">
                                    <button onClick={() => setActivePageId(p.id)} className={`w-full text-left p-2 rounded text-sm mb-1 ${activePageId === p.id ? 'bg-news-accent/10 text-news-accent font-bold' : 'hover:bg-gray-50'}`}>
                                        {p.date} - Page {p.pageNumber}
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete this page?')) onDeletePage(p.id); }}
                                        className="absolute right-2 top-2 text-gray-400 hover:text-red-600 hidden group-hover:block"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                              ))}
                          </div>
                          <div className="lg:col-span-9">
                            {activePage ? (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    {/* EDITOR / VIEWER */}
                                    <div className="bg-white p-4 border rounded-lg shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Preview</span>
                                                {drawMode && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold uppercase animate-pulse">Draw Mode Active</span>}
                                            </div>
                                            <button 
                                                onClick={() => setDrawMode(!drawMode)} 
                                                className={`text-xs px-3 py-1.5 rounded font-bold uppercase flex items-center gap-2 transition-colors ${drawMode ? 'bg-news-accent text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                {drawMode ? <><Ban size={14}/> Stop Drawing</> : <><Pencil size={14}/> Draw Region</>}
                                            </button>
                                        </div>
                                        
                                        {/* Container for the image + overlays */}
                                        {/* We use a flex container to center the image preview block */}
                                        <div className="aspect-[2/3] w-full bg-gray-100 relative flex items-center justify-center overflow-hidden border border-gray-200 p-2">
                                            {/* The ref must be on the specific element that matches the image dimensions 
                                                so coordinate calculations are correct. 
                                                We wrap EPaperViewer in a div that shrinks to fit the image. */}
                                            <div 
                                                ref={imageContainerRef}
                                                className={`relative inline-block shadow-sm ${drawMode ? 'cursor-crosshair' : 'cursor-default'}`}
                                                style={{ touchAction: 'none' }}
                                                onMouseDown={handleDrawStart}
                                                onMouseMove={handleDrawMove}
                                                onMouseUp={handleDrawEnd}
                                                onMouseLeave={handleDrawEnd}
                                                onTouchStart={handleTouchDrawStart}
                                                onTouchMove={handleTouchDrawMove}
                                                onTouchEnd={handleDrawEnd}
                                            >
                                                <EPaperViewer 
                                                    page={activePage} 
                                                    className="max-w-full max-h-full" 
                                                    imageClassName="max-h-[600px]" // Limit height in editor
                                                />
                                                
                                                {/* Draw Mode Overlay */}
                                                {drawMode && <div className="absolute inset-0 z-20" />}
                                                
                                                {/* Live Preview Box */}
                                                {drawPreview && (
                                                    <div 
                                                        className="absolute border-2 border-news-accent bg-news-accent/20 z-30"
                                                        style={{
                                                            left: `${drawPreview.x}%`,
                                                            top: `${drawPreview.y}%`,
                                                            width: `${drawPreview.w}%`,
                                                            height: `${drawPreview.h}%`
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-2 text-[10px] text-gray-400 text-center">
                                            {drawMode ? 'Click/Tap and drag on the image to define a new region.' : 'Enable Draw Mode to add regions freely.'}
                                        </div>
                                    </div>
                                    
                                    {/* REGION LIST */}
                                    <div className="bg-white p-4 border rounded-lg max-h-[70vh] overflow-y-auto">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <h3 className="font-bold text-gray-800">Regions</h3>
                                                <p className="text-xs text-gray-500">Map articles to areas on the page.</p>
                                            </div>
                                            <button onClick={() => handleAddRegion(activePage)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold hover:bg-gray-200 transition-colors border border-gray-200">
                                                <Plus size={14} className="inline mr-1"/> Manual Add
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {activePage.regions.length === 0 && (
                                                <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded">
                                                    <MousePointer2 className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs">No regions added yet.</p>
                                                    <p className="text-[10px] mt-1">Use 'Draw Region' to start.</p>
                                                </div>
                                            )}
                                            {activePage.regions.map(region => (
                                                <RegionEditor key={region.id} region={region} page={activePage} articles={articles} onSave={handleSaveRegion} onDelete={handleDeleteRegion}/>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-96 flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed rounded-lg text-gray-400">
                                    <Newspaper size={48} className="mb-4 opacity-20" />
                                    <p className="font-bold">Select a page to edit</p>
                                    <p className="text-xs mt-1">Or upload a new one to get started.</p>
                                </div>
                            )}
                          </div>
                      </div>
                 </div>
              )}
              {/* Other tabs kept as is, abbreviated for change set */}
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
              {activeTab === 'taxonomy' && (
                  <div className="max-w-6xl mx-auto space-y-8">
                       <h1 className="font-serif text-3xl font-bold text-gray-900 mb-6">Taxonomy Settings</h1>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Categories */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <List size={18} className="text-news-gold" /> Article Categories
                                </h3>
                                <form onSubmit={handleAddCategorySubmit} className="flex gap-2 mb-4">
                                    <input 
                                        type="text" 
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        placeholder="New Category Name"
                                        className="flex-1 p-2 border rounded text-sm"
                                    />
                                    <button type="submit" className="bg-news-black text-white px-3 py-2 rounded text-xs font-bold uppercase hover:bg-gray-800"><Plus size={16}/></button>
                                </form>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {categories.map(cat => (
                                        <div key={cat} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100">
                                            <span className="text-sm font-medium">{cat}</span>
                                            <button onClick={() => onDeleteCategory(cat)} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Tags */}
                            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Tag size={18} className="text-news-gold" /> Global Tags
                                </h3>
                                <form onSubmit={handleAddTagSubmit} className="flex gap-2 mb-4">
                                    <input 
                                        type="text" 
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        placeholder="New Tag Name"
                                        className="flex-1 p-2 border rounded text-sm"
                                    />
                                    <button type="submit" className="bg-news-black text-white px-3 py-2 rounded text-xs font-bold uppercase hover:bg-gray-800"><Plus size={16}/></button>
                                </form>
                                <div className="flex flex-wrap gap-2">
                                    {tags?.map(tag => (
                                        <div key={tag} className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600 border border-gray-200">
                                            <span>#{tag}</span>
                                            <button onClick={() => onDeleteTag && onDeleteTag(tag)} className="ml-1 text-gray-400 hover:text-red-500"><X size={12}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
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
               {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                      <div className="flex justify-between items-center mb-6">
                           <h1 className="font-serif text-3xl font-bold text-gray-900">Settings</h1>
                           <button onClick={saveWatermarkSettings} className="bg-news-black hover:bg-gray-800 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 uppercase tracking-wider"><Save size={16} /> Save Changes</button>
                      </div>
                      
                      {/* Watermark Configuration Card */}
                      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                           <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                               <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                   <Crop size={24} />
                               </div>
                               <div>
                                   <h3 className="text-lg font-bold text-gray-900">Watermark Configuration</h3>
                                   <p className="text-sm text-gray-500">Customize the branding applied to clipped E-Paper regions.</p>
                               </div>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div className="space-y-4">
                                   <div>
                                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Website Name / Brand Text</label>
                                       <div className="relative">
                                           <Type className="absolute left-3 top-3 text-gray-400" size={16} />
                                           <input 
                                                type="text" 
                                                value={localWatermark.text}
                                                onChange={(e) => setLocalWatermark({...localWatermark, text: e.target.value})}
                                                className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg outline-none focus:border-news-black transition-colors text-sm font-medium"
                                                placeholder="e.g. Digital Newsroom"
                                           />
                                       </div>
                                   </div>
                                   
                                   <div>
                                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Logo Image</label>
                                       <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative">
                                            {localWatermark.logoUrl ? (
                                                <div className="flex items-center justify-between">
                                                    <img src={localWatermark.logoUrl} className="h-10 object-contain" alt="Logo Preview" />
                                                    <button onClick={() => setLocalWatermark({...localWatermark, logoUrl: ''})} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                                </div>
                                            ) : (
                                                <div className="py-2 text-gray-400">
                                                    <Upload size={20} className="mx-auto mb-2 opacity-50"/>
                                                    <span className="text-xs">Upload PNG/JPG</span>
                                                </div>
                                            )}
                                            <input type="file" accept="image/*" onChange={handleWatermarkLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                       </div>
                                       <div className="flex items-center gap-2 mt-2">
                                           <input 
                                                type="checkbox" 
                                                id="showLogo" 
                                                checked={localWatermark.showLogo} 
                                                onChange={(e) => setLocalWatermark({...localWatermark, showLogo: e.target.checked})}
                                                className="rounded border-gray-300 text-news-black focus:ring-news-black"
                                           />
                                           <label htmlFor="showLogo" className="text-sm text-gray-600">Show Logo in Clipping</label>
                                       </div>
                                   </div>
                               </div>

                               <div className="space-y-4">
                                   <div>
                                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Colors</label>
                                       <div className="grid grid-cols-2 gap-4">
                                           <div>
                                               <div className="flex items-center gap-2 mb-1">
                                                   <div className="w-4 h-4 rounded border border-gray-200" style={{backgroundColor: localWatermark.backgroundColor}}></div>
                                                   <span className="text-xs text-gray-600">Background</span>
                                               </div>
                                               <input 
                                                    type="color" 
                                                    value={localWatermark.backgroundColor} 
                                                    onChange={(e) => setLocalWatermark({...localWatermark, backgroundColor: e.target.value})}
                                                    className="w-full h-8 cursor-pointer rounded overflow-hidden"
                                               />
                                           </div>
                                           <div>
                                               <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-4 h-4 rounded border border-gray-200" style={{backgroundColor: localWatermark.textColor}}></div>
                                                    <span className="text-xs text-gray-600">Text</span>
                                               </div>
                                               <input 
                                                    type="color" 
                                                    value={localWatermark.textColor} 
                                                    onChange={(e) => setLocalWatermark({...localWatermark, textColor: e.target.value})}
                                                    className="w-full h-8 cursor-pointer rounded overflow-hidden"
                                               />
                                           </div>
                                       </div>
                                   </div>
                                   
                                   <div className="pt-2">
                                       <div className="p-4 bg-gray-100 rounded-lg border border-gray-200">
                                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Live Preview (Approximate)</p>
                                           <div className="h-12 w-full flex items-center px-4 justify-between" style={{backgroundColor: localWatermark.backgroundColor}}>
                                                <div className="flex items-center gap-3">
                                                    {localWatermark.showLogo && localWatermark.logoUrl && (
                                                        <img src={localWatermark.logoUrl} className="h-6 object-contain" />
                                                    )}
                                                    <span className="font-serif font-bold" style={{color: localWatermark.textColor}}>{localWatermark.text}</span>
                                                </div>
                                                <span className="text-xs font-sans text-white/80">Jan 01, 2024</span>
                                           </div>
                                       </div>
                                   </div>
                               </div>
                           </div>
                      </div>
                      
                      {/* Global Ads Switch */}
                      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                           <div className="flex items-center gap-3">
                               <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                   <Megaphone size={24} />
                               </div>
                               <div>
                                   <h3 className="text-lg font-bold text-gray-900">Global Advertisements</h3>
                                   <p className="text-sm text-gray-500">Toggle all ad units across the platform instantly.</p>
                               </div>
                           </div>
                           <button 
                                onClick={() => onToggleGlobalAds(!globalAdsEnabled)}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${globalAdsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                           >
                               <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${globalAdsEnabled ? 'translate-x-7' : 'translate-x-1'}`}/>
                           </button>
                      </div>
                  </div>
              )}
               {activeTab === 'inbox' && (
                  <div className="max-w-6xl mx-auto text-center py-20 bg-white border rounded-lg">
                      <Inbox size={48} className="mx-auto text-gray-300 mb-4" />
                      <h1 className="font-serif text-2xl font-bold text-gray-800">Communication Center</h1>
                      <div className="max-w-md mx-auto mt-6 p-6 bg-gray-50 rounded-lg border border-gray-100 text-left">
                          <h4 className="font-bold text-sm mb-2">Recent Notifications</h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                              <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div> System Updated successfully.</li>
                              <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> New article draft received from Writer.</li>
                              <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-400"></div> Daily Analytics Report ready.</li>
                          </ul>
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Modals rendered here */}
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

      {/* NEW: ADD E-PAPER PAGE MODAL */}
      {showAddPageModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md animate-in zoom-in-95">
                <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-800">Upload E-Paper Page</h3>
                    <button onClick={() => setShowAddPageModal(false)}><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Edition Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                            <input 
                                type="date" 
                                value={newPageDate} 
                                onChange={(e) => setNewPageDate(e.target.value)} 
                                className="w-full pl-10 p-2 border rounded font-mono text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Page Number</label>
                        <input 
                            type="number" 
                            min="1"
                            value={newPageNumber} 
                            onChange={(e) => setNewPageNumber(parseInt(e.target.value))} 
                            className="w-full p-2 border rounded font-mono text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Page Image (JPG/PNG)</label>
                        <div className="border-2 border-dashed p-6 rounded bg-gray-50 text-center hover:bg-gray-100 transition-colors relative">
                             {isPageUploading ? (
                                <div className="flex flex-col items-center">
                                    <Loader2 className="animate-spin text-news-accent mb-2" />
                                    <span className="text-xs font-bold">Uploading...</span>
                                </div>
                             ) : newPageImage ? (
                                <div className="relative group">
                                     <img src={newPageImage} className="max-h-32 mx-auto shadow-sm rounded" />
                                     <button 
                                        onClick={() => setNewPageImage('')}
                                        className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full shadow-lg"
                                     >
                                        <X size={12} />
                                     </button>
                                     <p className="text-xs text-green-600 font-bold mt-2 flex items-center justify-center gap-1"><CheckCircle size={12}/> Ready to save</p>
                                </div>
                             ) : (
                                <>
                                    <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                                    <p className="text-xs text-gray-500 font-medium">Click to upload page image</p>
                                    <input type="file" accept="image/*" onChange={handleEPaperUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                </>
                             )}
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={() => setShowAddPageModal(false)} className="px-4 py-2 text-xs font-bold text-gray-600 uppercase">Cancel</button>
                    <button 
                        onClick={handleSubmitNewPage} 
                        disabled={!newPageImage || isPageUploading}
                        className="px-6 py-2 bg-news-black text-white rounded text-xs font-bold uppercase disabled:opacity-50"
                    >
                        Save Page
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
                <input type="number" value={Math.round(localRegion.x)} onChange={e => setLocalRegion(r => ({...r, x: parseFloat(e.target.value)}))} className="w-full p-1 border rounded" placeholder="X" />
                <input type="number" value={Math.round(localRegion.y)} onChange={e => setLocalRegion(r => ({...r, y: parseFloat(e.target.value)}))} className="w-full p-1 border rounded" placeholder="Y" />
                <input type="number" value={Math.round(localRegion.width)} onChange={e => setLocalRegion(r => ({...r, width: parseFloat(e.target.value)}))} className="w-full p-1 border rounded" placeholder="W" />
                <input type="number" value={Math.round(localRegion.height)} onChange={e => setLocalRegion(r => ({...r, height: parseFloat(e.target.value)}))} className="w-full p-1 border rounded" placeholder="H" />
            </div>
            <select value={localRegion.linkedArticleId} onChange={e => setLocalRegion(r => ({...r, linkedArticleId: e.target.value}))} className="w-full p-1 border rounded bg-white">
                <option value="">No Linked Article</option>
                {articles.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
        </div>
    );
};

export default EditorDashboard;
