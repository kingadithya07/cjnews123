
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
import { UserRole, Article, EPaperPage, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, AdSize, ActivityLog, UserProfile } from './types';
import { APP_NAME } from './constants';
import { generateId, getDeviceId, createSlug, getDeviceMetadata, getPublicIP } from './utils';
import { supabase } from './supabaseClient';
import { ShieldAlert, Monitor, Check, MapPin } from 'lucide-react';

const GLOBAL_SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

function App() {
  const [userRole, setUserRole] = useState<UserRole>(UserRole.READER);
  const [userName, setUserName] = useState<string | null>(null); 
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
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
  
  // New State for Translation API Key
  const [translationApiKey, setTranslationApiKey] = useState('');

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
  const [allStaffUsers, setAllStaffUsers] = useState<UserProfile[]>([]);
  const sessionStartTime = useRef<number>(Date.now());

  useEffect(() => {
      userIdRef.current = userId;
  }, [userId]);

  const handleLogActivity = async (action: ActivityLog['action'], details?: string) => {
      if (!userIdRef.current) return;
      const meta = getDeviceMetadata();
      const ip = await getPublicIP();
      const newLog: ActivityLog = {
          id: generateId(),
          userId: userIdRef.current,
          deviceName: meta.name,
          action,
          details: details || '',
          ip,
          location: 'Detected via IP',
          timestamp: new Date().toISOString()
      };
      setActivityLogs(prev => [newLog, ...prev]);
      try {
          await supabase.from('activity_logs').insert({
              user_id: newLog.userId,
              device_name: newLog.deviceName,
              action: newLog.action,
              details: newLog.details,
              ip: newLog.ip,
              location: newLog.location,
              timestamp: newLog.timestamp
          });
      } catch (e) {
          console.warn("Log system unavailable");
      }
  };

  const fetchLogs = async () => {
      if (!userIdRef.current) return;
      try {
          const { data, error } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(200);
          if (!error && data) {
              const mappedLogs: ActivityLog[] = data.map((l: any) => ({
                  id: l.id, userId: l.user_id, deviceName: l.device_name, action: l.action, details: l.details, ip: l.ip, location: l.location, timestamp: l.timestamp
              }));
              setActivityLogs(mappedLogs);
          }
      } catch (e) { console.warn("Log fetch failed"); }
  };

  useEffect(() => {
    const channel = supabase.channel('cj_newsroom_visitors');
    channel.on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const count = Object.keys(newState).length;
        setActiveVisitors(count > 0 ? count : 1);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString(), device_id: getDeviceId(), role: userRole });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [userRole]);

  const mapDbDevice = (d: any): TrustedDevice => {
      const currentId = getDeviceId();
      return {
          id: d.id, userId: d.user_id, deviceName: d.device_name, deviceType: d.device_type, location: d.location, lastActive: d.last_active, status: d.status, browser: d.browser, isPrimary: d.is_primary, isCurrent: d.id === currentId 
      };
  };

  const fetchDevices = async (uidOverride?: string) => {
      const targetUserId = uidOverride || userIdRef.current;
      if (!targetUserId) { setDevices([]); return; }
      const { data, error } = await supabase.from('trusted_devices').select('*');
      
      if (error) { console.error("Error fetching devices:", error); return; }
      if (data) { 
          const mappedDevices = data.map(mapDbDevice);
          if (userRole === UserRole.EDITOR || userRole === UserRole.ADMIN) {
              setDevices(mappedDevices);
          } else {
              setDevices(mappedDevices.filter(d => d.userId === targetUserId));
          }
      }
  };

  useEffect(() => {
      if (userRole !== UserRole.EDITOR && userRole !== UserRole.ADMIN) return;

      const deriveUsers = () => {
          const userMap = new Map<string, UserProfile>();
          activityLogs.forEach(log => {
              if (!userMap.has(log.userId)) {
                  userMap.set(log.userId, {
                      id: log.userId,
                      name: 'Staff Member',
                      email: 'Hidden',
                      role: UserRole.WRITER,
                      joinedAt: log.timestamp,
                      lastIp: log.ip || 'Unknown',
                      status: 'active'
                  });
              } else {
                  const existing = userMap.get(log.userId)!;
                  if (new Date(log.timestamp) < new Date(existing.joinedAt)) existing.joinedAt = log.timestamp;
              }
          });

          // Correct IP using latest log
          activityLogs.forEach(log => {
             const user = userMap.get(log.userId);
             if (user) {
                 if (user.lastIp === 'Unknown' || user.lastIp === 'Detected via IP') user.lastIp = log.ip || 'Unknown';
             }
          });

          if (userId && userMap.has(userId)) {
              const self = userMap.get(userId)!;
              self.name = userName || 'Me';
              self.email = userEmail || '';
              self.role = userRole;
          }
          setAllStaffUsers(Array.from(userMap.values()));
      };
      deriveUsers();
  }, [activityLogs, devices, userRole, userId, userName, userEmail]);

  const handleAddDevice = async (device: TrustedDevice) => {
      setDevices(prev => { if (prev.some(d => d.id === device.id)) return prev; return [...prev, { ...device, isCurrent: true }]; });
      const dbDevice = {
          id: device.id, user_id: device.userId, device_name: device.deviceName, device_type: device.deviceType, location: device.location, last_active: device.lastActive, status: device.status, browser: device.browser, is_primary: device.isPrimary
      };
      const { error } = await supabase.from('trusted_devices').upsert(dbDevice);
      if (error) { console.error("Device add failed", error); fetchDevices(); }
  };

  const handleRevokeDevice = async (deviceId: string) => {
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      const { error } = await supabase.from('trusted_devices').delete().eq('id', deviceId);
      if (error) { alert("Failed to delete device: " + error.message); fetchDevices(); }
  };

  const handleUpdateDeviceStatus = async (deviceId: string, status: 'approved' | 'pending') => {
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status } : d));
      const { error } = await supabase.from('trusted_devices').update({ status }).eq('id', deviceId);
      if (error) { console.error("Status update failed", error); fetchDevices(); }
  };

  const handleBlockUser = async (targetUserId: string) => {
      const userDevices = devices.filter(d => d.userId === targetUserId);
      for (const device of userDevices) {
          await supabase.from('trusted_devices').delete().eq('id', device.id);
      }
      setDevices(prev => prev.filter(d => d.userId !== targetUserId));
      handleLogActivity('EDIT', `Blocked User ${targetUserId.substring(0, 8)}`);
      alert("User blocked. All trusted devices for this user have been revoked.");
  };

  const parseTags = (input: any): string[] => {
      if (!input) return [];
      if (Array.isArray(input)) return input;
      if (typeof input === 'string') {
          let cleaned = input.trim();
          if (cleaned.startsWith('{') && cleaned.endsWith('}')) cleaned = cleaned.substring(1, cleaned.length - 1);
          return cleaned.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
      }
      return [];
  };

  const fetchData = async (force: boolean = false) => {
    try {
      const { data: settingsData } = await supabase.from('articles').select('content, published_at').eq('id', GLOBAL_SETTINGS_ID).maybeSingle();
      if (settingsData && settingsData.content) {
          try {
              const parsedSettings = JSON.parse(settingsData.content);
              if (parsedSettings.watermark) setWatermarkSettings(parsedSettings.watermark);
              if (parsedSettings.categories && Array.isArray(parsedSettings.categories)) setCategories(parsedSettings.categories);
              if (parsedSettings.tags && Array.isArray(parsedSettings.tags)) setTags(parsedSettings.tags);
              if (parsedSettings.adCategories && Array.isArray(parsedSettings.adCategories)) setAdCategories(parsedSettings.adCategories);
              if (parsedSettings.adsEnabled !== undefined) setGlobalAdsEnabled(parsedSettings.adsEnabled);
              // Load API Key
              if (parsedSettings.translationApiKey) setTranslationApiKey(parsedSettings.translationApiKey);
          } catch (e) { console.error("Failed to parse global settings", e); }
      }
      let { data: artData } = await supabase.from('articles').select('*').neq('id', GLOBAL_SETTINGS_ID).order('publishedAt', { ascending: false });
      let { data: pageData } = await supabase.from('epaper_pages').select('*').order('date', { ascending: false }).order('pageNumber', { ascending: true });
      const { data: clsData } = await supabase.from('classifieds').select('*').order('id', { ascending: false });
      const { data: adData } = await supabase.from('advertisements').select('*');

      if (userIdRef.current) { await fetchDevices(); fetchLogs(); }

      if (artData) {
        setArticles(artData.map(a => ({
          id: a.id, userId: a.user_id, slug: a.slug, title: a.title, englishTitle: a.english_title || undefined, subline: a.subline,
          author: a.author, authorAvatar: a.authorAvatar || a.author_avatar, content: a.content,
          categories: a.category ? a.category.split(',').map((s: string) => s.trim()).filter(Boolean) : ['General'],
          tags: parseTags(a.tags),
          imageUrl: a.imageUrl || a.image_url || 'https://placehold.co/800x400?text=No+Image',
          publishedAt: a.publishedAt || a.published_at || new Date().toISOString(),
          status: (a.status as ArticleStatus) || ArticleStatus.PUBLISHED,
          summary: a.summary, isPremium: a.isPremium || a.is_premium || false, isFeatured: a.isFeatured || a.is_featured || false,
          isEditorsChoice: a.isEditorsChoice || a.is_editors_choice || false, views: a.views || 0
        })) as Article[]);
      }
      if (pageData) {
        setEPaperPages(pageData.map(p => ({
          id: p.id, date: p.date, pageNumber: p.pageNumber !== undefined ? p.pageNumber : (p.page_number !== undefined ? p.page_number : 1),
          imageUrl: p.imageUrl || p.image_url || 'https://placehold.co/600x800?text=No+Scan', regions: []
        })) as EPaperPage[]);
      }
      if (clsData) {
        setClassifieds(clsData.map(c => ({
          id: c.id, title: c.title, category: c.category, content: c.content, price: c.price, location: c.location,
          contactInfo: c.contactInfo || c.contact_info, postedAt: c.postedAt || c.posted_at || new Date().toISOString()
        })) as ClassifiedAd[]);
      }
      if (adData) {
        setAdvertisements(adData.map(ad => ({
          id: ad.id, imageUrl: ad.imageUrl || ad.image_url, linkUrl: ad.linkUrl || ad.link_url, title: ad.title,
          size: ad.size, customWidth: ad.customWidth, customHeight: ad.customHeight, placement: ad.placement, targetCategory: ad.targetCategory,
          isActive: ad.isActive !== undefined ? ad.isActive : (ad.is_active !== undefined ? ad.is_active : true)
        })) as Advertisement[]);
      }
      setLastSync(new Date());
    } catch (err) { console.error("Critical error in fetchData:", err); }
  };

  const getPathFromHash = () => {
     const hash = window.location.hash;
     if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('error=')) return '/auth-callback'; 
     if ((!hash || hash === '#') && window.location.pathname.length > 1) return window.location.pathname + window.location.search;
     if (!hash || hash === '#') return '/';
     return hash.startsWith('#') ? hash.slice(1) : hash;
  };

  const [currentPath, setCurrentPath] = useState(getPathFromHash());
  
  const navigate = (path: string) => {
    window.location.hash = path;
    setCurrentPath(path);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const handleHashChange = () => {
        const newPath = getPathFromHash();
        if (newPath !== '/auth-callback') setCurrentPath(newPath);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
      if (currentPath === '/auth-callback') {
          const timer = setTimeout(() => { navigate('/'); }, 5000);
          return () => clearTimeout(timer);
      }
  }, [currentPath]);

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('newsroom_global_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epaper_pages' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classifieds' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trusted_devices' }, (payload) => {
          if (!userIdRef.current) return;
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
              fetchDevices();
          }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => { fetchLogs(); })
      .subscribe();

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUserId(session.user.id); userIdRef.current = session.user.id; sessionStartTime.current = Date.now();
          setUserName(session.user.user_metadata.full_name || 'Staff');
          setUserEmail(session.user.email || null);
          setUserRole(session.user.user_metadata.role || UserRole.READER);
          setUserAvatar(session.user.user_metadata.avatar_url || null);
          await fetchDevices(); fetchLogs();
        }
      } catch (err) { console.warn("Auth check failed:", err); } finally { setLoading(false); }
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') { setIsRecovering(true); navigate('/reset-password'); }
      if (event === 'SIGNED_IN' && session) {
          sessionStartTime.current = Date.now(); setUserId(session.user.id); userIdRef.current = session.user.id;
          handleLogActivity('LOGIN', 'Session Started'); fetchDevices(); fetchLogs();
      }
      if (event === 'SIGNED_OUT') {
          const duration = Math.round((Date.now() - sessionStartTime.current) / 60000); 
          await handleLogActivity('LOGOUT', `Duration: ${duration} mins`);
          setUserId(null); userIdRef.current = null; setUserName(null); setUserEmail(null); setUserRole(UserRole.READER); setUserAvatar(null); setDevices([]); setActivityLogs([]); setAllStaffUsers([]);
      }
      if (session) {
        setUserId(session.user.id); userIdRef.current = session.user.id; 
        setUserName(session.user.user_metadata.full_name || 'Staff');
        setUserEmail(session.user.email || null);
        setUserRole(session.user.user_metadata.role || UserRole.READER);
        setUserAvatar(session.user.user_metadata.avatar_url || null);
      }
    });
    return () => { supabase.removeChannel(channel); subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
      if (userId && devices.length > 0) {
          const currentId = getDeviceId();
          const currentDeviceEntry = devices.find(d => d.id === currentId && d.userId === userId);
          if (currentDeviceEntry && currentDeviceEntry.status !== 'approved' && currentDeviceEntry.status !== 'pending') {
               supabase.auth.signOut().then(() => { navigate('/login'); alert("Device access revoked."); });
          }
      }
  }, [devices, userId]);

  const handleLogin = (role: UserRole, name: string, avatar?: string) => { setUserRole(role); setUserName(name); if (avatar) setUserAvatar(avatar); };
  
  const handleSaveGlobalConfig = async (w?: WatermarkSettings, adsEnabledOverride?: boolean, apiKeyOverride?: string) => { 
      const watermarkToSave = w || watermarkSettings;
      if (w) setWatermarkSettings(w);
      const adsEnabledToSave = adsEnabledOverride !== undefined ? adsEnabledOverride : globalAdsEnabled;
      const apiKeyToSave = apiKeyOverride !== undefined ? apiKeyOverride : translationApiKey;
      if (apiKeyOverride !== undefined) setTranslationApiKey(apiKeyOverride);

      const payload = {
          id: GLOBAL_SETTINGS_ID,
          title: 'SYSTEM_CONFIG',
          subline: 'Global System Configuration',
          content: JSON.stringify({ 
              watermark: watermarkToSave,
              categories: categories,
              tags: tags,
              adCategories: adCategories,
              adsEnabled: adsEnabledToSave,
              translationApiKey: apiKeyToSave // Store Key in DB
          }),
          author: 'SYSTEM',
          category: 'Config',
          imageUrl: 'https://placehold.co/100?text=Config',
          image_url: 'https://placehold.co/100?text=Config',
          publishedAt: new Date().toISOString(),
          published_at: new Date().toISOString(),
          status: ArticleStatus.PUBLISHED, 
          user_id: userId,
          summary: 'Internal system configuration'
      };

      const { error } = await supabase.from('articles').upsert(payload);
      if (error) { alert(`Failed to save settings globally: ${error.message}`); } else { fetchData(true); }
  };
  
  const handleToggleGlobalAds = async (e: boolean) => { 
      setGlobalAdsEnabled(e);
      handleSaveGlobalConfig(undefined, e); 
  };

  const handleUpdateTranslationKey = async (key: string) => {
      handleSaveGlobalConfig(undefined, undefined, key);
  };

  const handleSaveArticle = async (article: Article) => {
    const slugBase = article.englishTitle || article.title;
    const articleSlug = article.slug || createSlug(slugBase);
    const articleWithSlug = { ...article, slug: articleSlug };

    setArticles(prev => {
        const exists = prev.find(a => a.id === article.id);
        return exists ? prev.map(a => a.id === article.id ? articleWithSlug : a) : [articleWithSlug, ...prev];
    });

    const payload = {
        id: article.id,
        title: article.title,
        english_title: article.englishTitle,
        slug: articleSlug,
        subline: article.subline,
        author: article.author,
        author_avatar: article.authorAvatar,
        content: article.content,
        category: article.categories.join(', '),
        tags: article.tags,
        imageUrl: article.imageUrl,
        image_url: article.imageUrl,
        publishedAt: article.publishedAt,
        published_at: article.publishedAt,
        status: article.status,
        user_id: userId,
        is_featured: article.isFeatured,
        is_editors_choice: article.isEditorsChoice
    };

    const { error } = await supabase.from('articles').upsert(payload);
    if (error) { alert("Failed to save article: " + error.message); fetchData(true); } else { handleLogActivity('EDIT', `Article: ${article.title.substring(0, 20)}...`); }
  };
  
  const handleDeleteArticle = async (id: string) => { 
      const previousArticles = [...articles];
      setArticles(prev => prev.filter(a => a.id !== id));
      try {
          const { error } = await supabase.from('articles').delete().eq('id', id);
          if (error) throw error;
      } catch (error: any) { alert(`Failed to delete: ${error.message}`); setArticles(previousArticles); fetchData(true); }
  };
  
  const handleAddPage = async (p: EPaperPage) => { 
    setEPaperPages(prev => [p, ...prev]);
    const payload = {
      id: p.id,
      date: p.date,
      pageNumber: p.pageNumber,
      page_number: p.pageNumber,
      imageUrl: p.imageUrl,
      image_url: p.imageUrl,
      user_id: userId
    };
    const { error } = await supabase.from('epaper_pages').insert(payload);
    if (error) { alert("Backend Sync Error: " + error.message); fetchData(true); }
  };
  
  const handleDeletePage = async (id: string) => { 
    const prevPages = [...ePaperPages];
    setEPaperPages(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('epaper_pages').delete().eq('id', id);
    if (error) { alert("Failed to delete page: " + error.message); setEPaperPages(prevPages); }
  };
  
  const handleUpdatePage = async (page: EPaperPage) => { 
    const { error } = await supabase.from('epaper_pages').update({
        date: page.date,
        pageNumber: page.pageNumber,
        page_number: page.pageNumber
    }).eq('id', page.id);
    if (error) console.error("Page update error:", error.message);
    fetchData(true); 
  };

  const isDeviceAuthorized = () => {
    if (!userId) return false;
    const currentDeviceId = getDeviceId();
    const myDevices = devices.filter(d => d.userId === userId);
    if (myDevices.length === 0) return true;
    const currentEntry = myDevices.find(d => d.id === currentDeviceId);
    return currentEntry?.status === 'approved';
  };

  if (loading || currentPath === '/auth-callback') {
      return (
          <div className="h-screen flex items-center justify-center bg-news-paper">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-news-accent border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-news-black font-serif font-bold animate-pulse">Initializing Newsroom...</p>
              </div>
          </div>
      );
  }

  const currentDeviceId = getDeviceId();
  const currentDeviceEntry = devices.find(d => d.id === currentDeviceId);
  const isPrimary = currentDeviceEntry?.isPrimary ?? false;
  const pendingDevice = devices.find(d => d.status === 'pending');
  const path = currentPath.toLowerCase();
  
  let content: React.ReactNode = null;
  
  if (path === '/reset-password') {
    content = <ResetPassword onNavigate={navigate} devices={devices} />;
  } else if (path.startsWith('/invite')) {
    content = <InviteRegistration onNavigate={navigate} />;
  } else if (path.startsWith('/staff/login')) {
    content = <StaffLogin onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={() => navigate('/reset-password')} />;
  } else if (path === '/login' || (userId && !isDeviceAuthorized() && !isRecovering)) {
    content = <Login onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={() => navigate('/reset-password')} />;
  } else if (path === '/editor' && (userRole === UserRole.EDITOR || userRole === UserRole.ADMIN) && isDeviceAuthorized()) {
    content = <EditorDashboard 
        articles={articles} ePaperPages={ePaperPages} categories={categories} tags={tags} adCategories={adCategories} classifieds={classifieds} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} watermarkSettings={watermarkSettings} 
        onToggleGlobalAds={handleToggleGlobalAds} onUpdateWatermarkSettings={(w) => handleSaveGlobalConfig(w)} onUpdatePage={handleUpdatePage} onAddPage={handleAddPage} onDeletePage={handleDeletePage} onDeleteArticle={handleDeleteArticle} onSaveArticle={handleSaveArticle} 
        onAddCategory={c => setCategories(p => [...p, c])} onDeleteCategory={c => setCategories(p => p.filter(o => o !== c))} onAddTag={t => setTags(p => [...p, t])} onDeleteTag={t => setTags(p => p.filter(o => o !== t))} 
        onAddAdCategory={c => setAdCategories(p => [...p, c])} onDeleteAdCategory={c => setAdCategories(p => p.filter(o => o !== c))} onSaveTaxonomy={() => handleSaveGlobalConfig()} 
        onAddClassified={async (c) => { await supabase.from('classifieds').insert(c); fetchData(true); }} onDeleteClassified={async (id) => { await supabase.from('classifieds').delete().eq('id', id); fetchData(true); }} 
        onAddAdvertisement={async (ad) => { await supabase.from('advertisements').insert({ ...ad, is_active: ad.isActive, image_url: ad.imageUrl, link_url: ad.linkUrl, custom_width: ad.customWidth, custom_height: ad.customHeight, target_category: ad.targetCategory }); fetchData(true); }} 
        onUpdateAdvertisement={async (ad) => { await supabase.from('advertisements').update({ ...ad, is_active: ad.isActive, image_url: ad.imageUrl, link_url: ad.linkUrl, custom_width: ad.customWidth, custom_height: ad.customHeight, target_category: ad.targetCategory }).eq('id', ad.id); fetchData(true); }} 
        onDeleteAdvertisement={async (id) => { await supabase.from('advertisements').delete().eq('id', id); fetchData(true); }} 
        onNavigate={navigate} userAvatar={userAvatar} userName={userName} userEmail={userEmail} devices={devices} onApproveDevice={(id) => handleUpdateDeviceStatus(id, 'approved')} onRejectDevice={(id) => handleRevokeDevice(id)} onRevokeDevice={handleRevokeDevice} userId={userId} activeVisitors={activeVisitors} logs={activityLogs}
        users={allStaffUsers} onBlockUser={handleBlockUser}
        translationApiKey={translationApiKey} onUpdateTranslationKey={handleUpdateTranslationKey}
    />;
  } else if (path === '/writer' && userRole === UserRole.WRITER && isDeviceAuthorized()) {
    content = <WriterDashboard onSave={handleSaveArticle} onDelete={handleDeleteArticle} existingArticles={articles} currentUserRole={userRole} categories={categories} onNavigate={navigate} userAvatar={userAvatar} userName={userName} userEmail={userEmail} devices={devices.filter(d => d.userId === userId)} onRevokeDevice={handleRevokeDevice} userId={userId} activeVisitors={activeVisitors} translationApiKey={translationApiKey} />;
  } else if (path === '/' || path === '/home') {
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} categories={categories} />;
  } else if (path.startsWith('/article/')) {
    const slugOrId = currentPath.split('/article/')[1];
    let targetId = slugOrId;
    const foundBySlug = articles.find(a => a.slug === slugOrId || a.id === slugOrId || createSlug(a.englishTitle || a.title) === slugOrId);
    if (foundBySlug) targetId = foundBySlug.id;
    content = <ArticleView articles={articles} articleId={targetId} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  } else if (path.startsWith('/category/')) {
    const cat = decodeURIComponent(currentPath.split('/category/')[1]);
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} selectedCategory={cat} categories={categories} />;
  } else if (path.startsWith('/tag/')) {
    const tag = decodeURIComponent(currentPath.split('/tag/')[1]);
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} selectedTag={tag} categories={categories} />;
  } else if (path === '/epaper') {
    content = <EPaperReader pages={ePaperPages} articles={articles} onNavigate={navigate} watermarkSettings={watermarkSettings} onSaveSettings={handleSaveGlobalConfig} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  } else if (path === '/classifieds') {
    content = <ClassifiedsHome classifieds={classifieds} adCategories={adCategories} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  } else {
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} categories={categories} />;
  }

  return (
    <>
    <Layout currentRole={userRole} onRoleChange={setUserRole} currentPath={currentPath} onNavigate={navigate} userName={userName} userAvatar={userAvatar} onForceSync={() => fetchData(true)} lastSync={lastSync} articles={articles} categories={categories} pendingDevices={devices.filter(d => d.status === 'pending' && d.userId === userId)} onApproveDevice={id => handleUpdateDeviceStatus(id, 'approved')} onRejectDevice={id => handleRevokeDevice(id)}>
      {content}
    </Layout>
    {isPrimary && pendingDevice && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-red-100">
              <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
                 <div className="p-2 bg-white/20 rounded-full animate-pulse"><ShieldAlert className="text-white" size={24} /></div>
                 <div>
                    <h3 className="text-white font-black uppercase tracking-widest text-sm">Security Alert</h3>
                    <p className="text-red-100 text-xs">New Device Access Request</p>
                 </div>
              </div>
              <div className="p-6">
                 <div className="space-y-6">
                      <div className="text-center"><p className="text-gray-600 text-sm">A new device is attempting to access your workspace or a team member account.</p></div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                          <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded-full border border-gray-200 text-gray-500"><Monitor size={20}/></div>
                              <div><p className="font-bold text-gray-900 text-sm">{pendingDevice.deviceName}</p><p className="text-xs text-gray-500">{pendingDevice.browser}</p></div>
                          </div>
                          <div className="border-t border-gray-200 pt-3 flex items-center gap-2 text-xs text-gray-500"><MapPin size={14}/> {pendingDevice.location}</div>
                          <div className="text-[10px] text-gray-400 font-mono pt-1">ID: {pendingDevice.id.substring(0,8)}...</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleRevokeDevice(pendingDevice.id)} className="py-3 rounded-lg border border-red-200 text-red-600 font-bold uppercase text-xs hover:bg-red-50 transition-colors">Block Access</button>
                          <button onClick={() => handleUpdateDeviceStatus(pendingDevice.id, 'approved')} className="py-3 rounded-lg bg-green-600 text-white font-bold uppercase text-xs hover:bg-green-700 shadow-lg transition-colors flex items-center justify-center gap-2"><Check size={16}/> Approve</button>
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
