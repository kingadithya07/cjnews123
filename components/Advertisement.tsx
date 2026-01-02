
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

  // Helper: Check if ad size is compatible with the slot size
  const isSizeCompatible = (slotSize: AdSize, adSize: AdSize) => {
      // Exact match
      if (slotSize === adSize) return true;
      
      // --- Desktop Compatibility ---
      // Allow LEADERBOARD (728x90) in BILLBOARD (970x250) or LARGE_LEADERBOARD (970x90)
      if ((slotSize === 'BILLBOARD' || slotSize === 'LARGE_LEADERBOARD') && adSize === 'LEADERBOARD') return true;
      
      // Allow BILLBOARD in LARGE_LEADERBOARD? No, height issue.
      // Allow LARGE_LEADERBOARD in BILLBOARD? Yes.
      if (slotSize === 'BILLBOARD' && adSize === 'LARGE_LEADERBOARD') return true;

      // Allow RECTANGLE (300x250) in LARGE_RECTANGLE (336x280)
      if (slotSize === 'LARGE_RECTANGLE' && adSize === 'RECTANGLE') return true;

      // --- Mobile Compatibility ---
      // Allow MOBILE_BANNER (320x50) in LARGE_MOBILE_BANNER (320x100) or RECTANGLE (300x250)
      if ((slotSize === 'LARGE_MOBILE_BANNER' || slotSize === 'RECTANGLE') && adSize === 'MOBILE_BANNER') return true;

      // --- Cross-Device Fallbacks (for GLOBAL placement mostly) ---
      // Allow BILLBOARD/LEADERBOARD in the other's slot (scaled)
      if (slotSize === 'LEADERBOARD' && (adSize === 'BILLBOARD' || adSize === 'LARGE_LEADERBOARD')) return true;
      
      return false;
  };

  // 2. Filter ads by size, active status, AND placement scope
  const availableAds = ads.filter(ad => {
    // Basic checks
    if (!ad.isActive) return false;
    
    // Check Size Compatibility
    if (!isSizeCompatible(size, ad.size)) return false;

    // Global ads run everywhere (Short-circuit)
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

  // 5. Determine styles based on the AD's size (not the slot size, to maintain aspect ratio)
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
      // Desktop Sizes
      case 'BILLBOARD': return { maxWidth: '970px', aspectRatio: '97/25' };
      case 'LARGE_LEADERBOARD': return { maxWidth: '970px', aspectRatio: '97/9' };
      case 'LEADERBOARD': return { maxWidth: '728px', aspectRatio: '728/90' };
      case 'HALF_PAGE': return { maxWidth: '300px', aspectRatio: '300/600' };
      case 'SKYSCRAPER': return { maxWidth: '160px', aspectRatio: '160/600' };
      case 'LARGE_RECTANGLE': return { maxWidth: '336px', aspectRatio: '336/280' };
      
      // Mobile Sizes
      case 'MOBILE_BANNER': return { maxWidth: '320px', aspectRatio: '32/5' };
      case 'LARGE_MOBILE_BANNER': return { maxWidth: '320px', aspectRatio: '32/10' };
      
      // Universal
      case 'RECTANGLE': default: return { maxWidth: '300px', aspectRatio: '300/250' };
    }
  };

  const styles = getSizeStyles(ad.size, ad.customWidth, ad.customHeight);
  
  // Responsive Visibility Logic based on SLOT TYPE (size prop)
  // This ensures Billboards don't crush mobile layouts, and Mobile Banners don't appear on desktop.
  let visibilityClasses = '';
  switch (size) {
      case 'MOBILE_BANNER':
      case 'LARGE_MOBILE_BANNER':
          visibilityClasses = 'block md:hidden'; // Strict Mobile
          break;
      case 'BILLBOARD':
      case 'LEADERBOARD':
      case 'LARGE_LEADERBOARD':
      case 'SKYSCRAPER':
      case 'HALF_PAGE':
      case 'LARGE_RECTANGLE':
          visibilityClasses = 'hidden md:flex'; // Strict Desktop
          break;
      case 'RECTANGLE':
      default:
          visibilityClasses = 'flex'; // Universal (Sidebars / Content Boxes)
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
