
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
import { generateId, getDeviceId } from './utils';
import { supabase } from './supabaseClient';

function App() {
  const [userRole, setUserRole] = useState<UserRole>(UserRole.READER);
  const [userName, setUserName] = useState<string | null>(null); 
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  
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

  // --- DATA SYNC FROM SUPABASE ---
  const fetchData = async () => {
    try {
      // 1. Fetch Articles
      let { data: artData, error: artError } = await supabase
        .from('articles')
        .select('*')
        .order('publishedAt', { ascending: false });
      
      if (artError) {
          // Fallback logic for column names
          const secondTry = await supabase.from('articles').select('*').order('id', { ascending: false });
          if (!secondTry.error) artData = secondTry.data;
      }

      // 2. Fetch E-Paper Pages
      let { data: pageData, error: pageError } = await supabase
        .from('epaper_pages')
        .select('*')
        .order('date', { ascending: false })
        .order('pageNumber', { ascending: true });
      
      if (pageError) {
          const secondTry = await supabase.from('epaper_pages').select('*').order('date', { ascending: false });
          if (!secondTry.error) pageData = secondTry.data;
      }

      // 3. Fetch Classifieds & Ads
      const { data: clsData } = await supabase.from('classifieds').select('*').order('id', { ascending: false });
      const { data: adData } = await supabase.from('advertisements').select('*');

      // 4. Fetch Global Settings (Stored as a special article)
      const { data: settingsData } = await supabase
        .from('articles')
        .select('content')
        .eq('id', 'global_settings')
        .maybeSingle(); // Use maybeSingle to avoid errors if not found

      if (settingsData && settingsData.content) {
          try {
              const parsedSettings = JSON.parse(settingsData.content);
              if (parsedSettings.watermark) {
                  setWatermarkSettings(parsedSettings.watermark);
              }
          } catch (e) {
              console.error("Failed to parse global settings", e);
          }
      }

      // --- MAPPING LAYER ---
      if (artData) {
        // Filter out the config article
        const visibleArticles = artData.filter(a => a.id !== 'global_settings');
        
        setArticles(visibleArticles.map(a => ({
          id: a.id,
          title: a.title,
          subline: a.subline,
          author: a.author,
          content: a.content,
          category: a.category,
          imageUrl: a.imageUrl || a.image_url || 'https://placehold.co/800x400?text=No+Image',
          publishedAt: a.publishedAt || a.published_at || new Date().toISOString(),
          status: (a.status as ArticleStatus) || ArticleStatus.PUBLISHED,
          summary: a.summary,
          isPremium: a.isPremium || a.is_premium || false
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
          placement: ad.placement,
          isActive: ad.isActive !== undefined ? ad.isActive : (ad.is_active !== undefined ? ad.is_active : true)
        })) as Advertisement[]);
      }
    } catch (err) {
      console.error("Critical error in fetchData:", err);
    }
  };

  // --- REAL-TIME SUBSCRIPTION ---
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('newsroom_global_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epaper_pages' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classifieds' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

  const persistDevicesToCloud = async (newDevices: TrustedDevice[]) => {
      setDevices(newDevices);
      await supabase.auth.updateUser({ data: { trusted_devices: newDevices } });
  };

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
          if (profile.trusted_devices) setDevices(profile.trusted_devices);
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
        if (profile.trusted_devices) setDevices(profile.trusted_devices);
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

  const handleLogin = (role: UserRole, name: string, avatar?: string) => {
      setUserRole(role);
      setUserName(name);
      if (avatar) setUserAvatar(avatar);
  };

  const handleSaveWatermarkSettings = async (settings: WatermarkSettings) => {
      setWatermarkSettings(settings);
      
      // Save to 'global_settings' article as a JSON store
      const payload = {
          id: 'global_settings',
          title: 'SYSTEM_CONFIG',
          content: JSON.stringify({ watermark: settings }),
          author: 'SYSTEM',
          category: 'Config',
          publishedAt: new Date().toISOString(),
          status: ArticleStatus.DRAFT,
          user_id: userId // CRITICAL: Include user_id to satisfy RLS policies
      };

      const { error } = await supabase.from('articles').upsert(payload);
      if (error) {
          console.error("Failed to save global settings:", error.message, error.details);
          alert(`Failed to save settings globally: ${error.message}`);
      }
  };

  const handleSaveArticle = async (article: Article) => {
    setArticles(prev => {
        const exists = prev.find(a => a.id === article.id);
        return exists ? prev.map(a => a.id === article.id ? article : a) : [article, ...prev];
    });

    const payload = {
        id: article.id,
        title: article.title,
        subline: article.subline,
        author: article.author,
        content: article.content,
        category: article.category,
        imageUrl: article.imageUrl,
        image_url: article.imageUrl, // Map to both cases for DB safety
        publishedAt: article.publishedAt,
        published_at: article.publishedAt,
        status: article.status,
        user_id: userId
    };

    const { error } = await supabase.from('articles').upsert(payload);

    if (error) {
      console.error("Supabase Article Save Error:", error.message);
      alert("Failed to save article: " + error.message);
      fetchData(); 
    }
  };

  const handleDeleteArticle = async (id: string) => {
      const previousArticles = [...articles];
      setArticles(prev => prev.filter(a => a.id !== id));
      
      try {
          const { error } = await supabase.from('articles').delete().eq('id', id);
          if (error) throw error;
      } catch (error: any) {
          console.error("Delete failed:", error.message);
          alert(`Failed to delete: ${error.message}`);
          setArticles(previousArticles);
          fetchData();
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
      console.error("Failed to add page to backend:", error.message);
      alert("Backend Sync Error: " + error.message);
      fetchData(); 
    }
  };

  const handleDeletePage = async (id: string) => {
    const prevPages = [...ePaperPages];
    setEPaperPages(prev => prev.filter(p => p.id !== id));

    const { error } = await supabase.from('epaper_pages').delete().eq('id', id);
    if (error) {
      console.error("Failed to delete page:", error.message);
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
    fetchData(); 
  }

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

  const path = currentPath.toLowerCase();
  let content;
  
  if (path === '/reset-password') {
    content = <ResetPassword onNavigate={navigate} devices={devices} />;
  } else if (path === '/login' || (userId && !isDeviceAuthorized() && !isRecovering)) {
    content = <Login onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={(d) => persistDevicesToCloud([...devices, d])} onEmergencyReset={() => {}} />;
  } else if (path === '/staff/login') {
    content = <StaffLogin onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={(d) => persistDevicesToCloud([...devices, d])} onEmergencyReset={() => {}} />;
  } else if (path === '/editor' && (userRole === UserRole.EDITOR || userRole === UserRole.ADMIN) && isDeviceAuthorized()) {
    content = <EditorDashboard articles={articles} ePaperPages={ePaperPages} categories={categories} tags={tags} adCategories={adCategories} classifieds={classifieds} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} watermarkSettings={watermarkSettings} onToggleGlobalAds={setGlobalAdsEnabled} onUpdateWatermarkSettings={handleSaveWatermarkSettings} onUpdatePage={handleUpdatePage} onAddPage={handleAddPage} onDeletePage={handleDeletePage} onDeleteArticle={handleDeleteArticle} onSaveArticle={handleSaveArticle} onAddCategory={c => setCategories(prev => [...prev, c])} onDeleteCategory={c => setCategories(prev => prev.filter(old => old !== c))} onAddTag={t => setTags(prev => [...prev, t])} onDeleteTag={t => setTags(prev => prev.filter(old => old !== t))} onAddAdCategory={() => {}} onDeleteAdCategory={() => {}} onAddClassified={async (c) => { await supabase.from('classifieds').insert(c); fetchData(); }} onDeleteClassified={async (id) => { await supabase.from('classifieds').delete().eq('id', id); fetchData(); }} onAddAdvertisement={async (ad) => { await supabase.from('advertisements').insert(ad); fetchData(); }} onDeleteAdvertisement={async (id) => { await supabase.from('advertisements').delete().eq('id', id); fetchData(); }} onNavigate={navigate} userAvatar={userAvatar} devices={devices.filter(d => d.userId === userId)} onApproveDevice={(id) => persistDevicesToCloud(devices.map(d => d.id === id ? {...d, status: 'approved'} : d))} onRejectDevice={(id) => persistDevicesToCloud(devices.filter(d => d.id !== id))} onRevokeDevice={(id) => persistDevicesToCloud(devices.filter(d => d.id !== id))} />;
  } else if (path === '/writer' && userRole === UserRole.WRITER && isDeviceAuthorized()) {
    content = <WriterDashboard onSave={handleSaveArticle} existingArticles={articles} currentUserRole={userRole} categories={categories} onNavigate={navigate} userAvatar={userAvatar} />;
  } else if (path === '/' || path === '/home') {
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  } else if (path.startsWith('/article/')) {
    const id = currentPath.split('/article/')[1];
    content = <ArticleView articles={articles} articleId={id} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  } else if (path === '/epaper') {
    content = <EPaperReader pages={ePaperPages} articles={articles} onNavigate={navigate} watermarkSettings={watermarkSettings} onSaveSettings={handleSaveWatermarkSettings} />;
  } else if (path === '/classifieds') {
    content = <ClassifiedsHome classifieds={classifieds} adCategories={adCategories} />;
  } else {
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  }

  return (
    <Layout currentRole={userRole} onRoleChange={setUserRole} currentPath={currentPath} onNavigate={navigate} userName={userName} userAvatar={userAvatar}>
      {content}
    </Layout>
  );
}

export default App;
