
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
        
        const cropper = new Cropper(cropperImgRef.current, {
            viewMode: 1,
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
    
    const croppedCanvas = cropperRef.current.getCroppedCanvas({ 
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high' 
    });
    
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
    <div className="flex flex-col h-[calc(100vh-80px)] bg-black text-white overflow-hidden relative font-sans">
      
      {/* Refined Navigation Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 bg-news-black border-b border-white/5 z-50 shrink-0 shadow-2xl">
         <div className="flex items-center gap-4 md:gap-8">
            <button 
                onClick={() => viewMode === 'grid' ? onNavigate('/') : setViewMode('grid')}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.25em]"
            >
                <ArrowLeft size={16} /> {viewMode === 'grid' ? 'Portal' : 'Grid'}
            </button>
            <div className="flex items-center bg-white/5 rounded-full px-1 border border-white/10">
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
                <div className="px-4 text-[10px] font-black tracking-[0.2em] font-mono text-news-gold whitespace-nowrap">
                    {safeFormat(selectedDate, 'dd MMM yyyy').toUpperCase()}
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

         <div className="flex items-center gap-3">
             {viewMode === 'reader' && (
                <button 
                    onClick={() => setIsCropping(true)}
                    className="flex items-center gap-2 px-5 md:px-7 py-2.5 bg-news-gold text-black rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:bg-white shadow-lg active:scale-95"
                >
                    <Scissors size={14} /> CLIP ARTICLE
                </button>
             )}
             <button 
                onClick={() => setViewMode(viewMode === 'grid' ? 'reader' : 'grid')}
                className="p-3 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
             >
                {viewMode === 'grid' ? <Eye size={18} /> : <LayoutGrid size={18} />}
             </button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
          
          {/* ARCHIVE GRID */}
          {viewMode === 'grid' && (
              <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-16 animate-in fade-in duration-500 bg-[#0a0a0a]">
                  <div className="max-w-7xl mx-auto space-y-12">
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
                          <div>
                              <h1 className="text-4xl md:text-5xl font-serif font-black text-white mb-2">Issue Archive</h1>
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
                                      <img src={page.imageUrl} className="w-full h-full object-cover transition-all duration-700 grayscale group-hover:grayscale-0 brightness-75 group-hover:brightness-100" alt={`P${page.pageNumber}`} />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                          <div className="bg-news-gold text-black p-3 rounded-full shadow-2xl transform scale-75 group-hover:scale-100 transition-transform">
                                              <Eye size={20} />
                                          </div>
                                      </div>
                                  </div>
                                  <p className="text-[10px] font-black tracking-[0.3em] text-gray-500 group-hover:text-news-gold transition-colors text-center">PAGE {page.pageNumber}</p>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* READER VIEW */}
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
                            position: 'relative'
                        }}
                      >
                          <EPaperViewer 
                            page={activePage} 
                            imageClassName="max-h-[85vh] h-auto w-auto max-w-full block shadow-[0_0_150px_rgba(0,0,0,1)] border border-white/5"
                            disableInteractivity={true}
                          />
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-6 opacity-30">
                          <Loader2 size={32} className="animate-spin" />
                          <p className="font-black uppercase tracking-[0.5em] text-[10px]">Accessing Scan...</p>
                      </div>
                  )}

                  {/* Navigation Handles */}
                  <div className="absolute inset-y-0 left-0 flex items-center">
                    <button 
                        onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                        disabled={activePageIndex === 0}
                        className="p-6 md:p-12 text-gray-700 hover:text-white transition-colors disabled:opacity-0"
                    >
                        <ChevronLeft size={48} />
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <button 
                        onClick={() => setActivePageIndex(prev => Math.min(currentEditionPages.length - 1, prev + 1))}
                        disabled={activePageIndex === currentEditionPages.length - 1}
                        className="p-6 md:p-12 text-gray-700 hover:text-white transition-colors disabled:opacity-0"
                    >
                        <ChevronRight size={48} />
                    </button>
                  </div>

                  {/* Desktop Zoom Console */}
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-news-black/90 backdrop-blur-3xl border border-white/5 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl z-40 hidden md:flex">
                      <button onClick={() => setScale(s => Math.max(1, s - 0.5))} className="hover:text-news-gold transition-colors"><ZoomOut size={18} /></button>
                      <div className="text-[10px] font-mono font-black text-news-gold min-w-[50px] text-center tracking-widest">{Math.round(scale * 100)}%</div>
                      <button onClick={() => setScale(s => Math.min(4, s + 0.5))} className="hover:text-news-gold transition-colors"><ZoomIn size={18} /></button>
                      <div className="w-px h-4 bg-white/10"></div>
                      <button onClick={() => { setScale(1); setPosition({x:0, y:0}); }} className="hover:text-news-gold transition-colors" title="Reset Viewer"><RotateCcw size={16} /></button>
                  </div>
              </div>
          )}
      </div>

      {/* CLIPPING WORKSHOP (MODAL + SIDE PREVIEW ON DESKTOP) */}
      {isCropping && (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col animate-in fade-in zoom-in-95 duration-300">
            {/* Workshop Header */}
            <div className="px-6 py-5 bg-news-black border-b border-white/5 flex items-center justify-between shrink-0 shadow-2xl">
                <div className="flex items-center gap-4">
                    <button onClick={() => { setIsCropping(false); setCropPreview(null); }} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                    <div>
                        <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-news-gold">Clipping Workshop</h2>
                        <p className="text-[9px] text-gray-600 uppercase tracking-widest font-bold hidden sm:block">Refining borders for digital archival</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    {cropPreview ? (
                        <div className="flex gap-2">
                            <button onClick={handleShare} className="bg-white/5 text-white border border-white/10 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-white/10 transition-all shadow-xl"><Share2 size={14} /> Share</button>
                            <button onClick={handleDownload} className="bg-news-gold text-black px-7 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-xl"><Download size={14} /> Save Clip</button>
                            <button onClick={() => setCropPreview(null)} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-gray-400 transition-all" title="Redo Crop"><RefreshCcw size={16} /></button>
                        </div>
                    ) : (
                        <button 
                            onClick={generateBrandedClip}
                            disabled={isProcessing}
                            className="bg-news-gold text-black px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-xl disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                            Process Clipping
                        </button>
                    )}
                </div>
            </div>

            {/* Workspace: Side-by-Side on Desktop */}
            <div className={`flex-1 overflow-hidden relative flex flex-col ${cropPreview ? 'md:flex-row' : 'flex-col'} bg-[#080808]`}>
                
                {/* Image Section (Cropper or Reference) */}
                <div className={`relative flex flex-col items-center justify-center p-4 md:p-12 transition-all duration-500 ${cropPreview ? 'w-full md:w-1/2 border-r border-white/5' : 'w-full h-full'}`}>
                    {cropPreview && (
                         <div className="absolute top-8 left-12 text-[9px] font-black uppercase tracking-[0.4em] text-gray-600 hidden md:block">Original Scan</div>
                    )}
                    <div className={`w-full h-full flex items-center justify-center ${cropPreview ? 'opacity-40 grayscale pointer-events-none scale-90' : ''} transition-all duration-700`}>
                        <img 
                            ref={cropperImgRef}
                            src={activePage?.imageUrl} 
                            className={`max-w-full max-h-full block ${cropPreview ? '' : 'invisible'}`} 
                            crossOrigin="anonymous"
                            alt="Scan workspace"
                        />
                    </div>
                </div>

                {/* Branded Clipping Result Section (Right Side on Desktop) */}
                {cropPreview && (
                    <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-6 md:p-16 bg-[#0c0c0c] animate-in slide-in-from-right-8 duration-700">
                        <div className="absolute top-8 right-12 text-[9px] font-black uppercase tracking-[0.4em] text-news-gold">Clipped Result</div>
                        <div className="max-w-4xl shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/5 rounded-sm overflow-hidden bg-white animate-in zoom-in-95 duration-700">
                             <img src={cropPreview} className="max-h-[65vh] w-auto block" alt="Branded Output" />
                        </div>
                        <div className="mt-10 flex flex-col items-center gap-2">
                             <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em]">Quality Verified • Watermark Applied</p>
                             <div className="w-12 h-0.5 bg-news-gold/30 mt-2"></div>
                        </div>
                    </div>
                )}
            </div>
            
            {!cropPreview && (
                <div className="bg-news-black p-4 border-t border-white/5 text-center shrink-0">
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.5em] flex items-center justify-center gap-4">
                        <ZoomIn size={14} /> Scroll to Zoom & Drag to Reposition Original • Refine borders to capture text and imagery
                    </p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default EPaperReader;
