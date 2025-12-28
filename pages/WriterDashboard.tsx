
import React, { useState, useEffect } from 'react';
import { Article, ArticleStatus, UserRole, TrustedDevice } from '../types';
import { PenTool, CheckCircle, Save, FileText, Clock, AlertCircle, Plus, Layout, ChevronDown, ChevronUp, LogOut, Inbox, Settings, Menu, X, Eye, PenSquare, Trash2, Globe, Image as ImageIcon, Upload, ShieldCheck, Monitor, Smartphone, Tablet, User, BarChart3, Loader2, Lock } from 'lucide-react';
import { generateId } from '../utils';
import RichTextEditor from '../components/RichTextEditor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { supabase } from '../supabaseClient';

interface WriterDashboardProps {
  onSave: (article: Article) => void;
  existingArticles: Article[];
  currentUserRole: UserRole;
  categories: string[];
  onNavigate: (path: string) => void;
  userAvatar?: string | null;
}

const WriterDashboard: React.FC<WriterDashboardProps> = ({ onSave, existingArticles, currentUserRole, categories, onNavigate, userAvatar }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'analytics' | 'inbox' | 'settings'>('articles');
  
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subline, setSubline] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0] || 'General');
  const [author, setAuthor] = useState('Staff Writer');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<ArticleStatus>(ArticleStatus.DRAFT);
  const [isUploading, setIsUploading] = useState(false);
  const [wordCount, setWordCount] = useState(0);

  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [devices, setDevices] = useState<TrustedDevice[]>([]);

  const myArticles = existingArticles;

  useEffect(() => {
      const text = content.replace(/<[^>]*>/g, ' '); 
      const count = text.trim().split(/\s+/).filter(w => w.length > 0).length;
      setWordCount(count);
  }, [content]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${generateId()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } catch (error: any) {
      console.error('Storage error:', error.message);
      alert("Storage Error: Make sure the 'images' bucket is created in Supabase with public access.");
    } finally {
      setIsUploading(false);
    }
  };

  const openNewArticle = () => {
      setActiveArticleId(null);
      setTitle('');
      setSubline('');
      setContent('');
      setCategory(categories[0]);
      setAuthor('Staff Writer');
      setImageUrl('');
      setStatus(ArticleStatus.DRAFT);
      setShowEditorModal(true);
  };

  const openEditArticle = (article: Article) => {
      setActiveArticleId(article.id);
      setTitle(article.title);
      setSubline(article.subline || '');
      setContent(article.content);
      setCategory(article.category);
      setAuthor(article.author);
      setImageUrl(article.imageUrl);
      setStatus(article.status);
      setShowEditorModal(true);
  };

  const handleSave = () => {
    if (!title) { alert("Headline is required"); return; }
    const newArticle: Article = {
      id: activeArticleId || generateId(),
      title, 
      subline,
      author, 
      content, 
      category,
      imageUrl: imageUrl || `https://picsum.photos/800/400?random=${Math.floor(Math.random() * 1000)}`,
      publishedAt: new Date().toISOString(),
      status: status
    };
    onSave(newArticle);
    setShowEditorModal(false);
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <div className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
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
              <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center mb-2">
                  <Globe size={16} /> View Website
              </button>
              <button onClick={() => { supabase.auth.signOut(); onNavigate('/login'); }} className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center">
                  <LogOut size={16} /> Logout
              </button>
          </div>
      </div>

      <div className="flex-1 flex flex-col md:ml-72 h-full overflow-hidden bg-[#f8f9fa]">
           <div className="md:p-8 overflow-y-auto flex-1 p-4">
              {activeTab === 'articles' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <h1 className="font-serif text-3xl font-bold text-gray-900">Articles</h1>
                           <button onClick={openNewArticle} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2">
                               <Plus size={16} /> Add New
                           </button>
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
                                    {myArticles.map((article) => (
                                        <tr key={article.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <span className="font-medium text-gray-900 text-sm">{article.title}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold">{article.category}</td>
                                            <td className="px-6 py-4 text-xs">
                                                <span className={`px-2 py-1 rounded ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{article.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => openEditArticle(article)} className="text-blue-600 hover:underline text-xs font-bold">Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                          </table>
                      </div>
                  </div>
              )}
           </div>
      </div>

      {showEditorModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold">{activeArticleId ? 'Edit Article' : 'New Article'}</h3>
                <button onClick={() => setShowEditorModal(false)}><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif" placeholder="Headline"/>
                <input type="text" value={subline} onChange={(e) => setSubline(e.target.value)} className="w-full p-2 border rounded text-sm italic" placeholder="Summary"/>
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Author"/>
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded text-sm">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="border-2 border-dashed p-4 rounded bg-gray-50 text-center">
                    {imageUrl ? <img src={imageUrl} className="h-32 mx-auto mb-2 rounded" /> : <ImageIcon size={32} className="mx-auto text-gray-300 mb-2" />}
                    <input type="file" onChange={handleImageUpload} className="hidden" id="img-up" />
                    <label htmlFor="img-up" className="cursor-pointer text-xs font-bold text-blue-600">{isUploading ? 'Uploading...' : 'Upload Image'}</label>
                </div>
                <RichTextEditor content={content} onChange={setContent} className="h-64"/>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button onClick={() => setShowEditorModal(false)} className="px-5 py-2 text-sm font-bold">Cancel</button>
              <button onClick={handleSave} disabled={isUploading} className="px-6 py-2 bg-green-600 text-white rounded text-sm font-bold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WriterDashboard;
