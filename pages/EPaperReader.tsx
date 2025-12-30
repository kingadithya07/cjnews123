
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
        
        // Match the reference image style
        const footerHeight = Math.max(80, Math.floor(img.naturalWidth * 0.08)); 
        
        canvas.width = sW;
        canvas.height = sH + footerHeight;

        // Draw background white first
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the crop
        ctx.drawImage(img, sX, sY, sW, sH, 0, 0, sW, sH);

        // Footer Bar (Dark)
        ctx.fillStyle = '#1a1a1a'; 
        ctx.fillRect(0, sH, sW, footerHeight);

        const centerY = sH + (footerHeight / 2);
        const padding = Math.floor(sW * 0.04);
        
        // Fonts - Responsive relative to canvas width
        const nameFontSize = Math.max(18, Math.floor(sW * 0.045)); 
        const dateFontSize = Math.max(14, Math.floor(sW * 0.035));

        // Brand Name (Gold)
        ctx.font = `bold ${nameFontSize}px "Merriweather", serif`;
        ctx.fillStyle = '#bfa17b';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        const brandText = APP_NAME + " Edition";
        ctx.fillText(brandText, padding, centerY);

        // Date (White)
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
                console.error("Canvas export", e);
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
        link.download = `Newsroom_Edition_${titleSlug}.jpg`;
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
        const shareData = { files: [file], title: 'News Clipping', text: `Check out this clipping from ${APP_NAME}!` };
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

  const getNormalizedCoords = (clientX: number, clientY: number) => {
      if (!contentRef.current) return { x: 0, y: 0 };
      const rect = contentRef.current.getBoundingClientRect();
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
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-2 md:px-4 py-3 bg-news-black border-b border-gray-800 shadow-md z-20 shrink-0">
         <div className="flex items-center gap-2">
            <button onClick={() => onNavigate('/')} className="p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded transition-colors" title="Home">
                <ArrowLeft size={20} />
            </button>
            <button onClick={() => setShowMobileSidebar(!showMobileSidebar)} className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded">
                <Grid size={20} />
            </button>
            <div className="flex items-center bg-gray-800 rounded-full px-1 border border-gray-700">
                <button onClick={() => handleDateChange('prev')} disabled={selectedDate === uniqueDates[uniqueDates.length - 1]} className="p-1.5 hover:bg-gray-700 rounded-full disabled:opacity-30"><ChevronLeft size={18} /></button>
                <div className="flex items-center px-3 space-x-2 text-xs font-bold font-mono">
                    <Calendar size={14} className="text-news-gold"/>
                    <span>{selectedDate}</span>
                </div>
                <button onClick={() => handleDateChange('next')} disabled={selectedDate === uniqueDates[0]} className="p-1.5 hover:bg-gray-700 rounded-full disabled:opacity-30"><ChevronRight size={18} /></button>
            </div>
         </div>

         <div className="flex items-center gap-2">
             <button
                onClick={() => { setClipMode(!clipMode); setSelectionBox(null); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold uppercase tracking-widest text-[10px] transition-all shadow-lg ${clipMode ? 'bg-news-accent text-white animate-pulse' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
             >
                 <Scissors size={14} /> {clipMode ? 'CANCEL CLIPPING' : 'MANUAL CLIP'}
             </button>
             <div className="hidden md:flex items-center bg-gray-800 rounded-lg p-1">
                <button onClick={handleZoomOut} disabled={scale <= 1} className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30"><ZoomOut size={16} /></button>
                <span className="px-2 text-xs font-mono w-12 text-center text-gray-400">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} disabled={scale >= 4} className="p-1.5 hover:bg-gray-700 rounded disabled:opacity-30"><ZoomIn size={16} /></button>
             </div>
             <button onClick={toggleFullscreen} className="hidden md:flex items-center gap-2 bg-news-black border border-gray-700 hover:bg-gray-800 px-4 py-2 rounded font-bold text-[10px] uppercase tracking-widest transition-colors">
                {isFullscreen ? <Minimize size={14}/> : <Maximize size={14} />} {isFullscreen ? 'Exit' : 'Full'}
             </button>
         </div>
      </div>

      {/* Workspace */}
      <div className="flex flex-1 overflow-hidden relative">
         <div className={`absolute md:static inset-y-0 left-0 z-30 w-64 md:w-48 bg-gray-800 border-r border-gray-700 transform transition-transform duration-300 ease-in-out md:transform-none overflow-y-auto custom-scrollbar shrink-0 ${showMobileSidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
            <div className="p-4 space-y-4">
               {currentEditionPages.map((page, idx) => (
                  <div key={page.id} onClick={() => { setActivePageIndex(idx); setShowMobileSidebar(false); }} className={`cursor-pointer group relative transition-all duration-300 ${idx === activePageIndex ? 'scale-105' : 'opacity-50 hover:opacity-100'}`}>
                     <div className={`rounded-sm overflow-hidden border-2 ${idx === activePageIndex ? 'border-news-accent shadow-lg shadow-news-accent/20' : 'border-transparent'}`}><img src={page.imageUrl} className="w-full h-auto object-cover" alt={`P${page.pageNumber}`} /></div>
                     <p className={`text-center text-[10px] mt-2 font-mono ${idx === activePageIndex ? 'text-news-accent font-bold' : 'text-gray-400'}`}>PAGE {page.pageNumber}</p>
                  </div>
               ))}
            </div>
         </div>
         {showMobileSidebar && <div className="absolute inset-0 bg-black/50 z-20 md:hidden" onClick={() => setShowMobileSidebar(false)}></div>}

         <div ref={viewerRef} className={`flex-1 bg-[#1e1e1e] overflow-hidden relative touch-none cursor-${clipMode ? 'crosshair' : (scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default')}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
             {activePage ? (
                 <div className="w-full h-full flex items-center justify-center p-4">
                    <div 
                        ref={contentRef}
                        style={{ 
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                            transformOrigin: 'center',
                            display: 'inline-block'
                        }}
                        className="origin-center shadow-2xl"
                    >
                        <EPaperViewer 
                            page={activePage} 
                            onRegionClick={handleRegionClick} 
                            onNavigate={onNavigate}
                            imageClassName="max-h-[85vh] h-auto w-auto max-w-full"
                            disableInteractivity={clipMode} 
                        />
                        {clipMode && selectionBox && (
                            <div className="absolute border-2 border-news-accent bg-news-accent/20 z-50 pointer-events-none" style={{ left: `${selectionBox.x}%`, top: `${selectionBox.y}%`, width: `${selectionBox.w}%`, height: `${selectionBox.h}%` }} />
                        )}
                    </div>
                 </div>
             ) : (
                 <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                     <p>No edition found for this date.</p>
                 </div>
             )}
         </div>
      </div>

      {/* CLIPPING MODAL */}
      {selectedRegion && (
        <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-4 md:p-8 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden border border-white/10">
                
                {/* Visual Preview (Clipped Image) */}
                <div className="w-full md:w-[55%] bg-[#0a0a0a] flex flex-col border-b md:border-b-0 md:border-r border-gray-100">
                    <div className="p-4 flex items-center justify-between border-b border-white/5 bg-black/20">
                        <span className="flex items-center gap-2 text-[10px] font-black text-news-gold uppercase tracking-[0.2em]">
                            <Scissors size={14} /> Clipped Content
                        </span>
                        <div className="flex gap-2">
                            <button onClick={downloadClipping} className="p-2 bg-white/5 hover:bg-white/20 rounded-full transition-colors text-white" title="Download"><Download size={18}/></button>
                            <button onClick={handleShareClip} className="p-2 bg-white/5 hover:bg-white/20 rounded-full transition-colors text-white" title="Share"><Share2 size={18}/></button>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center overflow-auto p-4 custom-scrollbar bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 to-black">
                        {isGeneratingClipping ? (
                            <div className="flex flex-col items-center gap-4 text-white/40">
                                <Loader2 size={48} className="animate-spin text-news-gold" />
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Processing High-Res Watermark...</span>
                            </div>
                        ) : generatedClipping ? (
                            <div className="relative group">
                                <img src={generatedClipping} alt="Clip" className="max-w-full max-h-[60vh] md:max-h-[70vh] object-contain shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/5" />
                                <div className="absolute inset-0 pointer-events-none border border-white/10 opacity-50"></div>
                            </div>
                        ) : (
                            <p className="text-red-500">Image Generation Failed</p>
                        )}
                    </div>
                    
                    <div className="p-4 text-center bg-black/40">
                         <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.15em]">© Digital Newsroom Interactive Publishing</p>
                    </div>
                </div>

                {/* Content Actions & Article Info */}
                <div className="w-full md:w-[45%] flex flex-col bg-white">
                    <div className="p-6 md:p-10 flex-1 overflow-y-auto">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <span className="inline-block bg-news-paper border border-news-gold text-news-gold text-[10px] font-black px-3 py-1 uppercase tracking-[0.2em] rounded-sm mb-4">
                                    {selectedArticle ? selectedArticle.category : 'CUSTOM CLIP'}
                                </span>
                                <h2 className="text-2xl md:text-3xl font-serif font-black text-gray-900 leading-tight mb-2">
                                    {selectedArticle ? selectedArticle.title : 'Selected Content Snapshot'}
                                </h2>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{selectedDate}</p>
                            </div>
                            <button onClick={() => setSelectedRegion(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} className="text-gray-400" />
                            </button>
                        </div>

                        {selectedArticle ? (
                            <div className="space-y-6">
                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mb-4">Article Summary</h4>
                                    <p className="font-serif text-gray-600 leading-relaxed italic text-sm">
                                        {selectedArticle.content.replace(/<[^>]*>/g, '').substring(0, 300)}...
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-news-black">
                                        <FileText size={24} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-900">By {selectedArticle.author}</p>
                                        <p className="text-[10px] text-gray-400">Published in {selectedArticle.category}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100">
                                <Crop size={48} className="mx-auto text-gray-300 mb-4 opacity-20" />
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest px-8">Manual selection capturing page area. Not linked to a specific digital article.</p>
                            </div>
                        )}
                    </div>

                    <div className="p-8 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-4">
                        <button 
                            onClick={downloadClipping}
                            disabled={!generatedClipping}
                            className="flex flex-col items-center justify-center gap-2 p-4 bg-white border border-gray-200 rounded-2xl hover:border-news-accent hover:shadow-xl hover:shadow-news-accent/5 transition-all group disabled:opacity-50"
                        >
                            <DownloadCloud size={24} className="text-news-black group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700">Save Clip</span>
                        </button>
                        
                        {selectedArticle && (
                             <button 
                                onClick={() => onNavigate(`/article/${selectedArticle.id}`)}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-news-black text-white rounded-2xl hover:bg-gray-800 hover:shadow-2xl transition-all group"
                             >
                                <ArrowRight size={24} className="text-news-gold group-hover:translate-x-1 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Full Article</span>
                             </button>
                        )}
                        {!selectedArticle && (
                            <button 
                                onClick={handleShareClip}
                                disabled={!generatedClipping}
                                className="flex flex-col items-center justify-center gap-2 p-4 bg-news-gold text-black rounded-2xl hover:bg-yellow-500 hover:shadow-2xl transition-all group disabled:opacity-50"
                            >
                                <Share size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Share Clip</span>
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
