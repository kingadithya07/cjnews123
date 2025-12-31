
import React, { useState, useEffect } from 'react';
import { Article, ArticleStatus, UserRole, TrustedDevice } from '../types';
import { PenTool, CheckCircle, Save, FileText, Clock, AlertCircle, Plus, Layout, ChevronDown, ChevronUp, LogOut, Inbox, Settings, Menu, X, Eye, PenSquare, Trash2, Globe, Image as ImageIcon, Upload, ShieldCheck, Monitor, Smartphone, Tablet, User as UserIcon, BarChart3, Loader2, Lock, Library, Check, Camera } from 'lucide-react';
import { generateId } from '../utils';
import RichTextEditor from '../components/RichTextEditor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { supabase } from '../supabaseClient';
import ImageGalleryModal from '../components/ImageGalleryModal';

interface WriterDashboardProps {
  onSave: (article: Article) => void;
  existingArticles: Article[];
  currentUserRole: UserRole;
  categories: string[];
  onNavigate: (path: string) => void;
  userAvatar?: string | null;
  userName?: string | null;
}

const WriterDashboard: React.FC<WriterDashboardProps> = ({ onSave, existingArticles, currentUserRole, categories, onNavigate, userAvatar, userName }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'articles' | 'analytics' | 'settings'>('articles');
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [subline, setSubline] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0] || 'General');
  const [author, setAuthor] = useState(userName || 'Staff Writer');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<ArticleStatus>(ArticleStatus.DRAFT);
  const [isUploading, setIsUploading] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);

  // Settings State
  const [profileName, setProfileName] = useState(userName || '');
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  useEffect(() => {
    if (content) {
      const text = content.replace(/<[^>]*>/g, '').trim();
      const count = text ? text.split(/\s+/).length : 0;
      setWordCount(count);
    } else {
      setWordCount(0);
    }
  }, [content]);

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
      setImageUrl(data.publicUrl);
    } catch (error: any) {
      console.error('Upload Error:', error.message);
      alert("Failed to upload image.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAvatarUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `avatars/${generateId()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        setProfileAvatar(data.publicUrl);
    } catch (error: any) {
        alert("Avatar Upload Failed: " + error.message);
    } finally {
        setIsAvatarUploading(false);
    }
  };

  const handleContentImageUpload = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${generateId()}.${fileExt}`;
    const filePath = `content/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
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
      imageUrl: imageUrl || 'https://picsum.photos/800/400',
      publishedAt: new Date().toISOString(),
      status: status
    };
    onSave(newArticle);
    setShowEditorModal(false);
  };

  const openNewArticle = () => {
      setActiveArticleId(null); setTitle(''); setSubline(''); setContent(''); setImageUrl(''); setStatus(ArticleStatus.DRAFT); setShowEditorModal(true);
  };

  const openEditArticle = (article: Article) => {
      setActiveArticleId(article.id); setTitle(article.title); setSubline(article.subline || ''); setContent(article.content); setCategory(article.category); setImageUrl(article.imageUrl); setStatus(article.status); setAuthor(article.author); setShowEditorModal(true);
  };

  const handleSelectFromGallery = (url: string) => {
    setImageUrl(url);
    setShowImageGallery(false);
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const updates: any = { 
        data: { 
          full_name: profileName,
          avatar_url: profileAvatar
        } 
      };
      if (newPassword) {
        updates.password = newPassword;
      }
      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      alert("Settings updated successfully!");
      setNewPassword('');
    } catch (err: any) {
      alert("Error updating profile: " + err.message);
    } finally {
      setIsSavingSettings(false);
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
                           <h1 className="font-serif text-3xl font-bold text-gray-900">My Articles</h1>
                           <button onClick={openNewArticle} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2"><Plus size={16} /> Add New</button>
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
                                    {existingArticles.map((article) => (
                                        <tr key={article.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4"><span className="font-medium text-gray-900 text-sm">{article.title}</span></td>
                                            <td className="px-6 py-4 text-xs font-bold">{article.category}</td>
                                            <td className="px-6 py-4 text-xs font-bold">
                                                <span className={`px-2 py-1 rounded ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{article.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => openEditArticle(article)} className="text-blue-600 font-bold text-xs uppercase">Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                          </table>
                      </div>
                  </div>
              )}
              {activeTab === 'analytics' && <div className="max-w-6xl mx-auto"><AnalyticsDashboard articles={existingArticles} role={ArticleStatus.PUBLISHED as any} /></div>}
              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-12 pb-20 pt-4">
                      <div className="bg-white rounded-xl border p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><UserIcon className="text-news-gold" /> Profile Settings</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Display Name</label>
                                    <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Avatar</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                            {profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-3 text-gray-300" />}
                                        </div>
                                        <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                                            {isAvatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                            Upload Image
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isAvatarUploading} />
                                        </label>
                                    </div>
                                    <input type="text" value={profileAvatar} onChange={e => setProfileAvatar(e.target.value)} className="w-full mt-2 p-2 border border-gray-200 rounded-lg text-xs text-gray-500 outline-none" placeholder="Or paste image URL..." />
                                </div>
                             </div>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Change Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" placeholder="New Password" />
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full bg-news-black text-news-gold py-3 rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg">
                                        {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                                        {isSavingSettings ? 'Saving...' : 'Update Profile'}
                                    </button>
                                </div>
                             </div>
                          </div>
                      </div>
                  </div>
              )}
           </div>
      </div>

      {showEditorModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold">{activeArticleId ? 'Edit Draft' : 'New Article Draft'}</h3>
                <button onClick={() => setShowEditorModal(false)}><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif" placeholder="Headline"/>
                        <textarea value={subline} onChange={(e) => setSubline(e.target.value)} className="w-full p-2 border rounded text-sm italic min-h-[80px]" placeholder="Summary / Sub-headline..."></textarea>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Author Name, Title"/>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded text-sm bg-white">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <div className="border-2 border-dashed p-4 rounded bg-gray-50 text-center relative overflow-hidden h-full flex flex-col justify-between">
                            {imageUrl ? (
                                <div className="relative group aspect-video">
                                    <img src={imageUrl} className="w-full h-full object-cover rounded shadow" />
                                    <button onClick={() => setImageUrl('')} type="button" className="absolute top-1 right-1 bg-black/40 text-white p-1 rounded-full hover:bg-red-600 transition-colors z-10" title="Remove image">
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
                  <RichTextEditor content={content} onChange={setContent} className="min-h-[400px]" onImageUpload={handleContentImageUpload} />
                  <div className="absolute bottom-2 right-3 bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded">
                      {wordCount} Words
                  </div>
                </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
              <button onClick={() => setShowEditorModal(false)} className="px-5 py-2 text-sm font-bold">Cancel</button>
              <button onClick={handleSave} disabled={isUploading} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold shadow hover:bg-gray-800 disabled:opacity-50">
                  {isUploading ? 'Uploading...' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default WriterDashboard;
