
import React, { useState, useRef, useEffect } from 'react';
import { EPaperPage, Article, EPaperRegion, ArticleStatus, ClassifiedAd, Advertisement, AdSize, AdPlacement, WatermarkSettings, TrustedDevice, UserRole } from '../types';
import { 
  Trash2, Upload, Plus, Save, FileText, Image as ImageIcon, 
  Layout, Settings, X, Check, MousePointer2, RotateCcw, ZoomIn, ZoomOut, RotateCw, Crop, Eye, BarChart3, Search, Filter, AlertCircle, CheckCircle, PenSquare, Tag, Megaphone, MonitorPlay, ToggleLeft, ToggleRight, Globe, Home, Menu, Grid, Users, Contact, LogOut, Inbox, List, Newspaper, DollarSign, MapPin, ChevronDown, ShieldCheck, Monitor, Smartphone, Tablet, ExternalLink, Loader2, Lock, Library, Calendar, Pencil, Ban, Type, Palette, Move
} from 'lucide-react';
import { format } from 'date-fns';
import EPaperViewer from '../components/EPaperViewer';
import RichTextEditor from '../components/RichTextEditor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { generateId, getDeviceId } from '../utils';
import { supabase } from '../supabaseClient';
import ImageGalleryModal from '../components/ImageGalleryModal';

const RegionEditor = ({ region, page, articles, onSave, onDelete }: { 
    region: EPaperRegion, 
    page: EPaperPage, 
    articles: Article[], 
    onSave: (p: EPaperPage, r: EPaperRegion) => void, 
    onDelete: (p: EPaperPage, id: string) => void 
}) => {
    const handleChange = (field: keyof EPaperRegion, value: any) => {
        onSave(page, { ...region, [field]: value });
    };

    return (
        <div className="p-3 border rounded bg-gray-50 text-xs space-y-2">
            <div className="flex justify-between items-center">
                <span className="font-bold text-gray-500">Region {region.id.substring(0,4)}</span>
                <button onClick={() => onDelete(page, region.id)} className="text-red-500 hover:text-red-700"><Trash2 size={12}/></button>
            </div>
            <div className="grid grid-cols-4 gap-2">
                <div>
                    <label className="block text-[8px] uppercase font-bold text-gray-400">X %</label>
                    <input type="number" value={Math.round(region.x)} onChange={e => handleChange('x', Number(e.target.value))} className="w-full p-1 border rounded"/>
                </div>
                <div>
                    <label className="block text-[8px] uppercase font-bold text-gray-400">Y %</label>
                    <input type="number" value={Math.round(region.y)} onChange={e => handleChange('y', Number(e.target.value))} className="w-full p-1 border rounded"/>
                </div>
                <div>
                    <label className="block text-[8px] uppercase font-bold text-gray-400">W %</label>
                    <input type="number" value={Math.round(region.width)} onChange={e => handleChange('width', Number(e.target.value))} className="w-full p-1 border rounded"/>
                </div>
                <div>
                    <label className="block text-[8px] uppercase font-bold text-gray-400">H %</label>
                    <input type="number" value={Math.round(region.height)} onChange={e => handleChange('height', Number(e.target.value))} className="w-full p-1 border rounded"/>
                </div>
            </div>
            <div>
                <label className="block text-[8px] uppercase font-bold text-gray-400 mb-1">Linked Article</label>
                <select 
                    value={region.linkedArticleId || ''} 
                    onChange={e => handleChange('linkedArticleId', e.target.value)}
                    className="w-full p-1 border rounded truncate"
                >
                    <option value="">-- None (Zoom Only) --</option>
                    {articles.map(a => (
                        <option key={a.id} value={a.id}>{a.title.substring(0, 30)}...</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

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
  
  // E-Paper Drawing & Zoom State
  const [drawMode, setDrawMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [drawPreview, setDrawPreview] = useState<{x: number, y: number, w: number, h: number} | null>(null);
  
  const [editorScale, setEditorScale] = useState(1);
  // Replaced editorPanY with full XY position
  const [editorPos, setEditorPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ clientX: number, clientY: number, originX: number, originY: number } | null>(null);
  
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  const activePage = ePaperPages.find(p => p.id === activePageId);

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

  // Reset scale and pos when page changes
  useEffect(() => {
      setEditorScale(1);
      setEditorPos({ x: 0, y: 0 });
  }, [activePageId]);

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
      
      await supabase.from('epaper_regions').insert({
          id: newRegion.id,
          page_id: page.id,
          x: newRegion.x, 
          y: newRegion.y, 
          width: newRegion.width, 
          height: newRegion.height
      });
  };

  // --- DRAWING LOGIC ---
  const handleDrawStart = (e: React.MouseEvent) => {
    if (!drawMode || !imageContainerRef.current) return;
    e.preventDefault();
    
    // Calculate coordinates relative to the *transformed* element
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

  // --- UNIFIED MOUSE HANDLER (Draw + Pan) ---
  const handleStageMouseDown = (e: React.MouseEvent) => {
      if (drawMode) {
          handleDrawStart(e);
      } else {
          // Pan Mode
          e.preventDefault();
          setIsPanning(true);
          panStartRef.current = {
              clientX: e.clientX,
              clientY: e.clientY,
              originX: editorPos.x,
              originY: editorPos.y
          };
      }
  };

  const handleStageMouseMove = (e: React.MouseEvent) => {
      if (drawMode) {
          handleDrawMove(e);
      } else if (isPanning && panStartRef.current) {
          // Pan Move
          e.preventDefault();
          const deltaX = e.clientX - panStartRef.current.clientX;
          const deltaY = e.clientY - panStartRef.current.clientY;
          setEditorPos({
              x: panStartRef.current.originX + deltaX,
              y: panStartRef.current.originY + deltaY
          });
      }
  };

  const handleStageMouseUp = () => {
      if (drawMode) {
          handleDrawEnd();
      } else {
          setIsPanning(false);
          panStartRef.current = null;
      }
  };
  
  // TOUCH SUPPORT for mobile drawing (kept separate as touch logic is specific)
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
  
  const handleDeleteRegion = async (page: EPaperPage, regionId: string) => {
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
                 <div className="max-w-screen-2xl mx-auto">
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
                          <div className="lg:col-span-3 bg-white p-4 border rounded-lg h-fit max-h-60 lg:max-h-[75vh] overflow-y-auto">
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
                                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                                    {/* EDITOR / VIEWER (Expanded to 9 cols) */}
                                    <div className="xl:col-span-9 bg-white p-4 border rounded-lg shadow-sm flex flex-col">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                    {drawMode ? 'Draw Mode' : 'Pan Mode'}
                                                </span>
                                                {drawMode && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded font-bold uppercase animate-pulse">Draw Active</span>}
                                                
                                                {/* Zoom Controls */}
                                                <div className="flex items-center gap-1 bg-gray-100 rounded p-0.5 border border-gray-200">
                                                    <button onClick={() => setEditorScale(s => Math.max(1, s - 0.5))} className="p-1 hover:bg-gray-200 rounded" title="Zoom Out"><ZoomOut size={14}/></button>
                                                    <span className="text-[10px] font-mono w-8 text-center">{editorScale}x</span>
                                                    <button onClick={() => setEditorScale(s => Math.min(4, s + 0.5))} className="p-1 hover:bg-gray-200 rounded" title="Zoom In"><ZoomIn size={14}/></button>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => setDrawMode(!drawMode)} 
                                                className={`text-xs px-3 py-1.5 rounded font-bold uppercase flex items-center gap-2 transition-colors ${drawMode ? 'bg-news-accent text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                {drawMode ? <><Ban size={14}/> Stop Drawing</> : <><Pencil size={14}/> Draw Region</>}
                                            </button>
                                        </div>
                                        
                                        {/* Container for the image + overlays */}
                                        <div 
                                            key={activePage.id}
                                            className={`w-full bg-gray-100 relative overflow-hidden border border-gray-200 p-2 flex items-center justify-center h-[75vh] 
                                                ${drawMode ? 'cursor-crosshair' : (isPanning ? 'cursor-grabbing' : 'cursor-grab')}
                                            `}
                                            onMouseDown={handleStageMouseDown}
                                            onMouseMove={handleStageMouseMove}
                                            onMouseUp={handleStageMouseUp}
                                            onMouseLeave={handleStageMouseUp}
                                        >
                                            
                                            {/* The ref must be on the specific element that matches the image dimensions 
                                                so coordinate calculations are correct. 
                                                We wrap EPaperViewer in a div that shrinks to fit the image. */}
                                            <div 
                                                style={{
                                                    transform: `translate(${editorPos.x}px, ${editorPos.y}px) scale(${editorScale})`,
                                                    transformOrigin: 'center center',
                                                    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                                                    maxWidth: '100%',
                                                    maxHeight: '100%'
                                                }}
                                                className="relative inline-block shadow-sm transition-transform origin-center"
                                            >
                                                <div
                                                    ref={imageContainerRef}
                                                    className="relative inline-block"
                                                    style={{ touchAction: 'none' }}
                                                    onTouchStart={handleTouchDrawStart}
                                                    onTouchMove={handleTouchDrawMove}
                                                    onTouchEnd={handleDrawEnd}
                                                >
                                                    <EPaperViewer 
                                                        page={activePage} 
                                                        className="max-w-full max-h-full" 
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
                                        </div>

                                        <div className="mt-2 text-[10px] text-gray-400 text-center flex justify-between px-2">
                                            <span>{drawMode ? 'Click and drag to map a region.' : 'Click and drag to pan the image.'}</span>
                                            {editorScale > 1 && <span className="text-news-accent font-bold"><Move size={10} className="inline"/> Pan enabled</span>}
                                        </div>
                                    </div>
                                    
                                    {/* REGION LIST (Reduced to 3 cols) */}
                                    <div className="xl:col-span-3 bg-white p-4 border rounded-lg max-h-[75vh] overflow-y-auto">
                                        <div className="flex justify-between items-center mb-4">
                                            <div>
                                                <h3 className="font-bold text-gray-800">Regions</h3>
                                                <p className="text-xs text-gray-500">Map articles.</p>
                                            </div>
                                            <button onClick={() => handleAddRegion(activePage)} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold hover:bg-gray-200 transition-colors border border-gray-200">
                                                <Plus size={14} className="inline mr-1"/> Manual
                                            </button>
                                        </div>
                                        <div className="space-y-3">
                                            {activePage.regions.length === 0 && (
                                                <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded">
                                                    <MousePointer2 className="mx-auto mb-2 opacity-50" />
                                                    <p className="text-xs">No regions added.</p>
                                                    <p className="text-[10px] mt-1">Draw or Add.</p>
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

              {/* ... (Rest of component remains unchanged) ... */}
              
              {activeTab === 'classifieds' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <h1 className="font-serif text-3xl font-bold text-gray-900">Classifieds</h1>
                           <button onClick={() => onAddClassified({ id: generateId(), title: "New Ad", category: adCategories[0], content: "", contactInfo: "", postedAt: new Date().toISOString()})} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> Add New</button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {classifieds.map(ad => (
                                <div key={ad.id} className="bg-white p-4 border rounded shadow-sm relative group">
                                    <button onClick={() => { if(window.confirm('Delete ad?')) onDeleteClassified(ad.id); }} className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                    <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded">{ad.category}</span>
                                    <h4 className="font-bold mt-2">{ad.title}</h4>
                                    <p className="text-sm text-gray-600 my-2 line-clamp-3">{ad.content}</p>
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                        <Contact size={12}/> {ad.contactInfo}
                                    </div>
                                </div>
                            ))}
                      </div>
                  </div>
              )}

              {activeTab === 'taxonomy' && (
                  <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-white p-6 rounded-lg border">
                           <h3 className="font-bold text-lg mb-4">Categories</h3>
                           <form onSubmit={handleAddCategorySubmit} className="flex gap-2 mb-4">
                               <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="New Category" className="flex-1 border p-2 rounded text-sm"/>
                               <button type="submit" className="bg-news-black text-white px-3 py-2 rounded text-xs font-bold uppercase">Add</button>
                           </form>
                           <div className="space-y-2">
                               {categories.map(c => (
                                   <div key={c} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                       <span className="text-sm font-medium">{c}</span>
                                       <button onClick={() => { if(window.confirm(`Delete category ${c}?`)) onDeleteCategory(c); }} className="text-red-500 hover:text-red-700"><Trash2 size={14}/></button>
                                   </div>
                               ))}
                           </div>
                       </div>
                       <div className="bg-white p-6 rounded-lg border">
                           <h3 className="font-bold text-lg mb-4">Tags</h3>
                           <form onSubmit={handleAddTagSubmit} className="flex gap-2 mb-4">
                               <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="New Tag" className="flex-1 border p-2 rounded text-sm"/>
                               <button type="submit" className="bg-news-black text-white px-3 py-2 rounded text-xs font-bold uppercase">Add</button>
                           </form>
                           <div className="flex flex-wrap gap-2">
                               {tags && tags.map(t => (
                                   <div key={t} className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-700">
                                       <span>#{t}</span>
                                       <button onClick={() => { if(window.confirm(`Delete tag ${t}?`)) onDeleteTag && onDeleteTag(t); }} className="text-gray-400 hover:text-red-500"><X size={12}/></button>
                                   </div>
                               ))}
                           </div>
                       </div>
                  </div>
              )}

              {activeTab === 'ads' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <h1 className="font-serif text-3xl font-bold text-gray-900">Advertisements</h1>
                           <div className="flex items-center gap-4">
                               <div className="flex items-center gap-2">
                                   <span className="text-sm font-bold text-gray-500">Global Ads</span>
                                   <button 
                                     onClick={() => onToggleGlobalAds(!globalAdsEnabled)}
                                     className={`w-10 h-6 rounded-full p-1 transition-colors ${globalAdsEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                                   >
                                       <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${globalAdsEnabled ? 'translate-x-4' : ''}`}></div>
                                   </button>
                               </div>
                               <button onClick={() => onAddAdvertisement({ id: generateId(), title: 'New Ad', imageUrl: 'https://placehold.co/300x250', linkUrl: '#', size: 'RECTANGLE', placement: 'GLOBAL', isActive: true })} className="bg-news-black text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> Create Ad</button>
                           </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {advertisements.map(ad => (
                              <div key={ad.id} className={`bg-white border rounded p-4 relative ${!ad.isActive ? 'opacity-50' : ''}`}>
                                  <div className="absolute top-2 right-2 flex gap-1">
                                      <button onClick={() => { if(window.confirm('Delete ad?')) onDeleteAdvertisement(ad.id); }} className="bg-white text-red-500 p-1 rounded shadow"><Trash2 size={14}/></button>
                                  </div>
                                  <div className="aspect-video bg-gray-100 mb-3 rounded overflow-hidden">
                                      <img src={ad.imageUrl} className="w-full h-full object-cover"/>
                                  </div>
                                  <h4 className="font-bold text-sm mb-1">{ad.title}</h4>
                                  <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase text-gray-500">
                                      <span className="bg-gray-100 px-1 rounded">{ad.size}</span>
                                      <span className="bg-gray-100 px-1 rounded">{ad.placement}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {activeTab === 'analytics' && (
                  <div className="max-w-7xl mx-auto">
                      <h1 className="font-serif text-3xl font-bold text-gray-900 mb-6">Analytics Overview</h1>
                      <AnalyticsDashboard articles={articles} role={UserRole.ADMIN} />
                  </div>
              )}
              
              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-8">
                      {/* Watermark Settings */}
                      <div className="bg-white p-6 rounded-lg border">
                          <h3 className="font-bold text-lg mb-6 border-b pb-2">E-Paper Watermark Settings</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Brand Text</label>
                                  <input type="text" value={localWatermark.text} onChange={e => setLocalWatermark({...localWatermark, text: e.target.value})} className="w-full p-2 border rounded"/>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Font Size</label>
                                  <input type="number" value={localWatermark.fontSize} onChange={e => setLocalWatermark({...localWatermark, fontSize: Number(e.target.value)})} className="w-full p-2 border rounded"/>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Background Color</label>
                                  <div className="flex gap-2">
                                      <input type="color" value={localWatermark.backgroundColor} onChange={e => setLocalWatermark({...localWatermark, backgroundColor: e.target.value})} className="h-10 w-10 border rounded cursor-pointer"/>
                                      <input type="text" value={localWatermark.backgroundColor} onChange={e => setLocalWatermark({...localWatermark, backgroundColor: e.target.value})} className="flex-1 p-2 border rounded uppercase"/>
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Text Color</label>
                                  <div className="flex gap-2">
                                      <input type="color" value={localWatermark.textColor} onChange={e => setLocalWatermark({...localWatermark, textColor: e.target.value})} className="h-10 w-10 border rounded cursor-pointer"/>
                                      <input type="text" value={localWatermark.textColor} onChange={e => setLocalWatermark({...localWatermark, textColor: e.target.value})} className="flex-1 p-2 border rounded uppercase"/>
                                  </div>
                              </div>
                              <div className="col-span-2">
                                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Logo URL</label>
                                  <div className="flex gap-2">
                                      <input type="text" value={localWatermark.logoUrl} onChange={e => setLocalWatermark({...localWatermark, logoUrl: e.target.value})} className="flex-1 p-2 border rounded"/>
                                      <label className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded cursor-pointer border text-xs font-bold uppercase flex items-center">
                                          Upload <input type="file" accept="image/*" onChange={handleWatermarkLogoUpload} className="hidden"/>
                                      </label>
                                  </div>
                              </div>
                              <div className="col-span-2">
                                  <button onClick={saveWatermarkSettings} className="bg-news-black text-white px-6 py-2 rounded text-xs font-bold uppercase tracking-widest">Save Settings</button>
                              </div>
                          </div>
                      </div>

                      {/* Device Approvals */}
                      <div className="bg-white p-6 rounded-lg border">
                          <h3 className="font-bold text-lg mb-6 border-b pb-2">Pending Device Approvals</h3>
                          <div className="space-y-4">
                              {devices.filter(d => d.status === 'pending').length === 0 ? (
                                  <p className="text-sm text-gray-500 italic">No pending device requests.</p>
                              ) : (
                                  devices.filter(d => d.status === 'pending').map(d => (
                                      <div key={d.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                                          <div>
                                              <div className="flex items-center gap-2">
                                                  <span className="font-bold text-gray-900">{d.deviceName}</span>
                                                  <span className="text-[10px] bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded font-bold uppercase">Pending</span>
                                              </div>
                                              <div className="text-xs text-gray-500 mt-1 flex gap-3">
                                                  <span>{d.deviceType}</span>
                                                  <span>•</span>
                                                  <span>{d.location}</span>
                                                  <span>•</span>
                                                  <span className="font-mono">{d.id}</span>
                                              </div>
                                          </div>
                                          <div className="flex gap-2">
                                              <button onClick={() => onRejectDevice(d.id)} className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 rounded text-xs font-bold hover:bg-gray-50">Reject</button>
                                              <button onClick={() => onApproveDevice(d.id)} className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700">Approve</button>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>

                          <h3 className="font-bold text-lg mt-8 mb-6 border-b pb-2">Trusted Devices</h3>
                          <div className="space-y-2">
                              {devices.filter(d => d.status === 'approved').map(d => (
                                  <div key={d.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100">
                                      <div className="flex items-center gap-3">
                                          <div className={`w-2 h-2 rounded-full ${d.isCurrent ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                          <div>
                                              <div className="text-sm font-medium">{d.deviceName} {d.isPrimary && <span className="text-[10px] text-news-accent font-bold ml-2">(PRIMARY)</span>}</div>
                                              <div className="text-xs text-gray-400">{d.lastActive}</div>
                                          </div>
                                      </div>
                                      {!d.isCurrent && (
                                          <button onClick={() => { if(window.confirm('Revoke access?')) onRevokeDevice(d.id); }} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Revoke</button>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'inbox' && (
                  <div className="max-w-4xl mx-auto text-center py-20 text-gray-400">
                      <Inbox size={48} className="mx-auto mb-4 opacity-20"/>
                      <h3 className="text-lg font-bold text-gray-600">No New Messages</h3>
                      <p className="text-sm">Internal communications will appear here.</p>
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
                  <RichTextEditor content={modalContent} onChange={setModalContent} className="min-h-[400px]" onImageUpload={handleContentImageUpload} />
                  <div className="absolute bottom-2 right-3 bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded">
                      {wordCount} Words
                  </div>
                </div>
                
                <div className="flex gap-4 border-t pt-4">
                     <div>
                         <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Status</label>
                         <select value={modalStatus} onChange={(e) => setModalStatus(e.target.value as ArticleStatus)} className="p-2 border rounded text-sm bg-white">
                             <option value={ArticleStatus.DRAFT}>Draft</option>
                             <option value={ArticleStatus.PENDING}>Pending Review</option>
                             <option value={ArticleStatus.PUBLISHED}>Published</option>
                         </select>
                     </div>
                </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button onClick={() => setShowArticleModal(false)} className="px-5 py-2 text-sm font-bold">Cancel</button>
              <button onClick={handleArticleModalSubmit} disabled={isUploading} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold shadow hover:bg-gray-800 disabled:opacity-50">
                  {isUploading ? 'Uploading...' : 'Save Article'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showAddPageModal && (
          <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <h3 className="font-bold text-lg mb-4">Upload New Page</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold mb-1">Date</label>
                          <input type="date" value={newPageDate} onChange={e => setNewPageDate(e.target.value)} className="w-full border p-2 rounded"/>
                      </div>
                      <div>
                          <label className="block text-sm font-bold mb-1">Page Number</label>
                          <input type="number" value={newPageNumber} onChange={e => setNewPageNumber(Number(e.target.value))} className="w-full border p-2 rounded"/>
                      </div>
                      <div>
                          <label className="block text-sm font-bold mb-1">Page Image</label>
                          <div className="border-2 border-dashed p-6 text-center rounded bg-gray-50">
                              {isPageUploading ? (
                                  <div className="flex flex-col items-center gap-2">
                                      <Loader2 className="animate-spin text-news-accent" />
                                      <span className="text-xs font-bold">Uploading...</span>
                                  </div>
                              ) : newPageImage ? (
                                  <div className="relative">
                                      <img src={newPageImage} className="max-h-32 mx-auto shadow-sm"/>
                                      <button onClick={() => setNewPageImage('')} className="text-xs text-red-500 underline mt-2">Remove</button>
                                  </div>
                              ) : (
                                  <label className="cursor-pointer">
                                      <span className="text-news-accent font-bold text-sm">Click to Upload</span>
                                      <input type="file" accept="image/*" onChange={handleEPaperUpload} className="hidden"/>
                                  </label>
                              )}
                          </div>
                      </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                      <button onClick={() => setShowAddPageModal(false)} className="px-4 py-2 text-sm font-bold">Cancel</button>
                      <button onClick={handleSubmitNewPage} disabled={!newPageImage} className="bg-news-black text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50">Add Page</button>
                  </div>
              </div>
          </div>
      )}
    </div>
    </>
  );
};

export default EditorDashboard;
