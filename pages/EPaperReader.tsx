
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EPaperPage, EPaperRegion, Article, WatermarkSettings } from '../types';
import EPaperViewer from '../components/EPaperViewer';
import Cropper from 'cropperjs';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  Maximize, Minimize, RotateCcw, X, Grid, ArrowLeft, Loader2, Scissors, Download, Check, LayoutGrid, Eye, Search
} from 'lucide-react';
import { format } from 'date-fns';
import { APP_NAME } from '../constants';

interface EPaperReaderProps {
  pages: EPaperPage[];
  articles?: Article[];
  onNavigate: (path: string) => void;
  // Added missing watermarkSettings property to resolve App.tsx type error
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

  // --- Reader View Controls ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [clipMode, setClipMode] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number, clientY: number, originX: number, originY: number } | null>(null);

  // --- Smart Clipping Logic ---
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
    }
  }, [viewMode, activePageIndex]);

  // Hover Box Tracker
  const handleMouseMove = (e: React.MouseEvent) => {
    if (clipMode && contentRef.current) {
        const rect = contentRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setHoverBox({ x, y });
    }
    
    if (isDragging && scale > 1 && dragStartRef.current && contentRef.current) {
      e.preventDefault();
      const deltaX = e.clientX - dragStartRef.current.clientX;
      const deltaY = e.clientY - dragStartRef.current.clientY;
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

  // --- Cropperjs Integration ---
  useEffect(() => {
    if (isCropping && cropperImgRef.current && !cropPreview) {
        if (cropperRef.current) cropperRef.current.destroy();
        
        const cropper = new Cropper(cropperImgRef.current, {
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.5,
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
                    const cropHeight = canvasData.height * 0.25;
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

  const generateFinalClip = async () => {
    if (!cropperRef.current) return;
    setIsProcessing(true);
    
    const croppedCanvas = cropperRef.current.getCroppedCanvas({ imageSmoothingQuality: 'high' });
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;

    const footerHeight = Math.max(60, croppedCanvas.height * 0.08);
    finalCanvas.width = croppedCanvas.width;
    finalCanvas.height = croppedCanvas.height + footerHeight;

    // Draw Content
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(croppedCanvas, 0, 0);

    // Draw Branded Footer - Optimized with watermarkSettings
    ctx.fillStyle = watermarkSettings.backgroundColor;
    ctx.fillRect(0, croppedCanvas.height, finalCanvas.width, footerHeight);

    // Brand Name
    const fontSize = Math.floor(footerHeight * 0.4);
    ctx.font = `bold ${fontSize}px "Merriweather", serif`;
    ctx.fillStyle = watermarkSettings.textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(watermarkSettings.text.toUpperCase(), footerHeight * 0.5, croppedCanvas.height + (footerHeight / 2));

    // Date String (Daily dynamic based on upload date)
    ctx.font = `500 ${fontSize * 0.6}px "Inter", sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    const dateStr = `Published: ${format(new Date(activePage!.date), 'EEEE, MMMM do, yyyy')}`;
    ctx.fillText(dateStr, finalCanvas.width - (footerHeight * 0.5), croppedCanvas.height + (footerHeight / 2));

    setCropPreview(finalCanvas.toDataURL('image/jpeg', 0.9));
    setIsProcessing(false);
  };

  const handleDownload = () => {
    if (!cropPreview) return;
    const link = document.createElement('a');
    link.href = cropPreview;
    link.download = `Clipping_${activePage?.date}_P${activePage?.pageNumber}.jpg`;
    link.click();
    setIsCropping(false);
    setClipMode(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-[#0f0f0f] text-white overflow-hidden relative font-sans">
      
      {/* Dynamic Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 bg-news-black border-b border-white/5 z-40 shrink-0 shadow-2xl">
         <div className="flex items-center gap-6">
            <button 
                onClick={() => viewMode === 'grid' ? onNavigate('/') : setViewMode('grid')}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
            >
                <ArrowLeft size={18} /> {viewMode === 'grid' ? 'Portal' : 'Back to Grid'}
            </button>
            <div className="h-6 w-px bg-white/10 hidden md:block"></div>
            <div className="flex items-center bg-white/5 rounded-full px-1 border border-white/10">
                <button 
                    disabled={selectedDate === uniqueDates[uniqueDates.length - 1]}
                    onClick={() => {
                        const idx = uniqueDates.indexOf(selectedDate);
                        setSelectedDate(uniqueDates[idx + 1]);
                    }}
                    className="p-2 hover:bg-white/5 rounded-full disabled:opacity-20"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="px-4 text-[11px] font-black tracking-[0.2em] font-mono text-news-gold whitespace-nowrap">
                    {format(new Date(selectedDate), 'dd MMM yyyy').toUpperCase()}
                </div>
                <button 
                    disabled={selectedDate === uniqueDates[0]}
                    onClick={() => {
                        const idx = uniqueDates.indexOf(selectedDate);
                        setSelectedDate(uniqueDates[idx - 1]);
                    }}
                    className="p-2 hover:bg-white/5 rounded-full disabled:opacity-20"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
         </div>

         <div className="flex items-center gap-3">
             {viewMode === 'reader' && (
                <button 
                    onClick={() => { setClipMode(!clipMode); setHoverBox(null); }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${clipMode ? 'bg-news-accent border-news-accent text-white animate-pulse' : 'bg-white/5 border-white/10 text-gray-300 hover:border-news-gold hover:text-news-gold'}`}
                >
                    <Scissors size={14} /> {clipMode ? 'ESC' : 'CLIP ARTICLE'}
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

      {/* Main Container */}
      <div className="flex-1 overflow-hidden relative bg-[#050505]">
          
          {/* ARCHIVE GRID VIEW */}
          {viewMode === 'grid' && (
              <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-12 animate-in fade-in duration-500">
                  <div className="max-w-7xl mx-auto space-y-12">
                      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
                          <div>
                              <h1 className="text-4xl md:text-5xl font-serif font-black text-white mb-3">Digital Archive</h1>
                              <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em]">Browsing Edition: {selectedDate}</p>
                          </div>
                          <div className="flex items-center gap-2 text-news-gold bg-news-gold/5 px-4 py-2 rounded-lg border border-news-gold/20">
                              <Search size={14} />
                              <span className="text-[10px] font-black tracking-widest uppercase">{currentEditionPages.length} Pages Available</span>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                          {currentEditionPages.map((page, idx) => (
                              <div 
                                key={page.id}
                                onClick={() => { setActivePageIndex(idx); setViewMode('reader'); }}
                                className="group cursor-pointer space-y-4"
                              >
                                  <div className="relative aspect-[3/4] overflow-hidden rounded-sm border border-white/10 shadow-2xl transition-all duration-500 group-hover:scale-[1.03] group-hover:border-news-gold group-hover:shadow-news-gold/20">
                                      <img src={page.imageUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" alt={`P${page.pageNumber}`} />
                                      <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors"></div>
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                          <div className="bg-news-gold text-black p-4 rounded-full shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                              <Eye size={24} />
                                          </div>
                                      </div>
                                  </div>
                                  <div className="flex items-center justify-between px-1">
                                      <span className="text-[10px] font-black tracking-[0.2em] text-gray-500 uppercase">Page {page.pageNumber}</span>
                                      <div className="w-8 h-px bg-white/10 group-hover:w-12 group-hover:bg-news-gold transition-all"></div>
                                  </div>
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
                className={`h-full relative flex items-center justify-center cursor-${clipMode ? 'crosshair' : (scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default')}`}
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
                            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.165, 0.84, 0.44, 1)',
                            transformOrigin: 'center',
                            display: 'inline-block',
                            position: 'relative'
                        }}
                      >
                          <EPaperViewer 
                            page={activePage} 
                            imageClassName={`max-h-[85vh] h-auto w-auto max-w-full block shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 transition-all duration-500 ${clipMode ? 'brightness-50' : ''}`}
                            disableInteractivity={true}
                          />
                          
                          {/* Hover Smart Selection Box */}
                          {clipMode && hoverBox && (
                              <div 
                                className="absolute border-2 border-news-gold bg-news-gold/10 pointer-events-none z-50 flex items-center justify-center"
                                style={{
                                    left: `${hoverBox.x}%`,
                                    top: `${hoverBox.y}%`,
                                    width: '30%', // Initial selection size
                                    height: '20%',
                                    transform: 'translate(-50%, -50%)',
                                    boxShadow: '0 0 40px rgba(191, 161, 123, 0.3)'
                                }}
                              >
                                  <div className="bg-news-gold text-black px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-sm absolute -top-8 animate-bounce">
                                      Click to Capture
                                  </div>
                              </div>
                          )}
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-6 opacity-30">
                          <Loader2 size={48} className="animate-spin" />
                          <p className="font-black uppercase tracking-[0.4em] text-xs">Loading Edition...</p>
                      </div>
                  )}

                  {/* Navigation Controls (Mobile optimized) */}
                  <div className="absolute inset-y-0 left-0 flex items-center">
                    <button 
                        onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                        disabled={activePageIndex === 0}
                        className="p-4 md:p-8 text-gray-600 hover:text-white transition-colors disabled:opacity-0"
                    >
                        <ChevronLeft size={48} />
                    </button>
                  </div>
                  <div className="absolute inset-y-0 right-0 flex items-center">
                    <button 
                        onClick={() => setActivePageIndex(prev => Math.min(currentEditionPages.length - 1, prev + 1))}
                        disabled={activePageIndex === currentEditionPages.length - 1}
                        className="p-4 md:p-8 text-gray-600 hover:text-white transition-colors disabled:opacity-0"
                    >
                        <ChevronRight size={48} />
                    </button>
                  </div>

                  {/* Zoom Controls Overlay */}
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-news-black/80 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 flex items-center gap-6 shadow-2xl z-40 hidden md:flex">
                      <button onClick={() => setScale(s => Math.max(1, s - 0.5))} className="hover:text-news-gold transition-colors"><ZoomOut size={20} /></button>
                      <span className="text-[10px] font-mono font-black text-news-gold min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
                      <button onClick={() => setScale(s => Math.min(4, s + 0.5))} className="hover:text-news-gold transition-colors"><ZoomIn size={20} /></button>
                      <div className="w-px h-4 bg-white/10"></div>
                      <button onClick={() => { setScale(1); setPosition({x:0, y:0}); }} className="hover:text-news-gold transition-colors"><RotateCcw size={18} /></button>
                  </div>
              </div>
          )}
      </div>

      {/* CLIPPING INTERFACE (MODAL) */}
      {isCropping && (
        <div className="fixed inset-0 z-[100] bg-[#050505] flex flex-col animate-in fade-in zoom-in-95 duration-300">
            <div className="px-6 py-5 bg-news-black border-b border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsCropping(false)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                        <X size={24} />
                    </button>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-news-gold">Clipping Workshop</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Adjust the area to include headlines and images</p>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    {cropPreview ? (
                        <button 
                            onClick={handleDownload}
                            className="bg-news-gold text-black px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-xl"
                        >
                            <Download size={16} /> Final Download
                        </button>
                    ) : (
                        <button 
                            onClick={generateFinalClip}
                            disabled={isProcessing}
                            className="bg-news-gold text-black px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-xl disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            Confirm Selection
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-6 md:p-12">
                {cropPreview ? (
                    <div className="animate-in zoom-in-95 duration-500 flex flex-col items-center">
                         <div className="max-w-4xl shadow-[0_0_100px_rgba(0,0,0,1)] border border-white/10 rounded-sm overflow-hidden">
                             <img src={cropPreview} className="max-h-[70vh] w-auto block" alt="Branded Clipping" />
                         </div>
                         <button 
                            onClick={() => setCropPreview(null)}
                            className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-colors"
                         >
                            Restart Adjustment
                         </button>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <img 
                            ref={cropperImgRef}
                            src={activePage?.imageUrl} 
                            className="max-w-full max-h-full block invisible" 
                            crossOrigin="anonymous"
                            alt="Cropping Area"
                        />
                    </div>
                )}
            </div>
            
            {!cropPreview && (
                <div className="bg-news-black p-6 border-t border-white/5 text-center shrink-0">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.3em]">Precision Crop • Press and drag to expand the selection area</p>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default EPaperReader;
