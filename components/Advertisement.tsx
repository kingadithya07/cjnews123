
import React from 'react';
import { Advertisement, AdSize, AdPlacement } from '../types';

interface AdvertisementProps {
  ads: Advertisement[];
  size: AdSize;
  placement?: AdPlacement; // context where the ad is being rendered
  currentCategory?: string; // optional context for category pages
  globalAdsEnabled: boolean;
  className?: string;
}

const AdvertisementBanner: React.FC<AdvertisementProps> = ({ ads, size, placement = 'GLOBAL', currentCategory, globalAdsEnabled, className }) => {
  // 1. Check Global Switch
  if (!globalAdsEnabled) return null;

  // 2. Filter ads by size, active status, AND placement scope
  const availableAds = ads.filter(ad => {
    // Basic checks
    if (!ad.isActive) return false;
    
    // Strict Size Match:
    // The ad's declared slot type (ad.size) must match the current slot (size).
    // Even "Custom" sized ads must optionally belong to a slot type (e.g. BILLBOARD) to render here.
    // We treat 'CUSTOM' legacy type as a fallback that matches nothing specific unless forced, 
    // but the new UI forces a slot selection.
    if (ad.size !== size) return false;

    // Global ads run everywhere
    if (ad.placement === 'GLOBAL') return true;

    // Specific placement match
    if (ad.placement === placement) {
        // If placement is CATEGORY, we must match the specific category
        if (placement === 'CATEGORY') {
            return ad.targetCategory === currentCategory;
        }
        return true;
    }

    return false;
  });

  // 3. If no ads available, return null
  if (availableAds.length === 0) return null;

  // 4. Randomly select one ad to display (Rotation logic)
  const ad = availableAds[Math.floor(Math.random() * availableAds.length)];

  // 5. Determine styles based on size
  const getSizeStyles = (s: AdSize, customW?: number, customH?: number) => {
    // Priority: Custom Dimensions (if provided)
    if (customW && customH) {
        return {
            width: '100%',
            maxWidth: `${customW}px`,
            aspectRatio: `${customW}/${customH}`,
            height: 'auto'
        };
    }

    // Default classes for standard sizes
    switch (s) {
      case 'BILLBOARD': return { maxWidth: '970px', aspectRatio: '97/25' };
      case 'LEADERBOARD': return { maxWidth: '728px', aspectRatio: '728/90' };
      case 'HALF_PAGE': return { maxWidth: '300px', aspectRatio: '300/600' };
      case 'SKYSCRAPER': return { maxWidth: '160px', aspectRatio: '160/600' };
      case 'MOBILE_BANNER': return { maxWidth: '320px', aspectRatio: '32/5' };
      case 'RECTANGLE': default: return { maxWidth: '300px', aspectRatio: '300/250' };
    }
  };

  const styles = getSizeStyles(ad.size, ad.customWidth, ad.customHeight);
  
  // Responsive Visibility Logic based on SLOT TYPE
  // This ensures Billboards don't crush mobile layouts, and Mobile Banners don't appear on desktop.
  let visibilityClasses = '';
  switch (size) {
      case 'MOBILE_BANNER':
          visibilityClasses = 'block md:hidden'; // Only on mobile
          break;
      case 'BILLBOARD':
      case 'LEADERBOARD':
      case 'SKYSCRAPER':
      case 'HALF_PAGE':
          visibilityClasses = 'hidden md:flex'; // Only on desktop
          break;
      case 'RECTANGLE':
      default:
          visibilityClasses = 'flex'; // Visible everywhere (Sidebar/Content boxes)
          break;
  }

  return (
    <div className={`w-full justify-center items-center my-6 ${visibilityClasses} ${className || ''}`}>
      <div 
        className="relative group overflow-hidden bg-gray-100 border border-gray-200 shadow-sm mx-auto w-full h-auto"
        style={styles as React.CSSProperties}
      >
        <span className="absolute top-0 right-0 bg-white/90 text-[8px] font-sans text-gray-400 px-1 uppercase tracking-widest z-10 border-b border-l border-gray-100 pointer-events-none">
            Ad
        </span>
        
        {ad.linkUrl ? (
            <a 
                href={ad.linkUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block w-full h-full relative"
            >
                <img 
                    src={ad.imageUrl} 
                    alt={ad.title} 
                    className="w-full h-full object-fill transition-opacity hover:opacity-90"
                />
            </a>
        ) : (
            // Offline Ad (Image only)
            <div className="block w-full h-full relative cursor-default">
                <img 
                    src={ad.imageUrl} 
                    alt={ad.title} 
                    className="w-full h-full object-fill"
                />
            </div>
        )}
      </div>
    </div>
  );
};

export default AdvertisementBanner;
