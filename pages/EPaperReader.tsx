
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EPaperPage, EPaperRegion, Article, WatermarkSettings } from '../types';
import EPaperViewer from '../components/EPaperViewer';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  Maximize, Minimize, RotateCcw, MousePointer2, X, ArrowRight, Menu, Grid, Scissors, Download, Loader2, Share2, Crop, ArrowLeft
} from 'lucide-react';
import { APP_NAME } from '../constants';
import { format, isValid, parseISO } from 'date-fns';

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

  const [selectedDate, setSelectedDate] = useState(uniqueDates[0] || new Date().toISOString().split('T')[0]);

  // Audit Fix: Reset selected date if available dates change significantly
  useEffect(() => {
    if (!uniqueDates.includes(selectedDate) && uniqueDates.length > 0) {
        if (!selectedDate) setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates]);
  
  const currentEditionPages = useMemo(() => {
    return pages.filter(p => p.date === selectedDate).sort((a, b) => a.pageNumber - b.pageNumber);
  }, [pages, selectedDate]);

  const [activePageIndex, setActivePageIndex] = useState(0);
  const activePage = currentEditionPages[activePageIndex];
  
  useEffect(() => {
     if (activePageIndex >= currentEditionPages.length && currentEditionPages.length > 0) {
         setActivePageIndex(0);
     }
  }, [currentEditionPages, activePageIndex]);

  // --- View Logic (Zoom/Pan/Clip) ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Manual Clipping State
  const [clipMode, setClipMode] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{x:number, y:number, w:number, h:number} | null>(null);
  const selectionStart = useRef<{x:number, y:number} | null>(null);
  
  // Refs for high-performance gesture handling
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number, clientY: number, originX: number, originY: number } | null>(null);
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Mobile UI Logic
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // --- Modal & Clipping Logic ---
  const [selectedRegion, setSelectedRegion] = useState<EPaperRegion | null>(null);
  const [generatedClipping, setGeneratedClipping] = useState<string | null>(null);
  const [isGeneratingClipping, setIsGeneratingClipping] = useState(false);
  
  // Modal Image Zoom State
  const [clippingScale, setClippingScale] = useState(1);

  // Reset view when page changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setSelectedRegion(null);
    setGeneratedClipping(null);
    setClippingScale(1);
    setClipMode(false);
    setSelectionBox(null);
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
    
    img.crossOrigin = "Anonymous";
    img.src = srcUrl;

    img.onload = () => {
        if (!ctx) return;

        const sX = Math.floor((region.x / 100) * img.naturalWidth);
        const sY = Math.floor((region.y / 100) * img.naturalHeight);
        const sW = Math.floor((region.width / 100) * img.naturalWidth);
        const sH = Math.floor((region.height / 100) * img.naturalHeight);

        const footerHeight = Math.max(60, Math.floor(sH * 0.15)); 
        
        canvas.width = sW;
        canvas.height = sH + footerHeight;

        ctx.drawImage(img, sX, sY, sW, sH, 0, 0, sW, sH);

        ctx.fillStyle = watermarkSettings?.backgroundColor || '#1a1a1a'; 
        ctx.fillRect(0, sH, sW, footerHeight);

        const centerY = sH + (footerHeight / 2);
        const padding = Math.floor(sW * 0.05);
        
        const nameFontSize = Math.max(16, Math.floor(sW * 0.05)); 
        const dateFontSize = Math.max(12, Math.floor(sW * 0.035));

        let textStartX = padding;

        ctx.font = `bold ${nameFontSize}px "Merriweather", serif`;
        ctx.fillStyle = watermarkSettings?.textColor || '#bfa17b';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        
        const brandText = watermarkSettings?.text || APP_NAME;
        ctx.fillText(brandText, textStartX, centerY);

        ctx.font = `normal ${dateFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        
        try {
            const formattedDate = format(new Date(dateStr), 'MMM do, yyyy');
            ctx.fillText(formattedDate, sW - padding, centerY);
        } catch (e) {
            ctx.fillText(dateStr, sW - padding, centerY);
        }

        if (watermarkSettings?.showLogo && watermarkSettings.logoUrl) {
             const logo = new Image();
             logo.crossOrigin = "Anonymous";
             logo.src = watermarkSettings.logoUrl;
             logo.onload = () => {
                 const logoH = Math.floor(footerHeight * 0.8);
                 const logoW = Math.floor(logo.naturalWidth * (logoH / logo.naturalHeight));
                 const logoY = Math.floor(sH + (footerHeight - logoH) / 2);
                 ctx.drawImage(logo, padding, logoY, logoW, logoH);
                 ctx.fillStyle = watermarkSettings?.backgroundColor || '#1a1a1a';
                 ctx.fillRect(padding, sH, Math.floor(sW/2), footerHeight);
                 ctx.fillStyle = watermarkSettings?.textColor || '#bfa17b';
                 ctx.textAlign = 'left';
                 ctx.fillText(brandText, padding + logoW + 15, centerY);
                 finalize();
             };
             logo.onerror = () => finalize();
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
            downloadClipping();
        }
    } catch (err) {
        console.error("Sharing failed", err);
        downloadClipping();
    }
  };


  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 1));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  // Vertical Slider Logic
  const handleVerticalScroll = (e: React.ChangeEvent<HTMLInputElement>) => {
      setPosition(prev => ({ ...prev, y: parseInt(e.target.value) }));
  };

  // --- Coordinates Helper ---
  const getNormalizedCoords = (clientX: number, clientY: number) => {
      if (!contentRef.current) return { x: 0, y: 0 };
      const rect = contentRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      return { 
          x: Math.max(0, Math.min(100, x)), 
          y: Math.max(0, Math.min(100, y)) 
      };
  };

  // Mouse Handlers (Desktop)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (clipMode) {
        // Start Manual Selection
        const coords = getNormalizedCoords(e.clientX, e.clientY);
        selectionStart.current = coords;
        setSelectionBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
    } else if (scale > 1) {
      // Start Pan
      setIsDragging(true);
      dragStartRef.current = { 
          clientX: e.clientX, 
          clientY: e.clientY, 
          originX: position.x, 
          originY: position.y 
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (clipMode && selectionStart.current) {
        // Update Manual Selection
        const coords = getNormalizedCoords(e.clientX, e.clientY);
        const start = selectionStart.current;
        const x = Math.min(start.x, coords.x);
        const y = Math.min(start.y, coords.y);
        const w = Math.abs(coords.x - start.x);
        const h = Math.abs(coords.y - start.y);
        setSelectionBox({ x, y, w, h });
    } else if (isDragging && scale > 1 && dragStartRef.current && contentRef.current) {
      // Update Pan
      e.preventDefault();
      const deltaX = e.clientX - dragStartRef.current.clientX;
      const deltaY = e.clientY - dragStartRef.current.clientY;
      
      const newX = dragStartRef.current.originX + deltaX;
      const newY = dragStartRef.current.originY + deltaY;

      contentRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scale})`;
      contentRef.current.style.transition = 'none';
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (clipMode && selectionBox) {
        // Finalize Manual Selection
        if (selectionBox.w > 1 && selectionBox.h > 1) {
             setSelectedRegion({
                 id: 'manual-clip',
                 x: selectionBox.x,
                 y: selectionBox.y,
                 width: selectionBox.w,
                 height: selectionBox.h,
                 linkedArticleId: '' // Manual clips have no article data
             });
             setClipMode(false);
        }
        setSelectionBox(null);
        selectionStart.current = null;
    } else if (isDragging && dragStartRef.current) {
        // Finalize Pan
        const deltaX = e.clientX - dragStartRef.current.clientX;
        const deltaY = e.clientY - dragStartRef.current.clientY;
        setPosition({
            x: dragStartRef.current.originX + deltaX,
            y: dragStartRef.current.originY + deltaY
        });
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Touch Handlers (Mobile) - Optimized
  const handleTouchStart = (e: React.TouchEvent) => {
    if (clipMode && e.touches.length === 1) {
        const coords = getNormalizedCoords(e.touches[0].clientX, e.touches[0].clientY);
        selectionStart.current = coords;
        setSelectionBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
    } else if (scale > 1 && e.touches.length === 1) {
       setIsDragging(true);
       dragStartRef.current = { 
           clientX: e.touches[0].clientX, 
           clientY: e.touches[0].clientY, 
           originX: position.x, 
           originY: position.y 
       };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
     if (clipMode && selectionStart.current && e.touches.length === 1) {
        const coords = getNormalizedCoords(e.touches[0].clientX, e.touches[0].clientY);
        const start = selectionStart.current;
        const x = Math.min(start.x, coords.x);
        const y = Math.min(start.y, coords.y);
        const w = Math.abs(coords.x - start.x);
        const h = Math.abs(coords.y - start.y);
        setSelectionBox({ x, y, w, h });
     } else if (isDragging && scale > 1 && e.touches.length === 1 && dragStartRef.current && contentRef.current) {
        const deltaX = e.touches[0].clientX - dragStartRef.current.clientX;
        const deltaY = e.touches[0].clientY - dragStartRef.current.clientY;
        
        const newX = dragStartRef.current.originX + deltaX;
        const newY = dragStartRef.current.originY + deltaY;

        contentRef.current.style.transform = `translate(${newX}px, ${newY}px) scale(${scale})`;
        contentRef.current.style.transition = 'none';
     }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (clipMode && selectionBox) {
          if (selectionBox.w > 1 && selectionBox.h > 1) {
             setSelectedRegion({
                 id: 'manual-clip',
                 x: selectionBox.x,
                 y: selectionBox.y,
                 width: selectionBox.w,
                 height: selectionBox.h,
                 linkedArticleId: ''
             });
             setClipMode(false);
          }
          setSelectionBox(null);
          selectionStart.current = null;
      } else if (isDragging && dragStartRef.current) {
          const touch = e.changedTouches[0];
          if (touch) {
              const deltaX = touch.clientX - dragStartRef.current.clientX;
              const deltaY = touch.clientY - dragStartRef.current.clientY;
              setPosition({
                  x: dragStartRef.current.originX + deltaX,
                  y: dragStartRef.current.originY + deltaY
              });
          }
      }
      setIsDragging(false);
      dragStartRef.current = null;
  };

  const handleRegionClick = (region: EPaperRegion) => {
    if (!isDragging && !clipMode) {
       setSelectedRegion(region);
       setClippingScale(1); // Reset modal zoom
    }
  };

  const handleDateChange = (direction: 'prev' | 'next') => {
    let targetIndex = -1;
    let newDate = selectedDate;

    if (uniqueDates.includes(selectedDate)) {
        const idx = uniqueDates.indexOf(selectedDate);
        if (direction === 'prev') {
            targetIndex = idx + 1; // Older
        } else {
            targetIndex = idx - 1; // Newer
        }
    } else {
        const currentTs = new Date(selectedDate).getTime();
        if (direction === 'prev') {
            const older = uniqueDates.find(d => new Date(d).getTime() < currentTs);
            if (older) newDate = older;
        } else {
            const newer = [...uniqueDates].reverse().find(d => new Date(d).getTime() > currentTs);
            if (newer) newDate = newer;
        }
        
        if (newDate !== selectedDate) {
            setSelectedDate(newDate);
            setActivePageIndex(0);
        }
        return;
    }

    if (targetIndex >= 0 && targetIndex < uniqueDates.length) {
        setSelectedDate(uniqueDates[targetIndex]);
        setActivePageIndex(0);
    }
  };

  const handlePrevPage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activePageIndex > 0) {
        setActivePageIndex(prev => prev - 1);
    }
  };

  const handleNextPage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activePageIndex < currentEditionPages.length - 1) {
        setActivePageIndex(prev => prev + 1);
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

  const selectedArticle = selectedRegion && selectedRegion.linkedArticleId ? articles.find(a => a.id === selectedRegion.linkedArticleId) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-900 text-white overflow-hidden relative">
      
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-2 md:px-4 py-3 bg-news-black border-b border-gray-800 shadow-md z-20 gap-2 shrink-0">
         
         {/* Left: Sidebar Toggle & Navigation */}
         <div className="flex items-center justify-start gap-2 w-auto md:min-w-[150px]">
            <button 
                onClick={() => onNavigate('/')}
                className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded flex items-center gap-1"
                title="Back to Home"
            >
                <ArrowLeft size={20} /> <span className="hidden lg:inline text-xs font-bold uppercase tracking-wider">Home</span>
            </button>
            
            <button 
                onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded"
            >
                <Grid size={20} />
            </button>

            {activePage && (
                <div className="hidden md:block text-sm text-gray-400 font-mono">
                    Page <span className="text-white font-bold">{activePageIndex + 1}</span> of {currentEditionPages.length}
                </div>
            )}
         </div>

         {/* Center: Date Navigation */}
         <div className="flex items-center justify-center flex-1">
            <div className="flex items-center bg-gray-800 rounded-full p-1 border border-gray-700 shadow-sm relative group hover:border-gray-600 transition-colors w-auto max-w-full">
                <button 
                  onClick={() => handleDateChange('prev')} 
                  disabled={uniqueDates.indexOf(selectedDate) === uniqueDates.length - 1 && uniqueDates.includes(selectedDate)}
                  className="p-1.5 hover:bg-gray-700 rounded-full disabled:opacity-30 transition-colors text-gray-300 hover:text-white shrink-0"
                  title="Previous Edition"
                >
                    <ChevronLeft size={18} />
                </button>
                
                <div className="relative mx-1 md:mx-2 cursor-pointer flex items-center justify-center px-2 py-1 overflow-hidden">
                    <div className="flex items-center space-x-2 text-[10px] md:text-xs font-bold text-white pointer-events-none group-hover:text-news-gold transition-colors whitespace-nowrap overflow-hidden text-ellipsis">
                        <Calendar size={14} className="text-news-accent mb-0.5 shrink-0"/>
                        <span className="tracking-wide truncate">
                            {isValid(parseISO(selectedDate)) ? format(parseISO(selectedDate), 'MMM dd, yyyy') : selectedDate}
                        </span>
                    </div>
                    {/* Native Date Picker Overlay */}
                    <input 
                        type="date" 
                        value={selectedDate} 
                        onChange={(e) => { setSelectedDate(e.target.value); setActivePageIndex(0); }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        title="Select Date"
                    />
                </div>

                <button 
                  onClick={() => handleDateChange('next')}
                  disabled={uniqueDates.indexOf(selectedDate) === 0 && uniqueDates.includes(selectedDate)}
                  className="p-1.5 hover:bg-gray-700 rounded-full disabled:opacity-30 transition-colors text-gray-300 hover:text-white shrink-0"
                  title="Next Edition"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
         </div>

         {/* Right: Zoom & Tools */}
         <div className="flex items-center justify-end gap-2 w-auto md:min-w-[150px]">
             
             {/* Clip Tool Toggle */}
             <button
                onClick={() => { setClipMode(!clipMode); setSelectionBox(null); }}
                className={`p-2 rounded-full transition-colors ${clipMode ? 'bg-news-accent text-white shadow-lg shadow-red-900/50' : 'text-gray-300 hover:bg-gray-800'}`}
                title={clipMode ? "Cancel Clipping" : "Clip Tool"}
             >
                 <Scissors size={18} />
             </button>

             <div className="hidden md:flex items-center bg-gray-800 rounded-md p-1 mr-2">
                <button onClick={handleZoomOut} disabled={scale <= 1} className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30">
                    <ZoomOut size={16} />
                </button>
                <span className="px-2 text-xs font-mono w-12 text-center text-gray-400">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} disabled={scale >= 4} className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30">
                    <ZoomIn size={16} />
                </button>
                <div className="w-px h-4 bg-gray-600 mx-1"></div>
                <button onClick={handleReset} className="p-1.5 hover:bg-gray-700 rounded" title="Reset View">
                    <RotateCcw size={16} />
                </button>
             </div>
             
             <button 
                onClick={handlePageShare}
                className="p-2 hover:bg-gray-700 rounded-full text-gray-300 hover:text-white transition-colors hidden sm:block"
                title="Share"
             >
                <Share2 size={18} />
             </button>

             <button 
                onClick={toggleFullscreen} 
                className="hidden md:flex items-center space-x-2 bg-news-black border border-gray-700 hover:bg-gray-800 px-3 py-1.5 rounded text-xs font-bold transition-colors"
             >
                {isFullscreen ? <Minimize size={14}/> : <Maximize size={14} />}
                <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
             </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
         
         {/* Thumbnails Sidebar */}
         <div className={`
             absolute md:static inset-y-0 left-0 z-30 w-64 md:w-48 bg-gray-800 border-r border-gray-700 
             transform transition-transform duration-300 ease-in-out md:transform-none overflow-y-auto custom-scrollbar shrink-0
             ${showMobileSidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
         `}>
            <div className="flex justify-between items-center p-4 border-b border-gray-700 md:hidden">
                <span className="font-bold text-gray-300">Pages</span>
                <button onClick={() => setShowMobileSidebar(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            <div className="p-4 space-y-4">
               {currentEditionPages.length > 0 ? currentEditionPages.map((page, idx) => (
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
               )) : (
                   <div className="text-center text-gray-500 text-xs py-8 italic">No pages found.</div>
               )}
            </div>
         </div>
         
         {showMobileSidebar && (
            <div className="absolute inset-0 bg-black/50 z-20 md:hidden" onClick={() => setShowMobileSidebar(false)}></div>
         )}

         {/* Canvas Area */}
         <div 
            ref={viewerRef}
            className={`flex-1 bg-[#1e1e1e] overflow-hidden relative touch-none cursor-${clipMode ? 'crosshair' : (scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default')}`}
            style={{ touchAction: scale > 1 ? 'none' : 'pan-y' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
         >
             {activePage ? (
                 <>
                    {/* Vertical Slider Control */}
                    {scale > 1 && !clipMode && (
                        <div className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 h-48 md:h-64 z-40 flex items-center justify-center bg-black/40 rounded-full py-4 backdrop-blur-sm shadow-lg border border-white/10">
                            <input
                                type="range"
                                min="-1000"
                                max="1000"
                                step="10"
                                value={position.y}
                                onChange={handleVerticalScroll}
                                className="h-full w-2 md:w-1.5 bg-gray-400/50 rounded-lg appearance-none cursor-pointer hover:bg-white transition-colors accent-news-accent"
                                style={{ writingMode: 'vertical-lr', direction: 'rtl', WebkitAppearance: 'slider-vertical' }}
                                title="Scroll Image Vertically"
                            />
                        </div>
                    )}

                    {/* Floating Page Navigation (Prev/Next Page) */}
                    {activePageIndex > 0 && !clipMode && (
                        <button 
                            onClick={handlePrevPage}
                            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-news-accent text-white p-2 rounded-full backdrop-blur-sm transition-all z-30 group shadow-lg"
                            title="Previous Page"
                        >
                            <ChevronLeft size={24} className="group-hover:-translate-x-0.5 transition-transform"/>
                        </button>
                    )}

                    {activePageIndex < currentEditionPages.length - 1 && !clipMode && (
                        <button 
                            onClick={handleNextPage}
                            className="absolute right-2 md:right-16 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-news-accent text-white p-2 rounded-full backdrop-blur-sm transition-all z-30 group shadow-lg"
                            title="Next Page"
                        >
                            <ChevronRight size={24} className="group-hover:translate-x-0.5 transition-transform"/>
                        </button>
                    )}

                    {/* Floating Zoom Controls (Visible on all devices) */}
                    <div className="absolute bottom-8 right-6 flex flex-col gap-2 z-40">
                        <button 
                            onClick={handleZoomIn} 
                            disabled={scale >= 4}
                            className="p-3 bg-news-black text-white rounded-full shadow-lg border border-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            <ZoomIn size={20} />
                        </button>
                        <button 
                            onClick={handleZoomOut} 
                            disabled={scale <= 1}
                            className="p-3 bg-news-black text-white rounded-full shadow-lg border border-gray-700 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            <ZoomOut size={20} />
                        </button>
                    </div>

                    {/* Clip Mode Toast */}
                    {clipMode && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-news-accent text-white px-4 py-2 rounded-full font-bold uppercase tracking-wider text-xs shadow-lg animate-pulse flex items-center gap-2">
                            <Scissors size={14} /> Draw a box to clip
                        </div>
                    )}

                    {/* Center Content Container */}
                    <div className="w-full h-full flex items-center justify-center p-4">
                        <div 
                            ref={contentRef}
                            style={{ 
                                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                                transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                                transformOrigin: 'center',
                                willChange: 'transform' // Improve scrolling performance
                            }}
                            className="origin-center flex items-center justify-center max-w-full max-h-full relative"
                        >
                            <EPaperViewer 
                                page={activePage} 
                                onRegionClick={handleRegionClick} 
                                onNavigate={onNavigate}
                                className="max-w-full max-h-full shadow-2xl"
                                imageClassName="max-h-[85vh] w-auto"
                                disableInteractivity={clipMode} // Disable existing region clicks when clipping
                            />
                            
                            {/* Manual Clip Selection Overlay */}
                            {clipMode && selectionBox && (
                                <div 
                                    className="absolute border-2 border-news-accent bg-news-accent/20 z-50 pointer-events-none"
                                    style={{
                                        left: `${selectionBox.x}%`,
                                        top: `${selectionBox.y}%`,
                                        width: `${selectionBox.w}%`,
                                        height: `${selectionBox.h}%`
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    {/* Overlay Hints */}
                    {scale === 1 && !selectedRegion && !clipMode && (
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-xs backdrop-blur-sm pointer-events-none whitespace-nowrap hidden sm:block">
                            <span className="flex items-center gap-2">
                                <MousePointer2 size={12} /> Hover to highlight • Click to clip • Scroll/Zoom to explore
                            </span>
                        </div>
                    )}
                 </>
             ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                     <div className="bg-gray-800 p-6 rounded-full mb-4">
                        <Calendar size={48} className="text-gray-600"/>
                     </div>
                     <h3 className="text-xl font-bold text-gray-300 mb-2">No Edition Found</h3>
                     <p className="text-sm mb-6">There is no E-Paper available for {format(parseISO(selectedDate), 'MMM dd, yyyy')}.</p>
                     {uniqueDates.length > 0 && (
                         <button 
                            onClick={() => setSelectedDate(uniqueDates[0])}
                            className="px-6 py-2 bg-news-accent text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-red-700 transition-colors"
                         >
                             View Latest Edition
                         </button>
                     )}
                 </div>
             )}
         </div>
      </div>

      {/* CLIPPING MODAL */}
      {selectedRegion && (
        <div className="absolute inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          
          {selectedArticle ? (
            /* WITH ARTICLE: Standard Split View */
            <div className="bg-white text-news-black rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
                {/* ... (Existing modal content) ... */}
                {/* Left: The Generated Clipping */}
                <div className="w-full md:w-1/2 bg-gray-100 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-200 relative min-h-[350px] md:min-h-auto">
                <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1 border border-gray-200 z-10">
                    <Scissors size={12} /> Clipped Content
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
                            {selectedArticle.category}
                        </span>
                        <h2 className="text-xl md:text-2xl font-serif font-bold leading-tight text-gray-900">
                            {selectedArticle.title}
                        </h2>
                    </div>
                    <button onClick={() => setSelectedRegion(null)} className="text-gray-400 hover:text-black transition-colors">
                        <X size={24} />
                    </button>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto">
                        <p className="font-serif text-gray-600 leading-relaxed text-sm mb-4">
                        {selectedArticle.content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            <span>By {selectedArticle.author}</span>
                            <span>•</span>
                            <span>{new Date(selectedArticle.publishedAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 border-t border-gray-100 space-y-3">
                        <div className="grid gap-3 grid-cols-2">
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

                            <button 
                                onClick={() => onNavigate(`/article/${selectedArticle.id}`)}
                                className="col-span-2 flex flex-col items-center justify-center p-3 bg-news-black text-white rounded hover:bg-gray-800 transition-all group shadow-lg shadow-gray-300"
                            >
                                <ArrowRight size={20} className="mb-1 group-hover:translate-x-1 transition-transform"/>
                                <span className="text-xs font-bold uppercase tracking-wide">Read Full Article</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          ) : (
            /* NO ARTICLE: Full Screen Image View (Manual or Unlinked Region) */
            <div className="relative w-full h-full flex flex-col items-center justify-center">
                {/* Close Button Top Right */}
                <button 
                  onClick={() => setSelectedRegion(null)}
                  className="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                    <X size={24} />
                </button>

                {/* Image Area */}
                <div className="flex-1 w-full h-full flex items-center justify-center overflow-hidden relative p-4"
                     onWheel={(e) => {
                         setClippingScale(s => Math.max(0.5, Math.min(4, s + e.deltaY * -0.001)));
                     }}
                >
                    {isGeneratingClipping ? (
                        <div className="text-white flex flex-col items-center">
                            <Loader2 size={48} className="animate-spin mb-4"/>
                            <p>Generating High-Res Clip...</p>
                        </div>
                    ) : generatedClipping ? (
                        <img 
                          src={generatedClipping} 
                          style={{ transform: `scale(${clippingScale})`, transition: 'transform 0.1s ease-out' }}
                          className="max-w-full max-h-full object-contain shadow-2xl cursor-grab active:cursor-grabbing"
                          alt="Clipped Content"
                        />
                    ) : (
                        <div className="text-red-400">Failed to load image</div>
                    )}
                </div>

                {/* Bottom Controls Bar */}
                <div className="absolute bottom-8 bg-black/80 backdrop-blur text-white px-6 py-3 rounded-full flex items-center gap-6 shadow-2xl border border-white/10 z-50">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setClippingScale(s => Math.max(0.5, s - 0.5))} className="p-2 hover:bg-white/20 rounded-full"><ZoomOut size={20}/></button>
                        <span className="w-12 text-center font-mono text-sm">{Math.round(clippingScale * 100)}%</span>
                        <button onClick={() => setClippingScale(s => Math.min(4, s + 0.5))} className="p-2 hover:bg-white/20 rounded-full"><ZoomIn size={20}/></button>
                    </div>
                    <div className="w-px h-8 bg-white/20"></div>
                    <div className="flex items-center gap-2">
                         <button onClick={downloadClipping} disabled={!generatedClipping} className="flex flex-col items-center gap-1 p-2 hover:bg-white/20 rounded-lg group disabled:opacity-50">
                             <Download size={20} className="group-hover:-translate-y-1 transition-transform"/>
                             <span className="text-[10px] font-bold uppercase">Save</span>
                         </button>
                         <button onClick={handleShareClip} disabled={!generatedClipping} className="flex flex-col items-center gap-1 p-2 hover:bg-white/20 rounded-lg group disabled:opacity-50">
                             <Share2 size={20} className="group-hover:-translate-y-1 transition-transform"/>
                             <span className="text-[10px] font-bold uppercase">Share</span>
                         </button>
                    </div>
                </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EPaperReader;
