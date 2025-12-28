
/**
 * Generates a UUID v4 string.
 * Uses crypto.randomUUID if available, otherwise falls back to a random number generation method.
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback for insecure contexts or older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// In-memory fallback for environments where Storage is completely blocked
const memoryStore: Record<string, string> = {};

const safeGetItem = (key: string, type: 'local' | 'session'): string | null => {
    try {
        if (type === 'local') return localStorage.getItem(key);
        return sessionStorage.getItem(key);
    } catch (e) {
        return memoryStore[key] || null;
    }
};

const safeSetItem = (key: string, value: string, type: 'local' | 'session') => {
    try {
        if (type === 'local') localStorage.setItem(key, value);
        else sessionStorage.setItem(key, value);
    } catch (e) {
        memoryStore[key] = value;
    }
};

/**
 * Gets or creates a persistent unique ID for the current browser/device.
 * Includes multiple fallbacks to prevent SecurityErrors in restricted iframes.
 */
export const getDeviceId = (): string => {
  // 1. Try Local Storage
  let deviceId = safeGetItem('dn_device_id', 'local');
  if (deviceId) return deviceId;

  // 2. Try Session Storage
  deviceId = safeGetItem('dn_temp_device_id', 'session');
  if (deviceId) return deviceId;

  // 3. Generate New
  const newId = `dev_${generateId().substring(0, 8)}`;
  
  // 4. Try to save (Local preferred, fall back to Session, then Memory)
  safeSetItem('dn_device_id', newId, 'local');
  
  // Verify if it stuck in local, if not, try session
  if (!safeGetItem('dn_device_id', 'local')) {
      safeSetItem('dn_temp_device_id', newId, 'session');
  }

  // If both failed, the `safeSetItem` put it in `memoryStore`, so we just return newId
  return newId;
};

/**
 * Basic browser/OS detection for device naming.
 */
export const getDeviceMetadata = () => {
  const ua = navigator.userAgent || 'Unknown';
  let type: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) type = 'tablet';
  else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) type = 'mobile';
  
  const platform = navigator.platform || 'Unknown OS';
  const browserMatch = ua.match(/(firefox|msie|trident|chrome|safari|opera)/i);
  const browser = browserMatch ? browserMatch[0] : 'Unknown Browser';
  
  return {
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${platform}`,
    type,
    browser: browser
  };
};
