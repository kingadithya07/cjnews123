
import React, { useState } from 'react';
import { EPaperPage, EPaperRegion } from '../types';
import { Scissors, BookOpen } from 'lucide-react';

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
          className={`block max-w-none select-none transition-all duration-300 ${imageClassName || ''} ${hoveredRegion ? 'brightness-75' : ''}`}
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
                ? 'bg-news-accent/20 border-news-accent shadow-xl ring-4 ring-news-accent/20 cursor-pointer animate-pulse' 
                : 'bg-transparent border-transparent'
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
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-news-black text-white text-[10px] font-bold py-2 px-4 rounded-full shadow-2xl whitespace-nowrap z-20 pointer-events-none border border-gray-700 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                 <div className="flex items-center gap-1.5 border-r border-gray-700 pr-3">
                    <Scissors size={14} className="text-news-gold" />
                    <span>CLIP</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <BookOpen size={14} className="text-white" />
                    <span>READ ARTICLE</span>
                 </div>
              </div>
            )}
          </div>
        ))}
    </div>
  );
};

export default EPaperViewer;
