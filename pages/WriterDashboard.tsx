
import React, { useState, useEffect } from 'react';
import { Article, ArticleStatus, UserRole, TrustedDevice } from '../types';
import { PenTool, CheckCircle, Save, FileText, Clock, AlertCircle, Plus, Layout, ChevronDown, ChevronUp, LogOut, Inbox, Settings, Menu, X, Eye, EyeOff, PenSquare, Trash2, Globe, Image as ImageIcon, Upload, ShieldCheck, Monitor, Smartphone, Tablet, User as UserIcon, BarChart3, Loader2, Lock, Library, Check, Camera, Star, Tag, Award, Sparkles, Key, Mail, ShieldAlert } from 'lucide-react';
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
  userEmail?: string | null;
  devices?: TrustedDevice[];
  onRevokeDevice?: (id: string) => void;
  userId?: string | null;
  activeVisitors?: number;
}

const WriterDashboard: React.FC<WriterDashboardProps> = ({ 
    onSave, onDelete, existingArticles, currentUserRole, categories, onNavigate, userAvatar, userName, userEmail,
    devices = [], onRevokeDevice, userId, activeVisitors
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
  const [wordCount, setWordCount] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string>(new Date().toISOString());
  
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Settings State
  const [profileName, setProfileName] = useState(userName || '');
  const [profileEmail, setProfileEmail] = useState(userEmail || '');
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isSavingDevices, setIsSavingDevices] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Identify Current Device & Status
  const currentDevice = devices.find(d => d.isCurrent);
  const isPrimaryDevice = currentDevice?.isPrimary || false;

  // Sync profile state when props arrive
  useEffect(() => {
      if (userName && !profileName) setProfileName(userName);
      if (userEmail && !profileEmail) setProfileEmail(userEmail);
      if (userAvatar && !profileAvatar) setProfileAvatar(userAvatar);
  }, [userName, userEmail, userAvatar]);

  useEffect(() => {
      const storedKey = localStorage.getItem('newsroom_custom_api_key');
      if (storedKey) setCustomApiKey(storedKey);
  }, []);

  const handleSaveApiKey = () => {
      localStorage.setItem('newsroom_custom_api_key', customApiKey);
      setShowKeyInput(false);
      alert("API Key saved locally.");
  };

  const myArticles = userId 
    ? existingArticles.filter(a => a.userId === userId)
    : existingArticles;

  useEffect(() => {
    if (content) {
      const text = content.replace(/<[^>]*>/g, '').trim();
      const count = text ? text.split(/\s+/).length : 0;
      setWordCount(count);
    } else {
      setWordCount(0);
    }
  }, [content]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAvatarUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const folderPrefix = userId ? `users/${userId}/` : '';
        const fileName = `${folderPrefix}avatars/${generateId()}.${fileExt}`;
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
    const folderPrefix = userId ? `users/${userId}/` : '';
    const filePath = `${folderPrefix}articles/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('images').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleTranslateTitle = async () => {
      if (!title) return;
      const keyToUse = customApiKey;
      if (!keyToUse) {
          const proceed = confirm("Translation requires a third-party API Key. Would you like to configure it now in Settings?");
          if (proceed) { setShowEditorModal(false); setActiveTab('settings'); }
          return;
      }
      setIsTranslating(true);
      try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: `Translate this news headline to concise English for SEO purposes. Return only the translated string, no quotes: "${title}"` }] }] })
          });
          const data = await response.json();
          const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (translated) setEnglishTitle(translated);
      } catch (e: any) {
          alert(`Auto-translation failed: ${e.message}.`);
      } finally {
          setIsTranslating(false);
      }
  };

  const handleAddTag = () => {
      if (!tagInput.trim()) return;
      const newTag = tagInput.trim();
      if (!tags.includes(newTag)) setTags([...tags, newTag]);
      setTagInput('');
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
  };

  const removeTag = (tagToRemove: string) => { setTags(tags.filter(t => t !== tagToRemove)); };

  const handleSave = () => {
    if (!title) { alert("Headline is required"); return; }
    let finalTags = [...tags];
    if (tagInput.trim()) {
        const pendingTag = tagInput.trim();
        if (!finalTags.includes(pendingTag)) finalTags.push(pendingTag);
    }
    if (selectedCategories && selectedCategories.length > 0) {
        selectedCategories.forEach(cat => {
            if (!finalTags.includes(cat)) finalTags.push(cat);
        });
    }
    const newArticle: Article = {
      id: activeArticleId || generateId(),
      userId: userId || undefined, 
      title, englishTitle, subline, author, content, 
      categories: selectedCategories.length > 0 ? selectedCategories : ['General'],
      tags: finalTags,
      imageUrl: imageUrl || 'https://picsum.photos/800/400',
      publishedAt: publishedAt,
      status: status,
      isFeatured: isFeatured,
      isEditorsChoice: false,
      authorAvatar: profileAvatar || undefined 
    };
    onSave(newArticle);
    setShowEditorModal(false);
    setTagInput('');
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this article?")) { if (onDelete) onDelete(id); }
  };

  const openNewArticle = () => {
      setActiveArticleId(null); setTitle(''); setEnglishTitle(''); setSubline(''); setContent(''); setImageUrl(''); setStatus(ArticleStatus.DRAFT); setIsFeatured(false); setSelectedCategories(['General']); setTags([]); setTagInput(''); setPublishedAt(new Date().toISOString()); setShowEditorModal(true);
  };

  const openEditArticle = (article: Article) => {
      setActiveArticleId(article.id); setTitle(article.title); setEnglishTitle(article.englishTitle || ''); setSubline(article.subline || ''); setContent(article.content); setSelectedCategories(article.categories); setTags(article.tags || []); setTagInput(''); setImageUrl(article.imageUrl); setStatus(article.status); setAuthor(article.author); setIsFeatured(article.isFeatured || false); setPublishedAt(article.publishedAt); setShowEditorModal(true);
  };

  const handleSelectFromGallery = (url: string) => { setImageUrl(url); setShowImageGallery(false); };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const updates: any = { 
        data: { 
            full_name: profileName.trim(), 
            avatar_url: profileAvatar.trim() 
        } 
      };
      
      if (newPassword) updates.password = newPassword;
      
      // Robust Email Detection
      const cleanNewEmail = profileEmail.trim().toLowerCase();
      const cleanOldEmail = (userEmail || '').trim().toLowerCase();

      if (cleanNewEmail && cleanNewEmail !== cleanOldEmail) {
          updates.email = cleanNewEmail;
      }

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      
      if (updates.email) {
          alert(`Settings updated! A confirmation link has been sent to ${cleanNewEmail}. Note: your email will not update until confirmed.`);
      } else {
          alert("Settings updated successfully!");
      }
      setNewPassword('');
    } catch (err: any) {
      alert("Error updating profile: " + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const SidebarItem = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
    <button onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 transition-colors ${activeTab === id ? 'text-white border-l-4 border-news-gold bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'}`}>
        <Icon size={18} />
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <>
    <ImageGalleryModal isOpen={showImageGallery} onClose={() => setShowImageGallery(false)} onSelectImage={handleSelectFromGallery} uploadFolder="articles" userId={userId} />
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
              <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center mb-2"><Globe size={16} /> View Website</button>
              <button onClick={() => { supabase.auth.signOut(); onNavigate('/login'); }} className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center"><LogOut size={16} /> Logout</button>
          </div>
      </div>

      <div className="flex-1 flex flex-col md:ml-64 h-full overflow-hidden bg-[#f8f9fa]">
           <div className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center shrink-0 sticky top-0 z-40 shadow-sm">
                <button onClick={() => setIsSidebarOpen(true)} className="text-gray-700"><Menu size={24}/></button>
                <h1 className="font-serif text-lg font-bold text-gray-900">Writer Dashboard</h1>
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                     {userAvatar ? <img src={userAvatar} className="w-full h-full object-cover"/> : <UserIcon className="p-1.5 text-gray-400 w-full h-full"/>}
                </div>
           </div>

           <div className="md:p-6 overflow-y-auto flex-1 p-4">
              {activeTab === 'articles' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900">My Articles</h1>
                           <button onClick={openNewArticle} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2">
                                <Plus size={16} /> <span>Add New</span>
                           </button>
                      </div>
                      <div className="bg-white rounded border overflow-x-auto">
                          <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Title</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {myArticles.map((article) => (
                                        <tr key={article.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4"><span className="font-medium text-gray-900 text-sm">{article.title}</span></td>
                                            <td className="px-6 py-4 text-xs font-bold"><span className={`px-2 py-1 rounded ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{article.status}</span></td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => openEditArticle(article)} className="text-blue-600 font-bold text-xs uppercase hover:text-blue-800">Edit</button>
                                                    {onDelete && <button onClick={() => handleDelete(article.id)} className="text-red-500 font-bold text-xs uppercase hover:text-red-700">Delete</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                          </table>
                      </div>
                  </div>
              )}
              {activeTab === 'analytics' && <div className="max-w-6xl mx-auto"><AnalyticsDashboard articles={myArticles} role={ArticleStatus.PUBLISHED as any} activeVisitors={activeVisitors} /></div>}
              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-12 pb-20 pt-4">
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm relative overflow-hidden">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><UserIcon className="text-news-gold" /> Profile Settings</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Display Name</label>
                                    <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full pl-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black font-medium" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Avatar</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                                            {profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-3 text-gray-300" />}
                                        </div>
                                        <label className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                                            {isAvatarUploading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                                            <span>Upload Image</span>
                                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={isAvatarUploading} />
                                        </label>
                                    </div>
                                </div>
                             </div>
                             <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Change Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-3.5 text-gray-400" size={16} />
                                        <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 pr-10 p-3 border border-gray-200 rounded-lg outline-none focus:border-news-black" placeholder="New Password" disabled={!isPrimaryDevice}/>
                                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400" disabled={!isPrimaryDevice}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
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
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-900">{activeArticleId ? 'Edit Draft' : 'New Article Draft'}</h3>
                <button onClick={() => setShowEditorModal(false)} className="p-2 -mr-2 text-gray-500 hover:text-black"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif" placeholder="Headline"/>
                        <div className="flex items-center gap-2">
                            <input type="text" value={englishTitle} onChange={(e) => setEnglishTitle(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="English Title (SEO)" />
                            <button onClick={handleTranslateTitle} disabled={isTranslating} className="bg-news-gold text-black p-2 rounded hover:bg-yellow-500 transition-colors flex items-center gap-1">
                                {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            </button>
                        </div>
                        <RichTextEditor content={content} onChange={setContent} onImageUpload={handleContentImageUpload} className="min-h-[400px]" userId={userId} uploadFolder="articles" />
                    </div>
                </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowEditorModal(false)} className="px-5 py-2 text-sm font-bold text-gray-600">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold shadow hover:bg-gray-800">Save Draft</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default WriterDashboard;
