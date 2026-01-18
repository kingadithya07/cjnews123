
import React from 'react';
import { Advertisement, AdSize, AdPlacement } from '../types';

interface AdvertisementProps {
  ads: Advertisement[];
  size: AdSize;
  placement?: AdPlacement;
  currentCategory?: string;
  globalAdsEnabled: boolean;
  className?: string;
}

const AdvertisementBanner: React.FC<AdvertisementProps> = ({ ads, size, placement = 'GLOBAL', currentCategory, globalAdsEnabled, className }) => {
  // Styles based on size
  const getSizeStyles = (s: AdSize) => {
    switch (s) {
      case 'BILLBOARD': return { maxWidth: '970px', aspectRatio: '97/25' };
      case 'LEADERBOARD': return { maxWidth: '728px', aspectRatio: '728/90' };
      case 'HALF_PAGE': return { maxWidth: '300px', aspectRatio: '300/600' };
      case 'SKYSCRAPER': return { maxWidth: '160px', aspectRatio: '160/600' };
      case 'MOBILE_BANNER': return { maxWidth: '320px', aspectRatio: '32/5' };
      case 'RECTANGLE': default: return { maxWidth: '300px', aspectRatio: '300/250' };
    }
  };

  const isAdCompatible = (slotSize: AdSize, ad: Advertisement) => {
      if (slotSize === ad.size) return true;
      if (slotSize === 'BILLBOARD' && ad.size === 'LEADERBOARD') return true;
      if (slotSize === 'LEADERBOARD' && ad.size === 'BILLBOARD') return true;
      if (slotSize === 'HALF_PAGE' && ad.size === 'RECTANGLE') return true;
      if (slotSize === 'RECTANGLE' && ad.size === 'MOBILE_BANNER') return true;
      return false;
  };

  const availableAds = ads.filter(ad => {
    if (!ad.isActive) return false;
    if (!isAdCompatible(size, ad)) return false;
    if (ad.placement === 'GLOBAL') return true;
    if (ad.placement === placement) {
        if (placement === 'CATEGORY') return ad.targetCategory === currentCategory;
        return true;
    }
    return false;
  });

  const styles = getSizeStyles(size);
  let visibilityClasses = '';
  switch (size) {
      case 'MOBILE_BANNER': visibilityClasses = 'block md:hidden'; break;
      case 'BILLBOARD': case 'LEADERBOARD': case 'SKYSCRAPER': case 'HALF_PAGE': visibilityClasses = 'hidden md:flex'; break;
      case 'RECTANGLE': default: visibilityClasses = 'flex'; break;
  }

  // --- PLACEHOLDER MODE (When no ad is found or ads are disabled) ---
  if (!globalAdsEnabled || availableAds.length === 0) {
      // Only show placeholder to help developer identify where slots are
      return (
        <div className={`w-full justify-center items-center my-6 ${visibilityClasses} ${className || ''}`}>
          <div 
            className="relative group overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 shadow-sm mx-auto w-full flex items-center justify-center p-4"
            style={styles as React.CSSProperties}
          >
            <div className="text-center">
                <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Available Ad Slot</span>
                <span className="block text-[12px] font-bold text-gray-400 mt-1">{size}</span>
                <span className="block text-[8px] font-medium text-gray-400 uppercase mt-1">Context: {placement} {currentCategory ? `(${currentCategory})` : ''}</span>
                {!globalAdsEnabled && <span className="block text-[8px] font-bold text-red-400 uppercase mt-2">GLOBAL ADS DISABLED</span>}
            </div>
          </div>
        </div>
      );
  }

  const ad = availableAds[Math.floor(Math.random() * availableAds.length)];

  return (
    <div className={`w-full justify-center items-center my-6 ${visibilityClasses} ${className || ''}`}>
      <div 
        className="relative group overflow-hidden bg-gray-100 border border-gray-200 shadow-sm mx-auto w-full h-auto"
        style={styles as React.CSSProperties}
      >
        <span className="absolute top-0 right-0 bg-white/90 text-[8px] font-sans text-gray-400 px-1 uppercase tracking-widest z-10 border-b border-l border-gray-100 pointer-events-none">Ad</span>
        {ad.linkUrl ? (
            <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative">
                <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-fill transition-opacity hover:opacity-90" />
            </a>
        ) : (
            <div className="block w-full h-full relative cursor-default">
                <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-fill" />
            </div>
        )}
      </div>
    </div>
  );
};

export default AdvertisementBanner;
