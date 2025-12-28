import React, { useState } from 'react';
import { EPaperPage, EPaperRegion } from '../types';

interface EPaperViewerProps {
  page: EPaperPage;
  onRegionClick?: (region: EPaperRegion) => void;
  onNavigate?: (path: string) => void;
}

const EPaperViewer: React.FC<EPaperViewerProps> = ({ page, onRegionClick, onNavigate }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const handleRegionClick = (region: EPaperRegion, e: React.MouseEvent) => {
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
    <div className="relative w-full h-full bg-white shadow-lg overflow-hidden select-none">
      <img 
        src={page.imageUrl} 
        alt={`Page ${page.pageNumber}`} 
        className="w-full h-full object-fill pointer-events-none"
        draggable={false}
      />
      
      {/* Overlay Regions */}
      {page.regions.map((region) => (
        <div
          key={region.id}
          onClick={(e) => handleRegionClick(region, e)}
          onMouseEnter={() => setHoveredRegion(region.id)}
          onMouseLeave={() => setHoveredRegion(null)}
          className={`absolute cursor-pointer transition-all duration-200 border-2 z-10 
            ${hoveredRegion === region.id 
              ? 'bg-news-accent/10 border-news-accent shadow-sm' 
              : 'bg-transparent border-transparent hover:border-news-accent/30'
            }`}
          style={{
            left: `${region.x}%`,
            top: `${region.y}%`,
            width: `${region.width}%`,
            height: `${region.height}%`,
          }}
        >
          {hoveredRegion === region.id && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-news-black text-white text-[10px] font-bold px-3 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none border border-gray-700">
               Click to Clip / Read
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EPaperViewer;