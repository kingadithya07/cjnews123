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
  const getSizeStyles = (s: AdSize) => {
    switch (s) {
      case 'BILLBOARD':
        return 'w-full max-w-[970px] h-[250px] hidden md:block';
      case 'LEADERBOARD':
        return 'w-full max-w-[728px] h-[90px] hidden sm:block';
      case 'HALF_PAGE':
        return 'w-[300px] h-[600px] hidden lg:block';
      case 'SKYSCRAPER':
        return 'w-[160px] h-[600px] hidden lg:block';
      case 'MOBILE_BANNER':
        return 'w-[320px] h-[50px] block sm:hidden';
      case 'RECTANGLE':
      default:
        return 'w-[300px] h-[250px]';
    }
  };

  const containerClasses = getSizeStyles(size);

  return (
    <div className={`w-full flex justify-center items-center my-6 ${className}`}>
      <div className={`relative group overflow-hidden bg-gray-100 border border-gray-200 shadow-sm ${containerClasses}`}>
        <span className="absolute top-0 right-0 bg-white/90 text-[8px] font-sans text-gray-400 px-1 uppercase tracking-widest z-10 border-b border-l border-gray-100">
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
                className="w-full h-full object-cover transition-opacity hover:opacity-90"
            />
        </a>
      </div>
    </div>
  );
};

export default AdvertisementBanner;