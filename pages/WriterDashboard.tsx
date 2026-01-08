
import React, { useState, useEffect } from 'react';
import { Article, ArticleStatus, UserRole, TrustedDevice } from '../types';
import { PenTool, CheckCircle, Save, FileText, Clock, AlertCircle, Plus, Layout, ChevronDown, ChevronUp, LogOut, Inbox, Settings, Menu, X, Eye, PenSquare, Trash2, Globe, Image as ImageIcon, Upload, ShieldCheck, Monitor, Smartphone, Tablet, User as UserIcon, BarChart3, Loader2, Lock, Library, Check, Camera, Star, Tag, Award, Sparkles, Key } from 'lucide-react';
import { generateId } from '../utils';
import RichTextEditor from '../components/RichTextEditor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { supabase } from '../supabaseClient';
import ImageGalleryModal from '../components/ImageGalleryModal';
import CategorySelector from '../components/CategorySelector';

interface WriterDashboardProps {
  onSave: (article: Article) => void;
  onDelete?: (id: string) => void;
  existingArticles: Article[];
  currentUserRole: UserRole;
  categories: string[];
  onNavigate: (path: string) => void;
  userAvatar?: string | null;
  userName?: string | null;
  devices?: TrustedDevice[];
  onRevokeDevice?: (id: string) => void;
  userId?: string | null;
}

const WriterDashboard: React.FC<WriterDashboardProps> = ({ 
    onSave, onDelete, existingArticles = [], currentUserRole, categories = [], onNavigate, userAvatar, userName,
    devices = [], onRevokeDevice, userId
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'analytics' | 'settings'>('articles');
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [englishTitle, setEnglishTitle] = useState('');
  const [subline, setSubline] = useState('');
  const [content, setContent] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [author, setAuthor] = useState(userName || 'Staff Writer');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<ArticleStatus>(ArticleStatus.DRAFT);
  const [isFeatured, setIsFeatured] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string>(new Date().toISOString());
  const [wordCount, setWordCount] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  const [profileName, setProfileName] = useState(userName || '');
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
      const storedKey = localStorage.getItem('newsroom_custom_api_key');
      if (storedKey) setCustomApiKey(storedKey);
  }, []);

  const handleSaveApiKey = () => {
      localStorage.setItem('newsroom_custom_api_key', customApiKey);
      setShowKeyInput(false);
      alert("API Key saved locally.");
  };

  const myArticles = (existingArticles || []).filter(a => !userId || a.userId === userId);

  useEffect(() => {
    if (content) {
      const text = String(content).replace(/<[^>]*>/g, '').trim();
      setWordCount(text ? text.split(/\s+/).length : 0);
    } else setWordCount(0);
  }, [content]);

  const handleSave = () => {
    if (!title) { alert("Headline is required"); return; }
    onSave({
      id: activeArticleId || generateId(),
      userId: userId || undefined,
      title, englishTitle, subline, author, content, 
      categories: selectedCategories.length > 0 ? selectedCategories : ['General'],
      imageUrl: imageUrl || 'https://picsum.photos/800/400',
      publishedAt: publishedAt,
      status: status, isFeatured: isFeatured, isEditorsChoice: false,
      authorAvatar: profileAvatar || undefined 
    });
    setShowEditorModal(false);
  };

  const openNewArticle = () => {
      setActiveArticleId(null); setTitle(''); setEnglishTitle(''); setSubline(''); setContent(''); setImageUrl(''); setStatus(ArticleStatus.DRAFT); setIsFeatured(false); setSelectedCategories(['General']); setPublishedAt(new Date().toISOString()); setShowEditorModal(true);
  };

  const openEditArticle = (article: Article) => {
      setActiveArticleId(article.id); setTitle(article.title); setEnglishTitle(article.englishTitle || ''); setSubline(article.subline || ''); setContent(article.content); setSelectedCategories(article.categories || ['General']); setImageUrl(article.imageUrl); setStatus(article.status); setAuthor(article.author); setIsFeatured(article.isFeatured || false); setPublishedAt(article.publishedAt); setShowEditorModal(true);
  };

  const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
        className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${activeTab === id ? 'text-white border-l-4 border-news-gold bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'}`}>
        <Icon size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <>
    <ImageGalleryModal isOpen={showImageGallery} onClose={() => setShowImageGallery(false)} onSelectImage={url => { setImageUrl(url); setShowImageGallery(false); }} uploadFolder="articles" userId={userId} />
    <CategorySelector isOpen={showCategorySelector} onClose={() => setShowCategorySelector(false)} options={categories} selected={selectedCategories} onChange={setSelectedCategories} />
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h1 className="font-serif text-2xl font-bold text-white">Writer</h1>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><X size={24} /></button>
          </div>
          <div className="flex-1 overflow-y-auto py-4">
              <SidebarItem id="articles" label="Articles" icon={FileText} />
              <SidebarItem id="analytics" label="Analytics" icon={BarChart3} />
              <SidebarItem id="settings" label="Settings" icon={Settings} />
          </div>
          <div className="p-6 border-t border-gray-800">
              <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded justify-center mb-2"><Globe size={16} /> Website</button>
              <button onClick={() => { supabase.auth.signOut(); onNavigate('/login'); }} className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center"><LogOut size={16} /> Logout</button>
          </div>
      </div>
      <div className="flex-1 flex flex-col md:ml-64 h-full overflow-hidden bg-[#f8f9fa]">
           <div className="md:p-6 overflow-y-auto flex-1 p-4">
              {activeTab === 'articles' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">Article Manager</h1>
                           <button onClick={openNewArticle} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> Add New Article</button>
                      </div>
                      <div className="bg-white rounded border overflow-x-auto">
                          <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                    <tr><th className="px-6 py-4">Title</th><th className="px-6 py-4">Categories</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {myArticles.map((article) => (
                                        <tr key={article.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4"><span className="font-medium text-gray-900 text-sm">{article.title}</span></td>
                                            <td className="px-6 py-4">{(article.categories || []).map(cat => <span key={cat} className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-full text-gray-600 uppercase mr-1">{cat}</span>)}</td>
                                            <td className="px-6 py-4 text-xs font-bold"><span className={`px-2 py-1 rounded ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{article.status}</span></td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => openEditArticle(article)} className="text-blue-600 font-bold text-xs uppercase hover:text-blue-800 mr-4">Edit</button>
                                                {onDelete && <button onClick={() => { if(confirm("Delete this article?")) onDelete(article.id); }} className="text-red-500 font-bold text-xs uppercase hover:text-red-700">Delete</button>}
                                            </td>
                                        </tr>
                                    ))}
                                    {myArticles.length === 0 && <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-400">No articles yet.</td></tr>}
                                </tbody>
                          </table>
                      </div>
                  </div>
              )}
              {activeTab === 'analytics' && <AnalyticsDashboard articles={myArticles} role={UserRole.WRITER} />}
              {activeTab === 'settings' && <div className="max-w-4xl mx-auto p-4">Staff Profile Settings...</div>}
           </div>
      </div>
      {showEditorModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-900">{activeArticleId ? 'Update Report' : 'New Dispatch'}</h3>
                <button onClick={() => setShowEditorModal(false)} className="p-2 text-gray-500 hover:text-black"><X size={20}/></button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif" placeholder="Headline"/>
                        <textarea value={subline} onChange={e => setSubline(e.target.value)} className="w-full p-2 border rounded text-sm italic min-h-[80px]" placeholder="Brief Summary..."></textarea>
                        <button onClick={() => setShowCategorySelector(true)} className="w-full p-2 border rounded text-sm bg-white text-left flex justify-between items-center">
                            <span className={selectedCategories.length === 0 ? 'text-gray-400' : ''}>{selectedCategories.length === 0 ? 'Select Section' : `${selectedCategories.length} Selected`}</span>
                            <ChevronDown size={14} />
                        </button>
                    </div>
                    <div className="md:col-span-1">
                        <div className="border-2 border-dashed p-4 rounded bg-gray-50 text-center h-[180px] flex flex-col justify-center items-center">
                            {imageUrl ? <img src={imageUrl} className="max-h-full rounded" /> : <p className="text-xs text-gray-400">Featured Image Awaited</p>}
                            <button onClick={() => setShowImageGallery(true)} className="mt-2 text-xs font-bold uppercase text-news-accent hover:underline">Pick Image</button>
                        </div>
                    </div>
                </div>
                <RichTextEditor content={content} onChange={setContent} onImageUpload={async () => ''} className="min-h-[300px]" />
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowEditorModal(false)} className="px-5 py-2 text-sm font-bold text-gray-600">Cancel</button>
              <button onClick={handleSave} className="px-8 py-2 bg-news-black text-white rounded text-sm font-black uppercase tracking-widest shadow-lg">Save Article</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default WriterDashboard;
