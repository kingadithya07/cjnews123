
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
import IDVerification from './pages/IDVerification';
import { UserRole, Article, EPaperPage, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, ReporterProfile } from './types';
import { MOCK_ARTICLES, MOCK_EPAPER, APP_NAME } from './constants';
import { generateId, getDeviceId, createSlug } from './utils';
import { supabase } from './supabaseClient';

const GLOBAL_SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

function App() {
  const [userRole, setUserRole] = useState<UserRole>(UserRole.READER);
  const [userName, setUserName] = useState<string | null>(null); 
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [activeVisitors, setActiveVisitors] = useState<number>(1);

  const [articles, setArticles] = useState<Article[]>([]);
  const [ePaperPages, setEPaperPages] = useState<EPaperPage[]>([]);
  const [categories, setCategories] = useState<string[]>(['General', 'World', 'Technology', 'Politics', 'Lifestyle', 'Business', 'Culture', 'Sports', 'Local']);
  const [tags, setTags] = useState<string[]>(['Breaking', 'Live', 'Exclusive', 'Opinion', 'Video', 'Podcast', 'Analysis']);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [adCategories, setAdCategories] = useState<string[]>(['Jobs', 'Real Estate', 'For Sale', 'Services', 'Community', 'Automotive', 'Events']);
  const [classifieds, setClassifieds] = useState<ClassifiedAd[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [reporters, setReporters] = useState<ReporterProfile[]>([]);
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

  useEffect(() => {
    const channel = supabase.channel('cj_newsroom_visitors');
    channel.on('presence', { event: 'sync' }, () => {
        const count = Object.keys(channel.presenceState()).length;
        setActiveVisitors(count > 0 ? count : 1);
    }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString(), device_id: getDeviceId(), role: userRole });
    });
    return () => { supabase.removeChannel(channel); };
  }, [userRole]);

  const fetchDevices = async () => {
      if (!userId) return;
      const { data } = await supabase.from('trusted_devices').select('*');
      if (data) {
          const currentId = getDeviceId();
          setDevices(data.map((d: any) => ({
              id: d.id, userId: d.user_id, deviceName: d.device_name, deviceType: d.device_type,
              location: d.location, lastActive: d.last_active, status: d.status,
              browser: d.browser, isPrimary: d.is_primary, isCurrent: d.id === currentId 
          })));
      }
  };

  const handleAddDevice = async (device: TrustedDevice) => {
      setDevices(prev => [...prev, { ...device, isCurrent: true }]);
      await supabase.from('trusted_devices').upsert({
          id: device.id, user_id: device.userId, device_name: device.deviceName,
          device_type: device.deviceType, location: device.location, last_active: device.lastActive,
          status: device.status, browser: device.browser, is_primary: device.isPrimary
      });
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
      if (settingsData?.content) {
          const s = JSON.parse(settingsData.content);
          if (s.watermark) setWatermarkSettings(s.watermark);
          if (s.categories) setCategories(s.categories);
          if (s.tags) setTags(s.tags);
          if (s.adCategories) setAdCategories(s.adCategories);
          if (s.adsEnabled !== undefined) setGlobalAdsEnabled(s.adsEnabled);
      }

      // Supabase order columns should be snake_case to be safe
      const { data: artData } = await supabase.from('articles').select('*').neq('id', GLOBAL_SETTINGS_ID).order('published_at', { ascending: false });
      const { data: pageData } = await supabase.from('epaper_pages').select('*').order('date', { ascending: false }).order('page_number', { ascending: true });
      const { data: clsData } = await supabase.from('classifieds').select('*').order('id', { ascending: false });
      const { data: adData } = await supabase.from('advertisements').select('*');
      const { data: repData } = await supabase.from('reporters').select('*');

      if (userId) await fetchDevices();

      if (artData) {
        setArticles(artData.map(a => ({
          id: a.id, userId: a.user_id, slug: a.slug, title: a.title, englishTitle: a.english_title || undefined,
          subline: a.subline, author: a.author, authorAvatar: a.author_avatar, content: a.content,
          categories: a.category ? a.category.split(',').map((s: string) => s.trim()).filter(Boolean) : ['General'],
          imageUrl: a.image_url || 'https://placehold.co/800x400?text=No+Image',
          publishedAt: a.published_at || new Date().toISOString(),
          status: (a.status as ArticleStatus) || ArticleStatus.PUBLISHED,
          summary: a.summary, isPremium: a.is_premium || false, isFeatured: a.is_featured || false,
          isEditorsChoice: a.is_editors_choice || false, views: a.views || 0
        })));
      }
      if (pageData) {
        setEPaperPages(pageData.map(p => ({
          id: p.id, date: p.date, pageNumber: p.page_number || 1,
          imageUrl: p.image_url || 'https://placehold.co/600x800?text=No+Scan', regions: []
        })));
      }
      if (clsData) {
        setClassifieds(clsData.map(c => ({
          id: c.id, title: c.title, category: c.category, content: c.content, price: c.price,
          location: c.location, contactInfo: c.contact_info, postedAt: c.posted_at || new Date().toISOString()
        })));
      }
      if (adData) {
        setAdvertisements(adData.map(ad => ({
          id: ad.id, imageUrl: ad.image_url, linkUrl: ad.link_url, title: ad.title, size: ad.size,
          customWidth: ad.customWidth, customHeight: ad.customHeight, placement: ad.placement,
          targetCategory: ad.targetCategory, isActive: ad.is_active !== undefined ? ad.is_active : true
        })));
      }
      if (repData) {
          setReporters(repData.map(r => ({
              id: r.id, fullName: r.full_name, role: r.role, department: r.department, idNumber: r.id_number,
              bloodGroup: r.blood_group, phone: r.phone, email: r.email, photoUrl: r.photo_url,
              joinedAt: r.joined_at, validUntil: r.valid_until, location: r.location, status: r.status,
              cardTemplate: r.card_template, emergencyContact: r.emergency_contact, officeAddress: r.office_address,
              signatureUrl: r.signature_url, stampUrl: r.stamp_url, logoUrl: r.logo_url, watermarkUrl: r.watermark_url
          })));
      }
      setLastSync(new Date());
    } catch (err) { console.error("Sync error:", err); }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('newsroom_global_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epaper_pages' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classifieds' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reporters' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trusted_devices' }, () => { if (userId) fetchDevices(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const getPathFromHash = () => {
     const hash = window.location.hash;
     if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('error=')) return '/auth-callback'; 
     if (!hash || hash === '#') return '/';
     return hash.startsWith('#') ? hash.slice(1) : hash;
  };

  const [currentPath, setCurrentPath] = useState(getPathFromHash());
  const navigate = (path: string) => { window.location.hash = path; setCurrentPath(path); window.scrollTo(0, 0); };

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
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
          const p = session.user.user_metadata;
          setUserId(session.user.id); setUserName(p.full_name || 'Staff');
          setUserRole(p.role || UserRole.READER); setUserAvatar(p.avatar_url || null);
          await fetchDevices();
      }
      setLoading(false);
    };
    checkInitialSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        const p = session.user.user_metadata;
        setUserId(session.user.id); setUserName(p.full_name || 'Staff');
        setUserRole(p.role || UserRole.READER); setUserAvatar(p.avatar_url || null);
        fetchDevices();
      } else {
        setUserId(null); setUserName(null); setUserRole(UserRole.READER); setUserAvatar(null); setDevices([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
      if (userId && devices.length > 0) {
          const currentId = getDeviceId();
          const d = devices.find(d => d.id === currentId);
          if (d && d.status !== 'approved' && d.status !== 'pending') {
               supabase.auth.signOut().then(() => { navigate('/login'); alert("Device access revoked."); });
          }
      }
  }, [devices, userId]);

  const handleLogin = (role: UserRole, name: string, avatar?: string) => {
      setUserRole(role); setUserName(name); if (avatar) setUserAvatar(avatar);
  };

  const handleSaveGlobalConfig = async (newWatermark?: WatermarkSettings) => {
      const watermarkToSave = newWatermark || watermarkSettings;
      if (newWatermark) setWatermarkSettings(newWatermark);
      await supabase.from('articles').upsert({
          id: GLOBAL_SETTINGS_ID, title: 'SYSTEM_CONFIG', subline: 'Global System Configuration',
          content: JSON.stringify({ watermark: watermarkToSave, categories, tags, adCategories, adsEnabled: globalAdsEnabled }),
          author: 'SYSTEM', category: 'Config', image_url: 'https://placehold.co/100?text=Config',
          published_at: new Date().toISOString(), status: ArticleStatus.PUBLISHED, user_id: userId, summary: 'Internal system configuration'
      });
      fetchData(true);
  };

  const handleToggleGlobalAds = async (enabled: boolean) => {
      setGlobalAdsEnabled(enabled);
      await supabase.from('articles').upsert({
          id: GLOBAL_SETTINGS_ID, title: 'SYSTEM_CONFIG', subline: 'Global System Configuration',
          content: JSON.stringify({ watermark: watermarkSettings, categories, tags, adCategories, adsEnabled: enabled }),
          author: 'SYSTEM', category: 'Config', image_url: 'https://placehold.co/100?text=Config',
          published_at: new Date().toISOString(), status: ArticleStatus.PUBLISHED, user_id: userId, summary: 'Internal system configuration'
      });
      fetchData(true);
  };

  const handleSaveArticle = async (article: Article) => {
    const slugBase = article.englishTitle || article.title;
    let articleSlug = article.slug || createSlug(slugBase);
    // Robust fallback: if headline is non-Latin and no English translation provided, slug could be empty
    if (!articleSlug) articleSlug = article.id;
    
    const articleWithSlug = { ...article, slug: articleSlug };
    setArticles(prev => {
        const exists = prev.find(a => a.id === article.id);
        return exists ? prev.map(a => a.id === article.id ? articleWithSlug : a) : [articleWithSlug, ...prev];
    });

    await supabase.from('articles').upsert({
        id: article.id, title: article.title, english_title: article.englishTitle, slug: articleSlug,
        subline: article.subline, author: article.author, author_avatar: article.authorAvatar,
        content: article.content, category: article.categories.join(', '), 
        image_url: article.imageUrl, published_at: article.publishedAt,
        status: article.status, user_id: userId, is_featured: article.isFeatured, is_editors_choice: article.isEditorsChoice
    });
  };

  const handleDeleteArticle = async (id: string) => {
      setArticles(prev => prev.filter(a => a.id !== id));
      await supabase.from('articles').delete().eq('id', id);
  };

  const handleAddPage = async (page: EPaperPage) => {
    setEPaperPages(prev => [page, ...prev]);
    await supabase.from('epaper_pages').insert({
      id: page.id, date: page.date, page_number: page.pageNumber, image_url: page.imageUrl, user_id: userId
    });
  };

  const handleDeletePage = async (id: string) => {
    setEPaperPages(prev => prev.filter(p => p.id !== id));
    await supabase.from('epaper_pages').delete().eq('id', id);
  };

  const handleUpdatePage = async (page: EPaperPage) => {
    await supabase.from('epaper_pages').update({ date: page.date, page_number: page.pageNumber }).eq('id', page.id);
    fetchData(true); 
  }
  
  const handleSaveReporter = async (reporter: ReporterProfile) => {
      setReporters(prev => {
          const exists = prev.find(r => r.id === reporter.id);
          return exists ? prev.map(r => r.id === reporter.id ? reporter : r) : [reporter, ...prev];
      });
      await supabase.from('reporters').upsert({
          id: reporter.id, full_name: reporter.fullName, role: reporter.role, department: reporter.department,
          id_number: reporter.idNumber, blood_group: reporter.bloodGroup, phone: reporter.phone,
          email: reporter.email, photo_url: reporter.photoUrl, joined_at: reporter.joinedAt,
          valid_until: reporter.validUntil, location: reporter.location, status: reporter.status,
          card_template: reporter.cardTemplate, emergency_contact: reporter.emergencyContact,
          office_address: reporter.officeAddress, signature_url: reporter.signatureUrl,
          stamp_url: reporter.stampUrl, logo_url: reporter.logoUrl, watermark_url: reporter.watermarkUrl
      });
  };

  const handleDeleteReporter = async (id: string) => {
      setReporters(prev => prev.filter(r => r.id !== id));
      await supabase.from('reporters').delete().eq('id', id);
  };

  const isDeviceAuthorized = () => {
    if (!userId) return false;
    const currentDeviceId = getDeviceId();
    const myDevices = devices.filter(d => d.userId === userId);
    if (myDevices.length === 0) return true;
    const d = myDevices.find(d => d.id === currentDeviceId);
    return d?.status === 'approved';
  };

  if (loading || currentPath === '/auth-callback') {
      return (
          <div className="h-screen flex items-center justify-center bg-news-paper">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-news-accent border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-news-black font-serif font-bold animate-pulse uppercase tracking-widest text-[10px]">Digital Newsroom Connecting...</p>
              </div>
          </div>
      );
  }

  const path = currentPath.toLowerCase();
  let content;
  
  if (path === '/reset-password') {
    content = <ResetPassword onNavigate={navigate} devices={devices} />;
  } else if (path.startsWith('/verify-id/')) {
    const rId = currentPath.split('/verify-id/')[1];
    content = <IDVerification reporters={reporters} reporterId={rId} onNavigate={navigate} />;
  } else if (path === '/login' || (userId && !isDeviceAuthorized() && !isRecovering)) {
    content = <Login onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={() => {}} />;
  } else if (path === '/staff/login') {
    content = <StaffLogin onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={() => {}} />;
  } else if (path === '/editor' && (userRole === UserRole.EDITOR || userRole === UserRole.ADMIN) && isDeviceAuthorized()) {
    content = <EditorDashboard 
        articles={articles} ePaperPages={ePaperPages} categories={categories} tags={tags} 
        adCategories={adCategories} classifieds={classifieds} advertisements={advertisements} 
        globalAdsEnabled={globalAdsEnabled} watermarkSettings={watermarkSettings} 
        onToggleGlobalAds={handleToggleGlobalAds} onUpdateWatermarkSettings={(w) => handleSaveGlobalConfig(w)} 
        onUpdatePage={handleUpdatePage} onAddPage={handleAddPage} onDeletePage={handleDeletePage} 
        onDeleteArticle={handleDeleteArticle} onSaveArticle={handleSaveArticle} 
        onAddCategory={c => setCategories(prev => [...prev, c])} onDeleteCategory={c => setCategories(prev => prev.filter(old => old !== c))} 
        onAddTag={t => setTags(prev => [...prev, t])} onDeleteTag={t => setTags(prev => prev.filter(old => old !== t))} 
        onAddAdCategory={c => setAdCategories(prev => [...prev, c])} onDeleteAdCategory={c => setAdCategories(prev => prev.filter(old => old !== c))}
        onSaveTaxonomy={() => handleSaveGlobalConfig()} onAddClassified={async (c) => { await supabase.from('classifieds').insert(c); fetchData(true); }} 
        onDeleteClassified={async (id) => { await supabase.from('classifieds').delete().eq('id', id); fetchData(true); }} 
        onAddAdvertisement={async (ad) => { 
            await supabase.from('advertisements').insert({
                id: ad.id, title: ad.title, image_url: ad.imageUrl, link_url: ad.linkUrl,
                size: ad.size, customWidth: ad.customWidth, customHeight: ad.customHeight,
                placement: ad.placement, targetCategory: ad.targetCategory, is_active: ad.isActive
            }); 
            fetchData(true); 
        }} 
        onUpdateAdvertisement={async (ad) => {
            await supabase.from('advertisements').update({
                title: ad.title, image_url: ad.imageUrl, link_url: ad.linkUrl, size: ad.size,
                customWidth: ad.customWidth, customHeight: ad.customHeight, placement: ad.placement,
                targetCategory: ad.targetCategory, is_active: ad.isActive
            }).eq('id', ad.id);
            fetchData(true);
        }}
        onDeleteAdvertisement={async (id) => { await supabase.from('advertisements').delete().eq('id', id); fetchData(true); }} 
        onNavigate={navigate} userAvatar={userAvatar} userName={userName}
        devices={devices.filter(d => d.userId === userId)} onApproveDevice={(id) => handleUpdateDeviceStatus(id, 'approved')} 
        onRejectDevice={(id) => handleRevokeDevice(id)} onRevokeDevice={handleRevokeDevice}
        userId={userId} activeVisitors={activeVisitors} reporters={reporters}
        onSaveReporter={handleSaveReporter} onDeleteReporter={handleDeleteReporter}
    />;
  } else if (path === '/writer' && userRole === UserRole.WRITER && isDeviceAuthorized()) {
    content = <WriterDashboard 
        onSave={handleSaveArticle} onDelete={handleDeleteArticle} existingArticles={articles} 
        currentUserRole={userRole} categories={categories} onNavigate={navigate} 
        userAvatar={userAvatar} userName={userName} devices={devices.filter(d => d.userId === userId)}
        onRevokeDevice={handleRevokeDevice} userId={userId}
    />;
  } else if (path.startsWith('/article/')) {
    const rawSlug = currentPath.split('/article/')[1];
    const slugOrId = rawSlug ? rawSlug.split('?')[0].split('/')[0] : '';
    let targetId = slugOrId;
    const found = articles.find(a => a.slug === slugOrId || a.id === slugOrId || createSlug(a.englishTitle || a.title) === slugOrId);
    if (found) targetId = found.id;
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
    <Layout currentRole={userRole} onRoleChange={setUserRole} currentPath={currentPath} onNavigate={navigate} 
      userName={userName} userAvatar={userAvatar} onForceSync={() => fetchData(true)} lastSync={lastSync}
      articles={articles} categories={categories}>
      {content}
    </Layout>
  );
}

export default App;
