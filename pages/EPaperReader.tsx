
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EPaperPage, EPaperRegion, Article, WatermarkSettings } from '../types';
import EPaperViewer from '../components/EPaperViewer';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  Maximize, Minimize, RotateCcw, MousePointer2, X, ArrowRight, Menu, Grid, Scissors, Download, Loader2, Share2, Crop, ArrowLeft, DownloadCloud, FileText, Share
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
    return dates.sort().reverse(); 
  }, [pages]);

  const [selectedDate, setSelectedDate] = useState(uniqueDates[0] || new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!uniqueDates.includes(selectedDate) && uniqueDates.length > 0) {
        setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);
  
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

  // --- View Logic ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [clipMode, setClipMode] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{x:number, y:number, w:number, h:number} | null>(null);
  const selectionStart = useRef<{x:number, y:number} | null>(null);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number, clientY: number, originX: number, originY: number } | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // --- Clipping Logic ---
  const [selectedRegion, setSelectedRegion] = useState<EPaperRegion | null>(null);
  const [generatedClipping, setGeneratedClipping] = useState<string | null>(null);
  const [isGeneratingClipping, setIsGeneratingClipping] = useState(false);
  const [clippingScale, setClippingScale] = useState(1);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setSelectedRegion(null);
    setGeneratedClipping(null);
    setClippingScale(1);
    setClipMode(false);
    setSelectionBox(null);
  }, [activePageIndex, selectedDate]);

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
        
        // Brand style: Black footer with gold text
        const footerHeight = Math.max(80, Math.floor(img.naturalWidth * 0.08)); 
        
        canvas.width = sW;
        canvas.height = sH + footerHeight;

        // Draw the main content
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, sX, sY, sW, sH, 0, 0, sW, sH);

        // Dark Footer Bar
        ctx.fillStyle = '#1a1a1a'; 
        ctx.fillRect(0, sH, sW, footerHeight);

        const centerY = sH + (footerHeight / 2);
        const padding = Math.floor(sW * 0.04);
        
        const nameFontSize = Math.max(18, Math.floor(sW * 0.045)); 
        const dateFontSize = Math.max(14, Math.floor(sW * 0.035));

        // Brand Label (Gold)
        ctx.font = `bold ${nameFontSize}px "Merriweather", serif`;
        ctx.fillStyle = '#bfa17b';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(APP_NAME + " Edition", padding, centerY);

        // Date Label (White)
        ctx.font = `normal ${dateFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        try {
            const formattedDate = format(new Date(dateStr), 'MMM do, yyyy');
            ctx.fillText(formattedDate, sW - padding, centerY);
        } catch (e) {
            ctx.fillText(dateStr, sW - padding, centerY);
        }

        finalize();

        function finalize() {
            try {
                const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
                setGeneratedClipping(dataUrl);
            } catch (e) {
                console.error("Canvas export failed", e);
            } finally {
                setIsGeneratingClipping(false);
            }
        }
    };
  };

  const downloadClipping = () => {
    if (generatedClipping) {
        const link = document.createElement('a');
        link.href = generatedClipping;
        const titleSlug = selectedArticle ? selectedArticle.title.substring(0, 20).replace(/\s+/g, '_') : 'clip';
        link.download = `Newsroom_${selectedDate}_${titleSlug}.jpg`;
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
        const shareData = { files: [file], title: 'News Clipping', text: `Clipped from ${APP_NAME}` };
        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            downloadClipping();
        }
    } catch (err) {
        downloadClipping();
    }
  };

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 1));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  // Core Coordinate Logic: Crucial to track ONLY the image container
  const getNormalizedCoords = (clientX: number, clientY: number) => {
      if (!contentRef.current) return { x: 0, y: 0 };
      const rect = contentRef.current.getBoundingClientRect();
      // Calculate percentage relative to the VISIBLE image box
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (clipMode) {
        const coords = getNormalizedCoords(e.clientX, e.clientY);
        selectionStart.current = coords;
        setSelectionBox({ x: coords.x, y: coords.y, w: 0, h: 0 });
    } else if (scale > 1) {
      setIsDragging(true);
      dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, originX: position.x, originY: position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (clipMode && selectionStart.current) {
        const coords = getNormalizedCoords(e.clientX, e.clientY);
        const start = selectionStart.current;
        const x = Math.min(start.x, coords.x);
        const y = Math.min(start.y, coords.y);
        const w = Math.abs(coords.x - start.x);
        const h = Math.abs(coords.y - start.y);
        setSelectionBox({ x, y, w, h });
    } else if (isDragging && scale > 1 && dragStartRef.current && contentRef.current) {
      e.preventDefault();
      const deltaX = e.clientX - dragStartRef.current.clientX;
      const deltaY = e.clientY - dragStartRef.current.clientY;
      contentRef.current.style.transform = `translate(${dragStartRef.current.originX + deltaX}px, ${dragStartRef.current.originY + deltaY}px) scale(${scale})`;
      contentRef.current.style.transition = 'none';
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (clipMode && selectionBox) {
        if (selectionBox.w > 1 && selectionBox.h > 1) {
             setSelectedRegion({ id: 'manual-clip', x: selectionBox.x, y: selectionBox.y, width: selectionBox.w, height: selectionBox.h, linkedArticleId: '' });
             setClipMode(false);
        }
        setSelectionBox(null);
        selectionStart.current = null;
    } else if (isDragging && dragStartRef.current) {
        const deltaX = e.clientX - dragStartRef.current.clientX;
        const deltaY = e.clientY - dragStartRef.current.clientY;
        setPosition({ x: dragStartRef.current.originX + deltaX, y: dragStartRef.current.originY + deltaY });
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleRegionClick = (region: EPaperRegion) => {
    if (!isDragging && !clipMode) {
       setSelectedRegion(region);
       setClippingScale(1);
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
    if (!document.fullscreenElement) { viewerRef.current?.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  };

  const selectedArticle = selectedRegion && selectedRegion.linkedArticleId ? articles.find(a => a.id === selectedRegion.linkedArticleId) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-900 text-white overflow-hidden relative">
      
      {/* Enhanced Toolbar */}
      <div className="flex items-center justify-between px-3 md:px-6 py-4 bg-news-black border-b border-white/5 shadow-xl z-20 shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('/')} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-all" title="Home">
                <ArrowLeft size={22} />
            </button>
            <div className="flex items-center bg-white/5 rounded-full px-1 border border-white/10">
                <button onClick={() => handleDateChange('prev')} disabled={selectedDate === uniqueDates[uniqueDates.length - 1]} className="p-2 hover:bg-white/5 rounded-full disabled:opacity-20 transition-all"><ChevronLeft size={20} /></button>
                <div className="flex items-center px-4 space-x-3 text-sm font-bold font-mono tracking-tight">
                    <Calendar size={16} className="text-news-gold"/>
                    <span>{selectedDate}</span>
                </div>
                <button onClick={() => handleDateChange('next')} disabled={selectedDate === uniqueDates[0]} className="p-2 hover:bg-white/5 rounded-full disabled:opacity-20 transition-all"><ChevronRight size={20} /></button>
            </div>
         </div>

         <div className="flex items-center gap-3">
             <button
                onClick={() => { setClipMode(!clipMode); setSelectionBox(null); }}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full font-black uppercase tracking-[0.15em] text-[10px] transition-all shadow-2xl border ${clipMode ? 'bg-news-accent border-news-accent text-white animate-pulse' : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
             >
                 <Scissors size={14} /> {clipMode ? 'CANCEL' : 'MANUAL CLIP'}
             </button>
             <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full p-1.5">
                <button onClick={handleZoomOut} disabled={scale <= 1} className="p-1.5 hover:bg-white/10 rounded-full disabled:opacity-20"><ZoomOut size={18} /></button>
                <span className="px-3 text-xs font-mono w-14 text-center text-news-gold">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} disabled={scale >= 4} className="p-1.5 hover:bg-white/10 rounded-full disabled:opacity-20"><ZoomIn size={18} /></button>
             </div>
             <button onClick={toggleFullscreen} className="hidden lg:flex items-center gap-2 bg-news-black border border-white/10 hover:border-news-gold/50 hover:text-news-gold px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-[0.15em] transition-all">
                {isFullscreen ? <Minimize size={16}/> : <Maximize size={16} />} {isFullscreen ? 'WINDOW' : 'FULLSCREEN'}
             </button>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
         {/* Thumbnails Sidebar */}
         <div className={`absolute md:static inset-y-0 left-0 z-30 w-64 md:w-52 bg-[#0d0d0d] border-r border-white/5 transform transition-transform duration-300 ease-in-out md:transform-none overflow-y-auto custom-scrollbar shrink-0 ${showMobileSidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
            <div className="p-6 space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2 border-b border-white/5 pb-2">Page Navigation</h4>
               {currentEditionPages.map((page, idx) => (
                  <div key={page.id} onClick={() => { setActivePageIndex(idx); setShowMobileSidebar(false); }} className={`cursor-pointer group relative transition-all duration-300 ${idx === activePageIndex ? 'scale-105' : 'opacity-40 hover:opacity-100'}`}>
                     <div className={`rounded-sm overflow-hidden border-2 ${idx === activePageIndex ? 'border-news-gold shadow-2xl shadow-news-gold/20' : 'border-transparent'}`}><img src={page.imageUrl} className="w-full h-auto object-cover" alt={`P${page.pageNumber}`} /></div>
                     <p className={`text-center text-[10px] mt-3 font-black tracking-widest ${idx === activePageIndex ? 'text-news-gold' : 'text-gray-500'}`}>P.{page.pageNumber}</p>
                  </div>
               ))}
            </div>
         </div>
         {showMobileSidebar && <div className="absolute inset-0 bg-black/80 z-20 md:hidden" onClick={() => setShowMobileSidebar(false)}></div>}

         <div ref={viewerRef} className={`flex-1 bg-[#151515] overflow-hidden relative touch-none flex items-center justify-center cursor-${clipMode ? 'crosshair' : (scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default')}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
             {activePage ? (
                 <div className="w-full h-full flex items-center justify-center p-6">
                    {/* 
                      CRITICAL FIX: The contentRef must wrap ONLY the image to ensure coordinate mapping 
                      is consistent across desktop and mobile, ignoring empty "black space" around it.
                    */}
                    <div 
                        ref={contentRef}
                        style={{ 
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.165, 0.84, 0.44, 1)',
                            transformOrigin: 'center',
                            display: 'inline-block',
                            position: 'relative'
                        }}
                        className="shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5"
                    >
                        <EPaperViewer 
                            page={activePage} 
                            onRegionClick={handleRegionClick} 
                            onNavigate={onNavigate}
                            imageClassName="max-h-[80vh] h-auto w-auto max-w-full block"
                            disableInteractivity={clipMode} 
                        />
                        {clipMode && selectionBox && (
                            <div className="absolute border-2 border-news-accent bg-news-accent/20 z-50 pointer-events-none" style={{ left: `${selectionBox.x}%`, top: `${selectionBox.y}%`, width: `${selectionBox.w}%`, height: `${selectionBox.h}%` }} />
                        )}
                    </div>
                 </div>
             ) : (
                 <div className="flex flex-col items-center gap-4 text-gray-500">
                     <Loader2 className="animate-spin" size={32} />
                     <p className="font-black uppercase tracking-widest text-xs">Parsing digital edition...</p>
                 </div>
             )}

             <button onClick={() => setShowMobileSidebar(true)} className="md:hidden absolute bottom-6 left-6 bg-news-gold text-black p-4 rounded-full shadow-2xl">
                 <Grid size={24} />
             </button>
         </div>
      </div>

      {/* INTERACTIVE CLIPPING MODAL */}
      {selectedRegion && (
        <div className="absolute inset-0 bg-black/98 z-50 flex items-center justify-center p-4 md:p-12 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] max-w-7xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden border border-white/5">
                
                {/* Visual Preview */}
                <div className="w-full md:w-[60%] bg-[#080808] flex flex-col border-b md:border-b-0 md:border-r border-white/10">
                    <div className="p-5 flex items-center justify-between border-b border-white/5 bg-black/40">
                        <span className="flex items-center gap-3 text-[11px] font-black text-news-gold uppercase tracking-[0.25em]">
                            <Scissors size={14} /> Digital Clipping
                        </span>
                        <div className="flex gap-2">
                            <button onClick={downloadClipping} className="p-2.5 bg-white/5 hover:bg-white/20 rounded-full transition-all text-white border border-white/5" title="Download"><Download size={20}/></button>
                            <button onClick={handleShareClip} className="p-2.5 bg-white/5 hover:bg-white/20 rounded-full transition-all text-white border border-white/5" title="Share"><Share2 size={20}/></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center overflow-auto p-6 custom-scrollbar bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
                        {isGeneratingClipping ? (
                            <div className="flex flex-col items-center gap-6 text-white/30">
                                <div className="relative">
                                    <div className="absolute inset-0 border-2 border-news-gold rounded-full animate-ping opacity-20"></div>
                                    <Loader2 size={56} className="animate-spin text-news-gold" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Rendering High-Res Watermark</span>
                            </div>
                        ) : generatedClipping ? (
                            <div className="relative group p-4">
                                <img src={generatedClipping} alt="Clipped Area" className="max-w-full max-h-[55vh] md:max-h-[65vh] object-contain shadow-[0_40px_100px_rgba(0,0,0,1)] border border-white/10" />
                                <div className="absolute inset-0 pointer-events-none border border-white/20 mix-blend-overlay"></div>
                            </div>
                        ) : (
                            <p className="text-red-500 font-bold">Image generation failure. Please try again.</p>
                        )}
                    </div>
                    
                    <div className="p-4 text-center bg-black/60">
                         <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em]">© {APP_NAME} Interactive Press • {selectedDate}</p>
                    </div>
                </div>

                {/* Content Actions */}
                <div className="w-full md:w-[40%] flex flex-col bg-white">
                    <div className="p-8 md:p-12 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <span className="inline-block bg-news-paper border border-news-gold text-news-gold text-[10px] font-black px-4 py-1.5 uppercase tracking-[0.25em] rounded-sm mb-6">
                                    {selectedArticle ? selectedArticle.category : 'CUSTOM SNIPPET'}
                                </span>
                                <h2 className="text-3xl md:text-4xl font-serif font-black text-gray-900 leading-[1.1] mb-4">
                                    {selectedArticle ? selectedArticle.title : 'Manual Capture'}
                                </h2>
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    <Calendar size={14} className="text-news-gold" /> {selectedDate}
                                </div>
                            </div>
                            <button onClick={() => setSelectedRegion(null)} className="p-3 bg-gray-50 hover:bg-news-accent hover:text-white rounded-full transition-all group">
                                <X size={24} className="text-gray-400 group-hover:text-white" />
                            </button>
                        </div>

                        {selectedArticle ? (
                            <div className="space-y-8">
                                <div className="p-8 bg-[#fdfdfb] rounded-3xl border border-gray-100 shadow-inner">
                                    <h4 className="text-[9px] font-black uppercase text-gray-400 tracking-[0.3em] mb-5 border-b border-gray-100 pb-2">Abstract</h4>
                                    <p className="font-serif text-gray-600 leading-loose italic text-sm md:text-base">
                                        "{selectedArticle.content.replace(/<[^>]*>/g, '').substring(0, 350)}..."
                                    </p>
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-full bg-news-black flex items-center justify-center text-news-gold shadow-xl">
                                        <FileText size={28} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Author</p>
                                        <p className="text-sm font-black uppercase tracking-widest text-gray-900">{selectedArticle.author}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                                <Crop size={56} className="mx-auto text-gray-200 mb-6" />
                                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-12 leading-relaxed">Capturing a specific region of the physical page. No digital record found for this specific area.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-10 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-5">
                        <button 
                            onClick={downloadClipping}
                            disabled={!generatedClipping}
                            className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-gray-200 rounded-[1.5rem] hover:border-news-gold hover:shadow-2xl hover:shadow-news-gold/5 transition-all group disabled:opacity-30"
                        >
                            <DownloadCloud size={28} className="text-gray-900 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 group-hover:text-gray-900">SAVE CLIPPING</span>
                        </button>
                        
                        {selectedArticle ? (
                             <button 
                                onClick={() => onNavigate(`/article/${selectedArticle.id}`)}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-news-black text-white rounded-[1.5rem] hover:bg-gray-800 hover:shadow-[0_20px_40px_rgba(0,0,0,0.3)] transition-all group"
                             >
                                <ArrowRight size={28} className="text-news-gold group-hover:translate-x-2 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-300">FULL ARTICLE</span>
                             </button>
                        ) : (
                            <button 
                                onClick={handleShareClip}
                                disabled={!generatedClipping}
                                className="flex flex-col items-center justify-center gap-3 p-6 bg-news-gold text-black rounded-[1.5rem] hover:bg-yellow-500 transition-all group disabled:opacity-30"
                            >
                                <Share size={28} className="group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">SHARE CLIP</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EPaperReader;
