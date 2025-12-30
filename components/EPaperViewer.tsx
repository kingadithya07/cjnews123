
import React from 'react';
import { EPaperPage } from '../types';

interface EPaperViewerProps {
  page: EPaperPage;
  className?: string;
  imageClassName?: string;
  style?: React.CSSProperties;
}

/**
 * EPaperViewer: Now a clean image renderer for Digital Editions.
 * Interactive region overlays and hover effects have been removed as requested.
 */
const EPaperViewer: React.FC<EPaperViewerProps> = ({ page, className, imageClassName, style }) => {
  return (
    <div 
      className={`relative inline-block align-middle shadow-2xl ${className || ''}`}
      style={style}
    >
        <img 
          src={page.imageUrl} 
          alt={`Digital Edition - Page ${page.pageNumber}`} 
          className={`block max-w-none select-none transition-opacity duration-500 ${imageClassName || ''}`}
          draggable={false}
        />
    </div>
  );
};

export default EPaperViewer;
