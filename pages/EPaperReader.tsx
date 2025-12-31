
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EPaperPage, EPaperRegion, Article, WatermarkSettings } from '../types';
import EPaperViewer from '../components/EPaperViewer';
import Cropper from 'cropperjs';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  X, Grid, ArrowLeft, Loader2, Scissors, Download, Check, LayoutGrid, Eye, Search, Share2, RotateCcw, RefreshCcw, Maximize, MousePointer2, MoveHorizontal, Hand, Image as ImageIcon, Upload, Save
} from 'lucide-react';
import { format, isValid } from 'date-fns';
import { APP_NAME } from '../constants';
import { generateId } from '../utils';
import { supabase } from '../supabaseClient';

interface EPaperReaderProps {
  pages: EPaperPage[];
  articles?: Article[];
  onNavigate: (path: string) => void;
  watermarkSettings: WatermarkSettings;
  onSaveSettings?: (settings: WatermarkSettings) => void;
}

const EPaperReader: React.FC<EPaperReaderProps> = ({ pages, onNavigate, watermarkSettings, onSaveSettings }) => {
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
  const [hSliderVal, setHSliderVal] = useState(0.5);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const isOverSlider = useRef(false);
  const isTouchInteraction = useRef(false);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const touchStartRef = useRef<{ 
    x: number; 
    y: number; 
    originX: number; 
    originY: number; 
    dist: number; 
    initialScale: number; 
  } | null>(null);

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
        setHSliderVal(0.5);
        setIsCropping(false);
        setCropPreview(null);
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [viewMode, activePageIndex]);

  // DESKTOP: MANUAL DRAG-TO-PAN
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1 && !isCropping && !isOverSlider.current) {
        isDragging.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || scale <= 1) return;
    const deltaX = e.clientX - lastMousePos.current.x;
    const deltaY = e.clientY - lastMousePos.current.y;
    setPosition(prev => {
        const newX = prev.x + deltaX;
        const newY = prev.y + deltaY;
        if (viewerRef.current) {
            const rect = viewerRef.current.getBoundingClientRect();
            const moveRangeX = rect.width * (scale - 1);
            if (moveRangeX > 0) {
                const pctX = 0.5 - (newX / moveRangeX);
                setHSliderVal(Math.max(0, Math.min(1, pctX)));
            }
        }
        return { x: newX, y: newY };
    });
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => { isDragging.current = false; };

  // TOUCH INTERACTION
  const handleTouchStart = (e: React.TouchEvent) => {
      isTouchInteraction.current = true;
      if (e.touches.length === 1 && scale > 1) {
          touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, originX: position.x, originY: position.y, dist: 0, initialScale: scale };
      } else if (e.touches.length === 2) {
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          touchStartRef.current = { x: 0, y: 0, originX: position.x, originY: position.y, dist: dist, initialScale: scale };
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      if (e.touches.length === 2) {
          e.preventDefault();
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          const ratio = dist / touchStartRef.current.dist;
          const newScale = Math.min(4, Math.max(1, touchStartRef.current.initialScale * ratio));
          setScale(newScale);
          return;
      }
      if (e.touches.length === 1 && scale > 1) {
           if (e.cancelable) e.preventDefault(); 
           const deltaX = e.touches[0].clientX - touchStartRef.current.x;
           const deltaY = e.touches[0].clientY - touchStartRef.current.y;
           const newX = touchStartRef.current.originX + deltaX;
           const newY = touchStartRef.current.originY + deltaY;
           setPosition({ x: newX, y: newY });
      }
  };

  const handleTouchEnd = () => {
      touchStartRef.current = null;
      setTimeout(() => { isTouchInteraction.current = false; }, 500);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setHSliderVal(val);
    if (viewerRef.current) {
        const rect = viewerRef.current.getBoundingClientRect();
        const moveRangeX = rect.width * (scale - 1);
        const targetX = (0.5 - val) * moveRangeX;
        setPosition(prev => ({ ...prev, x: targetX }));
    }
  };

  useEffect(() => {
    if (isCropping && cropperImgRef.current && !cropPreview) {
        if (cropperRef.current) cropperRef.current.destroy();
        const cropper = new Cropper(cropperImgRef.current, {
            dragMode: 'move', autoCropArea: 0.8, restore: false, guides: true, center: true, highlight: false, cropBoxMovable: true, cropBoxResizable: true, zoomable: true, background: false, responsive: true,
            ready() { setWorkshopScale(1); },
            zoom(e) { setWorkshopScale(e.detail.ratio); }
        } as any);
        cropperRef.current = cropper;
    }
    return () => { if (cropperRef.current) { cropperRef.current.destroy(); cropperRef.current = null; } };
  }, [isCropping, cropPreview]);

  const generateBrandedClip = async () => {
    if (!cropperRef.current) return;
    setIsProcessing(true);
    const croppedCanvas = (cropperRef.current as any).getCroppedCanvas();
    if (!croppedCanvas) { setIsProcessing(false); return; }
    
    const finalCanvas = document.createElement('canvas');
    const ctx = finalCanvas.getContext('2d');
    if (!ctx) return;
    
    const clipWidth = croppedCanvas.width;
    const clipHeight = croppedCanvas.height;

    const isNarrow = clipWidth < 450;
    const baseFooterHeight = Math.max(50, Math.min(clipHeight * 0.12, 120));
    const footerHeight = isNarrow ? baseFooterHeight * 1.8 : baseFooterHeight;
    
    finalCanvas.width = clipWidth;
    finalCanvas.height = clipHeight + footerHeight;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    ctx.drawImage(croppedCanvas, 0, 0);
    
    ctx.fillStyle = watermarkSettings.backgroundColor;
    ctx.fillRect(0, clipHeight, finalCanvas.width, footerHeight);
    
    const padding = Math.max(10, clipWidth * 0.05);
    const dateStr = safeFormat(activePage?.date, 'MMMM do, yyyy');
    
    // CRITICAL FIX: Use watermarkSettings prop directly to ensure global sync reflects in the clip
    const brandLabel = (watermarkSettings.text || APP_NAME).toUpperCase();
    
    let logoImg: HTMLImageElement | null = null;
    if (watermarkSettings.logoUrl) {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = watermarkSettings.logoUrl;
            await new Promise((res) => { img.onload = res; img.onerror = res; });
            logoImg = img;
        } catch (e) { console.error("Logo load failed", e); }
    }

    const getFittingFontSize = (text: string, initialSize: number, maxWidth: number, fontFace: string) => {
        let size = initialSize;
        ctx.font = `${size}px ${fontFace}`;
        while (ctx.measureText(text).width > maxWidth && size > 8) {
            size -= 0.5;
            ctx.font = `${size}px ${fontFace}`;
        }
        return size;
    };

    if (isNarrow) {
        const line1Y = clipHeight + (footerHeight * 0.35);
        const line2Y = clipHeight + (footerHeight * 0.75);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        let currentX = padding;
        
        if (logoImg) {
            const logoH = footerHeight * 0.35;
            let logoW = (logoImg.width / logoImg.height) * logoH;
            if (logoW > clipWidth * 0.3) {
                logoW = clipWidth * 0.3;
                const newLogoH = (logoImg.height / logoImg.width) * logoW;
                ctx.drawImage(logoImg, currentX, line1Y - (newLogoH / 2), logoW, newLogoH);
            } else {
                ctx.drawImage(logoImg, currentX, line1Y - (logoH / 2), logoW, logoH);
            }
            currentX += logoW + (padding * 0.5);
        }
        
        const maxBrandWidth = clipWidth - currentX - padding;
        const brandFontSize = getFittingFontSize(brandLabel, footerHeight * 0.25, maxBrandWidth, '"Merriweather", serif');
        ctx.font = `bold ${brandFontSize}px "Merriweather", serif`;
        ctx.fillStyle = watermarkSettings.textColor;
        ctx.fillText(brandLabel, currentX, line1Y);
        
        const fullDateStr = `Archive Edition: ${dateStr}`;
        const maxDateWidth = clipWidth - (padding * 2);
        const dateFontSize = getFittingFontSize(fullDateStr, footerHeight * 0.18, maxDateWidth, '"Inter", sans-serif');
        ctx.font = `500 ${dateFontSize}px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(fullDateStr, padding, line2Y);
        
    } else {
        const textY = clipHeight + (footerHeight / 2);
        ctx.textBaseline = 'middle';
        let currentX = padding;
        
        if (logoImg) {
            const logoH = footerHeight * 0.6;
            const logoW = (logoImg.width / logoImg.height) * logoH;
            ctx.drawImage(logoImg, currentX, clipHeight + (footerHeight - logoH) / 2, logoW, logoH);
            currentX += logoW + (padding * 0.5);
        }
        
        const fullDateStr = `Archive Edition: ${dateStr}`;
        const baseFontSize = footerHeight * 0.35;
        const totalAvailableWidth = clipWidth - currentX - (padding * 2);
        
        ctx.font = `bold ${baseFontSize}px "Merriweather", serif`;
        const brandW = ctx.measureText(brandLabel).width;
        ctx.font = `500 ${baseFontSize * 0.6}px "Inter", sans-serif`;
        const dateW = ctx.measureText(fullDateStr).width;
        
        let fontSize = baseFontSize;
        if ((brandW + dateW + padding) > totalAvailableWidth) {
            const scale = totalAvailableWidth / (brandW + dateW + padding);
            fontSize = Math.max(10, baseFontSize * scale);
        }

        ctx.font = `bold ${fontSize}px "Merriweather", serif`;
        ctx.fillStyle = watermarkSettings.textColor;
        ctx.textAlign = 'left';
        ctx.fillText(brandLabel, currentX, textY);
        
        ctx.font = `500 ${fontSize * 0.6}px "Inter", sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'right';
        ctx.fillText(fullDateStr, clipWidth - padding, textY);
    }
    
    setCropPreview(finalCanvas.toDataURL('image/jpeg', 0.95));
    setIsProcessing(false);
  };

  const handleDownload = () => {
    if (!cropPreview) return;
    const link = document.createElement('a');
    link.href = cropPreview;
    link.download = `ChaanvikaJyothi_${activePage?.date}.jpg`;
    link.click();
  };

  const handleShare = async () => {
      if (!cropPreview || !navigator.share) return;
      try {
          const blob = await (await fetch(cropPreview)).blob();
          const file = new File([blob], `Clip_${activePage?.date}.jpg`, { type: 'image/jpeg' });
          await navigator.share({ files: [file], title: 'Paper Clipping', text: `Extracted from Chaanvika Jyothi` });
      } catch (err) { console.error('Share failed', err); }
  };

  return (
    <div className="flex flex-col bg-news-paper font-sans h-[100dvh]">
      {viewMode === 'grid' && (
        <div className="flex items-center justify-between px-4 md:px-8 py-3 bg-white border-b border-gray-100 z-10 sticky top-0 shadow-sm shrink-0">
           <div className="flex items-center gap-4">
              <button onClick={() => onNavigate('/')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-news-black transition-all">
                  <ArrowLeft size={18} />
              </button>
              <div className="flex items-center bg-gray-50 rounded-full px-1 border border-gray-200">
                  <button disabled={selectedDate === uniqueDates[uniqueDates.length - 1]} onClick={() => setSelectedDate(uniqueDates[uniqueDates.indexOf(selectedDate) + 1])} className="p-1.5 hover:bg-white rounded-full disabled:opacity-20"><ChevronLeft size={16} /></button>
                  <div className="px-3 text-[9px] font-black tracking-[0.2em] font-mono text-news-black uppercase">{safeFormat(selectedDate, 'dd MMM yyyy')}</div>
                  <button disabled={selectedDate === uniqueDates[0]} onClick={() => setSelectedDate(uniqueDates[uniqueDates.indexOf(selectedDate) - 1])} className="p-1.5 hover:bg-white rounded-full disabled:opacity-20"><ChevronRight size={16} /></button>
              </div>
           </div>
           <div className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 hidden md:block">Archive Explorer</div>
        </div>
      )}

      {viewMode === 'grid' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 animate-in fade-in duration-500">
              <div className="max-w-7xl mx-auto space-y-10">
                  <div className="border-b border-gray-200 pb-6">
                      <h1 className="text-3xl md:text-5xl font-serif font-black text-gray-900 mb-2">Chaanvika Jyothi</h1>
                      <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                        <Calendar size={12} className="text-news-gold"/> Edition: {safeFormat(selectedDate, 'MMMM do, yyyy')}
                      </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10 pb-20">
                      {currentEditionPages.map((page, idx) => (
                          <div key={page.id} onClick={() => { setActivePageIndex(idx); setViewMode('reader'); }} className="group cursor-pointer space-y-4">
                              <div className="relative aspect-[1/1.4] overflow-hidden rounded-xl border border-gray-200 shadow-sm transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-2xl bg-white">
                                  <img src={page.imageUrl} className="w-full h-full object-cover object-top transition-all duration-700" alt={`P${page.pageNumber}`} />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                      <div className="bg-news-black text-white p-4 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-2xl">
                                          <Maximize size={24} />
                                      </div>
                                  </div>
                                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm border border-gray-100 text-[10px] font-black px-2 py-1 rounded shadow-sm text-gray-600">
                                      P. {page.pageNumber}
                                  </div>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] font-black tracking-[0.3em] text-gray-400 group-hover:text-news-accent transition-colors uppercase">Page {page.pageNumber}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {viewMode === 'reader' && (
          <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col animate-in fade-in duration-300">
              <div className="flex items-center justify-between px-4 md:px-8 py-2 bg-black/90 backdrop-blur-xl border-b border-white/5 z-50 shrink-0 shadow-2xl safe-area-top">
                  <div className="flex items-center gap-4">
                      <button onClick={() => setViewMode('grid')} className="flex items-center gap-2 text-white/50 hover:text-white transition-all bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                          <X size={16} />
                          <span className="hidden md:inline text-[9px] font-black uppercase tracking-[0.2em]">Exit</span>
                      </button>
                      <div className="hidden md:flex items-center gap-3 border-l border-white/10 pl-5">
                           <span className="text-[9px] font-black text-news-gold tracking-widest uppercase">{safeFormat(selectedDate, 'dd MMM yyyy')}</span>
                           <span className="text-gray-500 text-[9px] font-bold uppercase tracking-widest">Page {activePage?.pageNumber} / {currentEditionPages.length}</span>
                      </div>
                  </div>
                  <div className="flex items-center gap-4 md:gap-6">
                      <button onClick={() => setIsCropping(true)} className="flex items-center gap-2 px-4 md:px-8 py-1.5 md:py-2 bg-news-gold text-black rounded-full transition-all hover:bg-white shadow-lg active:scale-95">
                          <Scissors size={14} />
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">CROP</span>
                      </button>
                      <div className="flex items-center gap-1 bg-white/5 rounded-full px-1.5 py-0.5 border border-white/5">
                          <button onClick={() => setScale(s => Math.max(1, s - 0.5))} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/60"><ZoomOut size={16} /></button>
                          <span className="text-[9px] font-mono font-black text-news-gold w-8 md:w-10 text-center select-none">{Math.round(scale * 100)}%</span>
                          <button onClick={() => setScale(s => Math.min(4, s + 0.5))} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/60"><ZoomIn size={16} /></button>
                      </div>
                  </div>
              </div>
              <div 
                  ref={viewerRef}
                  onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
                  className={`flex-1 relative flex items-center justify-center overflow-hidden bg-[#050505] transition-all duration-300 min-h-0 ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
              >
                  {activePage ? (
                      <div ref={contentRef} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transition: (isTouchInteraction.current || isDragging.current) ? 'none' : 'transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1)', transformOrigin: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          <EPaperViewer page={activePage} imageClassName="max-w-[98vw] max-h-[85dvh] md:max-h-[90vh] w-auto h-auto block shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/5 rounded-sm object-contain" disableInteractivity={true} />
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-4 opacity-30">
                          <Loader2 size={32} className="animate-spin text-news-gold" />
                          <p className="font-black uppercase tracking-[0.5em] text-[9px]">Initializing Archive Scan...</p>
                      </div>
                  )}
                  {scale > 1 && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85vw] md:w-[480px] px-6 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full z-[60] flex items-center gap-4 shadow-2xl animate-in slide-in-from-bottom-4 safe-area-bottom" onMouseEnter={() => { isOverSlider.current = true; }} onMouseLeave={() => { isOverSlider.current = false; }} onTouchStart={(e) => e.stopPropagation()} >
                          <div className="text-news-gold opacity-50"><MoveHorizontal size={14} /></div>
                          <input type="range" min="0" max="1" step="0.001" value={hSliderVal} onChange={handleSliderChange} className="flex-1 accent-news-gold h-1 bg-white/10 rounded-full appearance-none cursor-pointer" />
                          <div className="hidden md:flex items-center gap-2 text-[8px] font-black text-news-gold uppercase tracking-[0.2em] bg-white/5 px-2 py-1 rounded">NAVIGATOR</div>
                      </div>
                  )}
                  {scale === 1 && (
                    <>
                        <div className="absolute inset-y-0 left-0 flex items-center px-2 md:px-4 z-20">
                            <button onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))} disabled={activePageIndex === 0} className="p-3 md:p-4 text-white/20 hover:text-white transition-all disabled:opacity-0 bg-white/5 hover:bg-white/10 rounded-full border border-white/5"><ChevronLeft size={24} /></button>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 md:px-4 z-20">
                            <button onClick={() => setActivePageIndex(prev => Math.min(currentEditionPages.length - 1, prev + 1))} disabled={activePageIndex === currentEditionPages.length - 1} className="p-3 md:p-4 text-white/20 hover:text-white transition-all disabled:opacity-0 bg-white/5 hover:bg-white/10 rounded-full border border-white/5"><ChevronRight size={24} /></button>
                        </div>
                    </>
                  )}
                  {scale > 1 && <div className="absolute inset-0 border-[4px] md:border-[10px] border-news-gold/5 pointer-events-none z-10"></div>}
                  {scale > 1 && <button onClick={() => { setScale(1); setPosition({x:0, y:0}); setHSliderVal(0.5); }} className="absolute bottom-6 right-6 p-3 md:p-4 bg-news-gold text-black rounded-full shadow-2xl transition-all hover:bg-white active:scale-90 z-20 safe-area-bottom"><RotateCcw size={20} /></button>}
              </div>
          </div>
      )}

      {isCropping && (
        <div className="fixed inset-0 z-[110] bg-[#050505] flex flex-col animate-in fade-in zoom-in-95 duration-400">
            <div className="px-4 md:px-6 py-2 md:py-3 bg-black/95 border-b border-white/5 flex items-center justify-between shrink-0 shadow-2xl safe-area-top">
                <div className="flex items-center gap-3">
                    <button onClick={() => { setIsCropping(false); setCropPreview(null); }} className="p-1.5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all"><X size={24} /></button>
                    <div>
                        <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-news-gold leading-none">Workshop</h2>
                        <p className="text-[7px] text-gray-600 uppercase tracking-widest font-bold hidden md:block mt-1">Refining Extraction</p>
                    </div>
                </div>
                <div className="flex gap-2 md:gap-4">
                    {cropPreview ? (
                        <div className="flex gap-2 md:gap-3">
                            <button onClick={handleShare} className="bg-white/5 text-white border border-white/10 px-4 py-2 rounded-full hover:bg-white/10 transition-all flex items-center gap-2"><Share2 size={14} /> <span className="text-[9px] font-black uppercase tracking-[0.2em] hidden md:inline">Share</span></button>
                            <button onClick={handleDownload} className="bg-news-gold text-black px-6 py-2 rounded-full hover:bg-white transition-all flex items-center gap-2 shadow-xl"><Download size={14} /> <span className="text-[9px] font-black uppercase tracking-[0.2em] hidden md:inline">Save</span></button>
                            <button onClick={() => setCropPreview(null)} className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 text-gray-400 transition-all"><RefreshCcw size={16} /></button>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <div className="hidden md:flex items-center gap-3 bg-white/5 rounded-full px-3 py-1 border border-white/10 mr-2">
                                <button onClick={() => cropperRef.current?.zoom(-0.2)} className="p-1.5 hover:bg-white/10 text-white rounded-full"><ZoomOut size={16} /></button>
                                <span className="text-[9px] font-mono font-black text-news-gold w-10 text-center">{Math.round(workshopScale * 100)}%</span>
                                <button onClick={() => cropperRef.current?.zoom(0.2)} className="p-1.5 hover:bg-white/10 text-white rounded-full"><ZoomIn size={16} /></button>
                            </div>
                            <button onClick={generateBrandedClip} disabled={isProcessing} className="bg-news-gold text-black px-4 md:px-10 py-2.5 rounded-full flex items-center gap-2 hover:bg-white transition-all shadow-xl disabled:opacity-50 active:scale-95">
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{isProcessing ? 'Busy' : 'Apply Crop'}</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <div className={`flex-1 overflow-hidden relative flex flex-col ${cropPreview ? 'md:flex-row' : 'flex-col'} bg-[#0a0a0a]`}>
                <div className={`relative flex flex-col items-center justify-center transition-all duration-700 ${cropPreview ? 'w-full md:w-1/2 border-r border-white/5 h-1/2 md:h-full p-4 grayscale brightness-50' : 'w-full h-full p-2 md:p-8'}`}>
                    {workshopScale > 1 && !cropPreview && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-news-gold text-black px-5 py-1.5 rounded-full font-black uppercase text-[8px] tracking-[0.3em] shadow-2xl animate-bounce pointer-events-none"><Hand size={12} /> Pan Mode Active</div>}
                    <div className={`w-full h-full flex items-center justify-center ${cropPreview ? 'opacity-30 pointer-events-none scale-[0.85]' : ''} transition-all duration-700`}>
                        <img ref={cropperImgRef} src={activePage?.imageUrl} className={`max-w-full max-h-full block ${cropPreview ? '' : 'invisible'}`} crossOrigin="anonymous" alt="Archive workspace" />
                    </div>
                </div>
                {cropPreview && (
                    <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col items-center justify-center p-6 md:p-12 bg-black animate-in slide-in-from-right duration-700 relative overflow-y-auto">
                        <div className="absolute top-4 right-6 text-[8px] font-black uppercase tracking-[0.4em] text-news-gold">Digital Output</div>
                        <div className="max-w-full md:max-w-4xl shadow-[0_0_80px_rgba(191,161,123,0.15)] border border-white/5 rounded-sm overflow-hidden bg-white animate-in zoom-in-95 duration-700 mb-6">
                             <img src={cropPreview} className="max-h-[50vh] md:max-h-[65vh] w-auto block" alt="Branded Archival Result" />
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
