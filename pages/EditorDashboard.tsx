
import React, { useState, useRef, useEffect } from 'react';
import { EPaperPage, Article, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice } from '../types';
import { 
  Trash2, Upload, Plus, FileText, Image as ImageIcon, 
  Settings, X, RotateCcw, ZoomIn, ZoomOut, BarChart3, PenSquare, Tag, Megaphone, Globe, Menu, List, Newspaper, Calendar, Loader2, Library
} from 'lucide-react';
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
  devices: TrustedDevice[];
  onApproveDevice: (id: string) => void;
  onRejectDevice: (id: string) => void;
  onRevokeDevice: (id: string) => void;
}

const EditorDashboard: React.FC<EditorDashboardProps> = ({ 
  articles, ePaperPages, categories, classifieds, advertisements,
  onAddPage, onDeletePage, onDeleteArticle, onSaveArticle, 
  onAddClassified, onDeleteClassified, onAddAdvertisement, onDeleteAdvertisement,
  onNavigate
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'epaper' | 'classifieds' | 'ads' | 'analytics' | 'settings'>('articles');

  // Article State
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
  const [showImageGallery, setShowImageGallery] = useState(false);
  
  // E-Paper State
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [showAddPageModal, setShowAddPageModal] = useState(false);
  const [newPageDate, setNewPageDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPageNumber, setNewPageNumber] = useState(1);
  const [newPageImage, setNewPageImage] = useState('');
  const [isPageUploading, setIsPageUploading] = useState(false);
  
  const [editorScale, setEditorScale] = useState(1);
  const [editorPos, setEditorPos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ clientX: number, clientY: number, originX: number, originY: number } | null>(null);
  
  const activePage = ePaperPages.find(p => p.id === activePageId);

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
      const fileName = `articles/${generateId()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      setModalImageUrl(data.publicUrl);
    } catch (error: any) {
      alert("Upload Failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleEPaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsPageUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `epaper/${newPageDate}/${newPageNumber}_${generateId()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('images').getPublicUrl(fileName);
      setNewPageImage(data.publicUrl);
    } catch (error: any) { alert("Failed to upload: " + error.message); } finally { setIsPageUploading(false); }
  };

  const handleSubmitNewPage = () => {
      if (!newPageImage) { alert("Please upload an image first."); return; }
      const newPage: EPaperPage = { id: generateId(), date: newPageDate, pageNumber: newPageNumber, imageUrl: newPageImage, regions: [] };
      onAddPage(newPage);
      setShowAddPageModal(false);
      setNewPageImage('');
      setNewPageNumber(prev => prev + 1);
  };

  const handleArticleModalSubmit = () => {
    if (!modalTitle) { alert("Headline is required"); return; }
    const articleData: Article = { id: editArticleId || generateId(), title: modalTitle, subline: modalSubline, author: modalAuthor, content: modalContent, category: modalCategory, publishedAt: new Date().toISOString(), imageUrl: modalImageUrl || 'https://placehold.co/800x400?text=No+Image', status: modalStatus };
    onSaveArticle(articleData);
    setShowArticleModal(false);
  };

  const openCreateArticleModal = () => { setModalMode('create'); setEditArticleId(null); setModalTitle(''); setModalSubline(''); setModalContent(''); setModalImageUrl(''); setModalAuthor('Editor'); setModalStatus(ArticleStatus.PUBLISHED); setShowArticleModal(true); };
  const openEditArticleModal = (article: Article) => { setModalMode('edit'); setEditArticleId(article.id); setModalTitle(article.title); setModalSubline(article.subline || ''); setModalContent(article.content); setModalCategory(article.category); setModalImageUrl(article.imageUrl); setModalAuthor(article.author); setModalStatus(article.status); setShowArticleModal(true); };

  const handleStageMouseDown = (e: React.MouseEvent) => {
      e.preventDefault(); setIsPanning(true); panStartRef.current = { clientX: e.clientX, clientY: e.clientY, originX: editorPos.x, originY: editorPos.y };
  };
  const handleStageMouseMove = (e: React.MouseEvent) => {
      if (isPanning && panStartRef.current) { e.preventDefault(); const deltaX = e.clientX - panStartRef.current.clientX; const deltaY = e.clientY - panStartRef.current.clientY; setEditorPos({ x: panStartRef.current.originX + deltaX, y: panStartRef.current.originY + deltaY }); }
  };
  const handleStageMouseUp = () => { setIsPanning(false); panStartRef.current = null; };

  const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${activeTab === id ? 'text-white border-l-4 border-news-gold bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'}`}><Icon size={18} /><span className="text-xs font-bold uppercase tracking-widest">{label}</span></button>
  );

  return (
    <>
    <ImageGalleryModal isOpen={showImageGallery} onClose={() => setShowImageGallery(false)} onSelectImage={(url) => { setModalImageUrl(url); setShowImageGallery(false); }}/>
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="flex justify-between items-center p-6 border-b border-gray-800"><h1 className="font-serif text-2xl font-bold text-white">Digital Admin</h1><button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24} /></button></div>
          <div className="flex-1 overflow-y-auto py-4"><SidebarItem id="analytics" label="Analytics" icon={BarChart3} /><SidebarItem id="articles" label="Articles" icon={FileText} /><SidebarItem id="epaper" label="E-Paper" icon={Newspaper} /><SidebarItem id="classifieds" label="Classifieds" icon={Tag} /><SidebarItem id="ads" label="Ads" icon={Megaphone} /><SidebarItem id="settings" label="Settings" icon={Settings} /></div>
          <div className="p-6 border-t border-gray-800"><button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center"><Globe size={16} /> View Website</button></div>
      </div>

      <div className="flex-1 flex flex-col md:ml-72 h-full overflow-hidden bg-[#f8f9fa]">
           <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30"><div className="flex items-center gap-3"><button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"><Menu size={24} /></button><h1 className="font-serif text-xl font-bold text-gray-900 capitalize">{activeTab}</h1></div></div>

          <div className="p-4 md:p-8 overflow-y-auto flex-1">
              {activeTab === 'articles' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6"><h1 className="font-serif text-3xl font-bold text-gray-900">Content Library</h1><button onClick={openCreateArticleModal} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> New Article</button></div>
                      <div className="bg-white rounded border overflow-hidden">
                          <table className="w-full text-left">
                              <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase"><tr><th className="px-6 py-4">Title</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                              <tbody className="divide-y">{articles.map(a => (<tr key={a.id} className="hover:bg-gray-50"><td className="px-6 py-4 flex items-center gap-3"><img src={a.imageUrl} className="w-10 h-10 object-cover rounded"/><span className="text-sm font-medium">{a.title}</span></td><td className="px-6 py-4 text-xs font-bold">{a.category}</td><td className="px-6 py-4 text-xs font-bold capitalize">{a.status}</td><td className="px-6 py-4 text-right"><button onClick={() => openEditArticleModal(a)} className="text-blue-600 mr-4"><PenSquare size={16}/></button><button onClick={() => { if(window.confirm('Delete article?')) onDeleteArticle(a.id) }} className="text-red-600"><Trash2 size={16}/></button></td></tr>))}</tbody>
                          </table>
                      </div>
                  </div>
              )}
              {activeTab === 'epaper' && (
                 <div className="max-w-screen-xl mx-auto">
                      <div className="flex justify-between items-center mb-6"><h1 className="font-serif text-3xl font-bold text-gray-900">Digital Archive Management</h1><button onClick={() => { setShowAddPageModal(true); setNewPageImage(''); }} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-800"><Plus size={16} /> Upload Archive Page</button></div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          <div className="lg:col-span-3 bg-white p-5 border rounded-lg h-fit max-h-[75vh] overflow-y-auto">
                              <h3 className="font-bold text-gray-800 border-b pb-2 mb-3 uppercase tracking-widest text-[10px]">Edition Pages</h3>
                              <div className="space-y-2">
                                {ePaperPages.length === 0 && <p className="text-xs text-gray-400 italic">No archive pages found.</p>}
                                {ePaperPages.map(p => (<div key={p.id} className="group relative"><button onClick={() => setActivePageId(p.id)} className={`w-full text-left p-3 rounded text-xs transition-colors ${activePageId === p.id ? 'bg-news-accent/10 text-news-accent font-bold' : 'hover:bg-gray-50'}`}>{p.date} - P.{p.pageNumber}</button><button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete page?')) onDeletePage(p.id); }} className="absolute right-2 top-3 text-gray-400 hover:text-red-600 hidden group-hover:block transition-colors"><Trash2 size={14} /></button></div>))}
                              </div>
                          </div>
                          <div className="lg:col-span-9">
                            {activePage ? (
                                <div className="bg-white p-5 border rounded-lg shadow-sm flex flex-col">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Archive Page View</span>
                                            <div className="flex items-center gap-1 bg-gray-100 rounded p-1 border border-gray-200">
                                                <button onClick={() => setEditorScale(s => Math.max(1, s - 0.5))} className="p-1 hover:bg-gray-200 rounded"><ZoomOut size={14}/></button>
                                                <span className="text-[10px] font-mono w-10 text-center">{Math.round(editorScale * 100)}%</span>
                                                <button onClick={() => setEditorScale(s => Math.min(4, s + 0.5))} className="p-1 hover:bg-gray-200 rounded"><ZoomIn size={14}/></button>
                                                <div className="w-px h-3 bg-gray-300 mx-1"></div>
                                                <button onClick={() => { setEditorScale(1); setEditorPos({x:0, y:0}); }} className="p-1 hover:bg-gray-200 rounded text-gray-500"><RotateCcw size={14}/></button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div 
                                        className={`w-full bg-gray-100 relative overflow-hidden border border-gray-200 rounded flex items-center justify-center h-[65vh] ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                                        onMouseDown={handleStageMouseDown} onMouseMove={handleStageMouseMove} onMouseUp={handleStageMouseUp} onMouseLeave={handleStageMouseUp}
                                    >
                                        <div 
                                            style={{
                                                transform: `translate(${editorPos.x}px, ${editorPos.y}px) scale(${editorScale})`,
                                                transformOrigin: 'center center',
                                                transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.165, 0.84, 0.44, 1)',
                                                display: 'inline-block' 
                                            }}
                                            className="relative"
                                        >
                                            <EPaperViewer 
                                                page={activePage} 
                                                imageClassName="max-h-[60vh] h-auto w-auto max-w-none block" 
                                            />
                                        </div>
                                    </div>
                                    <p className="mt-3 text-[10px] text-gray-400 text-center uppercase tracking-widest italic">Click and drag to explore the archive preview.</p>
                                </div>
                            ) : <div className="h-96 flex flex-col items-center justify-center bg-white border rounded-lg text-gray-400 shadow-sm"><Newspaper size={48} className="mb-4 opacity-10" /><p className="font-bold uppercase tracking-widest text-xs">Select a page to preview</p></div>}
                          </div>
                      </div>
                 </div>
              )}
              {activeTab === 'classifieds' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6"><h1 className="font-serif text-3xl font-bold text-gray-900">Classifieds</h1><button onClick={() => onAddClassified({ id: generateId(), title: "New Ad", category: 'General', content: "", contactInfo: "", postedAt: new Date().toISOString()})} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> Add Listing</button></div>
                      <div className="bg-white rounded border overflow-hidden">
                          <table className="w-full text-left">
                             <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase"><tr><th className="px-6 py-4">Title</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                             <tbody className="divide-y">{classifieds.map(c => <tr key={c.id} className="hover:bg-gray-50"><td className="px-6 py-4 font-medium text-sm">{c.title}</td><td className="px-6 py-4 text-xs font-bold">{c.category}</td><td className="px-6 py-4 text-xs">{c.contactInfo}</td><td className="px-6 py-4 text-right"><button onClick={() => onDeleteClassified(c.id)} className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 size={16}/></button></td></tr>)}</tbody>
                          </table>
                      </div>
                  </div>
              )}
               {activeTab === 'ads' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6"><h1 className="font-serif text-3xl font-bold text-gray-900">Advertising</h1><button onClick={() => onAddAdvertisement({id: generateId(), title: "Banner Ad", size: "RECTANGLE", placement: "GLOBAL", isActive: true, imageUrl: 'https://placehold.co/300x250?text=Ad+Space', linkUrl: '#'})} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> Create Banner</button></div>
                      <div className="bg-white rounded border overflow-hidden">
                           <table className="w-full text-left">
                             <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase"><tr><th className="px-6 py-4">Title</th><th className="px-6 py-4">Dimensions</th><th className="px-6 py-4">Placement</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                             <tbody className="divide-y">{advertisements.map(ad => <tr key={ad.id} className="hover:bg-gray-50"><td className="px-6 py-4 flex items-center gap-3 font-medium text-sm"><img src={ad.imageUrl} className="w-16 h-10 object-cover bg-gray-100 rounded border border-gray-100"/>{ad.title}</td><td className="px-6 py-4 text-[10px] font-mono">{ad.size}</td><td className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">{ad.placement}</td><td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${ad.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{ad.isActive ? 'Active' : 'Draft'}</span></td><td className="px-6 py-4 text-right"><button onClick={() => onDeleteAdvertisement(ad.id)} className="text-red-600 hover:bg-red-50 p-2 rounded transition-colors"><Trash2 size={16}/></button></td></tr>)}</tbody>
                          </table>
                      </div>
                  </div>
              )}
               {activeTab === 'analytics' && <div className="max-w-6xl mx-auto"><AnalyticsDashboard articles={articles} role={ArticleStatus.PUBLISHED as any} /></div>}
               {activeTab === 'settings' && <div className="max-w-6xl mx-auto bg-white p-8 rounded-lg border text-center text-gray-400 font-serif italic">Global site settings module under maintenance.</div>}
          </div>
      </div>

      {/* MODALS */}
      {showArticleModal && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-serif text-xl font-bold text-gray-900">{modalMode === 'create' ? 'Draft New Article' : 'Revise Content'}</h3>
                <button onClick={() => setShowArticleModal(false)} className="text-gray-400 hover:text-black transition-colors"><X size={24}/></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-5">
                        <input type="text" value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} className="w-full p-4 border border-gray-200 rounded-lg text-xl font-serif font-black focus:border-news-black outline-none transition-all" placeholder="Article Headline..."/>
                        <textarea value={modalSubline} onChange={(e) => setModalSubline(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg text-sm italic min-h-[100px] outline-none focus:border-news-black transition-all" placeholder="Context or Summary (Lead Text)..."></textarea>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={modalAuthor} onChange={(e) => setModalAuthor(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg text-sm font-bold uppercase tracking-widest outline-none focus:border-news-black" placeholder="BY AUTHOR NAME"/>
                            <select value={modalCategory} onChange={(e) => setModalCategory(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg text-sm font-bold bg-white outline-none focus:border-news-black">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <div className="border-2 border-dashed border-gray-200 p-5 rounded-xl bg-gray-50 flex flex-col justify-between h-full group hover:border-news-gold transition-colors">
                            {modalImageUrl ? (
                                <div className="relative aspect-video rounded-lg overflow-hidden shadow-lg">
                                    <img src={modalImageUrl} className="w-full h-full object-cover" />
                                    <button onClick={() => setModalImageUrl('')} type="button" className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-red-600 transition-colors z-10"><Trash2 size={16} /></button>
                                </div>
                            ) : (
                                <div className="py-8 text-gray-300 flex flex-col items-center justify-center">
                                    <ImageIcon size={48} className="mb-2 opacity-10" />
                                    <p className="text-[10px] font-black uppercase tracking-widest">Article Cover Image</p>
                                </div>
                            )}
                             <div className="flex gap-3 mt-4">
                                <label className="flex-1 bg-news-black text-white text-[10px] font-black uppercase tracking-widest px-3 py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:bg-gray-800">
                                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                    <span>{isUploading ? 'BUSY' : 'UPLOAD'}</span>
                                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isUploading} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative border border-gray-100 rounded-xl overflow-hidden shadow-inner">
                    <RichTextEditor content={modalContent} onChange={setModalContent} onImageUpload={async (file) => {
                        const { data } = supabase.storage.from('images').getPublicUrl(`content/${generateId()}`);
                        return data.publicUrl;
                    }} className="min-h-[500px]"/>
                </div>
            </div>
            <div className="px-8 py-5 bg-gray-50 border-t flex justify-end gap-4">
              <button onClick={() => setShowArticleModal(false)} className="px-6 py-2 text-sm font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors">Abort</button>
              <button onClick={handleArticleModalSubmit} disabled={isUploading} className="px-10 py-3 bg-news-black text-news-gold rounded-full text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-gray-800 transition-all disabled:opacity-50">Commit Article</button>
            </div>
          </div>
        </div>
      )}

      {showAddPageModal && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200">
                  <h3 className="font-serif text-2xl font-black mb-6 border-b border-gray-100 pb-2">New Digital Page</h3>
                  <div className="space-y-6">
                      <div><label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Issue Date</label><input type="date" value={newPageDate} onChange={e => setNewPageDate(e.target.value)} className="w-full border border-gray-200 p-3 rounded-lg font-mono text-sm outline-none focus:border-news-black"/></div>
                      <div><label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Sequence Number</label><input type="number" value={newPageNumber} onChange={e => setNewPageNumber(Number(e.target.value))} className="w-full border border-gray-200 p-3 rounded-lg font-mono text-sm outline-none focus:border-news-black"/></div>
                      <div><label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Page Scan (High-Res)</label><div className="border-2 border-dashed border-gray-200 p-10 text-center rounded-xl bg-gray-50 group hover:border-news-gold transition-colors">{isPageUploading ? <div className="flex flex-col items-center gap-3"><Loader2 className="animate-spin text-news-gold" /><span className="text-[10px] font-black uppercase tracking-widest">Transferring...</span></div> : newPageImage ? <div className="relative"><img src={newPageImage} className="max-h-48 mx-auto shadow-2xl rounded"/><button onClick={() => setNewPageImage('')} className="bg-red-600 text-white p-2 rounded-full shadow-lg absolute -top-3 -right-3"><X size={14} /></button></div> : <label className="cursor-pointer block"><ImageIcon size={32} className="mx-auto mb-2 opacity-10" /><span className="text-news-accent font-black text-[10px] uppercase tracking-widest">Select File</span><input type="file" accept="image/*" onChange={handleEPaperUpload} className="hidden"/></label>}</div></div>
                  </div>
                  <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100"><button onClick={() => setShowAddPageModal(false)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black">Dismiss</button><button onClick={handleSubmitNewPage} disabled={!newPageImage} className="bg-news-black text-news-gold px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest disabled:opacity-20 shadow-xl transition-all">Add to Archive</button></div>
              </div>
          </div>
      )}
    </div>
    </>
  );
};

export default EditorDashboard;
