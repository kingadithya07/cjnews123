
import React, { useState } from 'react';
import { EPaperPage, EPaperRegion } from '../types';

interface EPaperViewerProps {
  page: EPaperPage;
  onRegionClick?: (region: EPaperRegion, e: React.MouseEvent) => void;
  onNavigate?: (path: string) => void;
  className?: string;
  imageClassName?: string;
  disableInteractivity?: boolean;
  style?: React.CSSProperties;
}

const EPaperViewer: React.FC<EPaperViewerProps> = ({ page, onRegionClick, onNavigate, className, imageClassName, disableInteractivity = false, style }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const handleRegionClick = (region: EPaperRegion, e: React.MouseEvent) => {
    if (disableInteractivity) return;
    
    // Always stop propagation to prevent parent drag/click handlers from firing
    e.stopPropagation();
    e.preventDefault(); 
    
    if (onRegionClick) {
        onRegionClick(region, e);
        return;
    }

    if (region.linkedArticleId && onNavigate) {
      onNavigate(`/article/${region.linkedArticleId}`);
    }
  };

  return (
    <div 
      className={`relative inline-block align-middle ${className || ''}`}
      style={style}
    >
        <img 
          src={page.imageUrl} 
          alt={`Page ${page.pageNumber}`} 
          className={`block max-w-none select-none ${imageClassName || ''}`}
          draggable={false}
        />
        
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
                 Click to Read / Clip
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default EPaperViewer;
