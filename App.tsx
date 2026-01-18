
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import ReaderHome from './pages/ReaderHome';
import ArticleView from './pages/ArticleView';
import WriterDashboard from './pages/WriterDashboard';
import EditorDashboard from './pages/EditorDashboard';
import EPaperReader from './pages/EPaperReader';
import ClassifiedsHome from './pages/ClassifiedsHome';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import InviteRegistration from './pages/InviteRegistration';
import ResetPassword from './pages/ResetPassword';
import { UserRole, Article, EPaperPage, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, ActivityLog } from './types';
import { APP_NAME } from './constants';
import { generateId, getDeviceId, createSlug, getDeviceMetadata, getPublicIP } from './utils';
import { supabase } from './supabaseClient';
import { ShieldAlert, Smartphone, Monitor, Check, MapPin, Tablet, Loader2 } from 'lucide-react';

const GLOBAL_SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

function App() {
  const [userRole, setUserRole] = useState<UserRole>(UserRole.READER);
  const [userName, setUserName] = useState<string | null>(null); 
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  
  const userIdRef = useRef<string | null>(null);
  const [activeVisitors, setActiveVisitors] = useState<number>(1);

  const [articles, setArticles] = useState<Article[]>([]);
  const [ePaperPages, setEPaperPages] = useState<EPaperPage[]>([]);
  const [categories, setCategories] = useState<string[]>(['General', 'World', 'Technology', 'Politics', 'Lifestyle', 'Business', 'Culture', 'Sports', 'Local']);
  const [tags, setTags] = useState<string[]>(['Breaking', 'Live', 'Exclusive', 'Opinion', 'Video', 'Podcast', 'Analysis']);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [adCategories, setAdCategories] = useState<string[]>(['Jobs', 'Real Estate', 'For Sale', 'Services', 'Community', 'Automotive', 'Events']);
  const [classifieds, setClassifieds] = useState<ClassifiedAd[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [globalAdsEnabled, setGlobalAdsEnabled] = useState(true);
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettings>({
    text: `${APP_NAME} Edition`,
    fontSize: 24,
    showLogo: true,
    logoUrl: 'https://cdn-icons-png.flaticon.com/512/21/21601.png',
    logoSize: 80,
    backgroundColor: '#1a1a1a',
    textColor: '#bfa17b'
  });
  
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const sessionStartTime = useRef<number>(Date.now());

  useEffect(() => { userIdRef.current = userId; }, [userId]);

  const handleLogActivity = async (action: ActivityLog['action'], details?: string) => {
      if (!userIdRef.current) return;
      const meta = getDeviceMetadata();
      const ip = await getPublicIP();
      const newLog: ActivityLog = { id: generateId(), userId: userIdRef.current, deviceName: meta.name, action, details: details || '', ip, location: 'Local', timestamp: new Date().toISOString() };
      setActivityLogs(prev => [newLog, ...prev]);
      try {
          await supabase.from('activity_logs').insert({ user_id: newLog.userId, device_name: newLog.deviceName, action: newLog.action, details: newLog.details, ip: newLog.ip, location: newLog.location, timestamp: newLog.timestamp });
      } catch (e) { console.warn("Log failed"); }
  };

  useEffect(() => {
    const channel = supabase.channel('cj_newsroom_visitors');
    channel.on('presence', { event: 'sync' }, () => {
        const count = Object.keys(channel.presenceState()).length;
        setActiveVisitors(count > 0 ? count : 1);
    }).subscribe(async (status) => { if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString(), device_id: getDeviceId(), role: userRole }); });
    return () => { supabase.removeChannel(channel); };
  }, [userRole]);

  const mapDbDevice = (d: any): TrustedDevice => ({ id: d.id, userId: d.user_id, deviceName: d.device_name, deviceType: d.device_type, location: d.location, lastActive: d.last_active, status: d.status, browser: d.browser, isPrimary: d.is_primary, isCurrent: d.id === getDeviceId() });

  const fetchDevices = async (uidOverride?: string) => {
      const targetUserId = uidOverride || userIdRef.current;
      if (!targetUserId) { setDevices([]); return; }
      const { data } = await supabase.from('trusted_devices').select('*').eq('user_id', targetUserId);
      if (data) setDevices(data.map(mapDbDevice));
  };

  const handleAddDevice = async (device: TrustedDevice) => {
      setDevices(prev => [...prev.filter(d => d.id !== device.id), { ...device, isCurrent: true }]);
      await supabase.from('trusted_devices').upsert({ id: device.id, user_id: device.userId, device_name: device.deviceName, device_type: device.deviceType, location: device.location, last_active: device.lastActive, status: device.status, browser: device.browser, is_primary: device.isPrimary });
  };

  const handleRevokeDevice = async (deviceId: string) => {
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      await supabase.from('trusted_devices').delete().eq('id', deviceId);
  };

  const handleUpdateDeviceStatus = async (deviceId: string, status: 'approved' | 'pending') => {
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status } : d));
      await supabase.from('trusted_devices').update({ status }).eq('id', deviceId);
  };

  const fetchData = async (force: boolean = false) => {
    try {
      const { data: settingsData } = await supabase.from('articles').select('content').eq('id', GLOBAL_SETTINGS_ID).maybeSingle();
      if (settingsData && settingsData.content) {
          try {
              const parsed = JSON.parse(settingsData.content);
              if (parsed.watermark) setWatermarkSettings(parsed.watermark);
              if (parsed.categories) setCategories(parsed.categories);
              if (parsed.tags) setTags(parsed.tags);
              if (parsed.adCategories) setAdCategories(parsed.adCategories);
              if (parsed.adsEnabled !== undefined) setGlobalAdsEnabled(parsed.adsEnabled);
          } catch (e) {}
      }
      
      const { data: artData } = await supabase.from('articles').select('*').neq('id', GLOBAL_SETTINGS_ID).order('publishedAt', { ascending: false });
      const { data: pageData } = await supabase.from('epaper_pages').select('*').order('date', { ascending: false }).order('page_number', { ascending: true });
      const { data: clsData } = await supabase.from('classifieds').select('*').order('id', { ascending: false });
      const { data: adData } = await supabase.from('advertisements').select('*');

      if (userIdRef.current) { await fetchDevices(userIdRef.current); }

      if (artData) setArticles(artData.map(a => ({ id: a.id, userId: a.user_id, slug: a.slug, title: a.title, englishTitle: a.english_title, subline: a.subline, author: a.author, authorAvatar: a.author_avatar, content: a.content, categories: a.category ? a.category.split(',').map((s: string) => s.trim()) : ['General'], tags: a.tags || [], imageUrl: a.image_url || a.imageUrl, publishedAt: a.published_at || a.publishedAt, status: a.status as ArticleStatus, summary: a.summary, isPremium: a.is_premium || a.isPremium, isFeatured: a.is_featured || a.isFeatured, isEditorsChoice: a.is_editors_choice || a.isEditorsChoice, views: a.views || 0 })));
      if (pageData) setEPaperPages(pageData.map(p => ({ id: p.id, date: p.date, pageNumber: p.page_number || p.pageNumber, imageUrl: p.image_url || p.imageUrl, regions: [] })));
      if (clsData) setClassifieds(clsData.map(c => ({ id: c.id, title: c.title, category: c.category, content: c.content, price: c.price, location: c.location, contactInfo: c.contact_info || c.contactInfo, postedAt: c.posted_at || c.postedAt })));
      if (adData) setAdvertisements(adData.map(ad => ({ id: ad.id, imageUrl: ad.image_url || ad.imageUrl, linkUrl: ad.link_url || ad.linkUrl, title: ad.title, size: ad.size, placement: ad.placement, targetCategory: ad.target_category || ad.targetCategory, isActive: ad.is_active !== undefined ? ad.is_active : true })));
      setLastSync(new Date());
    } catch (err) { console.error("Sync error", err); }
  };

  const navigate = (path: string) => { window.location.hash = path; setCurrentPath(path); window.scrollTo(0, 0); };
  const [currentPath, setCurrentPath] = useState(() => { const h = window.location.hash; return h.startsWith('#') ? h.slice(1) : (h || '/'); });

  useEffect(() => {
    fetchData();
    const sub = supabase.channel('global_sync').on('postgres_changes', { event: '*', schema: 'public' }, () => fetchData(true)).subscribe();
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) { setUserId(session.user.id); setUserName(session.user.user_metadata.full_name); setUserEmail(session.user.email); setUserRole(session.user.user_metadata.role || UserRole.READER); fetchDevices(session.user.id); }
        setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (session) { setUserId(session.user.id); setUserName(session.user.user_metadata.full_name); setUserEmail(session.user.email); setUserRole(session.user.user_metadata.role || UserRole.READER); }
        else { setUserId(null); setUserName(null); setUserEmail(null); setUserRole(UserRole.READER); }
    });
    return () => { sub.unsubscribe(); subscription.unsubscribe(); };
  }, []);

  const handleSaveGlobalConfig = async (w?: WatermarkSettings) => {
      const watermarkToSave = w || watermarkSettings;
      const payload = { id: GLOBAL_SETTINGS_ID, title: 'SYSTEM_CONFIG', content: JSON.stringify({ watermark: watermarkToSave, categories, tags, adCategories, adsEnabled: globalAdsEnabled }), author: 'SYSTEM', status: ArticleStatus.PUBLISHED, published_at: new Date().toISOString() };
      await supabase.from('articles').upsert(payload);
      fetchData(true);
  };

  const handleSaveArticle = async (article: Article) => {
    const slug = article.slug || createSlug(article.englishTitle || article.title);
    const payload = { id: article.id, title: article.title, english_title: article.englishTitle, slug, subline: article.subline, author: article.author, author_avatar: article.authorAvatar, content: article.content, category: article.categories.join(','), tags: article.tags, image_url: article.imageUrl, published_at: article.publishedAt, status: article.status, user_id: userId, is_featured: article.isFeatured };
    await supabase.from('articles').upsert(payload);
    handleLogActivity('EDIT', `Dispatch: ${article.title}`);
    fetchData(true);
  };

  const isDeviceAuthorized = () => { if (!userId) return false; const d = devices.find(d => d.id === getDeviceId() && d.userId === userId); return !d || d.status === 'approved'; };

  if (loading) return <div className="h-screen flex items-center justify-center bg-news-paper"><Loader2 className="animate-spin text-news-accent" /></div>;

  const path = currentPath.toLowerCase();
  let content: React.ReactNode = null;

  if (path === '/reset-password') content = <ResetPassword onNavigate={navigate} devices={devices} />;
  else if (path.startsWith('/invite')) content = <InviteRegistration onNavigate={navigate} />;
  else if (path === '/login' || (userId && !isDeviceAuthorized())) content = <Login onLogin={(r, n) => { setUserRole(r); setUserName(n); }} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={() => navigate('/reset-password')} />;
  else if (path === '/editor' && (userRole === UserRole.EDITOR || userRole === UserRole.ADMIN)) content = <EditorDashboard 
      articles={articles} ePaperPages={ePaperPages} categories={categories} tags={tags} adCategories={adCategories} classifieds={classifieds} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} watermarkSettings={watermarkSettings} 
      onToggleGlobalAds={e => { setGlobalAdsEnabled(e); handleSaveGlobalConfig(); }} onUpdateWatermarkSettings={w => { setWatermarkSettings(w); handleSaveGlobalConfig(w); }} 
      onUpdatePage={p => supabase.from('epaper_pages').update({ date: p.date, page_number: p.pageNumber }).eq('id', p.id).then(() => fetchData(true))} 
      onAddPage={p => supabase.from('epaper_pages').insert({ id: p.id, date: p.date, page_number: p.pageNumber, image_url: p.imageUrl, user_id: userId }).then(() => fetchData(true))} 
      onDeletePage={id => supabase.from('epaper_pages').delete().eq('id', id).then(() => fetchData(true))} 
      onDeleteArticle={id => supabase.from('articles').delete().eq('id', id).then(() => fetchData(true))} 
      onSaveArticle={handleSaveArticle} 
      onAddCategory={c => { setCategories(p => [...p, c]); handleSaveGlobalConfig(); }} 
      onDeleteCategory={c => { setCategories(p => p.filter(o => o !== c)); handleSaveGlobalConfig(); }} 
      onSaveTaxonomy={async () => handleSaveGlobalConfig()}
      onAddClassified={async c => { await supabase.from('classifieds').insert({ id: c.id, title: c.title, category: c.category, content: c.content, price: c.price, location: c.location, contact_info: c.contactInfo, posted_at: c.postedAt }); fetchData(true); }} 
      onDeleteClassified={async id => { await supabase.from('classifieds').delete().eq('id', id); fetchData(true); }} 
      onAddAdvertisement={async ad => { 
          const { error } = await supabase.from('advertisements').insert({ id: ad.id, title: ad.title, image_url: ad.imageUrl, link_url: ad.linkUrl, size: ad.size, placement: ad.placement, target_category: ad.targetCategory, is_active: ad.isActive }); 
          if (error) alert("Ad save failed: " + error.message);
          fetchData(true); 
      }} 
      onUpdateAdvertisement={async ad => { 
          const { error } = await supabase.from('advertisements').update({ title: ad.title, image_url: ad.imageUrl, link_url: ad.linkUrl, size: ad.size, placement: ad.placement, target_category: ad.targetCategory, is_active: ad.isActive }).eq('id', ad.id); 
          if (error) alert("Ad update failed: " + error.message);
          fetchData(true); 
      }} 
      onDeleteAdvertisement={async id => { await supabase.from('advertisements').delete().eq('id', id); fetchData(true); }} 
      onNavigate={navigate} userAvatar={userAvatar} userName={userName} userEmail={userEmail} devices={devices.filter(d => d.userId === userId)} onApproveDevice={id => handleUpdateDeviceStatus(id, 'approved')} onRejectDevice={handleRevokeDevice} onRevokeDevice={handleRevokeDevice} userId={userId} activeVisitors={activeVisitors} logs={activityLogs}
  />;
  else if (path === '/writer' && userRole === UserRole.WRITER) content = <WriterDashboard onSave={handleSaveArticle} onDelete={id => supabase.from('articles').delete().eq('id', id).then(() => fetchData(true))} existingArticles={articles} currentUserRole={userRole} categories={categories} onNavigate={navigate} userAvatar={userAvatar} userName={userName} userEmail={userEmail} devices={devices.filter(d => d.userId === userId)} onRevokeDevice={handleRevokeDevice} userId={userId} activeVisitors={activeVisitors}/>;
  else if (path === '/' || path === '/home') content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} categories={categories} />;
  else if (path.startsWith('/article/')) content = <ArticleView articles={articles} articleId={articles.find(a => a.slug === path.split('/article/')[1] || a.id === path.split('/article/')[1])?.id} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  else if (path.startsWith('/category/')) content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} selectedCategory={decodeURIComponent(path.split('/category/')[1])} categories={categories} />;
  else if (path === '/epaper') content = <EPaperReader pages={ePaperPages} articles={articles} onNavigate={navigate} watermarkSettings={watermarkSettings} onSaveSettings={handleSaveGlobalConfig} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  else if (path === '/classifieds') content = <ClassifiedsHome classifieds={classifieds} adCategories={adCategories} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  else content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} categories={categories} />;

  const pendingDevices = devices.filter(d => d.status === 'pending' && d.userId === userId);

  return (
    <>
      <Layout currentRole={userRole} onRoleChange={setUserRole} currentPath={currentPath} onNavigate={navigate} userName={userName} userAvatar={userAvatar} onForceSync={() => fetchData(true)} lastSync={lastSync} articles={articles} categories={categories} pendingDevices={pendingDevices} onApproveDevice={id => handleUpdateDeviceStatus(id, 'approved')} onRejectDevice={handleRevokeDevice}>
        {content}
      </Layout>
      {pendingDevices.length > 0 && devices.find(d => d.id === getDeviceId())?.isPrimary && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
             <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100">
                <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
                   <div className="p-2 bg-white/20 rounded-full animate-pulse"><ShieldAlert className="text-white" size={24} /></div>
                   <div>
                      <h3 className="text-white font-black uppercase tracking-widest text-sm">Security Handshake</h3>
                      <p className="text-red-100 text-xs">New Authorization Request</p>
                   </div>
                </div>
                <div className="p-6">
                   <div className="space-y-6">
                        <div className="text-center"><p className="text-gray-600 text-sm">A new device is requesting access to your station.</p></div>
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="bg-white p-2 rounded-full border border-gray-200 text-gray-500"><Monitor size={20}/></div>
                                <div><p className="font-bold text-gray-900 text-sm">{pendingDevices[0].deviceName}</p><p className="text-xs text-gray-500">{pendingDevices[0].browser}</p></div>
                            </div>
                            <div className="border-t border-gray-200 pt-3 flex items-center gap-2 text-xs text-gray-500"><MapPin size={14}/> {pendingDevices[0].location}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => handleRevokeDevice(pendingDevices[0].id)} className="py-3 rounded-lg border border-red-200 text-red-600 font-bold uppercase text-xs hover:bg-red-50 transition-colors">Block Access</button>
                            <button onClick={() => handleUpdateDeviceStatus(pendingDevices[0].id, 'approved')} className="py-3 rounded-lg bg-green-600 text-white font-bold uppercase text-xs hover:bg-green-700 shadow-lg transition-colors flex items-center justify-center gap-2"><Check size={16}/> Approve</button>
                        </div>
                   </div>
                </div>
             </div>
          </div>
      )}
    </>
  );
}

export default App;
