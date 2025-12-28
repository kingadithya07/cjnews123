
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
  
  // Safe Storage Access Helper
  const safeJsonParse = (key: string, fallback: any) => {
      try {
          const item = localStorage.getItem(key);
          return item ? JSON.parse(item) : fallback;
      } catch (e) {
          return fallback;
      }
  };

  const safeJsonSave = (key: string, value: any) => {
      try {
          localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
          // Storage restricted
      }
  };

  // Persistence states (Content remains local for mock purposes, Devices move to Cloud)
  const [articles, setArticles] = useState<Article[]>(() => safeJsonParse('dn_articles', MOCK_ARTICLES));
  const [ePaperPages, setEPaperPages] = useState<EPaperPage[]>(() => safeJsonParse('dn_epaper', MOCK_EPAPER));
  const [categories, setCategories] = useState<string[]>(() => safeJsonParse('dn_categories', ['General', 'World', 'Technology', 'Politics', 'Lifestyle', 'Business', 'Culture', 'Sports', 'Local']));
  const [tags, setTags] = useState<string[]>(() => safeJsonParse('dn_tags', ['Breaking', 'Live', 'Exclusive', 'Opinion', 'Video', 'Podcast', 'Analysis']));
  
  // DEVICES are now synced from Supabase Metadata, defaulting to empty
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

  // Sync Content to LocalStorage
  useEffect(() => safeJsonSave('dn_articles', articles), [articles]);
  useEffect(() => safeJsonSave('dn_epaper', ePaperPages), [ePaperPages]);
  useEffect(() => safeJsonSave('dn_categories', categories), [categories]);
  useEffect(() => safeJsonSave('dn_tags', tags), [tags]);
  // We no longer sync devices to localStorage to avoid conflicts with cloud state

  // --- ROUTING LOGIC (Hash Based) ---
  const getPathFromHash = () => {
     const hash = window.location.hash;
     if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('error=')) {
         return '/auth-callback'; 
     }
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
        if (newPath !== '/auth-callback') {
             setCurrentPath(newPath);
        }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- CLOUD SYNC HELPER ---
  // Saves the current device list to Supabase User Metadata
  const persistDevicesToCloud = async (newDevices: TrustedDevice[]) => {
      setDevices(newDevices); // Optimistic UI update
      const { error } = await supabase.auth.updateUser({
          data: { trusted_devices: newDevices }
      });
      if (error) console.error("Cloud Sync Failed:", error);
  };

  // --- CLOUD POLLING ---
  // Checks for updates from other devices (e.g., Mobile waiting for Desktop approval)
  useEffect(() => {
      if (!userId) return;

      const pollInterval = setInterval(async () => {
          // We use refreshSession to ensure we get the absolute latest metadata from the server
          const { data: { session } } = await supabase.auth.refreshSession();
          if (session) {
              const cloudDevices = session.user.user_metadata.trusted_devices || [];
              
              // Only update state if different to prevent re-renders
              // Simple JSON stringify comparison is sufficient for this data size
              setDevices(prev => {
                  if (JSON.stringify(prev) !== JSON.stringify(cloudDevices)) {
                      return cloudDevices;
                  }
                  return prev;
              });
          }
      }, 4000); // Check every 4 seconds

      return () => clearInterval(pollInterval);
  }, [userId]);


  // --- AUTH INITIALIZATION ---
  useEffect(() => {
    const safetyTimer = setTimeout(() => setLoading(false), 2000);

    const isConfigured = !supabase.supabaseUrl.includes('placeholder-project');
    if (!isConfigured) {
      setLoading(false);
      clearTimeout(safetyTimer);
      return;
    }

    const checkInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        const hash = window.location.hash;
        if (hash.includes('type=recovery')) {
             setIsRecovering(true);
             navigate('/reset-password');
        }

        if (session) {
          const profile = session.user.user_metadata;
          setUserId(session.user.id);
          setUserName(profile.full_name || 'Staff');
          setUserRole(profile.role || UserRole.READER);
          setUserAvatar(profile.avatar_url || null);
          
          // Load Trusted Devices from Cloud
          if (profile.trusted_devices && Array.isArray(profile.trusted_devices)) {
              setDevices(profile.trusted_devices);
          }
        }
      } catch (err) {
        console.warn("Auth initialization warning:", err);
      } finally {
        setLoading(false);
        clearTimeout(safetyTimer);
      }
    };

    checkInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
        navigate('/reset-password');
      }

      if (session) {
        const profile = session.user.user_metadata;
        setUserId(session.user.id);
        setUserName(profile.full_name || 'Staff');
        setUserRole(profile.role || UserRole.READER);
        setUserAvatar(profile.avatar_url || null);
        
        // Sync devices on login/update
        if (profile.trusted_devices && Array.isArray(profile.trusted_devices)) {
            setDevices(profile.trusted_devices);
        }
      } else {
        setUserId(null);
        setUserName(null);
        setUserRole(UserRole.READER);
        setUserAvatar(null);
        setDevices([]); // Clear devices on logout
        setIsRecovering(false);
      }
    });
    
    return () => {
        subscription.unsubscribe();
        clearTimeout(safetyTimer);
    };
  }, []);

  const handleLogin = (role: UserRole, name: string, avatar?: string) => {
      setUserRole(role);
      setUserName(name);
      if (avatar) setUserAvatar(avatar);
  };

  const handleEmergencyReset = async () => {
    if (window.confirm("FACTORY RESET: This will clear all trusted devices from the cloud and log you out. The next login will be treated as a Primary Device. Continue?")) {
        // Clear cloud metadata
        await supabase.auth.updateUser({
            data: { trusted_devices: [] }
        });
        setDevices([]);
        await supabase.auth.signOut();
        navigate('/login');
    }
  };

  const isDeviceAuthorized = () => {
    if (!userId) return false;
    const currentDeviceId = getDeviceId();
    const myDevices = devices.filter(d => d.userId === userId);
    
    // First device rule
    if (myDevices.length === 0) return true; 
    
    const currentEntry = myDevices.find(d => d.id === currentDeviceId);
    return currentEntry?.status === 'approved';
  };

  const handleAddDevice = (device: TrustedDevice) => {
      // Logic to add device, but using persistDevicesToCloud
      // Check if it already exists to avoid dupes
      const exists = devices.some(d => d.id === device.id);
      if (!exists) {
          const newDeviceList = [...devices, device];
          persistDevicesToCloud(newDeviceList);
      }
  };

  const handleApproveDevice = (deviceId: string) => {
    const targetDevice = devices.find(d => d.id === deviceId);
    if (!targetDevice) return;

    // Security: Check limit (Max 5)
    const approvedCount = devices.filter(d => d.userId === targetDevice.userId && d.status === 'approved').length;
    
    if (approvedCount >= 5) {
        alert("Security Alert: Trusted device limit reached (5 Max). Please remove an existing device before approving this one.");
        return;
    }

    const updatedList = devices.map(d => d.id === deviceId ? { ...d, status: 'approved' as const } : d);
    persistDevicesToCloud(updatedList);
  };

  const handleRejectDevice = (deviceId: string) => {
    const updatedList = devices.filter(d => d.id !== deviceId);
    persistDevicesToCloud(updatedList);
  };

  const handleRevokeDevice = (deviceId: string) => {
    const updatedList = devices.filter(d => d.id !== deviceId);
    persistDevicesToCloud(updatedList);
  };

  const handleSaveArticle = (article: Article) => {
    setArticles(prev => {
        const exists = prev.find(a => a.id === article.id);
        return exists ? prev.map(a => a.id === article.id ? article : a) : [article, ...prev];
    });
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

  // Normalize path
  const rawPath = currentPath.toLowerCase();
  const path = rawPath.endsWith('/') && rawPath.length > 1 ? rawPath.slice(0, -1) : rawPath;

  let content;
  
  if (path === '/reset-password') {
    content = <ResetPassword onNavigate={navigate} devices={devices} />;
  } else if (path === '/login' || (userId && !isDeviceAuthorized() && !isRecovering)) {
    content = <Login onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={handleEmergencyReset} />;
  } else if (path === '/staff/login') {
    content = <StaffLogin onLogin={handleLogin} onNavigate={navigate} existingDevices={devices} onAddDevice={handleAddDevice} onEmergencyReset={handleEmergencyReset} />;
  } else if (path === '/editor' && (userRole === UserRole.EDITOR || userRole === UserRole.ADMIN) && isDeviceAuthorized()) {
    content = <EditorDashboard articles={articles} ePaperPages={ePaperPages} categories={categories} tags={tags} adCategories={adCategories} classifieds={classifieds} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} watermarkSettings={watermarkSettings} onToggleGlobalAds={setGlobalAdsEnabled} onUpdateWatermarkSettings={setWatermarkSettings} onUpdatePage={p => setEPaperPages(prev => prev.map(old => old.id === p.id ? p : old))} onAddPage={p => setEPaperPages(prev => [...prev, p])} onDeletePage={id => setEPaperPages(prev => prev.filter(p => p.id !== id))} onDeleteArticle={id => setArticles(prev => prev.filter(a => a.id !== id))} onSaveArticle={handleSaveArticle} onAddCategory={c => setCategories(prev => [...prev, c])} onDeleteCategory={c => setCategories(prev => prev.filter(old => old !== c))} onAddTag={t => setTags(prev => [...prev, t])} onDeleteTag={t => setTags(prev => prev.filter(old => old !== t))} onAddAdCategory={c => {}} onDeleteAdCategory={c => {}} onAddClassified={c => {}} onDeleteClassified={id => {}} onAddAdvertisement={a => {}} onDeleteAdvertisement={id => {}} onNavigate={navigate} userAvatar={userAvatar} devices={devices.filter(d => d.userId === userId)} onApproveDevice={handleApproveDevice} onRejectDevice={handleRejectDevice} onRevokeDevice={handleRevokeDevice} />;
  } else if (path === '/writer' && userRole === UserRole.WRITER && isDeviceAuthorized()) {
    content = <WriterDashboard onSave={handleSaveArticle} existingArticles={articles} currentUserRole={userRole} categories={categories} onNavigate={navigate} userAvatar={userAvatar} />;
  } else if (path === '/' || path === '/home') {
    content = <ReaderHome articles={articles} ePaperPages={ePaperPages} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  } else if (path.startsWith('/article/')) {
    const id = currentPath.split('/article/')[1];
    content = <ArticleView articles={articles} articleId={id} onNavigate={navigate} advertisements={advertisements} globalAdsEnabled={globalAdsEnabled} />;
  } else if (path === '/epaper') {
    content = <EPaperReader pages={ePaperPages} articles={articles} onNavigate={navigate} watermarkSettings={watermarkSettings} />;
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
