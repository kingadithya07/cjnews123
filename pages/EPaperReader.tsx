
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EPaperPage, EPaperRegion, Article, WatermarkSettings } from '../types';
import EPaperViewer from '../components/EPaperViewer';
import Cropper from 'cropperjs';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  X, Grid, ArrowLeft, Loader2, Scissors, Download, Check, LayoutGrid, Eye, Search, Share2, RotateCcw, RefreshCcw
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { APP_NAME } from '../constants';

interface EPaperReaderProps {
  pages: EPaperPage[];
  articles?: Article[];
  onNavigate: (path: string) => void;
  watermarkSettings: WatermarkSettings;
}

const EPaperReader: React.FC<EPaperReaderProps> = ({ pages, onNavigate, watermarkSettings }) => {
  // --- Mode & Navigation ---
  const [viewMode, setViewMode] = useState<'grid' | 'reader'>('grid');
  
  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(pages.map(p => p.date).filter(Boolean)));
    return dates.sort().reverse(); 
  }, [pages]);

  const [selectedDate, setSelectedDate] = useState(uniqueDates[0] || new Date().toISOString().split('T')[0]);
  
  // React to incoming real-time data if current selectedDate is no longer the latest or is invalid
  useEffect(() => {
    if (uniqueDates.length > 0 && (!selectedDate || !uniqueDates.includes(selectedDate))) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);

  const currentEditionPages = useMemo(() => {
    return pages.filter(p => p.date === selectedDate).sort((a, b) => a.pageNumber - b.pageNumber);
  }, [pages, selectedDate]);

  const [activePageIndex, setActivePageIndex] = useState(0);
  const activePage = currentEditionPages[activePageIndex];

  // Helper for safe date formatting
  const safeFormat = (dateValue: any, formatStr: string) => {
    if (!dateValue) return 'N/A';
    const d = new Date(dateValue);
    return isValid(d) ? format(d, formatStr) : 'N/A';
  };

  // --- Reader View Controls ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number, clientY: number, originX: number, originY: number } | null>(null);

  // --- Direct Clipping Workflow ---
  const [isCropping, setIsCropping] = useState(false);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const cropperImgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (viewMode === 'reader') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setIsCropping(false);
        setCropPreview(null);
    }
  }, [viewMode, activePageIndex]);

  // Handle Pan/Zoom Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1 && !isCropping) {
      setIsDragging(true);
      dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, originX: position.x, originY: position.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1 && dragStartRef.current && contentRef.current) {
      e.preventDefault();
      const deltaX = e.clientX - dragStartRef.current.clientX;
      const deltaY = e.clientY - dragStartRef.current.clientY;
      contentRef.current.style.transform = `translate(${dragStartRef.current.originX + deltaX}px, ${dragStartRef.current.originY + deltaY}px) scale(${scale})`;
      contentRef.current.style.transition = 'none';
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging && dragStartRef.current) {
        const deltaX = e.clientX - dragStartRef.current.clientX;
        const deltaY = e.clientY - dragStartRef.current.clientY;
        setPosition({ x: dragStartRef.current.originX + deltaX, y: dragStartRef.current.originY + deltaY });
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // --- Cropperjs Direct Initialization ---
  useEffect(() => {
    if (isCropping && cropperImgRef.current && !cropPreview) {
        if (cropperRef.current) cropperRef.current.destroy();
        
        // Fixed: Removed unsupported 'viewMode' property from CropperOptions to resolve TS error on line 111
        const cropper = new Cropper(cropperImgRef.current, {
            dragMode: 'move', // Allows zooming/panning the image inside the crop container
            autoCropArea: 0.5,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            zoomable: true,
            background: false,
            responsive: true,
        });
        cropperRef.current = cropper;
    }
    return () => {
        if (cropperRef.current) {
            cropperRef.current.destroy();
            cropperRef.current = null;
        }
    };
  }, [isCropping, cropPreview]);

  const generateBrandedClip = async () => {
    if (!cropperRef.current) return;
    setIsProcessing(true);
    
    // Fixed: Changed 'getCroppedCanvas' to 'getCropperCanvas' as per CropperJS v2 API to resolve TS error on line 138
    const croppedCanvas = (cropperRef.current as any).getCropperCanvas();
    
    if (!croppedCanvas) {
      setIsProcessing(false);
      return;
    }

    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    const footerHeight = Math.max(70, croppedCanvas.height * 0.1);
    finalCanvas.width = croppedCanvas.width;
    finalCanvas.height = croppedCanvas.height + footerHeight;

    // White Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(croppedCanvas, 0, 0);

    // Branded Footer
    ctx.fillStyle = watermarkSettings.backgroundColor;
    ctx.fillRect(0, croppedCanvas.height, finalCanvas.width, footerHeight);

    const fontSize = Math.floor(footerHeight * 0.4);
    ctx.font = `bold ${fontSize}px "Merriweather", serif`;
    ctx.fillStyle = watermarkSettings.textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(watermarkSettings.text.toUpperCase(), footerHeight * 0.5, croppedCanvas.height + (footerHeight / 2));

    // Date/Edition Stamp
    ctx.font = `500 ${fontSize * 0.6}px "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right';
    const dateStr = safeFormat(activePage?.date, 'MMMM do, yyyy');
    ctx.fillText(`Archive Edition: ${dateStr}`, finalCanvas.width - (footerHeight * 0.5), croppedCanvas.height + (footerHeight / 2));

    setCropPreview(finalCanvas.toDataURL('image/jpeg', 0.95));
    setIsProcessing(false);
  };

  const handleDownload = () => {
    if (!cropPreview) return;
    const link = document.createElement('a');
    link.href = cropPreview;
    link.download = `Newsroom_Clipping_${activePage?.date}.jpg`;
    link.click();
  };

  const handleShare = async () => {
      if (!cropPreview || !navigator.share) return;
      try {
          const blob = await (await fetch(cropPreview)).blob();
          const file = new File([blob], `Clip_${activePage?.date}.jpg`, { type: 'image/jpeg' });
          await navigator.share({
              files: [file],
              title: 'Newspaper Clipping',
              text: `Archived from ${APP_NAME}`
          });
      } catch (err) { console.error('Share failed', err); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-[calc(100vh-80px)] bg-black text-white overflow-hidden relative font-sans">
      
      {/* Refined Navigation Header - Optimized with Icons for Mobile */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-news-black border-b border-white/5 z-50 shrink-0 shadow-2xl">
         <div className="flex items-center gap-3 md:gap-8">
            <button 
                onClick={() => viewMode === 'grid' ? onNavigate('/') : setViewMode('grid')}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-all"
                title={viewMode === 'grid' ? 'Back to Portal' : 'Back to Grid'}
            >
                <ArrowLeft size={18} />
                <span className="hidden md:inline text-[10px] font-black uppercase tracking-[0.25em]">{viewMode === 'grid' ? 'Portal' : 'Grid'}</span>
            </button>
            <div className="flex items-center bg-white/5 rounded-full px-1 border border-white/10 h-9 md:h-10">
                <button 
                    disabled={selectedDate === uniqueDates[uniqueDates.length - 1]}
                    onClick={() => {
                        const idx = uniqueDates.indexOf(selectedDate);
                        setSelectedDate(uniqueDates[idx + 1]);
                    }}
                    className="p-1.5 md:p-2 hover:bg-white/5 rounded-full disabled:opacity-20"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className="px-2 md:px-4 text-[9px] md:text-[10px] font-black tracking-[0.2em] font-mono text-news-gold whitespace-nowrap">
                    {safeFormat(selectedDate, 'dd MMM yy').toUpperCase()}
                </div>
                <button 
                    disabled={selectedDate === uniqueDates[0]}
                    onClick={() => {
                        const idx = uniqueDates.indexOf(selectedDate);
                        setSelectedDate(uniqueDates[idx - 1]);
                    }}
                    className="p-1.5 md:p-2 hover:bg-white/5 rounded-full disabled:opacity-20"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
         </div>

         <div className="flex items-center gap-2 md:gap-3">
             {viewMode === 'reader' && (
                <button 
                    onClick={() => setIsCropping(true)}
                    className="flex items-center gap-2 px-3 md:px-7 py-2 md:py-2.5 bg-news-gold text-black rounded-full transition-all hover:bg-white shadow-lg active:scale-95"
                    title="Clip Article"
                >
                    <Scissors size={14} />
                    <span className="hidden md:inline text-[10px] font-black uppercase tracking-[0.2em]">CLIP ARTICLE</span>
                </button>
             )}
             <button 
                onClick={() => setViewMode(viewMode === 'grid' ? 'reader' : 'grid')}
                className="p-2.5 md:p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
                title={viewMode === 'grid' ? 'Read Edition' : 'Browse Pages'}
             >
                {viewMode === 'grid' ? <Eye size={18} /> : <LayoutGrid size={18} />}
             </button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
          
          {/* ARCHIVE GRID - Colorful version */}
          {viewMode === 'grid' && (
              <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-16 animate-in fade-in duration-500 bg-[#0a0a0a]">
                  <div className="max-w-7xl mx-auto space-y-12">
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
                          <div>
                              <h1 className="text-3xl md:text-5xl font-serif font-black text-white mb-2">Issue Archive</h1>
                              <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                                <Calendar size={14} className="text-news-gold"/> Edition Date: {safeFormat(selectedDate, 'yyyy-MM-dd')}
                              </p>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10">
                          {currentEditionPages.map((page, idx) => (
                              <div 
                                key={page.id}
                                onClick={() => { setActivePageIndex(idx); setViewMode('reader'); }}
                                className="group cursor-pointer space-y-3"
                              >
                                  <div className="relative aspect-[3/4] overflow-hidden rounded-sm border border-white/10 shadow-2xl transition-all duration-500 group-hover:scale-[1.05] group-hover:border-news-gold group-hover:shadow-news-gold/30">
                                      {/* Colorful image, no grayscale */}
                                      <img src={page.imageUrl} className="w-full h-full object-cover transition-all duration-700 brightness-90 group-hover:brightness-105" alt={`P${page.pageNumber}`} />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <div className="bg-news-gold text-black p-3 rounded-full shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                                              <Eye size={20} />
                                          </div>
                                      </div>
                                  </div>
                                  <p className="text-[9px] md:text-[10px] font-black tracking-[0.3em] text-gray-500 group-hover:text-news-gold transition-colors text-center">PAGE {page.pageNumber}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* READER VIEW - Deeply Optimized for Mobile Frame */}
          {viewMode === 'reader' && (
              <div 
                ref={viewerRef}
                className={`h-full relative flex items-center justify-center cursor-${scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'} touch-none`}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                  {activePage ? (
                      <div 
                        ref={contentRef}
                        style={{ 
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
                            transformOrigin: 'center',
                            display: 'inline-block',
                            position: 'relative',
                            maxWidth: '100%',
                            maxHeight: '100%'
                        }}
                      >
                          <EPaperViewer 
                            page={activePage} 
                            // Adjusted max-h to fit perfectly in mobile without overflow
                            imageClassName="max-h-[82vh] md:max-h-[85vh] h-auto w-auto max-w-full block shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5"
                            disableInteractivity={true}
                          />
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-6 opacity-30">
                          <Loader2 size={32} className="animate-spin" />
                          <p className="font-black uppercase tracking-[0.5em] text-[10px]">Accessing Scan...</p>
                      </div>
                  )}

                  {/* Navigation Handles - Subtle for mobile */}
                  <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                    <button 
                        onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                        disabled={activePageIndex === 0}
                        className="p-3 md:p-12 text-gray-700/50 hover:text-white transition-colors disabled:opacity-0 pointer-events-auto"
                    >
                        <ChevronLeft size={40} className="md:w-12 md:h-12 w-8 h-8" />
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none">
                    <button 
                        onClick={() => setActivePageIndex(prev => Math.min(currentEditionPages.length - 1, prev + 1))}
                        disabled={activePageIndex === currentEditionPages.length - 1}
                        className="p-3 md:p-12 text-gray-700/50 hover:text-white transition-colors disabled:opacity-0 pointer-events-auto"
                    >
                        <ChevronRight size={40} className="md:w-12 md:h-12 w-8 h-8" />
                    </button>
                  </div>

                  {/* Zoom Console - Minimized on mobile */}
                  <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 bg-news-black/90 backdrop-blur-3xl border border-white/5 rounded-full px-4 md:px-6 py-2.5 md:py-3 flex items-center gap-4 md:gap-6 shadow-2xl z-40">
                      <button onClick={() => setScale(s => Math.max(1, s - 0.5))} className="hover:text-news-gold transition-colors"><ZoomOut size={16} /></button>
                      <div className="text-[9px] md:text-[10px] font-mono font-black text-news-gold min-w-[40px] md:min-w-[50px] text-center tracking-widest">{Math.round(scale * 100)}%</div>
                      <button onClick={() => setScale(s => Math.min(4, s + 0.5))} className="hover:text-news-gold transition-colors"><ZoomIn size={16} /></button>
                      <div className="w-px h-3 md:h-4 bg-white/10"></div>
                      <button onClick={() => { setScale(1); setPosition({x:0, y:0}); }} className="hover:text-news-gold transition-colors" title="Reset Viewer"><RotateCcw size={15} /></button>
                  </div>
              </div>
          )}
      </div>

      {/* CLIPPING WORKSHOP (DIRECT STEP - SKIP SELECTION) */}
      {isCropping && (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col animate-in fade-in zoom-in-95 duration-300">
            {/* Workshop Header - Icon Heavy for Mobile */}
            <div className="px-4 md:px-6 py-3 md:py-5 bg-news-black border-b border-white/5 flex items-center justify-between shrink-0 shadow-2xl">
                <div className="flex items-center gap-3">
                    <button onClick={() => { setIsCropping(false); setCropPreview(null); }} className="p-1.5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all">
                        <X size={22} />
                    </button>
                    <div>
                        <h2 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.25em] text-news-gold leading-none">Workshop</h2>
                        <p className="text-[8px] text-gray-600 uppercase tracking-widest font-bold hidden md:block mt-1">Refining borders for archival</p>
                    </div>
                </div>
                
                <div className="flex gap-2 md:gap-3">
                    {cropPreview ? (
                        <div className="flex gap-2">
                            <button onClick={handleShare} className="bg-white/5 text-white border border-white/10 p-2 md:px-5 md:py-2.5 rounded-full hover:bg-white/10 transition-all flex items-center gap-2" title="Share">
                                <Share2 size={16} /> <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.2em]">Share</span>
                            </button>
                            <button onClick={handleDownload} className="bg-news-gold text-black p-2 md:px-7 md:py-2.5 rounded-full hover:bg-yellow-500 transition-all flex items-center gap-2" title="Save">
                                <Download size={16} /> <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.2em]">Save</span>
                            </button>
                            <button onClick={() => setCropPreview(null)} className="p-2 md:p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-gray-400 transition-all" title="Redo Crop"><RefreshCcw size={16} /></button>
                        </div>
                    ) : (
                        <button 
                            onClick={generateBrandedClip}
                            disabled={isProcessing}
                            className="bg-news-gold text-black px-5 md:px-10 py-2 md:py-3 rounded-full flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-xl disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">{isProcessing ? 'Wait' : 'Process'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Workspace: Side-by-Side on Desktop, Direct Editor on Mobile */}
            <div className={`flex-1 overflow-hidden relative flex flex-col ${cropPreview ? 'md:flex-row' : 'flex-col'} bg-[#080808]`}>
                
                {/* Editor Area (Original Scan with Cropper) */}
                <div className={`relative flex flex-col items-center justify-center transition-all duration-500 ${cropPreview ? 'w-full md:w-1/2 border-r border-white/5 h-1/2 md:h-full p-4' : 'w-full h-full p-2 md:p-8'}`}>
                    {cropPreview && (
                         <div className="absolute top-4 left-6 text-[8px] font-black uppercase tracking-[0.4em] text-gray-600">Original</div>
                    )}
                    <div className={`w-full h-full flex items-center justify-center ${cropPreview ? 'opacity-30 pointer-events-none scale-[0.85]' : ''} transition-all duration-700`}>
                        <img 
                            ref={cropperImgRef}
                            src={activePage?.imageUrl} 
                            className={`max-w-full max-h-full block ${cropPreview ? '' : 'invisible'}`} 
                            crossOrigin="anonymous"
                            alt="Scan workspace"
                        />
                    </div>
                </div>

                {/* Clipping Result Section (Right side on desktop, bottom on mobile) */}
                {cropPreview && (
                    <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col items-center justify-center p-6 md:p-16 bg-[#0c0c0c] animate-in slide-in-from-bottom md:slide-in-from-right duration-700 relative">
                        <div className="absolute top-4 right-6 text-[8px] font-black uppercase tracking-[0.4em] text-news-gold">Clipped Result</div>
                        <div className="max-w-full md:max-w-4xl shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/5 rounded-sm overflow-hidden bg-white animate-in zoom-in-95 duration-700">
                             <img src={cropPreview} className="max-h-[40vh] md:max-h-[65vh] w-auto block" alt="Branded Output" />
                        </div>
                        <div className="mt-6 md:mt-10 flex flex-col items-center gap-2">
                             <p className="text-[8px] md:text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em]">Quality Verified • Watermark Applied</p>
                             <div className="w-8 md:w-12 h-0.5 bg-news-gold/30 mt-1"></div>
                        </div>
                    </div>
                )}
            </div>
            
            {!cropPreview && (
                <div className="bg-news-black p-3 md:p-4 border-t border-white/5 text-center shrink-0">
                    <p className="text-[8px] md:text-[9px] text-gray-600 font-bold uppercase tracking-[0.5em] flex items-center justify-center gap-2 md:gap-4">
                        <Scissors size={12} /> Direct Clipping Mode • Adjust borders and save
                    </p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default EPaperReader;
