
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
  userId?: string | null; // Passed for data isolation
}

const WriterDashboard: React.FC<WriterDashboardProps> = ({ 
    onSave, onDelete, existingArticles, currentUserRole, categories, onNavigate, userAvatar, userName,
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
  const [wordCount, setWordCount] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string>(new Date().toISOString());

  // Settings State
  const [profileName, setProfileName] = useState(userName || '');
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isSavingDevices, setIsSavingDevices] = useState(false);
  
  // Custom API State
  const [customApiKey, setCustomApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Load custom key on mount
  useEffect(() => {
      const storedKey = localStorage.getItem('newsroom_custom_api_key');
      if (storedKey) setCustomApiKey(storedKey);
  }, []);

  const handleSaveApiKey = () => {
      localStorage.setItem('newsroom_custom_api_key', customApiKey);
      setShowKeyInput(false);
      alert("API Key saved locally.");
  };

  // Filter articles for this writer only if userId is provided
  // If no userId provided (rare), fallback to showing all or empty to be safe
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
    // Store content images in dedicated 'articles' folder, isolated by user
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
          if (proceed) {
              setShowEditorModal(false);
              setActiveTab('settings');
          }
          return;
      }

      setIsTranslating(true);
      try {
          // Direct fetch to Gemini API to avoid SDK dependency
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyToUse}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  contents: [{
                      parts: [{
                          text: `Translate this news headline to concise English for SEO purposes. Return only the translated string, no quotes: "${title}"`
                      }]
                  }]
              })
          });

          const data = await response.json();
          
          if (data.error) {
              throw new Error(data.error.message || "API Error");
          }

          const translated = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (translated) {
              setEnglishTitle(translated);
          } else {
              throw new Error("No translation returned.");
          }
      } catch (e: any) {
          console.error("Translation failed", e);
          alert(`Auto-translation failed: ${e.message}. Please enter manually or check your API Key.`);
      } finally {
          setIsTranslating(false);
      }
  };

  const handleSave = () => {
    if (!title) { alert("Headline is required"); return; }
    const newArticle: Article = {
      id: activeArticleId || generateId(),
      userId: userId || undefined, // Associate article with current user
      title, 
      englishTitle,
      subline,
      author, 
      content, 
      categories: selectedCategories.length > 0 ? selectedCategories : ['General'],
      imageUrl: imageUrl || 'https://picsum.photos/800/400',
      publishedAt: publishedAt, // Preserve original date
      status: status,
      isFeatured: isFeatured,
      isEditorsChoice: false, // Removed from UI, default false
      authorAvatar: profileAvatar || undefined 
    };
    onSave(newArticle);
    setShowEditorModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this article?")) {
        if (onDelete) onDelete(id);
    }
  };

  const openNewArticle = () => {
      setActiveArticleId(null); setTitle(''); setEnglishTitle(''); setSubline(''); setContent(''); setImageUrl(''); setStatus(ArticleStatus.DRAFT); setIsFeatured(false); setSelectedCategories(['General']); setPublishedAt(new Date().toISOString()); setShowEditorModal(true);
  };

  const openEditArticle = (article: Article) => {
      setActiveArticleId(article.id); setTitle(article.title); setEnglishTitle(article.englishTitle || ''); setSubline(article.subline || ''); setContent(article.content); setSelectedCategories(article.categories); setImageUrl(article.imageUrl); setStatus(article.status); setAuthor(article.author); setIsFeatured(article.isFeatured || false); setPublishedAt(article.publishedAt); setShowEditorModal(true);
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

  const handleForceSaveDevices = async () => {
      setIsSavingDevices(true);
      try {
          // Sync logic is handled via App.tsx usually, but this triggers a simple alert in this mocked version
          alert("Device list synced globally.");
      } catch (e: any) {
          alert("Error syncing: " + e.message);
      } finally {
          setIsSavingDevices(false);
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
        uploadFolder="articles"
        userId={userId} // Pass userId for isolation
    />
    <CategorySelector 
        isOpen={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        options={categories}
        selected={selectedCategories}
        onChange={setSelectedCategories}
    />
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Optimized Sidebar for Desktop (w-64 instead of w-72) */}
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
              <button onClick={() => onNavigate('/')} className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center mb-2">
                  <Globe size={16} /> View Website
              </button>
              <button onClick={() => { supabase.auth.signOut(); onNavigate('/login'); }} className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded transition-colors justify-center">
                  <LogOut size={16} /> Logout
              </button>
          </div>
      </div>

      {/* Main Content Area - Optimized margins and padding */}
      <div className="flex-1 flex flex-col md:ml-64 h-full overflow-hidden bg-[#f8f9fa]">
           {/* Mobile Header */}
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
                           <h1 className="font-serif text-2xl md:text-3xl font-bold text-gray-900 hidden md:block">My Articles</h1>
                           <h1 className="font-serif text-xl font-bold text-gray-900 md:hidden">My Articles</h1>
                           <button onClick={openNewArticle} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2">
                                <Plus size={16} /> <span className="hidden md:inline">Add New</span><span className="md:hidden">New</span>
                           </button>
                      </div>

                      {/* Mobile Card View (Optimized) */}
                      <div className="grid grid-cols-1 gap-4 md:hidden">
                           {myArticles.map(article => (
                               <div key={article.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                   <div className="flex p-3 gap-3">
                                       {/* Thumbnail */}
                                       <div className="w-20 h-20 bg-gray-100 rounded-md shrink-0 overflow-hidden relative">
                                           <img src={article.imageUrl} className="w-full h-full object-cover" alt={article.title} />
                                           {article.isFeatured && (
                                              <div className="absolute top-0 right-0 bg-news-accent text-white p-0.5 rounded-bl-md shadow-sm">
                                                  <Star size={10} fill="currentColor" />
                                              </div>
                                           )}
                                       </div>
                                       
                                       {/* Content */}
                                       <div className="flex-1 min-w-0 flex flex-col justify-between">
                                           <div>
                                               <div className="flex items-center gap-2 mb-1">
                                                   <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                       {article.status}
                                                   </span>
                                                   <span className="text-[10px] text-gray-400 font-bold uppercase truncate">{article.categories[0]}</span>
                                               </div>
                                               <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{article.title}</h3>
                                           </div>
                                           <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                               <Clock size={10} /> {new Date(article.publishedAt).toLocaleDateString()}
                                           </div>
                                       </div>
                                   </div>

                                   {/* Actions */}
                                   <div className="grid grid-cols-2 border-t border-gray-100 divide-x divide-gray-100">
                                       <button onClick={() => openEditArticle(article)} className="py-2.5 text-center text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                                           <PenSquare size={14}/> Edit
                                       </button>
                                       {onDelete && (
                                           <button onClick={() => handleDelete(article.id)} className="py-2.5 text-center text-xs font-bold text-red-500 hover:bg-red-50 flex items-center justify-center gap-2">
                                               <Trash2 size={14}/> Delete
                                           </button>
                                       )}
                                   </div>
                               </div>
                           ))}
                           {myArticles.length === 0 && (
                               <div className="text-center py-10 text-gray-400 bg-white rounded border border-dashed">
                                   <p className="text-sm">No articles found in your workspace.</p>
                               </div>
                           )}
                      </div>

                      {/* Desktop Table View */}
                      <div className="hidden md:block bg-white rounded border overflow-x-auto">
                          <table className="w-full text-left min-w-[700px]">
                                <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Title</th>
                                        <th className="px-6 py-4">Categories</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {myArticles.map((article) => (
                                        <tr key={article.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900 text-sm">{article.title}</span>
                                                    {article.isFeatured && <span className="text-[10px] text-news-accent font-bold uppercase flex items-center gap-1 mt-1"><Star size={10} fill="currentColor"/> Featured</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {article.categories.slice(0, 3).map(cat => (
                                                        <span key={cat} className="text-[10px] font-bold bg-gray-100 px-2 py-1 rounded-full text-gray-600 uppercase">{cat}</span>
                                                    ))}
                                                    {article.categories.length > 3 && <span className="text-[10px] text-gray-400 font-bold px-1">+{article.categories.length - 3}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold">
                                                <span className={`px-2 py-1 rounded ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>{article.status}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => openEditArticle(article)} className="text-blue-600 font-bold text-xs uppercase hover:text-blue-800">Edit</button>
                                                    {onDelete && (
                                                        <button onClick={() => handleDelete(article.id)} className="text-red-500 font-bold text-xs uppercase hover:text-red-700">Delete</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {myArticles.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-10 text-center text-gray-400">No articles yet. Click "Add New" to start writing.</td>
                                        </tr>
                                    )}
                                </tbody>
                          </table>
                      </div>
                  </div>
              )}
              {activeTab === 'analytics' && <div className="max-w-6xl mx-auto"><AnalyticsDashboard articles={myArticles} role={ArticleStatus.PUBLISHED as any} /></div>}
              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-12 pb-20 pt-4">
                      {/* Third-Party Integrations */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
                          <h2 className="text-xl font-serif font-bold mb-6 flex items-center gap-2"><Key className="text-news-gold" /> Third-Party Integrations</h2>
                          <div className="space-y-4">
                              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg">
                                  <div className="flex justify-between items-start mb-2">
                                      <div>
                                          <h3 className="font-bold text-sm text-gray-900">Translation Service (Google Gemini)</h3>
                                          <p className="text-xs text-gray-500 mt-1">Configure your own API key to enable auto-translation features in the editor.</p>
                                      </div>
                                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${customApiKey ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                          {customApiKey ? 'Connected' : 'Not Configured'}
                                      </span>
                                  </div>
                                  <div className="mt-4">
                                      <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">API Key</label>
                                      <div className="flex gap-2">
                                          <input 
                                            type={showKeyInput ? "text" : "password"} 
                                            value={customApiKey} 
                                            onChange={e => setCustomApiKey(e.target.value)} 
                                            placeholder="Enter your Gemini API Key..."
                                            className="flex-1 p-2 border rounded text-sm outline-none focus:border-news-black"
                                          />
                                          <button onClick={() => setShowKeyInput(!showKeyInput)} className="bg-gray-200 text-gray-600 px-3 rounded hover:bg-gray-300">
                                              {showKeyInput ? <Eye size={16}/> : <Layout size={16}/>}
                                          </button>
                                          <button onClick={handleSaveApiKey} className="bg-news-black text-white px-4 py-2 rounded text-xs font-bold uppercase flex items-center gap-2 hover:bg-gray-800">
                                              <Save size={14}/> Save
                                          </button>
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-2">
                                          Key is stored locally in your browser. Get a key from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">Google AI Studio</a>.
                                      </p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Profile Section */}
                      <div className="bg-white rounded-xl border p-6 md:p-8 shadow-sm">
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
                                            <span className="hidden sm:inline">Upload Image</span>
                                            <span className="sm:hidden">Upload</span>
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

                      {/* Trusted Devices Section */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 shadow-sm">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="font-bold text-lg flex items-center gap-2"><ShieldCheck size={20} className="text-green-600"/> Trusted Devices</h3>
                              <div className="flex items-center gap-2">
                                  <button onClick={handleForceSaveDevices} disabled={isSavingDevices} className="bg-news-black text-white p-2 rounded hover:bg-gray-800 transition-colors" title="Force Save Globally">
                                      {isSavingDevices ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                                  </button>
                                  <span className="text-[10px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1 rounded text-gray-600">
                                      {devices.filter(d => d.status === 'approved').length} Active
                                  </span>
                              </div>
                          </div>
                          
                          <div className="space-y-4">
                              {devices.length === 0 && <p className="text-gray-400 text-sm italic">No devices registered.</p>}
                              {devices.map(device => {
                                  let Icon = Monitor;
                                  if (device.deviceType === 'mobile') Icon = Smartphone;
                                  if (device.deviceType === 'tablet') Icon = Tablet;
                                  
                                  return (
                                      <div key={device.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                                          <div className="flex items-center gap-4 w-full md:w-auto">
                                              <div className={`p-3 rounded-full ${device.isCurrent ? 'bg-news-black text-news-gold' : 'bg-white border text-gray-500'}`}>
                                                  <Icon size={20} />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                      <span className="font-bold text-sm text-gray-900 truncate">{device.deviceName}</span>
                                                      {device.isCurrent && <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">THIS DEVICE</span>}
                                                      {device.status === 'pending' && <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">PENDING</span>}
                                                  </div>
                                                  <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2 items-center">
                                                      <span>{device.location}</span>
                                                      <span className="hidden md:inline">•</span>
                                                      <span>{device.browser}</span>
                                                      <span className="hidden md:inline">•</span>
                                                      <span>{device.lastActive}</span>
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="w-full md:w-auto flex justify-end gap-2">
                                              {device.status === 'approved' && onRevokeDevice && (
                                                  <button 
                                                    onClick={() => onRevokeDevice(device.id)} 
                                                    className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                                    title="Delete Device"
                                                  >
                                                      <Trash2 size={18}/>
                                                  </button>
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

      {showEditorModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                <h3 className="font-bold text-gray-900">{activeArticleId ? 'Edit Draft' : 'New Article Draft'}</h3>
                <button onClick={() => setShowEditorModal(false)} className="p-2 -mr-2 text-gray-500 hover:text-black"><X size={20}/></button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border rounded text-lg font-serif placeholder:text-gray-300" placeholder="Article Headline"/>
                        
                        {/* SEO English Title Input */}
                        <div className="flex items-center gap-2">
                            <input 
                                type="text" 
                                value={englishTitle} 
                                onChange={(e) => setEnglishTitle(e.target.value)} 
                                className="w-full p-2 border rounded text-sm placeholder:text-gray-300" 
                                placeholder="English Title (for SEO & URL)" 
                            />
                            <button 
                                onClick={handleTranslateTitle} 
                                disabled={isTranslating} 
                                className="bg-news-gold text-black p-2 rounded hover:bg-yellow-500 transition-colors flex items-center gap-1" 
                                title="Auto Translate (Requires API Key)"
                            >
                                {isTranslating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            </button>
                        </div>
                        
                        <textarea value={subline} onChange={(e) => setSubline(e.target.value)} className="w-full p-2 border rounded text-sm italic min-h-[80px] placeholder:text-gray-300" placeholder="Summary / Sub-headline..."></textarea>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Author Name, Title"/>
                            <button onClick={() => setShowCategorySelector(true)} className="w-full p-2 border rounded text-sm bg-white text-left flex justify-between items-center">
                                <span className={selectedCategories.length === 0 ? 'text-gray-400' : ''}>
                                    {selectedCategories.length === 0 ? 'Select Categories' : `${selectedCategories.length} Selected`}
                                </span>
                                <ChevronDown size={14} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Status</label>
                                <select 
                                    value={status} 
                                    onChange={(e) => setStatus(e.target.value as ArticleStatus)} 
                                    className="w-full p-2 border rounded text-sm bg-white"
                                >
                                    <option value={ArticleStatus.DRAFT}>Draft</option>
                                    <option value={ArticleStatus.PENDING}>Pending Review</option>
                                    <option value={ArticleStatus.PUBLISHED}>Published</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Tags</label>
                                <input type="text" placeholder="Add tags..." className="w-full p-2 border rounded text-sm" />
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-1">
                        <div className="border-2 border-dashed p-4 rounded bg-gray-50 text-center relative overflow-hidden h-[200px] flex flex-col justify-between">
                            {imageUrl ? (
                                <div className="relative group w-full h-full">
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
                        </div>
                        <div className="mt-2">
                            <button type="button" onClick={() => setShowImageGallery(true)} className="w-full bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold px-2 py-2 rounded flex items-center justify-center gap-2 cursor-pointer transition-colors">
                                <Library size={14} />
                                <span>Select from Gallery</span>
                            </button>
                        </div>
                        <div className="mt-4 space-y-2">
                            <div className="flex items-center gap-3 bg-gray-50 p-2 rounded border border-gray-100">
                                <label className="flex items-center gap-2 cursor-pointer w-full">
                                    <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="w-4 h-4 accent-news-accent" />
                                    <div className="flex items-center gap-2">
                                        <Star size={12} className={isFeatured ? "text-news-accent fill-news-accent" : "text-gray-400"} />
                                        <span className="text-xs font-bold uppercase">Featured</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative">
                  <RichTextEditor 
                    content={content} 
                    onChange={setContent} 
                    className="min-h-[300px] md:min-h-[400px]" 
                    onImageUpload={handleContentImageUpload} 
                    userId={userId} // Pass ID for isolation in editor gallery
                    uploadFolder="articles" // Use articles folder to match featured images
                  />
                  <div className="absolute bottom-2 right-3 bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded pointer-events-none">
                      {wordCount} Words
                  </div>
                </div>

            </div>
            <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowEditorModal(false)} className="px-5 py-2 text-sm font-bold text-gray-600">Cancel</button>
              <button onClick={handleSave} className="px-6 py-2 bg-news-black text-white rounded text-sm font-bold shadow hover:bg-gray-800">
                  Save Draft
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
