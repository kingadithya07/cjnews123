
/**
 * Generates a UUID v4 string.
 */
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Generates an 8-digit numeric verification code.
 */
export const generateVerificationCode = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

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

export const getDeviceId = (): string => {
  let deviceId = safeGetItem('dn_device_id', 'local');
  if (deviceId) return deviceId;
  deviceId = safeGetItem('dn_temp_device_id', 'session');
  if (deviceId) return deviceId;
  const newId = `dev_${generateId().substring(0, 8)}`;
  safeSetItem('dn_device_id', newId, 'local');
  if (!safeGetItem('dn_device_id', 'local')) {
      safeSetItem('dn_temp_device_id', newId, 'session');
  }
  return newId;
};

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

/**
 * Creates a URL-friendly slug from a title string.
 * Now improved to handle non-Latin headlines by providing a better fallback logic.
 */
export const createSlug = (title: string): string => {
  if (!title) return '';
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with dashes
    .replace(/^-+|-+$/g, ''); // Trim leading/trailing dashes
  
  return slug;
};
