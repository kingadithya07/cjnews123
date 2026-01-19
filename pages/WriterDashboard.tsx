import React, { useState, useEffect } from 'react';
import { UserRole, Article, ArticleStatus, TrustedDevice } from '../types';
import { supabase } from '../supabaseClient';
import { 
  LayoutDashboard, FileText, Settings, PenTool, LogOut, Plus, 
  Trash2, Edit3, Image as ImageIcon, Save, Check, X, 
  Clock, AlertCircle, Loader2, Eye
} from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { generateId } from '../utils';
import ImageGalleryModal from '../components/ImageGalleryModal';
import CategorySelector from '../components/CategorySelector';

interface WriterDashboardProps {
  onSave: (article: Article) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  existingArticles: Article[];
  currentUserRole: UserRole;
  categories: string[];
  onNavigate: (path: string) => void;
  userAvatar?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  devices: TrustedDevice[];
  onRevokeDevice: (id: string) => void;
  userId?: string | null;
  activeVisitors?: number;
  translationApiKey?: string;
}

const WriterDashboard: React.FC<WriterDashboardProps> = ({ 
  onSave, onDelete, existingArticles, currentUserRole, categories, onNavigate, 
  userAvatar, userName, userEmail, devices, onRevokeDevice, userId, activeVisitors,
  translationApiKey 
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'articles' | 'editor' | 'settings'>('dashboard');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  // Editor State
  const [editTitle, setEditTitle] = useState('');
  const [editEnglishTitle, setEditEnglishTitle] = useState('');
  const [editSubline, setEditSubline] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<ArticleStatus>(ArticleStatus.DRAFT);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const [currentTagInput, setCurrentTagInput] = useState('');

  // Profile Settings State
  const [profileName, setProfileName] = useState(userName || '');
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [profileEmail, setProfileEmail] = useState(userEmail || '');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (userName) setProfileName(userName);
    if (userAvatar) setProfileAvatar(userAvatar);
    if (userEmail) setProfileEmail(userEmail);
  }, [userName, userAvatar, userEmail]);

  const myArticles = existingArticles.filter(a => a.userId === userId || a.author === userName);

  const handleEditClick = (article: Article) => {
    setSelectedArticle(article);
    setEditTitle(article.title);
    setEditEnglishTitle(article.englishTitle || '');
    setEditSubline(article.subline || '');
    setEditContent(article.content);
    setEditImage(article.imageUrl);
    setEditCategories(article.categories);
    setEditTags(article.tags || []);
    setEditStatus(article.status);
    setActiveTab('editor');
  };

  const handleCreateNew = () => {
    setSelectedArticle(null);
    setEditTitle('');
    setEditEnglishTitle('');
    setEditSubline('');
    setEditContent('');
    setEditImage('https://placehold.co/800x400?text=Article+Image');
    setEditCategories(['General']);
    setEditTags([]);
    setEditStatus(ArticleStatus.DRAFT);
    setActiveTab('editor');
  };

  const handleSaveArticle = async () => {
    if (!editTitle || !editContent) {
      alert("Title and content are required.");
      return;
    }

    const articleToSave: Article = {
      id: selectedArticle?.id || generateId(),
      userId: userId || undefined,
      title: editTitle,
      englishTitle: editEnglishTitle,
      subline: editSubline,
      content: editContent,
      imageUrl: editImage,
      categories: editCategories,
      tags: editTags,
      author: userName || 'Writer',
      authorAvatar: userAvatar || undefined,
      publishedAt: selectedArticle?.publishedAt || new Date().toISOString(),
      status: editStatus,
      views: selectedArticle?.views || 0,
      isFeatured: selectedArticle?.isFeatured || false,
      isEditorsChoice: selectedArticle?.isEditorsChoice || false
    };

    await onSave(articleToSave);
    setActiveTab('articles');
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentTagInput.trim()) {
        e.preventDefault();
        if (!editTags.includes(currentTagInput.trim())) {
            setEditTags([...editTags, currentTagInput.trim()]);
        }
        setCurrentTagInput('');
    }
  };

  const removeTag = (tag: string) => {
      setEditTags(editTags.filter(t => t !== tag));
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const updates: any = {
        data: { full_name: profileName, avatar_url: profileAvatar }
      };
      if (newPassword) updates.password = newPassword;
      if (profileEmail !== userEmail) updates.email = profileEmail;

      const { error } = await supabase.auth.updateUser(updates);
      if (error) throw error;

      if (profileEmail !== userEmail) alert("Settings updated! A confirmation link has been sent to your new email address.");
      else alert("Settings updated successfully!");
      setNewPassword('');
    } catch (err: any) {
      console.error("Profile update error:", err);
      if (err.message?.includes('session_id') || err.message?.includes('JWT')) {
          alert("Your session has expired. Please sign in again to save changes.");
          await supabase.auth.signOut();
          onNavigate('/login');
      } else if (err.message?.includes('security purposes')) {
          alert("Security Check: To update sensitive info, please sign in again.");
      } else {
          alert("Error updating profile: " + err.message);
      }
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <h2 className="text-xl font-serif font-bold text-gray-900 mb-1">Writer Studio</h2>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{currentUserRole}</p>
        </div>
        <nav className="px-3 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-news-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button onClick={() => setActiveTab('articles')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'articles' ? 'bg-news-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <FileText size={18} /> My Articles
          </button>
          <button onClick={handleCreateNew} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'editor' && !selectedArticle ? 'bg-news-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <PenTool size={18} /> New Article
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-news-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            <Settings size={18} /> Settings
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        {activeTab === 'dashboard' && (
           <AnalyticsDashboard articles={myArticles} role={currentUserRole} activeVisitors={activeVisitors} />
        )}

        {activeTab === 'articles' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-gray-900">My Articles</h3>
               <button onClick={handleCreateNew} className="bg-news-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-800 flex items-center gap-2">
                 <Plus size={14} /> Create New
               </button>
            </div>
            <div className="divide-y divide-gray-100">
               {myArticles.length === 0 ? (
                 <div className="p-10 text-center text-gray-400">You haven't written any articles yet.</div>
               ) : (
                 myArticles.map(article => (
                   <div key={article.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                      <img src={article.imageUrl} className="w-16 h-12 object-cover rounded bg-gray-200" alt="" />
                      <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-gray-900 truncate">{article.title}</h4>
                         <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : article.status === ArticleStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'}`}>
                               {article.status}
                            </span>
                            <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                            <span>• {article.views} views</span>
                         </div>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => handleEditClick(article)} className="p-2 text-gray-400 hover:text-news-blue hover:bg-blue-50 rounded-full">
                            <Edit3 size={18} />
                         </button>
                         <button onClick={() => { if(confirm('Delete article?')) onDelete(article.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full">
                            <Trash2 size={18} />
                         </button>
                      </div>
                   </div>
                 ))
               )}
            </div>
          </div>
        )}

        {activeTab === 'editor' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
               <h2 className="text-2xl font-serif font-bold text-gray-900">{selectedArticle ? 'Edit Article' : 'New Article'}</h2>
               <div className="flex gap-3">
                  <button onClick={() => setActiveTab('articles')} className="px-4 py-2 text-gray-500 font-bold text-xs uppercase hover:text-black">Cancel</button>
                  <button onClick={handleSaveArticle} className="bg-news-gold text-black px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-white shadow-lg flex items-center gap-2">
                     <Save size={16} /> Save
                  </button>
               </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
               {/* Title & English Title */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Title (Primary)</label>
                    <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-news-gold outline-none font-serif text-lg font-bold" placeholder="Article Headline" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">English Title (SEO/Slug)</label>
                    <input type="text" value={editEnglishTitle} onChange={e => setEditEnglishTitle(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-news-gold outline-none" placeholder="English version for URL" />
                  </div>
               </div>

               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Subline / Summary</label>
                  <textarea value={editSubline} onChange={e => setEditSubline(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:border-news-gold outline-none h-24 resize-none" placeholder="Brief summary or hook..." />
               </div>

               {/* Image Selector */}
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Featured Image</label>
                  <div className="flex gap-4 items-start">
                     <div className="w-40 h-24 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                        <img src={editImage} className="w-full h-full object-cover" alt="Preview" />
                     </div>
                     <div className="flex-1 space-y-3">
                        <div className="flex gap-2">
                           <input type="text" value={editImage} onChange={e => setEditImage(e.target.value)} className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded text-sm" placeholder="Image URL" />
                           <button onClick={() => setIsGalleryOpen(true)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded font-bold text-xs uppercase hover:bg-gray-200 flex items-center gap-2"><ImageIcon size={14}/> Gallery</button>
                        </div>
                        <p className="text-[10px] text-gray-400">Recommended: 1200x630px JPG/PNG</p>
                     </div>
                  </div>
               </div>

               {/* Categories & Tags */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Categories</label>
                     <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[50px] cursor-pointer" onClick={() => setIsCategorySelectorOpen(true)}>
                        {editCategories.length === 0 && <span className="text-gray-400 text-sm">Select Category...</span>}
                        {editCategories.map(cat => (
                           <span key={cat} className="bg-news-black text-white px-2 py-1 rounded text-xs font-bold">{cat}</span>
                        ))}
                     </div>
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tags</label>
                     <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        {editTags.map(tag => (
                           <span key={tag} className="bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                              #{tag} <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X size={10}/></button>
                           </span>
                        ))}
                        <input 
                           type="text" 
                           value={currentTagInput} 
                           onChange={e => setCurrentTagInput(e.target.value)}
                           onKeyDown={handleAddTag}
                           className="bg-transparent outline-none text-sm flex-1 min-w-[60px]"
                           placeholder="Add tag..."
                        />
                     </div>
                  </div>
               </div>

               {/* Editor */}
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Content</label>
                  <RichTextEditor 
                     content={editContent} 
                     onChange={setEditContent} 
                     onImageUpload={async (f) => URL.createObjectURL(f)} 
                     userId={userId}
                     uploadFolder="articles"
                  />
               </div>

               {/* Publishing Options */}
               <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 flex items-center justify-between">
                  <div>
                     <span className="block text-xs font-bold text-gray-500 uppercase tracking-widest">Status</span>
                     <select value={editStatus} onChange={e => setEditStatus(e.target.value as ArticleStatus)} className="mt-1 bg-white border border-gray-300 rounded px-2 py-1 text-sm font-bold text-gray-800 outline-none">
                        <option value={ArticleStatus.DRAFT}>Draft</option>
                        <option value={ArticleStatus.PENDING}>Pending Review</option>
                        {currentUserRole === UserRole.WRITER ? null : <option value={ArticleStatus.PUBLISHED}>Published</option>}
                     </select>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
               <h3 className="font-bold text-gray-900">Profile Settings</h3>
            </div>
            <div className="p-8 space-y-6">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gray-200 rounded-full overflow-hidden border-2 border-white shadow-md relative group">
                      {profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white font-bold text-xl">{profileName.charAt(0)}</div>}
                      <button onClick={() => { const url = prompt("Enter Avatar URL"); if(url) setProfileAvatar(url); }} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Edit3 size={20} />
                      </button>
                  </div>
                  <div>
                      <h4 className="font-bold text-lg">{profileName}</h4>
                      <p className="text-sm text-gray-500">{currentUserRole}</p>
                  </div>
               </div>
               
               <div className="space-y-4">
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Display Name</label>
                       <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-news-black" />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
                       <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-news-black" />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Password</label>
                       <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-news-black" />
                   </div>
               </div>

               <div className="pt-6 border-t border-gray-100 flex justify-end">
                   <button onClick={handleSaveSettings} disabled={isSavingSettings} className="bg-news-black text-white px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-gray-800 transition-all flex items-center gap-2">
                       {isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Save Changes
                   </button>
               </div>
            </div>
          </div>
        )}

      </div>

      <ImageGalleryModal 
        isOpen={isGalleryOpen} 
        onClose={() => setIsGalleryOpen(false)} 
        onSelectImage={(url) => { setEditImage(url); setIsGalleryOpen(false); }}
        userId={userId}
        uploadFolder="articles" 
      />
      
      <CategorySelector 
        isOpen={isCategorySelectorOpen} 
        onClose={() => setIsCategorySelectorOpen(false)} 
        options={categories} 
        selected={editCategories} 
        onChange={setEditCategories} 
      />

    </div>
  );
};

export default WriterDashboard;