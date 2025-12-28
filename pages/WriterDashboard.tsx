
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
  
  // Editor State
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

  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Trusted Devices State
  const [devices, setDevices] = useState<TrustedDevice[]>([
    { id: '1', deviceName: 'MacBook Pro 14"', deviceType: 'desktop', location: 'Hyderabad, IN', lastActive: 'Active Now', isCurrent: true, browser: 'Chrome' },
    { id: '2', deviceName: 'iPhone 15 Pro', deviceType: 'mobile', location: 'Hyderabad, IN', lastActive: '2 hours ago', isCurrent: false, browser: 'Safari' },
  ]);

  const revokeDevice = (id: string) => {
    if (window.confirm("Log out of this device?")) {
        setDevices(devices.filter(d => d.id !== id));
    }
  };

  // Filter only my articles (simulated)
  const myArticles = existingArticles;

  useEffect(() => {
      // Calculate word count whenever content changes
      const text = content.replace(/<[^>]*>/g, ' '); // Strip HTML tags
      const count = text.trim().split(/\s+/).filter(w => w.length > 0).length;
      setWordCount(count);
  }, [content]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('images').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
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
      setImageUrl(`https://picsum.photos/800/400?random=${Math.floor(Math.random() * 1000)}`);
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
        setPasswordStatus({type: 'error', message: "Passwords do not match"});
        return;
    }
    if (newPassword.length < 6) {
        setPasswordStatus({type: 'error', message: "Password must be at least 6 characters"});
        return;
    }

    setIsUpdatingPassword(true);
    setPasswordStatus(null);

    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setPasswordStatus({type: 'success', message: "Password updated successfully"});
        setNewPassword('');
        setConfirmNewPassword('');
    } catch (err: any) {
        setPasswordStatus({type: 'error', message: err.message || "Failed to update password"});
    } finally {
        setIsUpdatingPassword(false);
    }
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

  const getDeviceIcon = (type: string) => {
    switch(type) {
      case 'desktop': return <Monitor size={20} />;
      case 'tablet': return <Tablet size={20} />;
      default: return <Smartphone size={20} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
        
      {/* --- SIDEBAR --- */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-[#1a1a1a] text-white flex flex-col transition-transform duration-300 shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
              <h1 className="font-serif text-2xl font-bold text-white">Writer</h1>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white">
                  <X size={24} />
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto py-4 custom-scrollbar">
              <SidebarItem id="articles" label="Articles" icon={FileText} />
              <SidebarItem id="analytics" label="Analytics" icon={BarChart3} />
              <SidebarItem id="inbox" label="Inbox" icon={Inbox} />
              <SidebarItem id="settings" label="Settings" icon={Settings} />
          </div>

          <div className="p-6 border-t border-gray-800 space-y-2">
              <button 
                onClick={() => onNavigate('/')} 
                className="flex items-center gap-3 text-gray-400 hover:text-white text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded hover:border-gray-500 transition-colors justify-center"
              >
                  <Globe size={16} /> View Website
              </button>
              <button 
                onClick={async () => {
                  await supabase.auth.signOut();
                  onNavigate('/login');
                }} 
                className="flex items-center gap-3 text-gray-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest w-full px-4 py-3 border border-gray-700 rounded hover:border-red-500 transition-colors justify-center"
              >
                  <LogOut size={16} /> Logout
              </button>
          </div>
      </div>

       {/* --- MOBILE OVERLAY --- */}
      {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col md:ml-72 h-full overflow-hidden relative bg-[#f8f9fa]">
          
          {/* Mobile Header */}
          <div className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm sticky top-0 z-30">
             <div className="flex items-center gap-3">
                 <button onClick={() => setIsSidebarOpen(true)} className="text-gray-700">
                     <Menu size={24} />
                 </button>
                 <span className="font-serif text-xl font-bold text-gray-900">
                    {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                 </span>
             </div>
             <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 overflow-hidden border border-gray-300">
                 {userAvatar ? (
                    <img src={userAvatar} alt="Writer" className="w-full h-full object-cover" />
                 ) : (
                    <span className="font-bold text-xs">W</span>
                 )}
             </div>
          </div>

           {/* Main Workspace */}
           <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {activeTab === 'articles' && (
                  <div className="max-w-6xl mx-auto">
                      <div className="flex justify-between items-center mb-6">
                           <div className="flex items-center gap-3">
                               <Menu size={24} className="text-gray-900 hidden md:block" />
                               <h1 className="font-serif text-3xl font-bold text-gray-900">Articles</h1>
                           </div>
                           
                           {/* Desktop Profile Pic */}
                           <div className="hidden md:block">
                               <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                                   {userAvatar ? (
                                       <img src={userAvatar} alt="Writer" className="w-full h-full object-cover" />
                                   ) : (
                                       <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">W</div>
                                   )}
                               </div>
                           </div>
                      </div>

                      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden min-h-[500px] flex flex-col">
                          <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
                              <h2 className="font-bold text-lg text-gray-800">My Articles</h2>
                              <button 
                                onClick={openNewArticle}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded uppercase tracking-wide flex items-center gap-2 transition-colors"
                              >
                                  <Plus size={16} strokeWidth={3} /> Add New
                              </button>
                          </div>
                          
                          <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left">
                                      <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                                          <tr>
                                              <th className="px-6 py-4">Title</th>
                                              <th className="px-6 py-4">Category</th>
                                              <th className="px-6 py-4">Status</th>
                                              <th className="px-6 py-4 text-right">Actions</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                          {myArticles.map((article) => (
                                              <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                                                  <td className="px-6 py-4">
                                                      <div className="flex items-center gap-3">
                                                          <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0 border border-gray-200">
                                                              <img src={article.imageUrl} alt="" className="w-full h-full object-cover"/>
                                                          </div>
                                                          <div className="flex flex-col">
                                                              <span className="font-medium text-gray-900 text-sm line-clamp-1 max-w-[200px]">{article.title}</span>
                                                              {article.subline && <span className="text-xs text-gray-500 line-clamp-1 max-w-[200px]">{article.subline}</span>}
                                                          </div>
                                                      </div>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold uppercase">{article.category}</span>
                                                  </td>
                                                  <td className="px-6 py-4">
                                                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                          article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' :
                                                          article.status === ArticleStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                                          'bg-gray-100 text-gray-600'
                                                      }`}>
                                                          {article.status}
                                                      </span>
                                                  </td>
                                                  <td className="px-6 py-4 text-right">
                                                      <button onClick={() => openEditArticle(article)} className="text-gray-400 hover:text-blue-600"><PenSquare size={16} /></button>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                </table>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'analytics' && (
                  <div className="max-w-6xl mx-auto">
                     <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <Menu size={24} className="text-gray-900 hidden md:block" />
                            <h1 className="font-serif text-3xl font-bold text-gray-900">Personal Analytics</h1>
                        </div>
                        <div className="hidden md:block">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                                {userAvatar ? (
                                    <img src={userAvatar} alt="Writer" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">W</div>
                                )}
                            </div>
                        </div>
                     </div>
                     <AnalyticsDashboard articles={myArticles} role={UserRole.WRITER} />
                  </div>
              )}

              {activeTab === 'settings' && (
                  <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                      <div className="flex items-center gap-3 mb-6">
                           <Settings size={28} className="text-gray-900" />
                           <h1 className="font-serif text-3xl font-bold text-gray-900">Account Settings</h1>
                      </div>

                      {/* Profile Section */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
                              <User size={20} className="text-news-gold" /> Public Profile
                          </h3>
                          <div className="flex items-center gap-6">
                              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300 relative group overflow-hidden">
                                  {userAvatar ? (
                                      <img src={userAvatar} className="w-full h-full object-cover" alt="Profile" />
                                  ) : (
                                      <User size={40} className="text-gray-300" />
                                  )}
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                      <Upload size={20} className="text-white" />
                                  </div>
                              </div>
                              <div className="space-y-1">
                                  <h4 className="font-bold text-gray-900 text-xl">Staff Member</h4>
                                  <p className="text-sm text-gray-500">Publisher Role • Joined 2025</p>
                                  <button className="text-xs font-bold text-news-accent hover:underline uppercase tracking-wide mt-2">Change Profile Picture</button>
                              </div>
                          </div>
                      </div>

                      {/* Security Credentials Section */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-800 text-lg mb-6 flex items-center gap-2">
                                <Lock size={20} className="text-news-gold" /> Security Credentials
                            </h3>
                            <div className="max-w-md">
                                <p className="text-sm text-gray-500 mb-4">
                                    Update your password. Ensure you use a strong, unique password for your staff account.
                                </p>
                                <form onSubmit={handlePasswordReset} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                                        <input 
                                            type="password" 
                                            value={newPassword} 
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-news-black outline-none transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm Password</label>
                                        <input 
                                            type="password" 
                                            value={confirmNewPassword} 
                                            onChange={e => setConfirmNewPassword(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:border-news-black outline-none transition-colors"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    
                                    {passwordStatus && (
                                        <div className={`p-3 rounded text-xs font-bold flex items-center gap-2 ${passwordStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {passwordStatus.type === 'success' ? <CheckCircle size={14}/> : <AlertCircle size={14}/>}
                                            {passwordStatus.message}
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={isUpdatingPassword}
                                        className="px-6 py-2 bg-news-black text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isUpdatingPassword && <Loader2 size={14} className="animate-spin"/>}
                                        {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                                    </button>
                                </form>
                            </div>
                      </div>

                      {/* Trusted Devices Section */}
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                          <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                              <div>
                                  <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                      <ShieldCheck size={20} className="text-green-600" /> Trusted Devices
                                  </h3>
                                  <p className="text-sm text-gray-500">Manage the devices that have access to your account.</p>
                              </div>
                              <button className="text-xs font-bold text-gray-500 hover:text-news-black uppercase tracking-wider">
                                  LOG OUT FROM ALL
                              </button>
                          </div>
                          <div className="divide-y divide-gray-100">
                              {devices.map(device => (
                                  <div key={device.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                      <div className="flex items-center gap-4">
                                          <div className={`p-3 rounded-lg ${device.isCurrent ? 'bg-news-gold/10 text-news-gold' : 'bg-gray-100 text-gray-400'}`}>
                                              {getDeviceIcon(device.deviceType)}
                                          </div>
                                          <div>
                                              <div className="flex items-center gap-2">
                                                  <span className="font-bold text-gray-900">{device.deviceName}</span>
                                                  {device.isCurrent && (
                                                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Current Session</span>
                                                  )}
                                              </div>
                                              <p className="text-xs text-gray-500 mt-0.5">
                                                  {device.browser} • {device.location} • <span className={device.isCurrent ? 'text-green-600 font-medium' : ''}>{device.lastActive}</span>
                                              </p>
                                          </div>
                                      </div>
                                      {!device.isCurrent && (
                                          <button 
                                              onClick={() => revokeDevice(device.id)}
                                              className="p-2 text-gray-300 hover:text-red-600 transition-colors"
                                              title="Revoke Access"
                                          >
                                              <Trash2 size={18} />
                                          </button>
                                      )}
                                  </div>
                              ))}
                          </div>
                          <div className="p-4 bg-blue-50 border-t border-blue-100 text-center">
                              <p className="text-xs text-blue-800">
                                  <span className="font-bold">Pro-tip:</span> If you don't recognize a device, change your password immediately.
                              </p>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'inbox' && (
                  <div className="max-w-6xl mx-auto h-[60vh] flex items-center justify-center text-gray-400 flex-col space-y-4">
                      <Inbox size={64} className="opacity-10" />
                      <p className="text-lg font-medium">Your Inbox is empty</p>
                  </div>
              )}
           </div>

      </div>

      {/* Editor Modal */}
      {showEditorModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">{activeArticleId ? 'Edit Article' : 'Compose New Article'}</h3>
                <button onClick={() => setShowEditorModal(false)} className="text-gray-400 hover:text-gray-900"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto">
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Headline</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 outline-none font-serif text-lg" placeholder="Article Title..."/>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subline (Subtitle / Summary)</label>
                        <input type="text" value={subline} onChange={(e) => setSubline(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm italic text-gray-600" placeholder="A short summary of the article..."/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Author Name</label>
                            <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full p-2 border rounded text-sm"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-2 border rounded text-sm bg-white">
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Article Status</label>
                        <div className="relative">
                            <select 
                                value={status} 
                                onChange={(e) => setStatus(e.target.value as ArticleStatus)} 
                                className={`w-full p-2 border rounded text-sm appearance-none font-bold uppercase tracking-wider ${
                                    status === ArticleStatus.PUBLISHED ? 'text-green-700 bg-green-50 border-green-200' :
                                    status === ArticleStatus.PENDING ? 'text-yellow-700 bg-yellow-50 border-yellow-200' :
                                    'text-gray-700 bg-gray-50 border-gray-200'
                                }`}
                            >
                                <option value={ArticleStatus.DRAFT}>Draft</option>
                                <option value={ArticleStatus.PENDING}>Pending Review</option>
                                <option value={ArticleStatus.PUBLISHED}>Published</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-2.5 pointer-events-none opacity-50" />
                        </div>
                    </div>

                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Featured Image</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors relative group">
                            {imageUrl ? (
                                <div className="relative w-full h-48 rounded-md overflow-hidden bg-gray-200">
                                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                disabled={isUploading}
                                            />
                                            <button className="bg-white text-black px-4 py-2 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                                                <Upload size={14} /> Change Image
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 relative w-full">
                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Loader2 size={32} className="animate-spin text-news-gold" />
                                            <span className="text-xs font-bold text-gray-400 uppercase">Uploading...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <input 
                                                type="file" 
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <ImageIcon size={32} className="mx-auto text-gray-300 mb-2" />
                                            <p className="text-xs text-gray-500 font-medium">Click to upload or drag and drop</p>
                                            <p className="text-[10px] text-gray-400 mt-1">SVG, PNG, JPG or GIF</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase">Content</label>
                            <span className="text-xs text-gray-400 font-mono">{wordCount} words</span>
                        </div>
                        <div className="h-64 border rounded">
                             <RichTextEditor content={content} onChange={setContent} className="h-full border-none"/>
                        </div>
                    </div>
                </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowEditorModal(false)} className="px-5 py-2 text-gray-600 hover:bg-gray-200 rounded text-sm font-bold">Discard</button>
              <button onClick={handleSave} disabled={isUploading} className="px-6 py-2 bg-green-600 text-white rounded text-sm font-bold hover:bg-green-700 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default WriterDashboard;
