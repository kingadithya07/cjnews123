import React from 'react';
import { Advertisement, AdSize, AdPlacement } from '../types';

interface AdvertisementProps {
  ads: Advertisement[];
  size: AdSize;
  placement?: AdPlacement; // context where the ad is being rendered
  globalAdsEnabled: boolean;
  className?: string;
}

const AdvertisementBanner: React.FC<AdvertisementProps> = ({ ads, size, placement = 'GLOBAL', globalAdsEnabled, className }) => {
  // 1. Check Global Switch
  if (!globalAdsEnabled) return null;

  // 2. Filter ads by size, active status, AND placement scope
  const availableAds = ads.filter(ad => 
    ad.size === size && 
    ad.isActive && 
    (ad.placement === 'GLOBAL' || ad.placement === placement)
  );

  // 3. If no ads available, return null
  if (availableAds.length === 0) return null;

  // 4. Randomly select one ad to display (Rotation logic)
  const ad = availableAds[Math.floor(Math.random() * availableAds.length)];

  // 5. Determine styles based on size
  // Optimized for mobile responsiveness using aspect-ratio and max-width scaling
  const getSizeStyles = (s: AdSize) => {
    switch (s) {
      case 'BILLBOARD':
        // 970x250 - Scale down on mobile, do not hide
        return 'w-full max-w-[970px] aspect-[97/25] h-auto';
      case 'LEADERBOARD':
        // 728x90 - Scale down on mobile
        return 'w-full max-w-[728px] aspect-[728/90] h-auto';
      case 'HALF_PAGE':
        // 300x600 - Fixed width usually, but scale if container is smaller
        return 'w-full max-w-[300px] aspect-[300/600] h-auto';
      case 'SKYSCRAPER':
        // 160x600
        return 'w-full max-w-[160px] aspect-[160/600] h-auto';
      case 'MOBILE_BANNER':
        // 320x50 - Only show on mobile breakpoints to avoid clutter on desktop if desired, 
        // or allow everywhere if layout permits. Keeping strict mobile targeting as per name.
        return 'w-full max-w-[320px] aspect-[32/5] h-auto block sm:hidden';
      case 'RECTANGLE':
      default:
        // 300x250
        return 'w-full max-w-[300px] aspect-[300/250] h-auto';
    }
  };

  const containerClasses = getSizeStyles(size);

  return (
    <div className={`w-full flex justify-center items-center my-6 ${className}`}>
      <div className={`relative group overflow-hidden bg-gray-100 border border-gray-200 shadow-sm mx-auto ${containerClasses}`}>
        <span className="absolute top-0 right-0 bg-white/90 text-[8px] font-sans text-gray-400 px-1 uppercase tracking-widest z-10 border-b border-l border-gray-100 pointer-events-none">
            Ad
        </span>
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
      </div>
    </div>
  );
};

export default AdvertisementBanner;