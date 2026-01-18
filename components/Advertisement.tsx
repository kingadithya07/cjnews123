
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
  
  // Helper: Get recommended styles for slot containers
  const getSlotStyles = (s: AdSize) => {
    switch (s) {
      case 'BILLBOARD': return { maxWidth: '970px', aspectRatio: '97/25' };
      case 'LEADERBOARD': return { maxWidth: '728px', aspectRatio: '728/90' };
      case 'HALF_PAGE': return { maxWidth: '300px', aspectRatio: '300/600' };
      case 'SKYSCRAPER': return { maxWidth: '160px', aspectRatio: '160/600' };
      case 'MOBILE_BANNER': return { maxWidth: '320px', aspectRatio: '32/5' };
      case 'RECTANGLE': default: return { maxWidth: '300px', aspectRatio: '300/250' };
    }
  };

  // Strict Device Matching Logic
  const isDeviceTargetMatch = (ad: Advertisement) => {
      const desktopOnlySizes: AdSize[] = ['BILLBOARD', 'LEADERBOARD', 'SKYSCRAPER', 'HALF_PAGE'];
      const mobileOnlySizes: AdSize[] = ['MOBILE_BANNER'];

      // If we are looking at a Desktop-only slot, only show Desktop-only ads
      if (desktopOnlySizes.includes(size)) {
          return desktopOnlySizes.includes(ad.size) || ad.size === 'RECTANGLE';
      }

      // If we are looking at a Mobile-only slot, only show Mobile-only ads
      if (mobileOnlySizes.includes(size)) {
          return mobileOnlySizes.includes(ad.size) || ad.size === 'RECTANGLE';
      }
      
      return ad.size === size || ad.size === 'RECTANGLE';
  };

  const availableAds = ads.filter(ad => {
    if (!ad.isActive) return false;
    if (!isDeviceTargetMatch(ad)) return false;
    
    if (ad.placement === 'GLOBAL') return true;
    if (ad.placement === placement) {
        if (placement === 'CATEGORY') return ad.targetCategory === currentCategory;
        return true;
    }
    return false;
  });

  const styles = getSlotStyles(size);
  
  // Visibility Classes
  let visibilityClasses = '';
  switch (size) {
      case 'MOBILE_BANNER':
          visibilityClasses = 'flex md:hidden'; // Strictly Mobile
          break;
      case 'BILLBOARD':
      case 'LEADERBOARD':
      case 'SKYSCRAPER':
      case 'HALF_PAGE':
          visibilityClasses = 'hidden md:flex'; // Strictly Desktop
          break;
      case 'RECTANGLE':
      default:
          visibilityClasses = 'flex'; // Universal
          break;
  }

  // --- VISUAL PLACEHOLDER MODE ---
  if (!globalAdsEnabled || availableAds.length === 0) {
      return (
        <div className={`w-full justify-center items-center my-6 select-none ${visibilityClasses} ${className || ''}`}>
          <div 
            className="relative overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 shadow-sm mx-auto w-full flex flex-col items-center justify-center p-4 transition-colors hover:bg-gray-100/50"
            style={styles as React.CSSProperties}
          >
            <div className="text-center">
                <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-gray-300 mb-1">Available Ad Slot</span>
                <div className="bg-gray-200 text-gray-500 px-3 py-1 rounded text-[11px] font-bold inline-block mb-1">{size}</div>
                <div className="flex gap-2 justify-center items-center">
                    <span className="text-[8px] font-medium text-gray-400 uppercase tracking-tighter">Scope: {placement}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                    <span className="text-[8px] font-medium text-gray-400 uppercase tracking-tighter">Target: {size.includes('MOBILE') ? 'Mobile Devices' : 'Desktop Displays'}</span>
                </div>
                {!globalAdsEnabled && (
                    <div className="mt-2 text-[8px] font-black text-red-400 border border-red-100 px-2 py-0.5 rounded uppercase">Master Ads Off</div>
                )}
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
