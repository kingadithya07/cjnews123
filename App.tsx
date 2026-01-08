
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
import ResetPassword from './pages/ResetPassword';
import { UserRole, Article, EPaperPage, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice } from './types';
import { MOCK_ARTICLES, MOCK_EPAPER, APP_NAME } from './constants';
import { generateId, getDeviceId, createSlug } from './utils';
import { supabase } from './supabaseClient';

// Use a fixed UUID for global settings to ensure compatibility with UUID columns in Supabase
const GLOBAL_SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

function App() {
  const [userRole, setUserRole] = useState<UserRole>(UserRole.READER);
  const [userName, setUserName] = useState<string | null>(null); 
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  
  // Real-time Analytics State
  const [activeVisitors, setActiveVisitors] = useState<number>(1);

  // Persistence states
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

  // --- REAL-TIME VISITOR TRACKING (PRESENCE) ---
  useEffect(() => {
    // Unique channel name for the app
    const channel = supabase.channel('cj_newsroom_visitors');

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        // Count distinct presence IDs (connected clients)
        const count = Object.keys(newState).length;
        setActiveVisitors(count > 0 ? count : 1);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track this client
          await channel.track({ 
            online_at: new Date().toISOString(),
            device_id: getDeviceId(),
            role: userRole 
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);

  // --- DEVICE MANAGEMENT (DB TABLE) ---
  const fetchDevices = async () => {
      if (!userId) return;
      // Fetch from 'trusted_devices' table instead of metadata
      const { data, error } = await supabase.from('trusted_devices').select('*');
      if (data) {
          const currentId = getDeviceId();
          const mappedDevices: TrustedDevice[] = data.map((d: any) => ({
              id: d.id,
              userId: d.user_id,
              deviceName: d.device_name,
              deviceType: d.device_type,
              location: d.location,
              lastActive: d.last_active,
              status: d.status,
              browser: d.browser,
              isPrimary: d.is_primary,
              // CALCULATE isCurrent dynamically. Do NOT rely on DB value.
              // This ensures 'Delete' button shows for remote devices.
              isCurrent: d.id === currentId 
          }));
          setDevices(mappedDevices);
      }
  };

  const handleAddDevice = async (device: TrustedDevice) => {
      // Optimistic Update
      setDevices(prev => [...prev, { ...device, isCurrent: true }]); // Local is always current initially

      const dbDevice = {
          id: device.id,
          user_id: device.userId,
          device_name: device.deviceName,
          device_type: device.deviceType,
          location: device.location,
          last_active: device.lastActive,
          status: device.status,
          browser: device.browser,
          is_primary: device.isPrimary
          // Removed isCurrent from DB payload to avoid stale state
      };

      const { error } = await supabase.from('trusted_devices').upsert(dbDevice);
      if (error) {
          console.error("Device add failed", error);
          fetchDevices(); // Revert on error
      }
  };

  const handleRevokeDevice = async (deviceId: string) => {
      // Optimistic
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      
      const { error } = await supabase.from('trusted_devices').delete().eq('id', deviceId);
      if (error) {
          alert("Failed to delete device: " + error.message);
          fetchDevices();
      }
  };

  const handleUpdateDeviceStatus = async (deviceId: string, status: 'approved' | 'pending') => {
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status } : d));
      const { error } = await supabase.from('trusted_devices').update({ status }).eq('id', deviceId);
      if (error) {
          console.error("Status update failed", error);
          fetchDevices();
      }
  };

  // --- DATA SYNC FROM SUPABASE ---
  const fetchData = async (force: boolean = false) => {
    try {
      // 1. Global Settings
      const { data: settingsData } = await supabase
        .from('articles')
        .select('content, published_at')
        .eq('id', GLOBAL_SETTINGS_ID)
        .maybeSingle();

      if (settingsData && settingsData.content) {
          try {
              const parsedSettings = JSON.parse(settingsData.content);
              if (parsedSettings.watermark) setWatermarkSettings(parsedSettings.watermark);
              if (parsedSettings.categories && Array.isArray(parsedSettings.categories)) setCategories(parsedSettings.categories);
              if (parsedSettings.tags && Array.isArray(parsedSettings.tags)) setTags(parsedSettings.tags);
              if (parsedSettings.adCategories && Array.isArray(parsedSettings.adCategories)) setAdCategories(parsedSettings.adCategories);
              if (parsedSettings.adsEnabled !== undefined) setGlobalAdsEnabled(parsedSettings.adsEnabled);
          } catch (e) { console.error("Failed to parse global settings", e); }
      }

      // 2. Articles
      let { data: artData } = await supabase.from('articles').select('*').neq('id', GLOBAL_SETTINGS_ID).order('publishedAt', { ascending: false });
      
      // 3. E-Paper
      let { data: pageData } = await supabase.from('epaper_pages').select('*').order('date', { ascending: false }).order('pageNumber', { ascending: true });

      // 4. Classifieds & Ads
      const { data: clsData } = await supabase.from('classifieds').select('*').order('id', { ascending: false });
      const { data: adData } = await supabase.from('advertisements').select('*');

      // 5. Trusted Devices (Only if logged in)
      if (userId) {
          await fetchDevices();
      }

      // --- MAPPING LAYER ---
      if (artData) {
        setArticles(artData.map(a => ({
          id: a.id,
          userId: a.user_id, // Map database column to type
          slug: a.slug, // Map slug
          title: a.title,
          englishTitle: a.english_title || undefined, // Map English Title
          subline: a.subline,
          author: a.author,
          authorAvatar: a.authorAvatar || a.author_avatar,
          content: a.content,
          categories: a.category ? a.category.split(',').map((s: string) => s.trim()).filter(Boolean) : ['General'],
          imageUrl: a.imageUrl || a.image_url || 'https://placehold.co/800x400?text=No+Image',
          publishedAt: a.publishedAt || a.published_at || new Date().toISOString(),
          status: (a.status as ArticleStatus) || ArticleStatus.PUBLISHED,
          summary: a.summary,
          isPremium: a.isPremium || a.is_premium || false,
          isFeatured: a.isFeatured || a.is_featured || false,
          isEditorsChoice: a.isEditorsChoice || a.is_editors_choice || false,
          views: a.views || 0 // Map views from DB
        })) as Article[]);
      }

      if (pageData) {
        setEPaperPages(pageData.map(p => ({
          id: p.id,
          date: p.date,
          pageNumber: p.pageNumber !== undefined ? p.pageNumber : (p.page_number !== undefined ? p.page_number : 1),
          imageUrl: p.imageUrl || p.image_url || 'https://placehold.co/600x800?text=No+Scan',
          regions: []
        })) as EPaperPage[]);
      }

      if (clsData) {
        setClassifieds(clsData.map(c => ({
          id: c.id,
          title: c.title,
          category: c.category,
          content: c.content,
          price: c.price,
          location: c.location,
          contactInfo: c.contactInfo || c.contact_info,
          postedAt: c.postedAt || c.posted_at || new Date().toISOString()
        })) as ClassifiedAd[]);
      }

      if (adData) {
        setAdvertisements(adData.map(ad => ({
          id: ad.id,
          imageUrl: ad.imageUrl || ad.image_url,
          linkUrl: ad.linkUrl || ad.link_url,
          title: ad.title,
          size: ad.size,
          customWidth: ad.customWidth, 
          customHeight: ad.customHeight,
          placement: ad.placement,
          targetCategory: ad.targetCategory,
          isActive: ad.isActive !== undefined ? ad.isActive : (ad.is_active !== undefined ? ad.is_active : true)
        })) as Advertisement[]);
      }

      setLastSync(new Date());
    } catch (err) {
      console.error("Critical error in fetchData:", err);
    }
  };

  // --- REAL-TIME SUBSCRIPTION ---
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('newsroom_global_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epaper_pages' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classifieds' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trusted_devices' }, () => {
          if (userId) fetchDevices(); // Refresh devices on change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // --- ROUTING LOGIC ---
  const getPathFromHash = () => {
     const hash = window.location.hash;
     if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('error=')) return '/auth-callback'; 
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
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const profile = session.user.user_metadata;
          setUserId(session.user.id);
          setUserName(profile.full_name || 'Staff');
          setUserRole(profile.role || UserRole.READER);
          setUserAvatar(profile.avatar_url || null);
          
          // Trigger device fetch after login
          await fetchDevices();
        }
      } catch (err) {
        console.warn("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };
    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const profile = session.user.user_metadata;
        setUserId(session.user.id);
        setUserName(profile.full_name || 'Staff');
        setUserRole(profile.role || UserRole.READER);
        setUserAvatar(profile.avatar_url || null);
        fetchDevices(); // Fetch when session becomes active
      } else {
        setUserId(null);
        setUserName(null);
        setUserRole(UserRole.READER);
        setUserAvatar(null);
        setDevices([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check device approval AFTER fetching devices
  useEffect(() => {
      if (userId && devices.length > 0) {
          const currentId = getDeviceId();
          const currentDeviceEntry = devices.find(d => d.id === currentId);
          if (currentDeviceEntry && currentDeviceEntry.status !== 'approved' && currentDeviceEntry.status !== 'pending') {
               supabase.auth.signOut().then(() => {
                   navigate('/login');
                   alert("Device access revoked.");
               });
          }
      }
  }, [devices, userId]);

  const handleLogin = (role: UserRole, name: string, avatar?: string) => {
      setUserRole(role);
      setUserName(name);
      if (avatar) setUserAvatar(avatar);
  };

  const handleSaveGlobalConfig = async (newWatermark?: WatermarkSettings) => {
      const watermarkToSave = newWatermark || watermarkSettings;
      if (newWatermark) setWatermarkSettings(newWatermark);

      const payload = {
          id: GLOBAL_SETTINGS_ID,
          title: 'SYSTEM_CONFIG',
          subline: 'Global System Configuration',
          content: JSON.stringify({ 
              watermark: watermarkToSave,
              categories: categories,
              tags: tags,
              adCategories: adCategories,
              adsEnabled: globalAdsEnabled
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
      if (error) {
          alert(`Failed to save settings globally: ${error.message}`);
      } else {
          fetchData(true);
      }
  };

  const handleToggleGlobalAds = async (enabled: boolean) => {
      setGlobalAdsEnabled(enabled);
      
      const payload = {
          id: GLOBAL_SETTINGS_ID,
          title: 'SYSTEM_CONFIG',
          subline: 'Global System Configuration',
          content: JSON.stringify({ 
              watermark: watermarkSettings,
              categories: categories,
              tags: tags,
              adCategories: adCategories,
              adsEnabled: enabled
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
      if (error) {
          console.error("Failed to sync global ad switch", error);
      } else {
          fetchData(true);
      }
  };

  const handleSaveArticle = async (article: Article) => {
    // Generate slug from English title if available (better for SEO), otherwise fallback to regular title
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
        english_title: article.englishTitle, // Save English title
        slug: articleSlug,
        subline: article.subline,
        author: article.author,
        author_avatar: article.authorAvatar,
        content: article.content,
        category: article.categories.join(', '), 
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
    if (error) {
      alert("Failed to save article: " + error.message);
      fetchData(true); 
    }
  };

  const handleDeleteArticle = async (id: string) => {
      const previousArticles = [...articles];
      setArticles(prev => prev.filter(a => a.id !== id));
      
      try {
          const { error } = await supabase.from('articles').delete().eq('id', id);
          if (error) throw error;
      } catch (error: any) {
          alert(`Failed to delete: ${error.message}`);
          setArticles(previousArticles);
          fetchData(true);
      }
  };

  const handleAddPage = async (page: EPaperPage) => {
    setEPaperPages(prev => [page, ...prev]);
    const payload = {
      id: page.id,
      date: page.date,
      pageNumber: page.pageNumber,
      page_number: page.pageNumber,
      imageUrl: page.imageUrl,
      image_url: page.imageUrl,
      user_id: userId
    };
    const { error } = await supabase.from('epaper_pages').insert(payload);
    if (error) {
      alert("Backend Sync Error: " + error.message);
      fetchData(true); 
    }
  };

  const handleDeletePage = async (id: string) => {
    const prevPages = [...ePaperPages];
    setEPaperPages(prev => prev.filter(p => p.id !== id));
    const { error } = await supabase.from('epaper_pages').delete().eq('id', id);
    if (error) {
      alert("Failed to delete page: " + error.message);
      setEPaperPages(prevPages);
    }
  };

  const handleUpdatePage = async (page: EPaperPage) => {
    const { error } = await supabase.from('epaper_pages').update({
        date: page.date,
        pageNumber: page.pageNumber,
        page_number: page.pageNumber
    }).eq('id', page.id);
    if (error) console.error("Page update error:", error.message);
    fetchData(true); 
  }

  const isDeviceAuthorized = () => {
    if (!userId) return false;
    const currentDeviceId = getDeviceId();
    const myDevices = devices.filter(d => d.userId === userId);
    if (myDevices.length === 0) return true; // First time login scenario handled in Login
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

  const path = currentPath.toLowerCase();
  let content;
  
  if (path === '/reset-password') {
    content = <ResetPassword onNavigate={navigate} devices={devices} />;
  } else if (path === '/login' || (userId && !isDeviceAuthorized() && !isRecovering)) {
    content = <Login onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={() => {}} />;
  } else if (path === '/staff/login') {
    content = <StaffLogin onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={() => {}} />;
  } else if (path === '/editor' && (userRole === UserRole.EDITOR || userRole === UserRole.ADMIN) && isDeviceAuthorized()) {
    content = <EditorDashboard 
        articles={articles} 
        ePaperPages={ePaperPages} 
        categories={categories} 
        tags={tags} 
        adCategories={adCategories} 
        classifieds={classifieds} 
        advertisements={advertisements} 
        globalAdsEnabled={globalAdsEnabled} 
        watermarkSettings={watermarkSettings} 
        onToggleGlobalAds={handleToggleGlobalAds} 
        onUpdateWatermarkSettings={(w) => handleSaveGlobalConfig(w)} 
        onUpdatePage={handleUpdatePage} 
        onAddPage={handleAddPage} 
        onDeletePage={handleDeletePage} 
        onDeleteArticle={handleDeleteArticle} 
        onSaveArticle={handleSaveArticle} 
        onAddCategory={c => setCategories(prev => [...prev, c])} 
        onDeleteCategory={c => setCategories(prev => prev.filter(old => old !== c))} 
        onAddTag={t => setTags(prev => [...prev, t])} 
        onDeleteTag={t => setTags(prev => prev.filter(old => old !== t))} 
        onAddAdCategory={c => setAdCategories(prev => [...prev, c])} 
        onDeleteAdCategory={c => setAdCategories(prev => prev.filter(old => old !== c))}
        onSaveTaxonomy={() => handleSaveGlobalConfig()} 
        onAddClassified={async (c) => { await supabase.from('classifieds').insert(c); fetchData(true); }} 
        onDeleteClassified={async (id) => { await supabase.from('classifieds').delete().eq('id', id); fetchData(true); }} 
        onAddAdvertisement={async (ad) => { 
            const dbAd = {
                id: ad.id,
                title: ad.title,
                image_url: ad.imageUrl,
                link_url: ad.linkUrl,
                size: ad.size,
                customWidth: ad.customWidth,
                customHeight: ad.customHeight,
                placement: ad.placement,
                targetCategory: ad.targetCategory,
                is_active: ad.isActive
            };
            const { error } = await supabase.from('advertisements').insert(dbAd); 
            if (error) alert("Error saving banner: " + error.message);
            else fetchData(true); 
        }} 
        onUpdateAdvertisement={async (ad) => {
            const dbAd = {
                title: ad.title,
                image_url: ad.imageUrl,
                link_url: ad.linkUrl,
                size: ad.size,
                customWidth: ad.customWidth,
                customHeight: ad.customHeight,
                placement: ad.placement,
                targetCategory: ad.targetCategory,
                is_active: ad.isActive
            };
            const { error } = await supabase.from('advertisements').update(dbAd).eq('id', ad.id);
            if (error) alert("Error updating banner: " + error.message);
            else fetchData(true);
        }}
        onDeleteAdvertisement={async (id) => { await supabase.from('advertisements').delete().eq('id', id); fetchData(true); }} 
        onNavigate={navigate} 
        userAvatar={userAvatar} 
        userName={userName}
        devices={devices.filter(d => d.userId === userId)} 
        onApproveDevice={(id) => handleUpdateDeviceStatus(id, 'approved')} 
        onRejectDevice={(id) => handleRevokeDevice(id)} 
        onRevokeDevice={handleRevokeDevice}
        // Pass userId to EditorDashboard for isolated gallery handling
        userId={userId}
        // Pass Active Visitors Prop
        activeVisitors={activeVisitors}
    />;
  } else if (path === '/writer' && userRole === UserRole.WRITER && isDeviceAuthorized()) {
    content = <WriterDashboard 
        onSave={handleSaveArticle}
        onDelete={handleDeleteArticle} 
        existingArticles={articles} 
        currentUserRole={userRole} 
        categories={categories} 
        onNavigate={navigate} 
        userAvatar={userAvatar} 
        userName={userName}
        devices={devices.filter(d => d.userId === userId)}
        onRevokeDevice={handleRevokeDevice}
        userId={userId} // Pass userId for isolation
    />;
  } else if (path === '/' || path === '/home') {
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} categories={categories} />;
  } else if (path.startsWith('/article/')) {
    // Determine if it's an ID or a Slug
    const slugOrId = currentPath.split('/article/')[1];
    
    // Find matching article either by ID or Slug OR by generated slug from title (robust fallback)
    let targetId = slugOrId;
    const foundBySlug = articles.find(a => 
        a.slug === slugOrId || 
        a.id === slugOrId || 
        createSlug(a.englishTitle || a.title) === slugOrId
    );
    if (foundBySlug) targetId = foundBySlug.id;

    content = <ArticleView articles={articles} articleId={targetId} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  } else if (path.startsWith('/category/')) {
    const cat = decodeURIComponent(currentPath.split('/category/')[1]);
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} selectedCategory={cat} categories={categories} />;
  } else if (path === '/epaper') {
    content = <EPaperReader pages={ePaperPages} articles={articles} onNavigate={navigate} watermarkSettings={watermarkSettings} onSaveSettings={handleSaveGlobalConfig} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  } else {
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} categories={categories} />;
  }

  return (
    <Layout 
      currentRole={userRole} 
      onRoleChange={setUserRole} 
      currentPath={currentPath} 
      onNavigate={navigate} 
      userName={userName} 
      userAvatar={userAvatar}
      onForceSync={() => fetchData(true)}
      lastSync={lastSync}
      articles={articles}
      categories={categories}
    >
      {content}
    </Layout>
  );
}

export default App;
