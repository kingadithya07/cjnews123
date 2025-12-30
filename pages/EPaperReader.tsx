
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EPaperPage, EPaperRegion, Article, WatermarkSettings } from '../types';
import EPaperViewer from '../components/EPaperViewer';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  Maximize, Minimize, RotateCcw, MousePointer2, X, ArrowRight, Menu, Grid, Scissors, Download, Loader2, Share2, Crop
} from 'lucide-react';
import { APP_NAME } from '../constants';
import { format } from 'date-fns';

interface EPaperReaderProps {
  pages: EPaperPage[];
  articles?: Article[];
  onNavigate: (path: string) => void;
  watermarkSettings?: WatermarkSettings;
}

const EPaperReader: React.FC<EPaperReaderProps> = ({ pages, articles = [], onNavigate, watermarkSettings }) => {
  
  // --- Data Logic ---
  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(pages.map(p => p.date)));
    return dates.sort().reverse(); // Newest first
  }, [pages]);

  const [selectedDate, setSelectedDate] = useState(uniqueDates[0]);

  // Audit Fix: Reset selected date if available dates change significantly
  useEffect(() => {
    if (!uniqueDates.includes(selectedDate) && uniqueDates.length > 0) {
        setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);
  
  const currentEditionPages = useMemo(() => {
    return pages.filter(p => p.date === selectedDate).sort((a, b) => a.pageNumber - b.pageNumber);
  }, [pages, selectedDate]);

  // Fix: activePageIndex out of bounds check
  const [activePageIndex, setActivePageIndex] = useState(0);

  const activePage = currentEditionPages[activePageIndex];
  
  // Ensure we stay within bounds when changing editions
  useEffect(() => {
     if (activePageIndex >= currentEditionPages.length && currentEditionPages.length > 0) {
         setActivePageIndex(0);
     }
  }, [currentEditionPages, activePageIndex]);

  // --- View Logic (Zoom/Pan) ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Mobile UI Logic
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const touchStart = useRef<{x: number, y: number} | null>(null);

  // --- Modal & Clipping Logic ---
  const [selectedRegion, setSelectedRegion] = useState<EPaperRegion | null>(null);
  const [generatedClipping, setGeneratedClipping] = useState<string | null>(null);
  const [isGeneratingClipping, setIsGeneratingClipping] = useState(false);

  // Reset view when page changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setSelectedRegion(null);
    setGeneratedClipping(null);
  }, [activePageIndex, selectedDate]);

  // --- Clipping Generator ---
  useEffect(() => {
    if (selectedRegion && activePage) {
        generateWatermarkedClipping(activePage.imageUrl, selectedRegion, activePage.date);
    } else {
        setGeneratedClipping(null);
    }
  }, [selectedRegion, activePage]);

  const generateWatermarkedClipping = (srcUrl: string, region: EPaperRegion, dateStr: string) => {
    setIsGeneratingClipping(true);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = "Anonymous"; // Essential for external images (CORS)
    img.src = srcUrl;

    img.onload = () => {
        if (!ctx) return;

        // 1. Calculate Crop Coordinates based on Natural Image Size
        // IMPORTANT: Round to integers to avoid sub-pixel rendering issues on some mobile devices
        const sX = Math.floor((region.x / 100) * img.naturalWidth);
        const sY = Math.floor((region.y / 100) * img.naturalHeight);
        const sW = Math.floor((region.width / 100) * img.naturalWidth);
        const sH = Math.floor((region.height / 100) * img.naturalHeight);

        // 2. Define Footer Dimensions (Watermark Strip)
        // Ensure footer is at least 60px or 10% of crop height, whichever is reasonable
        const footerHeight = Math.max(60, Math.floor(sH * 0.15)); 
        
        // 3. Set Canvas Size (Crop Size + Footer)
        canvas.width = sW;
        canvas.height = sH + footerHeight;

        // 4. Draw The Cropped Image
        ctx.drawImage(img, sX, sY, sW, sH, 0, 0, sW, sH);

        // 5. Draw The Footer Background using settings or default
        ctx.fillStyle = watermarkSettings?.backgroundColor || '#1a1a1a'; 
        ctx.fillRect(0, sH, sW, footerHeight);

        // 6. Draw Content (Website Name & Date)
        const centerY = sH + (footerHeight / 2);
        const padding = Math.floor(sW * 0.05); // 5% padding
        
        // Font sizing based on image width to remain proportional
        const nameFontSize = Math.max(16, Math.floor(sW * 0.05)); 
        const dateFontSize = Math.max(12, Math.floor(sW * 0.035));

        // Draw Logic Helpers
        let textStartX = padding;

        // B. Website Name (Left/Center)
        // Note: For advanced logo handling, we'd need a Promise wrapper. 
        // For now, we render text.
        ctx.font = `bold ${nameFontSize}px "Merriweather", serif`;
        ctx.fillStyle = watermarkSettings?.textColor || '#bfa17b'; // News Gold default
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        
        const brandText = watermarkSettings?.text || APP_NAME;
        ctx.fillText(brandText, textStartX, centerY);

        // C. Date (Right, White/Contrast)
        ctx.font = `normal ${dateFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = '#ffffff'; // Keep date white for contrast usually, or derive
        ctx.textAlign = 'right';
        
        try {
            const formattedDate = format(new Date(dateStr), 'MMM do, yyyy');
            ctx.fillText(formattedDate, sW - padding, centerY);
        } catch (e) {
            ctx.fillText(dateStr, sW - padding, centerY);
        }

        // If logo exists, try to draw it. This is async, so we might need to re-export dataURL inside onload.
        if (watermarkSettings?.showLogo && watermarkSettings.logoUrl) {
             const logo = new Image();
             logo.crossOrigin = "Anonymous";
             logo.src = watermarkSettings.logoUrl;
             logo.onload = () => {
                 const logoH = Math.floor(footerHeight * 0.8);
                 const logoW = Math.floor(logo.naturalWidth * (logoH / logo.naturalHeight));
                 const logoY = Math.floor(sH + (footerHeight - logoH) / 2);
                 // Draw logo before text
                 ctx.drawImage(logo, padding, logoY, logoW, logoH);
                 // Redraw text shifted
                 ctx.fillStyle = watermarkSettings?.backgroundColor || '#1a1a1a';
                 ctx.fillRect(padding, sH, Math.floor(sW/2), footerHeight); // Clear left side
                 ctx.fillStyle = watermarkSettings?.textColor || '#bfa17b';
                 ctx.textAlign = 'left';
                 ctx.fillText(brandText, padding + logoW + 15, centerY);
                 
                 finalize();
             };
             logo.onerror = () => finalize(); // Proceed without logo on error
        } else {
            finalize();
        }

        function finalize() {
            try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                setGeneratedClipping(dataUrl);
            } catch (e) {
                console.error("Canvas export failed (likely CORS)", e);
            } finally {
                setIsGeneratingClipping(false);
            }
        }
    };

    img.onerror = () => {
        console.error("Failed to load source image for clipping");
        setIsGeneratingClipping(false);
    };
  };

  const downloadClipping = () => {
    if (generatedClipping) {
        const link = document.createElement('a');
        link.href = generatedClipping;
        const titleSlug = selectedArticle ? selectedArticle.title.substring(0, 20).replace(/\s+/g, '_') : 'epaper_clip';
        link.download = `CJNews_${titleSlug}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleShareClip = async () => {
    if (!generatedClipping) return;

    try {
        const base64Response = await fetch(generatedClipping);
        const blob = await base64Response.blob();
        const file = new File([blob], `clip_${Date.now()}.jpg`, { type: 'image/jpeg' });
        
        const shareData = {
            files: [file],
            title: 'News Clipping',
            text: `Check out this clipping from ${APP_NAME}!`
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            // Fallback
            downloadClipping();
        }
    } catch (err) {
        console.error("Sharing failed", err);
        // Fallback to download if sharing fails
        downloadClipping();
    }
  };


  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 1));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale > 1 && e.touches.length === 1) {
       touchStart.current = { x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y };
       setIsDragging(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
     if (isDragging && scale > 1 && e.touches.length === 1 && touchStart.current) {
        setPosition({
            x: e.touches[0].clientX - touchStart.current.x,
            y: e.touches[0].clientY - touchStart.current.y
        });
     }
  };

  const handleTouchEnd = () => {
      setIsDragging(false);
      touchStart.current = null;
  };

  // Handle region click - UPDATED: Open modal regardless of linking
  const handleRegionClick = (region: EPaperRegion) => {
    if (!isDragging) {
       setSelectedRegion(region);
    }
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    const idx = uniqueDates.indexOf(selectedDate);
    if (direction === 'prev' && idx < uniqueDates.length - 1) {
        setSelectedDate(uniqueDates[idx + 1]);
        setActivePageIndex(0);
    }
    if (direction === 'next' && idx > 0) {
        setSelectedDate(uniqueDates[idx - 1]);
        setActivePageIndex(0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        viewerRef.current?.requestFullscreen();
        setIsFullscreen(true);
    } else {
        document.exitFullscreen();
        setIsFullscreen(false);
    }
  };

  const handlePageShare = async () => {
    const shareData = {
        title: `${APP_NAME} E-Paper`,
        text: `Read the ${format(new Date(selectedDate), 'dd MMM yyyy')} edition of ${APP_NAME} online.`,
        url: window.location.href
    };
    
    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Share canceled');
        }
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
    }
  };

  // Get linked article data (if any)
  const selectedArticle = selectedRegion && selectedRegion.linkedArticleId ? articles.find(a => a.id === selectedRegion.linkedArticleId) : null;

  if (!activePage) return <div className="p-8 text-center text-white">No E-Paper available for this date.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-900 text-white overflow-hidden relative">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-2 md:px-4 py-3 bg-news-black border-b border-gray-800 shadow-md z-20">
         
         {/* Left: Sidebar Toggle & Date Nav */}
         <div className="flex items-center space-x-2 md:space-x-4">
            <button 
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded"
            >
                <Grid size={20} />
            </button>

            <div className="flex items-center bg-gray-800 rounded-md p-1">
                <button 
                  onClick={() => handleDateChange('prev')} 
                  disabled={selectedDate === uniqueDates[uniqueDates.length - 1]}
                  className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 transition-colors"
                >
                    <ChevronLeft size={16} md:size={20} />
                </button>
                <div className="flex items-center px-1 md:px-2 space-x-2 text-xs md:text-sm font-medium border-x border-gray-700 mx-1 min-w-[100px] md:min-w-[140px] justify-center relative group">
                    <Calendar size={12} className="text-news-accent hidden sm:block absolute left-2 pointer-events-none"/>
                    <select 
                        value={selectedDate} 
                        onChange={(e) => { setSelectedDate(e.target.value); setActivePageIndex(0); }}
                        className="bg-transparent text-white font-bold text-xs md:text-sm appearance-none outline-none cursor-pointer pl-6 pr-4 py-1 text-center w-full hover:text-news-gold transition-colors"
                    >
                        {uniqueDates.map(date => (
                            <option key={date} value={date} className="text-black bg-white">
                                {date}
                            </option>
                        ))}
                    </select>
                </div>
                <button 
                  onClick={() => handleDateChange('next')}
                  disabled={selectedDate === uniqueDates[0]} 
                  className="p-1 hover:bg-gray-700 rounded disabled:opacity-30 transition-colors"
                >
                    <ChevronRight size={16} md:size={20} />
                </button>
            </div>

            <div className="hidden sm:block text-sm text-gray-400 font-mono">
                Page <span className="text-white font-bold">{activePageIndex + 1}</span> of {currentEditionPages.length}
            </div>
         </div>

         {/* Right: Zoom, Share & View Tools */}
         <div className="flex items-center space-x-2 md:space-x-4">
             <div className="flex items-center bg-gray-800 rounded-md p-1">
                <button onClick={handleZoomOut} disabled={scale <= 1} className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30 hidden sm:block">
                    <ZoomOut size={16} />
                </button>
                <span className="px-1 md:px-2 text-[10px] md:text-xs font-mono w-8 md:w-12 text-center hidden sm:block">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} disabled={scale >= 4} className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30 hidden sm:block">
                    <ZoomIn size={16} />
                </button>
                <div className="w-px h-4 bg-gray-600 mx-1 hidden sm:block"></div>
                <button onClick={handleReset} className="p-1.5 hover:bg-gray-700 rounded hidden sm:block" title="Reset View">
                    <RotateCcw size={16} />
                </button>
             </div>
             
             <button 
                onClick={handlePageShare}
                className="p-2 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white transition-colors"
                title="Share this edition"
             >
                <Share2 size={18} />
             </button>

             <button 
                onClick={toggleFullscreen} 
                className="flex items-center space-x-2 bg-news-accent hover:bg-red-700 px-2 md:px-3 py-1.5 rounded text-sm font-bold transition-colors"
             >
                {isFullscreen ? <Minimize size={16}/> : <Maximize size={16} />}
                <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
             </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
         
         {/* Thumbnails Sidebar */}
         <div className={`
             absolute md:static inset-y-0 left-0 z-30 w-64 md:w-48 bg-gray-800 border-r border-gray-700 
             transform transition-transform duration-300 ease-in-out md:transform-none overflow-y-auto custom-scrollbar
             ${showMobileSidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
         `}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700 md:hidden">
                <span className="font-bold text-gray-300">Pages</span>
                <button onClick={() => setShowMobileSidebar(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            <div className="p-4 space-y-4">
               {currentEditionPages.map((page, idx) => (
                  <div 
                    key={page.id} 
                    onClick={() => { setActivePageIndex(idx); setShowMobileSidebar(false); }}
                    className={`cursor-pointer group relative transition-all duration-300 ${
                        idx === activePageIndex ? 'scale-105' : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                     <div className={`rounded-sm overflow-hidden border-2 ${idx === activePageIndex ? 'border-news-accent shadow-lg shadow-news-accent/20' : 'border-transparent'}`}>
                        <img src={page.imageUrl} className="w-full h-full object-cover" alt={`Thumb ${page.pageNumber}`} />
                     </div>
                     <p className={`text-center text-xs mt-2 font-mono ${idx === activePageIndex ? 'text-news-accent font-bold' : 'text-gray-400'}`}>
                        Page {page.pageNumber}
                     </p>
                  </div>
               ))}
            </div>
         </div>
         
         {showMobileSidebar && (
            <div className="absolute inset-0 bg-black/50 z-20 md:hidden" onClick={() => setShowMobileSidebar(false)}></div>
         )}

         {/* Canvas Area */}
         <div 
            ref={viewerRef}
            className={`flex-1 bg-[#1e1e1e] overflow-hidden relative touch-none cursor-${scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'}`}
            style={{ touchAction: 'none' }} // Prevent scrolling while interacting
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
         >
             {/* Center Content Container */}
             <div className="w-full h-full flex items-center justify-center p-2 md:p-8">
                <div 
                    style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                        width: 'auto',
                        height: '100%',
                        aspectRatio: '2/3',
                    }}
                    className="origin-center shadow-2xl"
                >
                    <EPaperViewer page={activePage} onRegionClick={handleRegionClick} onNavigate={onNavigate} />
                </div>
             </div>

             {/* Overlay Hints */}
             {scale === 1 && !selectedRegion && (
                 <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-xs backdrop-blur-sm pointer-events-none whitespace-nowrap hidden sm:block">
                     <span className="flex items-center gap-2">
                        <MousePointer2 size={12} /> Hover to highlight • Click to clip • Scroll/Zoom to explore
                     </span>
                 </div>
             )}
         </div>
      </div>

      {/* CLIPPING MODAL */}
      {selectedRegion && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white text-news-black rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
            
            {/* Left: The Generated Clipping */}
            <div className="w-full md:w-1/2 bg-gray-100 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 relative min-h-[350px] md:min-h-auto">
               <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 border border-gray-200 z-10">
                   <Scissors size={12} /> Auto-Clipped
               </div>
               
               <div className="shadow-lg max-h-full max-w-full overflow-auto custom-scrollbar border-4 border-white flex justify-center items-center w-full h-full">
                  {isGeneratingClipping ? (
                      <div className="h-48 w-full flex flex-col items-center justify-center text-gray-400">
                          <Loader2 size={32} className="animate-spin mb-2" />
                          <span className="text-xs font-bold uppercase">Generating Watermark...</span>
                      </div>
                  ) : generatedClipping ? (
                      <img src={generatedClipping} alt="Clipped Article" className="max-w-full max-h-[40vh] md:max-h-[60vh] object-contain block" />
                  ) : (
                      <div className="h-48 w-full flex items-center justify-center text-red-400 text-xs">Failed to generate image</div>
                  )}
               </div>
               
               <p className="mt-4 text-[10px] text-gray-400 text-center max-w-xs">
                   This image has been automatically cropped and watermarked with {watermarkSettings?.text || APP_NAME} branding.
               </p>
            </div>

            {/* Right: Actions & Info */}
            <div className="w-full md:w-1/2 flex flex-col h-[40vh] md:h-auto">
                <div className="flex justify-between items-start p-6 border-b border-gray-100">
                   <div>
                       <span className={`inline-block text-white text-[10px] font-bold px-2 py-0.5 uppercase tracking-widest rounded-sm mb-2 ${selectedArticle ? 'bg-news-accent' : 'bg-gray-400'}`}>
                          {selectedArticle ? selectedArticle.category : 'E-Paper Clipping'}
                       </span>
                       <h2 className="text-xl md:text-2xl font-serif font-bold leading-tight text-gray-900">
                           {selectedArticle ? selectedArticle.title : 'Clipping Selection'}
                       </h2>
                   </div>
                   <button onClick={() => setSelectedRegion(null)} className="text-gray-400 hover:text-black transition-colors">
                     <X size={24} />
                   </button>
                </div>

                <div className="p-6 flex-1 overflow-y-auto">
                    {selectedArticle ? (
                        <>
                            <p className="font-serif text-gray-600 leading-relaxed text-sm mb-4">
                            {selectedArticle.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                            </p>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <span>By {selectedArticle.author}</span>
                                <span>•</span>
                                <span>{new Date(selectedArticle.publishedAt).toLocaleDateString()}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3">
                            <Crop size={48} className="opacity-20" />
                            <p className="text-sm">No digital article is linked to this region.</p>
                            <p className="text-xs">You can still download or share the clipped image.</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
                    <div className={`grid gap-3 ${selectedArticle ? 'grid-cols-2' : 'grid-cols-2'}`}>
                         <button 
                            onClick={downloadClipping}
                            disabled={!generatedClipping}
                            className="flex flex-col items-center justify-center p-3 bg-white border border-gray-300 rounded hover:bg-gray-100 hover:border-gray-400 transition-all group disabled:opacity-50"
                         >
                            <Download size={20} className="mb-1 text-news-black group-hover:scale-110 transition-transform"/>
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Save Clipping</span>
                         </button>
                         
                         <button 
                            onClick={handleShareClip}
                            disabled={!generatedClipping}
                            className="flex flex-col items-center justify-center p-3 bg-white border border-gray-300 rounded hover:bg-gray-100 hover:border-gray-400 transition-all group disabled:opacity-50"
                         >
                            <Share2 size={20} className="mb-1 text-blue-600 group-hover:scale-110 transition-transform"/>
                            <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Share Clip</span>
                         </button>

                         {selectedArticle && (
                            <button 
                                onClick={() => onNavigate(`/article/${selectedArticle.id}`)}
                                className="col-span-2 flex flex-col items-center justify-center p-3 bg-news-black text-white rounded hover:bg-gray-800 transition-all group shadow-lg shadow-gray-300"
                            >
                                <ArrowRight size={20} className="mb-1 group-hover:translate-x-1 transition-transform"/>
                                <span className="text-xs font-bold uppercase tracking-wide">Read Full Article</span>
                            </button>
                         )}
                    </div>
                </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default EPaperReader;
