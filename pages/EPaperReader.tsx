
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EPaperPage, EPaperRegion, Article, WatermarkSettings } from '../types';
import EPaperViewer from '../components/EPaperViewer';
import Cropper from 'cropperjs';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  X, Grid, ArrowLeft, Loader2, Scissors, Download, Check, LayoutGrid, Eye, Search, Share2, RotateCcw, RefreshCcw, Maximize, MousePointer2
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

  const safeFormat = (dateValue: any, formatStr: string) => {
    if (!dateValue) return 'N/A';
    const d = new Date(dateValue);
    return isValid(d) ? format(d, formatStr) : 'N/A';
  };

  // --- Reader View Controls ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  const contentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  // --- Direct Clipping Workflow ---
  const [isCropping, setIsCropping] = useState(false);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [workshopScale, setWorkshopScale] = useState(1);
  const cropperRef = useRef<Cropper | null>(null);
  const cropperImgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (viewMode === 'reader') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setIsCropping(false);
        setCropPreview(null);
        // Prevent body scroll when in full screen reader
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [viewMode, activePageIndex]);

  // HOVER PANNING LOGIC (READER)
  const handleReaderMouseMove = (e: React.MouseEvent) => {
    if (scale > 1 && viewerRef.current && !isCropping) {
        const rect = viewerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const pctX = Math.max(0, Math.min(1, mouseX / rect.width));
        const pctY = Math.max(0, Math.min(1, mouseY / rect.height));
        
        // Dynamic offset calculation to ensure full coverage of the image
        const moveRangeX = rect.width * (scale - 1);
        const moveRangeY = rect.height * (scale - 1);

        const targetX = (0.5 - pctX) * moveRangeX;
        const targetY = (0.5 - pctY) * moveRangeY;

        setPosition({ x: targetX, y: targetY });
    }
  };

  // HOVER PANNING LOGIC (WORKSHOP / CROP)
  const handleWorkshopMouseMove = (e: React.MouseEvent) => {
      if (isCropping && workshopScale > 1 && cropperRef.current && !cropPreview) {
          const containerData = (cropperRef.current as any).getContainerData();
          const rect = e.currentTarget.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          const pctX = Math.max(0, Math.min(1, mouseX / rect.width));
          const pctY = Math.max(0, Math.min(1, mouseY / rect.height));

          const imageData = (cropperRef.current as any).getImageData();
          
          // Smooth translation within the cropper canvas based on hover
          (cropperRef.current as any).moveTo(
              (containerData.width / 2) - (pctX * imageData.width * workshopScale) + (imageData.width / 2),
              (containerData.height / 2) - (pctY * imageData.height * workshopScale) + (imageData.height / 2)
          );
      }
  };

  useEffect(() => {
    if (isCropping && cropperImgRef.current && !cropPreview) {
        if (cropperRef.current) cropperRef.current.destroy();
        
        const cropper = new Cropper(cropperImgRef.current, {
            dragMode: 'move', 
            autoCropArea: 0.8,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            zoomable: true,
            background: false,
            responsive: true,
            ready() {
                setWorkshopScale(1);
            },
            zoom(e) {
                setWorkshopScale(e.detail.ratio);
            }
        } as any);
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
    
    // Correct API for CropperJS v1.x
    const croppedCanvas = (cropperRef.current as any).getCroppedCanvas();
    
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

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(croppedCanvas, 0, 0);

    ctx.fillStyle = watermarkSettings.backgroundColor;
    ctx.fillRect(0, croppedCanvas.height, finalCanvas.width, footerHeight);

    const fontSize = Math.floor(footerHeight * 0.4);
    ctx.font = `bold ${fontSize}px "Merriweather", serif`;
    ctx.fillStyle = watermarkSettings.textColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(watermarkSettings.text.toUpperCase(), footerHeight * 0.5, croppedCanvas.height + (footerHeight / 2));

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
    link.download = `Clipping_${activePage?.date}.jpg`;
    link.click();
  };

  const handleShare = async () => {
      if (!cropPreview || !navigator.share) return;
      try {
          const blob = await (await fetch(cropPreview)).blob();
          const file = new File([blob], `Clip_${activePage?.date}.jpg`, { type: 'image/jpeg' });
          await navigator.share({
              files: [file],
              title: 'Paper Clipping',
              text: `Extracted from ${APP_NAME}`
          });
      } catch (err) { console.error('Share failed', err); }
  };

  return (
    <div className="flex flex-col bg-news-paper font-sans">
      
      {/* INITIAL GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="flex items-center justify-between px-4 md:px-8 py-4 bg-white border-b border-gray-100 z-10 sticky top-0 shadow-sm">
           <div className="flex items-center gap-4">
              <button 
                  onClick={() => onNavigate('/')}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-news-black transition-all"
              >
                  <ArrowLeft size={20} />
              </button>
              <div className="flex items-center bg-gray-50 rounded-full px-1 border border-gray-200">
                  <button 
                      disabled={selectedDate === uniqueDates[uniqueDates.length - 1]}
                      onClick={() => {
                          const idx = uniqueDates.indexOf(selectedDate);
                          setSelectedDate(uniqueDates[idx + 1]);
                      }}
                      className="p-2 hover:bg-white rounded-full disabled:opacity-20"
                  >
                      <ChevronLeft size={18} />
                  </button>
                  <div className="px-4 text-[10px] font-black tracking-[0.2em] font-mono text-news-black">
                      {safeFormat(selectedDate, 'dd MMM yyyy').toUpperCase()}
                  </div>
                  <button 
                      disabled={selectedDate === uniqueDates[0]}
                      onClick={() => {
                          const idx = uniqueDates.indexOf(selectedDate);
                          setSelectedDate(uniqueDates[idx - 1]);
                      }}
                      className="p-2 hover:bg-white rounded-full disabled:opacity-20"
                  >
                      <ChevronRight size={18} />
                  </button>
              </div>
           </div>
           <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hidden md:block">
               Select Page to Read
           </div>
        </div>
      )}

      {/* ARCHIVE GRID */}
      {viewMode === 'grid' && (
          <div className="p-6 md:p-12 animate-in fade-in duration-500 min-h-[80vh]">
              <div className="max-w-7xl mx-auto space-y-12">
                  <div className="border-b border-gray-200 pb-8">
                      <h1 className="text-3xl md:text-5xl font-serif font-black text-gray-900 mb-2">Issue Portal</h1>
                      <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                        <Calendar size={14} className="text-news-gold"/> Edition: {safeFormat(selectedDate, 'MMMM do, yyyy')}
                      </p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-10">
                      {currentEditionPages.map((page, idx) => (
                          <div 
                            key={page.id}
                            onClick={() => { setActivePageIndex(idx); setViewMode('reader'); }}
                            className="group cursor-pointer space-y-3"
                          >
                              <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-gray-200 shadow-sm transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-2xl">
                                  <img src={page.imageUrl} className="w-full h-full object-cover transition-all duration-700" alt={`P${page.pageNumber}`} />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                      <div className="bg-news-black text-white p-4 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0">
                                          <Maximize size={24} />
                                      </div>
                                  </div>
                              </div>
                              <p className="text-[10px] font-black tracking-[0.3em] text-gray-400 group-hover:text-news-accent transition-colors text-center uppercase">Page {page.pageNumber}</p>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* IMMERSIVE FULL SCREEN READER OVERLAY */}
      {viewMode === 'reader' && (
          <div className="fixed inset-0 z-[100] bg-[#050505] text-white flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Immersive Top Control Bar */}
              <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-black/80 backdrop-blur-xl border-b border-white/5 z-50 shrink-0 shadow-2xl">
                  <div className="flex items-center gap-4">
                      <button 
                          onClick={() => setViewMode('grid')}
                          className="flex items-center gap-2 text-white/50 hover:text-white transition-all bg-white/5 px-4 py-2 rounded-full border border-white/5"
                      >
                          <X size={20} />
                          <span className="hidden md:inline text-[10px] font-black uppercase tracking-[0.2em]">Exit</span>
                      </button>
                      <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-6">
                           <span className="text-[10px] font-black text-news-gold tracking-widest uppercase">{safeFormat(selectedDate, 'dd MMM yyyy')}</span>
                           <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Page {activePage?.pageNumber} / {currentEditionPages.length}</span>
                      </div>
                  </div>

                  <div className="flex items-center gap-3 md:gap-6">
                      {/* HIGH-VISIBILITY CROP OPTION */}
                      <button 
                          onClick={() => setIsCropping(true)}
                          className="flex items-center gap-2.5 px-6 md:px-10 py-2 md:py-3 bg-news-gold text-black rounded-full transition-all hover:bg-white shadow-[0_0_20px_rgba(191,161,123,0.3)] active:scale-95"
                      >
                          <Scissors size={16} />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">CROP PAGE</span>
                      </button>
                      
                      <div className="w-px h-6 bg-white/10 hidden md:block"></div>
                      
                      <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2 py-1 border border-white/5">
                          <button onClick={() => setScale(s => Math.max(1, s - 0.5))} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"><ZoomOut size={18} /></button>
                          <span className="text-[10px] font-mono font-black text-news-gold w-12 text-center select-none">{Math.round(scale * 100)}%</span>
                          <button onClick={() => setScale(s => Math.min(4, s + 0.5))} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70"><ZoomIn size={18} /></button>
                      </div>
                  </div>
              </div>

              {/* Reader Stage - Auto-Move Hover Navigation */}
              <div 
                  ref={viewerRef}
                  onMouseMove={handleReaderMouseMove}
                  className={`flex-1 relative flex items-center justify-center overflow-hidden bg-[#0a0a0a] transition-all duration-300 ${scale > 1 ? 'cursor-none' : 'cursor-default'}`}
              >
                  {activePage ? (
                      <div 
                        ref={contentRef}
                        style={{ 
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: 'transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)',
                            transformOrigin: 'center',
                            display: 'inline-block',
                            position: 'relative',
                            maxWidth: '100%',
                            maxHeight: '100%'
                        }}
                      >
                          <EPaperViewer 
                            page={activePage} 
                            imageClassName="max-h-[85vh] h-auto w-auto max-w-full block shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/5 rounded-sm"
                            disableInteractivity={true}
                          />
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-6 opacity-40">
                          <Loader2 size={40} className="animate-spin text-news-gold" />
                          <p className="font-black uppercase tracking-[0.5em] text-[10px]">Buffering High-Res Scan...</p>
                      </div>
                  )}

                  {/* Navigation Handles - Auto-Locked when Zoomed */}
                  {scale === 1 && (
                    <>
                        <div className="absolute inset-y-0 left-0 flex items-center px-4">
                            <button 
                                onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))}
                                disabled={activePageIndex === 0}
                                className="p-5 text-white/20 hover:text-white transition-all disabled:opacity-0 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm border border-white/5"
                            >
                                <ChevronLeft size={32} />
                            </button>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4">
                            <button 
                                onClick={() => setActivePageIndex(prev => Math.min(currentEditionPages.length - 1, prev + 1))}
                                disabled={activePageIndex === currentEditionPages.length - 1}
                                className="p-5 text-white/20 hover:text-white transition-all disabled:opacity-0 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm border border-white/5"
                            >
                                <ChevronRight size={32} />
                            </button>
                        </div>
                    </>
                  )}
                  
                  {/* Visual Hover State Indicators */}
                  {scale > 1 && (
                      <div className="absolute inset-0 border-[20px] border-news-gold/5 pointer-events-none z-10 animate-pulse"></div>
                  )}

                  {/* Mobile Zoom Reset */}
                  {scale > 1 && (
                      <button 
                        onClick={() => { setScale(1); setPosition({x:0, y:0}); }} 
                        className="absolute bottom-8 right-8 p-5 bg-news-gold text-black rounded-full shadow-2xl transition-all hover:bg-white active:scale-90 z-20"
                        title="Zoom Out to Unlock Pages"
                      >
                        <RotateCcw size={24} />
                      </button>
                  )}
              </div>

              {/* Status Footer - Mobile optimized */}
              <div className="md:hidden px-4 py-3 bg-black border-t border-white/5 flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-500">
                  <span>Digital Archive Edition</span>
                  <span className="text-news-gold">Page {activePage?.pageNumber} OF {currentEditionPages.length}</span>
              </div>
          </div>
      )}

      {/* CLIPPING WORKSHOP OVERLAY */}
      {isCropping && (
        <div className="fixed inset-0 z-[110] bg-[#050505] flex flex-col animate-in fade-in zoom-in-95 duration-500">
            {/* Workshop Header */}
            <div className="px-4 md:px-6 py-3 md:py-5 bg-black/90 border-b border-white/5 flex items-center justify-between shrink-0 shadow-2xl">
                <div className="flex items-center gap-3">
                    <button onClick={() => { setIsCropping(false); setCropPreview(null); }} className="p-2 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all">
                        <X size={28} />
                    </button>
                    <div>
                        <h2 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-news-gold leading-none">Clipping Workshop</h2>
                        <p className="text-[8px] text-gray-600 uppercase tracking-widest font-bold hidden md:block mt-1.5">Adjust selection and verify preview</p>
                    </div>
                </div>
                
                <div className="flex gap-2 md:gap-4">
                    {cropPreview ? (
                        <div className="flex gap-2 md:gap-3">
                            <button onClick={handleShare} className="bg-white/5 text-white border border-white/10 px-5 py-2.5 rounded-full hover:bg-white/10 transition-all flex items-center gap-2">
                                <Share2 size={16} /> <span className="text-[9px] font-black uppercase tracking-[0.2em]">Share</span>
                            </button>
                            <button onClick={handleDownload} className="bg-news-gold text-black px-8 py-2.5 rounded-full hover:bg-white transition-all flex items-center gap-2 shadow-xl">
                                <Download size={16} /> <span className="text-[9px] font-black uppercase tracking-[0.2em]">Download</span>
                            </button>
                            <button onClick={() => setCropPreview(null)} className="p-2.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-gray-400 transition-all"><RefreshCcw size={18} /></button>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <div className="hidden md:flex items-center gap-3 bg-white/5 rounded-full px-3 py-1.5 border border-white/10 mr-2">
                                <button onClick={() => cropperRef.current?.zoom(-0.2)} className="p-1.5 hover:bg-white/10 text-white rounded-full"><ZoomOut size={18} /></button>
                                <span className="text-[10px] font-mono font-black text-news-gold w-12 text-center">{Math.round(workshopScale * 100)}%</span>
                                <button onClick={() => cropperRef.current?.zoom(0.2)} className="p-1.5 hover:bg-white/10 text-white rounded-full"><ZoomIn size={18} /></button>
                            </div>
                            <button 
                                onClick={generateBrandedClip}
                                disabled={isProcessing}
                                className="bg-news-gold text-black px-8 md:px-12 py-3 md:py-3.5 rounded-full flex items-center gap-2.5 hover:bg-white transition-all shadow-xl disabled:opacity-50 active:scale-95"
                            >
                                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} 
                                <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">{isProcessing ? 'Processing' : 'Confirm Clipping'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div 
                onMouseMove={handleWorkshopMouseMove}
                className={`flex-1 overflow-hidden relative flex flex-col ${cropPreview ? 'md:flex-row' : 'flex-col'} bg-[#0a0a0a]`}
            >
                {/* Image Section - Auto-Move Hover Navigation when zoomed */}
                <div className={`relative flex flex-col items-center justify-center transition-all duration-700 ${cropPreview ? 'w-full md:w-1/2 border-r border-white/5 h-1/2 md:h-full p-4 grayscale brightness-50' : 'w-full h-full p-2 md:p-8'}`}>
                    {workshopScale > 1 && !cropPreview && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-news-gold text-black px-6 py-2 rounded-full font-black uppercase text-[9px] tracking-[0.3em] shadow-2xl animate-bounce">
                           <MousePointer2 size={14} /> Hover Mode Active
                        </div>
                    )}
                    <div className={`w-full h-full flex items-center justify-center ${cropPreview ? 'opacity-30 pointer-events-none scale-[0.85]' : ''} transition-all duration-700`}>
                        <img 
                            ref={cropperImgRef}
                            src={activePage?.imageUrl} 
                            className={`max-w-full max-h-full block ${cropPreview ? '' : 'invisible'}`} 
                            crossOrigin="anonymous"
                            alt="Archive scan workspace"
                        />
                    </div>
                </div>

                {/* Clipping Result Preview */}
                {cropPreview && (
                    <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col items-center justify-center p-6 md:p-16 bg-black animate-in slide-in-from-right duration-700 relative overflow-y-auto">
                        <div className="absolute top-6 right-8 text-[9px] font-black uppercase tracking-[0.4em] text-news-gold animate-pulse">Final Archival Output</div>
                        <div className="max-w-full md:max-w-4xl shadow-[0_0_120px_rgba(191,161,123,0.15)] border border-white/5 rounded-sm overflow-hidden bg-white animate-in zoom-in-95 duration-700 mb-8">
                             <img src={cropPreview} className="max-h-[50vh] md:max-h-[70vh] w-auto block" alt="Branded Archival Result" />
                        </div>
                        <div className="text-center space-y-2 opacity-50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white">Quality Verified</p>
                            <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Branding and Watermark Auto-Applied</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

export default EPaperReader;
