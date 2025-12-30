
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EPaperPage, EPaperRegion, Article, WatermarkSettings } from '../types';
import EPaperViewer from '../components/EPaperViewer';
import Cropper from 'cropperjs';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  X, Grid, ArrowLeft, Loader2, Scissors, Download, Check, LayoutGrid, Eye, Search, Share2, RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
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
    const dates = Array.from(new Set(pages.map(p => p.date)));
    return dates.sort().reverse(); 
  }, [pages]);

  const [selectedDate, setSelectedDate] = useState(uniqueDates[0] || new Date().toISOString().split('T')[0]);
  
  const currentEditionPages = useMemo(() => {
    return pages.filter(p => p.date === selectedDate).sort((a, b) => a.pageNumber - b.pageNumber);
  }, [pages, selectedDate]);

  const [activePageIndex, setActivePageIndex] = useState(0);
  const activePage = currentEditionPages[activePageIndex];

  // --- Reader Controls ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [clipMode, setClipMode] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number, clientY: number, originX: number, originY: number } | null>(null);

  // --- Clipping Workshop ---
  const [hoverBox, setHoverBox] = useState<{ x: number, y: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const cropperImgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (viewMode === 'reader') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setClipMode(false);
        setHoverBox(null);
    }
  }, [viewMode, activePageIndex]);

  // Handle cursor/touch movement for the clipping square
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (clipMode && contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;
        setHoverBox({ x, y });
    }
    
    if (isDragging && scale > 1 && dragStartRef.current && contentRef.current && !clipMode) {
      if ('touches' in e) return; // Standard pan via separate logic or CSS for mobile
      const deltaX = (e as React.MouseEvent).clientX - dragStartRef.current.clientX;
      const deltaY = (e as React.MouseEvent).clientY - dragStartRef.current.clientY;
      contentRef.current.style.transform = `translate(${dragStartRef.current.originX + deltaX}px, ${dragStartRef.current.originY + deltaY}px) scale(${scale})`;
      contentRef.current.style.transition = 'none';
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (clipMode) {
        setIsCropping(true);
        setCropPreview(null);
        return;
    }
    if (scale > 1) {
      setIsDragging(true);
      dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, originX: position.x, originY: position.y };
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

  // --- Image Extraction ---
  useEffect(() => {
    if (isCropping && cropperImgRef.current && !cropPreview) {
        if (cropperRef.current) cropperRef.current.destroy();
        
        const cropper = new Cropper(cropperImgRef.current, {
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.6,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            ready() {
                if (hoverBox) {
                    const canvasData = cropper.getCanvasData();
                    const cropWidth = canvasData.width * 0.4;
                    const cropHeight = canvasData.height * 0.3;
                    cropper.setCropBoxData({
                        left: (hoverBox.x / 100) * canvasData.width - (cropWidth / 2),
                        top: (hoverBox.y / 100) * canvasData.height - (cropHeight / 2),
                        width: cropWidth,
                        height: cropHeight
                    });
                }
            }
        });
        cropperRef.current = cropper;
    }
  }, [isCropping, cropPreview]);

  const generateBrandedClip = async () => {
    if (!cropperRef.current) return;
    setIsProcessing(true);
    
    const croppedCanvas = cropperRef.current.getCroppedCanvas({ imageSmoothingQuality: 'high' });
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    const footerHeight = Math.max(70, croppedCanvas.height * 0.1);
    finalCanvas.width = croppedCanvas.width;
    finalCanvas.height = croppedCanvas.height + footerHeight;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(croppedCanvas, 0, 0);

    // Dynamic Branded Strip
    ctx.fillStyle = watermarkSettings.backgroundColor;
    ctx.fillRect(0, croppedCanvas.height, finalCanvas.width, footerHeight);

    const fontSize = Math.floor(footerHeight * 0.4);
    ctx.font = `bold ${fontSize}px "Merriweather", serif`;
    ctx.fillStyle = watermarkSettings.textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(watermarkSettings.text.toUpperCase(), footerHeight * 0.5, croppedCanvas.height + (footerHeight / 2));

    // Dynamic Issue Date
    ctx.font = `500 ${fontSize * 0.6}px "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right';
    const issueDate = format(new Date(activePage!.date), 'MMMM do, yyyy');
    ctx.fillText(`Edition: ${issueDate}`, finalCanvas.width - (footerHeight * 0.5), croppedCanvas.height + (footerHeight / 2));

    setCropPreview(finalCanvas.toDataURL('image/jpeg', 0.95));
    setIsProcessing(false);
  };

  const handleDownload = () => {
    if (!cropPreview) return;
    const link = document.createElement('a');
    link.href = cropPreview;
    link.download = `Newsroom_Clip_${activePage?.date}_P${activePage?.pageNumber}.jpg`;
    link.click();
  };

  const handleShare = async () => {
      if (!cropPreview || !navigator.share) return;
      try {
          const blob = await (await fetch(cropPreview)).blob();
          const file = new File([blob], `Clip_${activePage?.date}.jpg`, { type: 'image/jpeg' });
          await navigator.share({
              files: [file],
              title: 'Article Clip',
              text: `Shared from ${APP_NAME}`
          });
      } catch (err) { console.error('Sharing failed', err); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#050505] text-white overflow-hidden relative font-sans">
      
      {/* Smart Nav Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-3 bg-news-black border-b border-white/5 z-50 shrink-0 shadow-xl">
         <div className="flex items-center gap-4 md:gap-8">
            <button 
                onClick={() => viewMode === 'grid' ? onNavigate('/') : setViewMode('grid')}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
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
                <div className="px-3 text-[10px] font-black tracking-[0.2em] font-mono text-news-gold whitespace-nowrap">
                    {format(new Date(selectedDate), 'dd MMM yyyy').toUpperCase()}
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
                    onClick={() => { setClipMode(!clipMode); setHoverBox(null); }}
                    className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${clipMode ? 'bg-news-accent border-news-accent text-white shadow-lg shadow-news-accent/20' : 'bg-white/5 border-white/10 text-gray-300 hover:border-news-gold hover:text-news-gold'}`}
                >
                    <Scissors size={14} /> {clipMode ? 'EXIT' : 'CLIP'}
                </button>
             )}
             <button 
                onClick={() => setViewMode(viewMode === 'grid' ? 'reader' : 'grid')}
                className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
             >
                {viewMode === 'grid' ? <Eye size={16} /> : <LayoutGrid size={16} />}
             </button>
         </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
          
          {/* ARCHIVE GRID: Multi-page browser */}
          {viewMode === 'grid' && (
              <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-16 animate-in fade-in duration-500 bg-[#0a0a0a]">
                  <div className="max-w-7xl mx-auto space-y-12">
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-10">
                          <div>
                              <h1 className="text-3xl md:text-5xl font-serif font-black text-white mb-2">Digital Archives</h1>
                              <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                                <Calendar size={12} className="text-news-gold"/> Edition: {selectedDate}
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
                                  <div className="relative aspect-[3/4] overflow-hidden rounded border border-white/10 shadow-2xl transition-all duration-500 group-hover:scale-[1.05] group-hover:border-news-gold group-hover:shadow-news-gold/30">
                                      <img src={page.imageUrl} className="w-full h-full object-cover transition-all duration-700 brightness-75 group-hover:brightness-105" alt={`P${page.pageNumber}`} />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                          <div className="bg-news-gold text-black p-3 rounded-full shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                                              <Eye size={20} />
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center justify-between px-1">
                                      <span className="text-[9px] font-black tracking-[0.2em] text-gray-500 uppercase">PAGE {page.pageNumber}</span>
                                      <div className="w-6 h-px bg-white/10 group-hover:w-10 group-hover:bg-news-gold transition-all"></div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}

          {/* READER VIEW: Immersive, Optimized Reader */}
          {viewMode === 'reader' && (
              <div 
                ref={viewerRef}
                className={`h-full relative flex items-center justify-center cursor-${clipMode ? 'crosshair' : (scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default')} touch-none`}
                onMouseMove={handleMouseMove}
                onTouchMove={handleMouseMove}
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
                            imageClassName={`max-h-[88vh] h-auto w-auto max-w-full block shadow-2xl border border-white/5 transition-all duration-500 ${clipMode ? 'brightness-[0.3] grayscale-[0.5]' : ''}`}
                            disableInteractivity={true}
                          />
                          
                          {/* Reactive Hover Capture Box */}
                          {clipMode && hoverBox && (
                              <div 
                                className="absolute border-2 border-news-gold bg-news-gold/10 pointer-events-none z-50"
                                style={{
                                    left: `${hoverBox.x}%`,
                                    top: `${hoverBox.y}%`,
                                    width: '32%',
                                    aspectRatio: '1',
                                    transform: 'translate(-50%, -50%)',
                                    boxShadow: '0 0 50px rgba(191, 161, 123, 0.4)'
                                }}
                              >
                                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-news-gold text-black px-3 py-1.5 text-[8px] font-black uppercase tracking-widest rounded-sm shadow-2xl">
                                      Select Article
                                  </div>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-6 opacity-20">
                          <Loader2 size={32} className="animate-spin" />
                          <p className="font-black uppercase tracking-[0.5em] text-[10px]">Accessing Scan...</p>
                      </div>
                  )}

                  {/* Page Controls (Hidden on Mobile) */}
                  <div className="absolute inset-y-0 left-0 hidden md:flex items-center">
                    <button 
                        onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                        disabled={activePageIndex === 0}
                        className="p-10 text-gray-700 hover:text-white transition-colors disabled:opacity-0"
                    >
                        <ChevronLeft size={48} />
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-0 hidden md:flex items-center">
                    <button 
                        onClick={() => setActivePageIndex(prev => Math.min(currentEditionPages.length - 1, prev + 1))}
                        disabled={activePageIndex === currentEditionPages.length - 1}
                        className="p-10 text-gray-700 hover:text-white transition-colors disabled:opacity-0"
                    >
                        <ChevronRight size={48} />
                    </button>
                  </div>

                  {/* Precision Zoom Console */}
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-news-black/90 backdrop-blur-2xl border border-white/5 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl z-50">
                      <button onClick={() => setScale(s => Math.max(1, s - 0.5))} className="hover:text-news-gold transition-colors"><ZoomOut size={18} /></button>
                      <div className="text-[9px] font-mono font-black text-news-gold min-w-[50px] text-center tracking-widest">{Math.round(scale * 100)}%</div>
                      <button onClick={() => setScale(s => Math.min(4, s + 0.5))} className="hover:text-news-gold transition-colors"><ZoomIn size={18} /></button>
                      <div className="w-px h-3 bg-white/10"></div>
                      <button onClick={() => { setScale(1); setPosition({x:0, y:0}); }} className="hover:text-news-gold transition-colors"><RotateCcw size={16} className="rotate-180" /></button>
                  </div>
              </div>
          )}
      </div>

      {/* CLIPPING WORKSHOP: The 'New Window' results interface */}
      {isCropping && (
        <div className="fixed inset-0 z-[100] bg-black/98 flex flex-col animate-in fade-in zoom-in-95 duration-300 backdrop-blur-3xl">
            <div className="px-6 py-5 bg-news-black border-b border-white/5 flex items-center justify-between shrink-0 shadow-2xl">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsCropping(false)} className="p-2 hover:bg-white/10 rounded-full transition-all text-white/50 hover:text-white">
                        <X size={24} />
                    </button>
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-news-gold">Clipping Workshop</h2>
                        <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold hidden sm:block">Refine borders for perfect archival quality</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    {cropPreview ? (
                        <div className="flex gap-2">
                            <button 
                                onClick={handleShare}
                                className="bg-white/5 text-white border border-white/10 px-5 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-white/10 transition-all shadow-xl"
                            >
                                <Share2 size={14} /> Share
                            </button>
                            <button 
                                onClick={handleDownload}
                                className="bg-news-gold text-black px-6 py-2.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-xl"
                            >
                                <Download size={14} /> Download Clip
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={generateBrandedClip}
                            disabled={isProcessing}
                            className="bg-news-gold text-black px-8 py-3 rounded-full text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-xl disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            Finalize Capture
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-4 md:p-12">
                {cropPreview ? (
                    <div className="animate-in zoom-in-95 duration-700 flex flex-col items-center">
                         <div className="max-w-4xl shadow-[0_0_120px_rgba(0,0,0,1)] border border-white/5 rounded-sm overflow-hidden bg-white">
                             <img src={cropPreview} className="max-h-[72vh] w-auto block" alt="Branded Clipping" />
                         </div>
                         <button 
                            onClick={() => setCropPreview(null)}
                            className="mt-8 text-[9px] font-black uppercase tracking-[0.4em] text-gray-600 hover:text-white transition-colors py-2 px-4 border border-transparent hover:border-white/10 rounded-full"
                         >
                            RE-ADJUST CROP
                         </button>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <img 
                            ref={cropperImgRef}
                            src={activePage?.imageUrl} 
                            className="max-w-full max-h-full block invisible" 
                            crossOrigin="anonymous"
                            alt="Processing Area"
                        />
                    </div>
                )}
            </div>
            
            {!cropPreview && (
                <div className="bg-news-black p-4 border-t border-white/5 text-center shrink-0">
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.4em]">Archival Mode • Align margins to capture text and imagery clearly</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default EPaperReader;
