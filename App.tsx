
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
import { UserRole, Article, EPaperPage, ArticleStatus, ClassifiedAd, Advertisement, WatermarkSettings, TrustedDevice, AdSize, ActivityLog } from './types';
import { MOCK_ARTICLES, MOCK_EPAPER, APP_NAME } from './constants';
import { generateId, getDeviceId, createSlug, getDeviceMetadata, getPublicIP } from './utils';
import { supabase } from './supabaseClient';
import { ShieldAlert, Smartphone, Monitor, Check, MapPin, Tablet } from 'lucide-react';

// Use a fixed UUID for global settings to ensure compatibility with UUID columns in Supabase
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
  
  // Keep a ref to userId to avoid stale closures in event listeners/effects
  const userIdRef = useRef<string | null>(null);
  
  // Real-time Analytics State
  const [activeVisitors, setActiveVisitors] = useState<number>(1);

  // Persistence states
  const [articles, setArticles] = useState<Article[]>([]);
  const [ePaperPages, setEPaperPages] = useState<EPaperPage[]>([]);
  const [categories, setCategories] = useState<string[]>(['General', 'World', 'Technology', 'Politics', 'Lifestyle', 'Business', 'Culture', 'Sports', 'Local']);
  const [tags, setTags] = useState<string[]>(['Breaking', 'Live', 'Exclusive', 'Opinion', 'Video', 'Podcast', 'Analysis']);
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<TrustedDevice[]>([]);
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

  // Sync state to ref
  useEffect(() => {
      userIdRef.current = userId;
  }, [userId]);

  // --- LOGGING SYSTEM ---
  const handleLogActivity = async (action: ActivityLog['action'], details?: string) => {
      if (!userIdRef.current) return;
      
      const meta = getDeviceMetadata();
      const ip = await getPublicIP(); // Fetch real IP
      
      const newLog: ActivityLog = {
          id: generateId(),
          userId: userIdRef.current,
          deviceName: meta.name,
          action,
          details: details || '',
          ip,
          location: 'Detected via IP', // In a real app, this would come from a GeoIP service
          timestamp: new Date().toISOString()
      };

      // Optimistic update
      setActivityLogs(prev => [newLog, ...prev]);

      // Save to Supabase (Mocking table existence)
      // We wrap in try-catch in case table doesn't exist in user's instance
      try {
          const { error } = await supabase.from('activity_logs').insert({
              user_id: newLog.userId,
              device_name: newLog.deviceName,
              action: newLog.action,
              details: newLog.details,
              ip: newLog.ip,
              location: newLog.location,
              timestamp: newLog.timestamp
          });
          if (error) console.warn("Log save failed (table might be missing)", error);
      } catch (e) {
          console.warn("Log system unavailable");
      }
  };

  const fetchLogs = async () => {
      if (!userIdRef.current) return;
      try {
          const { data, error } = await supabase
              .from('activity_logs')
              .select('*')
              .order('timestamp', { ascending: false })
              .limit(50);
          
          if (!error && data) {
              const mappedLogs: ActivityLog[] = data.map((l: any) => ({
                  id: l.id,
                  userId: l.user_id,
                  deviceName: l.device_name,
                  action: l.action,
                  details: l.details,
                  ip: l.ip,
                  location: l.location,
                  timestamp: l.timestamp
              }));
              setActivityLogs(mappedLogs);
          }
      } catch (e) {
          console.warn("Log fetch failed");
      }
  };

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

  // --- DEVICE MANAGEMENT ---
  const mapDbDevice = (d: any): TrustedDevice => {
      const currentId = getDeviceId();
      return {
          id: d.id,
          userId: d.user_id,
          deviceName: d.device_name,
          deviceType: d.device_type,
          location: d.location,
          lastActive: d.last_active,
          status: d.status,
          browser: d.browser,
          isPrimary: d.is_primary,
          isCurrent: d.id === currentId 
      };
  };

  const fetchDevices = async (uidOverride?: string) => {
      const targetUserId = uidOverride || userIdRef.current;
      if (!targetUserId) {
          setDevices([]);
          return;
      }
      try {
        const { data, error } = await supabase
            .from('trusted_devices')
            .select('*')
            .eq('user_id', targetUserId);
            
        if (error) {
            console.error("Error fetching devices:", error);
            return;
        }
        if (data) {
            setDevices(data.map(mapDbDevice));
        }
      } catch (e) {
          console.warn("Device fetch error", e);
      }
  };

  // Fetch pending registrations across ALL users (Only for Admin/Editor)
  const fetchPendingRegistrations = async () => {
      if (!userIdRef.current || (userRole !== UserRole.ADMIN && userRole !== UserRole.EDITOR)) return;

      try {
        const { data, error } = await supabase
            .from('trusted_devices')
            .select('*')
            .eq('status', 'awaiting_verification');

        if (!error && data) {
            setPendingRegistrations(data.map(mapDbDevice));
        }
      } catch (e) { console.warn("Pending regs fetch error", e); }
  };

  const handleAddDevice = async (device: TrustedDevice) => {
      // Optimistic Update
      setDevices(prev => {
          if (prev.some(d => d.id === device.id)) return prev;
          return [...prev, { ...device, isCurrent: true }];
      });

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
      };

      const { error } = await supabase.from('trusted_devices').upsert(dbDevice);
      if (error) {
          console.error("Device add failed", error);
          fetchDevices(device.userId); // Revert on error
      }
  };

  const handleRevokeDevice = async (deviceId: string) => {
      setPendingRegistrations(prev => prev.filter(d => d.id !== deviceId));
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      
      const { error } = await supabase.from('trusted_devices').delete().eq('id', deviceId);
      if (error) {
          alert("Failed to delete device: " + error.message);
          fetchDevices();
          fetchPendingRegistrations();
      }
  };

  const handleUpdateDeviceStatus = async (deviceId: string, status: 'approved' | 'pending') => {
      // Instant Local Update
      setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, status } : d));
      // Remove from pending registrations if approved
      if (status === 'approved') {
          setPendingRegistrations(prev => prev.filter(d => d.id !== deviceId));
      }
      
      const { error } = await supabase.from('trusted_devices').update({ status }).eq('id', deviceId);
      if (error) {
          console.error("Status update failed", error);
          fetchDevices();
          fetchPendingRegistrations();
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
      if (userIdRef.current) {
          await fetchDevices(userIdRef.current);
          await fetchPendingRegistrations();
          fetchLogs();
      }

      // --- MAPPING LAYER ---
      if (artData && artData.length > 0) {
        setArticles(artData.map(a => ({
          id: a.id,
          userId: a.user_id,
          slug: a.slug,
          title: a.title,
          englishTitle: a.english_title || undefined,
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
          views: a.views || 0
        })) as Article[]);
      } else {
          // Fallback to Mock Data if DB is empty
          setArticles(MOCK_ARTICLES);
      }

      if (pageData && pageData.length > 0) {
        setEPaperPages(pageData.map(p => ({
          id: p.id,
          date: p.date,
          pageNumber: p.pageNumber !== undefined ? p.pageNumber : (p.page_number !== undefined ? p.page_number : 1),
          imageUrl: p.imageUrl || p.image_url || 'https://placehold.co/600x800?text=No+Scan',
          regions: []
        })) as EPaperPage[]);
      } else {
          // Fallback to Mock Data
          setEPaperPages(MOCK_EPAPER);
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
      // Ensure mock data fallback on critical error
      setArticles(MOCK_ARTICLES);
      setEPaperPages(MOCK_EPAPER);
    }
  };

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

  // --- REAL-TIME SUBSCRIPTION & AUTH STATE ---
  useEffect(() => {
    // Initial fetch
    fetchData();

    const channel = supabase
      .channel('newsroom_global_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'epaper_pages' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classifieds' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'advertisements' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trusted_devices' }, (payload) => {
          
          if (!userIdRef.current) return;

          // Special Handling: If new device is inserted with 'awaiting_verification', refresh pending list
          // This allows Admins to see new registrations instantly
          if (payload.new && (payload.new as any).status === 'awaiting_verification') {
              fetchPendingRegistrations();
          }

          // Existing user-device sync
          if (payload.new && (payload.new as any).user_id !== userIdRef.current) return;
          if (payload.old && !payload.new && (payload.old as any).user_id !== userIdRef.current) {
              // ...
          }

          if (payload.eventType === 'INSERT') {
              const newDevice = mapDbDevice(payload.new);
              setDevices(prev => {
                  if (prev.some(d => d.id === newDevice.id)) return prev;
                  return [...prev, newDevice];
              });
          } else if (payload.eventType === 'UPDATE') {
              const updatedDevice = mapDbDevice(payload.new);
              setDevices(prev => prev.map(d => d.id === updatedDevice.id ? updatedDevice : d));
          } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setDevices(prev => prev.filter(d => d.id !== deletedId));
          }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, () => {
          fetchLogs();
      })
      .subscribe();

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const profile = session.user.user_metadata;
          setUserId(session.user.id);
          userIdRef.current = session.user.id; 
          sessionStartTime.current = Date.now();
          
          setUserName(profile.full_name || 'Staff');
          setUserEmail(session.user.email || null);
          setUserRole(profile.role || UserRole.READER);
          setUserAvatar(profile.avatar_url || null);
          
          await fetchDevices(session.user.id);
          // Don't call fetchPending here immediately, wait for role/devices to settle
          if (profile.role === UserRole.ADMIN || profile.role === UserRole.EDITOR) {
              fetchPendingRegistrations();
          }
          fetchLogs();
        }
      } catch (err) {
        console.warn("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };
    checkInitialSession();

    // Safety timeout to prevent infinite loading screen
    const safetyTimeout = setTimeout(() => {
        setLoading(false);
    }, 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
        navigate('/reset-password');
      }

      if (event === 'SIGNED_IN' && session) {
          sessionStartTime.current = Date.now();
          setUserId(session.user.id);
          userIdRef.current = session.user.id;
          handleLogActivity('LOGIN', 'Session Started');
          await fetchDevices(session.user.id);
          
          const role = session.user.user_metadata.role || UserRole.READER;
          if (role === UserRole.ADMIN || role === UserRole.EDITOR) {
              fetchPendingRegistrations();
          }
          fetchLogs();
      }

      if (event === 'SIGNED_OUT') {
          const duration = Math.round((Date.now() - sessionStartTime.current) / 60000); 
          await handleLogActivity('LOGOUT', `Duration: ${duration} mins`);
          
          setUserId(null);
          userIdRef.current = null;
          setUserName(null);
          setUserEmail(null);
          setUserRole(UserRole.READER);
          setUserAvatar(null);
          setDevices([]);
          setActivityLogs([]);
          setPendingRegistrations([]);
      }

      if (session) {
        const profile = session.user.user_metadata;
        setUserId(session.user.id);
        userIdRef.current = session.user.id; 
        
        setUserName(profile.full_name || 'Staff');
        setUserEmail(session.user.email || null);
        setUserRole(profile.role || UserRole.READER);
        setUserAvatar(profile.avatar_url || null);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      supabase.removeChannel(channel);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
      if (userId && devices.length > 0) {
          const currentId = getDeviceId();
          const currentDeviceEntry = devices.find(d => d.id === currentId);
          // Deny access if awaiting verification or blocked
          if (currentDeviceEntry && currentDeviceEntry.status !== 'approved' && currentDeviceEntry.status !== 'pending') {
               // Only sign out if we are not already on login page (to avoid loop if Login handles the waiting screen)
               // Actually, Login component handles 'awaiting_verification' mode.
               // We should redirect to Login but NOT sign out immediately, so Login can show the "Pending" screen.
               if (!currentPath.includes('/login')) {
                   navigate('/login');
               }
          }
      }
  }, [devices, userId, currentPath]);

  // --- HANDLERS (CRUD) ---
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
    } else {
        handleLogActivity('EDIT', `Article: ${article.title.substring(0, 20)}...`);
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
    if (myDevices.length === 0) return true; // First time logic handled elsewhere
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

  // Calculate Primary Device Status for Global Popup
  const currentDeviceId = getDeviceId();
  const currentDeviceEntry = devices.find(d => d.id === currentDeviceId);
  const isPrimary = currentDeviceEntry?.isPrimary ?? false;
  // Get FIRST pending device only (Normal pending)
  const pendingDevice = devices.find(d => d.status === 'pending');

  const path = currentPath.toLowerCase();
  
  let content: React.ReactNode = null;
  
  if (path === '/auth-callback') {
      // Temporary Redirect State to break loop if user stuck
      setTimeout(() => navigate('/'), 100);
      content = <div className="h-screen flex items-center justify-center">Redirecting...</div>;
  } else if (path === '/reset-password') {
    content = <ResetPassword onNavigate={navigate} devices={devices} />;
  } else if (path === '/login' || (userId && !isDeviceAuthorized() && !isRecovering)) {
    content = <Login onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={() => navigate('/reset-password')} />;
  } else if (path === '/staff/login') {
    content = <StaffLogin onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={() => navigate('/reset-password')} />;
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
        userEmail={userEmail}
        devices={devices.filter(d => d.userId === userId)} 
        onApproveDevice={(id) => handleUpdateDeviceStatus(id, 'approved')} 
        onRejectDevice={(id) => handleRevokeDevice(id)} 
        onRevokeDevice={handleRevokeDevice}
        userId={userId}
        activeVisitors={activeVisitors}
        logs={activityLogs}
        pendingRegistrations={pendingRegistrations}
        onApproveRegistration={(id) => handleUpdateDeviceStatus(id, 'approved')}
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
        userEmail={userEmail}
        devices={devices.filter(d => d.userId === userId)}
        onRevokeDevice={handleRevokeDevice}
        userId={userId} 
        activeVisitors={activeVisitors}
    />;
  } else if (path === '/' || path === '/home') {
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} categories={categories} />;
  } else if (path.startsWith('/article/')) {
    const slugOrId = currentPath.split('/article/')[1];
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
  } else if (path === '/classifieds') {
    content = <ClassifiedsHome classifieds={classifieds} adCategories={adCategories} />;
  } else {
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} categories={categories} />;
  }

  return (
    <>
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

    {/* GLOBAL SECURITY ALERT POPUP (PRIMARY DEVICE ONLY) */}
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
                      <div className="text-center">
                         <p className="text-gray-600 text-sm">A new device is attempting to access your <b>{userRole}</b> workspace.</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                          <div className="flex items-center gap-3">
                              <div className="bg-white p-2 rounded-full border border-gray-200 text-gray-500">
                                 {pendingDevice.deviceType === 'mobile' ? <Smartphone size={20}/> : pendingDevice.deviceType === 'tablet' ? <Tablet size={20}/> : <Monitor size={20}/>}
                              </div>
                              <div>
                                  <p className="font-bold text-gray-900 text-sm">{pendingDevice.deviceName}</p>
                                  <p className="text-xs text-gray-500">{pendingDevice.browser}</p>
                              </div>
                          </div>
                          <div className="border-t border-gray-200 pt-3 flex items-center gap-2 text-xs text-gray-500">
                              <MapPin size={14}/> {pendingDevice.location}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono pt-1">ID: {pendingDevice.id.substring(0,8)}...</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <button onClick={() => handleRevokeDevice(pendingDevice.id)} className="py-3 rounded-lg border border-red-200 text-red-600 font-bold uppercase text-xs hover:bg-red-50 transition-colors">
                              Block Access
                          </button>
                          <button onClick={() => handleUpdateDeviceStatus(pendingDevice.id, 'approved')} className="py-3 rounded-lg bg-green-600 text-white font-bold uppercase text-xs hover:bg-green-700 shadow-lg transition-colors flex items-center justify-center gap-2">
                              <Check size={16}/> Approve
                          </button>
                      </div>
                 </div>
                 {devices.filter(d => d.status === 'pending').length > 1 && (
                     <p className="text-center text-[10px] text-gray-400 mt-4">Queue: {devices.filter(d => d.status === 'pending').length} pending requests</p>
                 )}
              </div>
           </div>
        </div>
    )}
    </>
  );
}

export default App;
