import React, { useState, useEffect } from 'react';
import { UserRole, Article, ArticleStatus, EPaperPage, Advertisement, WatermarkSettings, ClassifiedAd, TrustedDevice, UserProfile, ActivityLog } from '../types';
import { supabase } from '../supabaseClient';
import { 
  LayoutDashboard, FileText, Settings, Users, Newspaper, Megaphone, Image as ImageIcon,
  Plus, Trash2, Edit3, Check, X, Search, Globe, Shield, Ban, Lock,
  RefreshCw, Loader2, Save, Upload, AlertTriangle
} from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { generateId, createSlug } from '../utils';
import ImageGalleryModal from '../components/ImageGalleryModal';
import CategorySelector from '../components/CategorySelector';

interface EditorDashboardProps {
  articles: Article[];
  ePaperPages: EPaperPage[];
  categories: string[];
  tags: string[];
  adCategories: string[];
  classifieds: ClassifiedAd[];
  advertisements: Advertisement[];
  globalAdsEnabled: boolean;
  watermarkSettings: WatermarkSettings;
  onToggleGlobalAds: (enabled: boolean) => void;
  onUpdateWatermarkSettings: (settings: WatermarkSettings) => void;
  onUpdatePage: (page: EPaperPage) => Promise<void>;
  onAddPage: (page: EPaperPage) => Promise<void>;
  onDeletePage: (id: string) => Promise<void>;
  onDeleteArticle: (id: string) => Promise<void>;
  onSaveArticle: (article: Article) => Promise<void>;
  onAddCategory: (cat: string) => void;
  onDeleteCategory: (cat: string) => void;
  onAddTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
  onAddAdCategory: (cat: string) => void;
  onDeleteAdCategory: (cat: string) => void;
  onSaveTaxonomy: () => void;
  onAddClassified: (ad: any) => Promise<void>;
  onDeleteClassified: (id: string) => Promise<void>;
  onAddAdvertisement: (ad: any) => Promise<void>;
  onUpdateAdvertisement: (ad: any) => Promise<void>;
  onDeleteAdvertisement: (id: string) => Promise<void>;
  onNavigate: (path: string) => void;
  userAvatar?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  devices: TrustedDevice[];
  onApproveDevice?: (id: string) => void;
  onRejectDevice?: (id: string) => void;
  onRevokeDevice?: (id: string) => void;
  userId?: string | null;
  activeVisitors?: number;
  logs?: ActivityLog[];
  users?: UserProfile[];
  onBlockUser?: (userId: string) => void;
  translationApiKey?: string;
  onUpdateTranslationKey?: (key: string) => void;
}

const EditorDashboard: React.FC<EditorDashboardProps> = ({ 
  articles, ePaperPages, categories, tags, adCategories, classifieds, advertisements, 
  globalAdsEnabled, watermarkSettings, onToggleGlobalAds, onUpdateWatermarkSettings,
  onUpdatePage, onAddPage, onDeletePage, onDeleteArticle, onSaveArticle,
  onAddCategory, onDeleteCategory, onAddTag, onDeleteTag, onAddAdCategory, onDeleteAdCategory, onSaveTaxonomy,
  onAddClassified, onDeleteClassified, onAddAdvertisement, onUpdateAdvertisement, onDeleteAdvertisement,
  onNavigate, userAvatar, userName, userEmail, devices, userId, activeVisitors, logs = [], users = [], onBlockUser,
  translationApiKey, onUpdateTranslationKey
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'articles' | 'epaper' | 'classifieds' | 'ads' | 'staff' | 'settings'>('dashboard');
  
  // Article Editor State
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEnglishTitle, setEditEnglishTitle] = useState('');
  const [editSubline, setEditSubline] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<ArticleStatus>(ArticleStatus.DRAFT);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isEditorsChoice, setIsEditorsChoice] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isCategorySelectorOpen, setIsCategorySelectorOpen] = useState(false);
  const [currentTagInput, setCurrentTagInput] = useState('');

  // Settings State
  const [profileName, setProfileName] = useState(userName || '');
  const [profileAvatar, setProfileAvatar] = useState(userAvatar || '');
  const [profileEmail, setProfileEmail] = useState(userEmail || '');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Invitation State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>(UserRole.WRITER);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  useEffect(() => {
      if (userName) setProfileName(userName);
      if (userAvatar) setProfileAvatar(userAvatar);
      if (userEmail) setProfileEmail(userEmail);
  }, [userName, userAvatar, userEmail]);

  // --- Article Logic ---
  const handleEditArticle = (article: Article) => {
      setEditingArticle(article);
      setEditTitle(article.title);
      setEditEnglishTitle(article.englishTitle || '');
      setEditSubline(article.subline || '');
      setEditContent(article.content);
      setEditImage(article.imageUrl);
      setEditCategories(article.categories);
      setEditTags(article.tags || []);
      setEditStatus(article.status);
      setIsFeatured(article.isFeatured || false);
      setIsEditorsChoice(article.isEditorsChoice || false);
      setActiveTab('articles'); // Ensure we stay on articles tab but show editor
  };

  const handleCreateArticle = () => {
      setEditingArticle(null); // Null means new
      setEditTitle('');
      setEditEnglishTitle('');
      setEditSubline('');
      setEditContent('');
      setEditImage('https://placehold.co/800x400?text=Article+Image');
      setEditCategories(['General']);
      setEditTags([]);
      setEditStatus(ArticleStatus.DRAFT);
      setIsFeatured(false);
      setIsEditorsChoice(false);
      // We will render editor conditionally based on state in 'articles' tab
  };

  const saveArticle = async () => {
      if (!editTitle) return alert("Title required");
      const article: Article = {
          id: editingArticle?.id || generateId(),
          title: editTitle,
          englishTitle: editEnglishTitle,
          subline: editSubline,
          content: editContent,
          imageUrl: editImage,
          categories: editCategories,
          tags: editTags,
          status: editStatus,
          author: editingArticle?.author || userName || 'Editor',
          authorAvatar: editingArticle?.authorAvatar || userAvatar || undefined,
          publishedAt: editingArticle?.publishedAt || new Date().toISOString(),
          userId: editingArticle?.userId || userId || undefined,
          isFeatured,
          isEditorsChoice,
          views: editingArticle?.views || 0
      };
      await onSaveArticle(article);
      setEditingArticle(null); // Close editor
      setEditTitle(''); // Reset
  };

  // --- Profile Logic ---
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const updates: any = { data: { full_name: profileName, avatar_url: profileAvatar } };
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
        } else if (err.message?.includes('security purposes') || err.message?.includes('reauthentication')) {
            alert("Security Alert: To update your password, you must have recently signed in. Please log out and sign in again.");
        } else {
            alert("Error updating profile: " + err.message);
        }
    } finally { setIsSavingSettings(false); }
  };

  // --- Invite Logic ---
  const handleGenerateInvite = async (e: React.FormEvent) => {
      e.preventDefault();
      setInviteLoading(true);
      try {
          const token = generateId();
          const { error } = await supabase.from('staff_invitations').insert({
              token,
              role: inviteRole,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
              created_by: userId
          });
          if (error) throw error;
          
          const link = `${window.location.origin}/#/invite?token=${token}`;
          setInviteLink(link);
      } catch (err: any) {
          alert("Error creating invite: " + err.message);
      } finally {
          setInviteLoading(false);
      }
  };

  // --- Render Editor ---
  const renderArticleEditor = () => (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">{editingArticle ? 'Edit Article' : 'New Article'}</h3>
              <div className="flex gap-2">
                  <button onClick={() => { setEditingArticle(null); setEditTitle(''); }} className="px-4 py-2 text-gray-500 font-bold text-xs uppercase hover:text-black">Cancel</button>
                  <button onClick={saveArticle} className="bg-news-gold text-black px-6 py-2 rounded-lg font-black text-xs uppercase tracking-widest hover:bg-white shadow-lg flex items-center gap-2">
                      <Save size={16} /> Save
                  </button>
              </div>
          </div>
          <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Title</label>
                      <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none font-bold text-lg" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">English Title (Slug)</label>
                      <input type="text" value={editEnglishTitle} onChange={e => setEditEnglishTitle(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="seo-friendly-url" />
                  </div>
              </div>
              
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Subline</label>
                  <textarea value={editSubline} onChange={e => setEditSubline(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none h-20 resize-none" />
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Image</label>
                  <div className="flex gap-4">
                      <div className="w-24 h-16 bg-gray-200 rounded overflow-hidden">
                          <img src={editImage} className="w-full h-full object-cover"/>
                      </div>
                      <div className="flex-1 flex gap-2">
                          <input type="text" value={editImage} onChange={e => setEditImage(e.target.value)} className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none text-sm" />
                          <button onClick={() => setIsGalleryOpen(true)} className="px-4 bg-gray-100 rounded-lg font-bold text-xs uppercase hover:bg-gray-200 flex items-center gap-2"><ImageIcon size={14}/> Gallery</button>
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Categories</label>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg min-h-[46px] flex flex-wrap gap-2 cursor-pointer" onClick={() => setIsCategorySelectorOpen(true)}>
                          {editCategories.map(c => <span key={c} className="bg-news-black text-white px-2 py-1 rounded text-xs font-bold">{c}</span>)}
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tags</label>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap gap-2">
                          {editTags.map(t => (
                              <span key={t} className="bg-white border border-gray-200 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                                  #{t} <button onClick={() => setEditTags(prev => prev.filter(tag => tag !== t))}><X size={10}/></button>
                              </span>
                          ))}
                          <input 
                            type="text" 
                            value={currentTagInput} 
                            onChange={e => setCurrentTagInput(e.target.value)} 
                            onKeyDown={(e) => { if(e.key === 'Enter' && currentTagInput.trim()) { setEditTags([...editTags, currentTagInput.trim()]); setCurrentTagInput(''); }}} 
                            className="bg-transparent outline-none text-sm min-w-[60px]" 
                            placeholder="Add tag..." 
                          />
                      </div>
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Content</label>
                  <RichTextEditor content={editContent} onChange={setEditContent} onImageUpload={async (f) => URL.createObjectURL(f)} userId={userId} uploadFolder="articles" />
              </div>

              <div className="flex gap-6 pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} className="rounded border-gray-300 text-news-gold focus:ring-news-gold" />
                      <span className="text-sm font-bold text-gray-700">Featured (Slider)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={isEditorsChoice} onChange={e => setIsEditorsChoice(e.target.checked)} className="rounded border-gray-300 text-news-gold focus:ring-news-gold" />
                      <span className="text-sm font-bold text-gray-700">Editor's Choice</span>
                  </label>
                  <div className="ml-auto">
                      <select value={editStatus} onChange={e => setEditStatus(e.target.value as ArticleStatus)} className="p-2 border border-gray-200 rounded font-bold text-sm bg-gray-50">
                          <option value={ArticleStatus.DRAFT}>Draft</option>
                          <option value={ArticleStatus.PENDING}>Pending</option>
                          <option value={ArticleStatus.PUBLISHED}>Published</option>
                      </select>
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <div className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
          <div className="p-6">
             <h2 className="text-xl font-serif font-bold text-gray-900 mb-1">Editor Control</h2>
             <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Global Admin</p>
          </div>
          <nav className="px-3 space-y-1">
             <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-news-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}><LayoutDashboard size={18} /> Overview</button>
             <button onClick={() => { setActiveTab('articles'); setEditingArticle(null); setEditTitle(''); }} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'articles' ? 'bg-news-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}><FileText size={18} /> Articles</button>
             <button onClick={() => setActiveTab('epaper')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'epaper' ? 'bg-news-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}><Newspaper size={18} /> E-Paper</button>
             <button onClick={() => setActiveTab('classifieds')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'classifieds' ? 'bg-news-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}><Megaphone size={18} /> Classifieds</button>
             <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'staff' ? 'bg-news-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}><Users size={18} /> Team & Users</button>
             <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-news-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}><Settings size={18} /> Settings</button>
          </nav>
      </div>

      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
          {activeTab === 'dashboard' && <AnalyticsDashboard articles={articles} role={UserRole.ADMIN} activeVisitors={activeVisitors} />}
          
          {activeTab === 'articles' && (
              <>
                {/* If editTitle has a value, we assume we are in editor mode, or if editingArticle is set */}
                {(editingArticle || editTitle !== '') ? (
                    renderArticleEditor()
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-900">All Articles</h3>
                            <button onClick={handleCreateArticle} className="bg-news-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-800 flex items-center gap-2">
                                <Plus size={14} /> New Article
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100">
                             {articles.map(article => (
                                 <div key={article.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                     <img src={article.imageUrl} className="w-16 h-12 object-cover rounded bg-gray-200" alt="" />
                                     <div className="flex-1 min-w-0">
                                         <h4 className="font-bold text-gray-900 truncate">{article.title}</h4>
                                         <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                             <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{article.status}</span>
                                             <span className="font-bold text-gray-400">{article.author}</span>
                                             <span>• {new Date(article.publishedAt).toLocaleDateString()}</span>
                                         </div>
                                     </div>
                                     <div className="flex gap-2">
                                         <button onClick={() => handleEditArticle(article)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Edit3 size={18}/></button>
                                         <button onClick={() => onDeleteArticle(article.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                )}
              </>
          )}

          {activeTab === 'staff' && (
              <div className="space-y-8">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><Users size={18} className="text-news-gold"/> Invite Staff</h3>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                          <div className="md:col-span-1">
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Role</label>
                              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none font-bold text-sm">
                                  <option value={UserRole.WRITER}>Writer</option>
                                  <option value={UserRole.EDITOR}>Editor</option>
                                  <option value={UserRole.ADMIN}>Admin</option>
                              </select>
                          </div>
                          <div className="md:col-span-2">
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Recipient Note (Optional)</label>
                              <input type="text" placeholder="John Doe" value={inviteName} onChange={e => setInviteName(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none" />
                          </div>
                          <button onClick={handleGenerateInvite} disabled={inviteLoading} className="h-[42px] bg-news-black text-white rounded-lg font-bold uppercase text-xs hover:bg-gray-800 flex items-center justify-center gap-2">
                              {inviteLoading ? <Loader2 className="animate-spin" size={16}/> : "Generate Link"}
                          </button>
                      </div>
                      {inviteLink && (
                          <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                              <code className="text-green-800 text-sm font-mono break-all">{inviteLink}</code>
                              <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="ml-4 text-green-700 font-bold text-xs uppercase hover:underline">Copy</button>
                          </div>
                      )}
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-6 border-b border-gray-100 bg-gray-50">
                          <h3 className="font-bold text-gray-900">Active Users & Activity</h3>
                      </div>
                      <div className="divide-y divide-gray-100">
                          {users.map(u => (
                              <div key={u.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                  <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500">{u.name.charAt(0)}</div>
                                      <div>
                                          <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                                          <p className="text-xs text-gray-500">{u.email} • <span className="uppercase text-[10px] font-black tracking-widest text-news-gold">{u.role}</span></p>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <span className="text-xs text-gray-400 font-mono hidden md:inline">{u.lastIp}</span>
                                      {onBlockUser && <button onClick={() => onBlockUser(u.id)} className="text-red-500 hover:text-red-700 p-2"><Ban size={16}/></button>}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'settings' && (
              <div className="max-w-2xl mx-auto space-y-8">
                  {/* Global Config */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-6 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-gray-900">System Configuration</h3></div>
                      <div className="p-6 space-y-6">
                          <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer">
                              <div>
                                  <span className="block font-bold text-gray-900 text-sm">Global Ad Network</span>
                                  <span className="text-xs text-gray-500">Enable/Disable advertisements across the platform</span>
                              </div>
                              <input type="checkbox" checked={globalAdsEnabled} onChange={e => onToggleGlobalAds(e.target.checked)} className="rounded text-news-gold focus:ring-news-gold w-5 h-5"/>
                          </label>
                          
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Translation API Key (Optional)</label>
                              <div className="flex gap-2">
                                  <input type="password" value={translationApiKey || ''} onChange={e => onUpdateTranslationKey && onUpdateTranslationKey(e.target.value)} placeholder="API Key for Auto-Translation" className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none font-mono text-sm" />
                                  <button onClick={onSaveTaxonomy} className="bg-news-black text-white px-4 rounded-lg font-bold text-xs uppercase">Save</button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Profile Config */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-6 border-b border-gray-100 bg-gray-50"><h3 className="font-bold text-gray-900">Your Profile</h3></div>
                      <div className="p-6 space-y-4">
                           <div className="flex items-center gap-4 mb-4">
                               <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                                   {profileAvatar ? <img src={profileAvatar} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xl">{profileName.charAt(0)}</div>}
                               </div>
                               <button onClick={() => { const u = prompt("Enter Avatar URL"); if(u) setProfileAvatar(u); }} className="text-xs font-bold text-news-accent hover:underline uppercase">Change Avatar</button>
                           </div>
                           <input type="text" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Display Name" />
                           <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="Email" />
                           <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none" placeholder="New Password (leave blank to keep)" />
                           <button onClick={handleSaveSettings} disabled={isSavingSettings} className="w-full bg-news-gold text-black py-3 rounded-lg font-bold uppercase text-xs hover:bg-news-black hover:text-white transition-colors flex items-center justify-center gap-2">
                               {isSavingSettings ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Save Profile
                           </button>
                      </div>
                  </div>
              </div>
          )}

      </div>
      
      <ImageGalleryModal isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} onSelectImage={(url) => { setEditImage(url); setIsGalleryOpen(false); }} userId={userId} uploadFolder="articles" />
      <CategorySelector isOpen={isCategorySelectorOpen} onClose={() => setIsCategorySelectorOpen(false)} options={categories} selected={editCategories} onChange={setEditCategories} />

    </div>
  );
};

export default EditorDashboard;