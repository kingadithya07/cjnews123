
import React, { useState } from 'react';
import { EPaperPage, EPaperRegion } from '../types';

interface EPaperViewerProps {
  page: EPaperPage;
  onRegionClick?: (region: EPaperRegion) => void;
  onNavigate?: (path: string) => void;
  className?: string;
  imageClassName?: string;
  disableInteractivity?: boolean;
}

const EPaperViewer: React.FC<EPaperViewerProps> = ({ page, onRegionClick, onNavigate, className, imageClassName, disableInteractivity = false }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const handleRegionClick = (region: EPaperRegion, e: React.MouseEvent) => {
    // If interactivity is disabled (e.g. in manual clip mode), let the event bubble up
    if (disableInteractivity) return;

    e.stopPropagation(); // Prevent drag/pan events on parent when clicking a region
    
    // If a parent handler exists (e.g., for showing a modal), defer to it
    if (onRegionClick) {
        onRegionClick(region);
        return;
    }

    // Default behavior: navigate directly if no handler provided
    if (region.linkedArticleId && onNavigate) {
      onNavigate(`/article/${region.linkedArticleId}`);
    }
  };

  return (
    // Outer flex container centers the image content in the parent space
    <div className={`relative w-full h-full flex items-center justify-center select-none ${className || ''} ${disableInteractivity ? 'pointer-events-none' : 'pointer-events-none'}`}>
       {/* Inner wrapper shrinks to fit the image dimensions exactly */}
       <div className={`relative h-full w-auto inline-block ${disableInteractivity ? 'pointer-events-auto' : 'pointer-events-auto'}`}>
          <img 
            src={page.imageUrl} 
            alt={`Page ${page.pageNumber}`} 
            className={`h-full w-auto max-w-none object-contain block ${imageClassName || ''}`}
            draggable={false}
          />
          
          {/* Overlay Regions are relative to the shrink-wrapped container */}
          {page.regions.map((region) => (
            <div
              key={region.id}
              onClick={(e) => handleRegionClick(region, e)}
              onMouseEnter={() => !disableInteractivity && setHoveredRegion(region.id)}
              onMouseLeave={() => setHoveredRegion(null)}
              className={`absolute transition-all duration-200 border-2 z-10 
                ${!disableInteractivity && hoveredRegion === region.id 
                  ? 'bg-news-accent/10 border-news-accent shadow-sm cursor-pointer' 
                  : 'bg-transparent border-transparent hover:border-news-accent/30'
                }
                ${disableInteractivity ? 'pointer-events-none' : 'pointer-events-auto'}
              `}
              style={{
                left: `${region.x}%`,
                top: `${region.y}%`,
                width: `${region.width}%`,
                height: `${region.height}%`,
              }}
            >
              {!disableInteractivity && hoveredRegion === region.id && (
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-news-black text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none border border-gray-700 hidden md:block">
                   Click to Clip / Read
                </div>
              )}
            </div>
          ))}
       </div>
    </div>
  );
};

export default EPaperViewer;
