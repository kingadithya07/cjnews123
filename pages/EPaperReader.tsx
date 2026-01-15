
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EPaperPage, EPaperRegion, Article, WatermarkSettings, Advertisement } from '../types';
import EPaperViewer from '../components/EPaperViewer';
import Cropper from 'cropperjs';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  X, Grid, ArrowLeft, Loader2, Scissors, Download, Check, LayoutGrid, Eye, Search, Share2, RotateCcw, RefreshCcw, Maximize, MousePointer2, MoveHorizontal, Hand, Image as ImageIcon, Upload, Save, Newspaper
} from 'lucide-react';
import { format, isValid, getDaysInMonth, startOfMonth, addMonths, subMonths, isSameDay } from 'date-fns';
import { APP_NAME } from '../constants';
import { generateId } from '../utils';
import { supabase } from '../supabaseClient';
import AdvertisementBanner from '../components/Advertisement';

interface EPaperReaderProps {
  pages: EPaperPage[];
  articles?: Article[];
  onNavigate: (path: string) => void;
  watermarkSettings: WatermarkSettings;
  onSaveSettings?: (settings: WatermarkSettings) => void;
  advertisements?: Advertisement[]; 
  globalAdsEnabled?: boolean;
}

const EPaperReader: React.FC<EPaperReaderProps> = ({ pages, onNavigate, watermarkSettings, onSaveSettings, advertisements = [], globalAdsEnabled = true }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'reader'>('grid');
  const [showCalendar, setShowCalendar] = useState(false);
  
  const uniqueDates = useMemo(() => {
    const dates = Array.from(new Set(pages.map(p => p.date).filter(Boolean)));
    return dates.sort().reverse(); 
  }, [pages]);

  const [selectedDate, setSelectedDate] = useState(uniqueDates[0] || new Date().toISOString().split('T')[0]);
  
  // Calendar Navigation State
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    if (uniqueDates.length > 0 && (!selectedDate || !uniqueDates.includes(selectedDate))) {
      setSelectedDate(uniqueDates[0]);
    }
    setCalendarMonth(new Date(selectedDate));
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

  // --- Calendar Helpers ---
  const generateCalendarDays = (monthDate: Date) => {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = getDaysInMonth(monthDate);
      const startDay = startOfMonth(monthDate).getDay(); // 0 is Sunday
      
      const days = [];
      // Fill empty slots before start of month
      for (let i = 0; i < startDay; i++) {
          days.push(null);
      }
      // Fill days
      for (let i = 1; i <= daysInMonth; i++) {
          days.push(new Date(year, month, i));
      }
      return days;
  };

  const hasEdition = (date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return uniqueDates.includes(dateStr);
  };

  const handleDateSelect = (date: Date) => {
      if (hasEdition(date)) {
          setSelectedDate(format(date, 'yyyy-MM-dd'));
          setShowCalendar(false);
          setViewMode('grid');
      }
  };

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

  const [isCropping, setIsCropping] = useState(false);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [workshopScale, setWorkshopScale] = useState(1);
  const cropperRef = useRef<Cropper | null>(null);
  const cropperImgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const isSharing = useRef(false);

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

  const handleTouchStart = (e: React.TouchEvent) => {
      isTouchInteraction.current = true;
      if (e.touches.length === 1) {
          // Track single touch start for both Panning (if scale > 1) AND Swiping (if scale == 1)
          touchStartRef.current = { 
              x: e.touches[0].clientX, 
              y: e.touches[0].clientY, 
              originX: position.x, 
              originY: position.y, 
              dist: 0, 
              initialScale: scale 
          };
      } else if (e.touches.length === 2) {
          // Pinch Zoom
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          touchStartRef.current = { x: 0, y: 0, originX: position.x, originY: position.y, dist: dist, initialScale: scale };
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      
      // Pinch Zoom Logic
      if (e.touches.length === 2) {
          e.preventDefault();
          const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
          const ratio = dist / touchStartRef.current.dist;
          const newScale = Math.min(4, Math.max(1, touchStartRef.current.initialScale * ratio));
          setScale(newScale);
          return;
      }

      // Pan Logic (Only if zoomed in)
      if (e.touches.length === 1 && scale > 1) {
           if (e.cancelable) e.preventDefault(); 
           const deltaX = e.touches[0].clientX - touchStartRef.current.x;
           const deltaY = e.touches[0].clientY - touchStartRef.current.y;
           const newX = touchStartRef.current.originX + deltaX;
           const newY = touchStartRef.current.originY + deltaY;
           setPosition({ x: newX, y: newY });
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      // Swipe Navigation Logic (Only if NOT zoomed)
      if (touchStartRef.current && scale === 1) {
          const endX = e.changedTouches[0].clientX;
          const diff = endX - touchStartRef.current.x;
          
          // Threshold for swipe (e.g., 50px)
          if (Math.abs(diff) > 50) {
              if (diff > 0) {
                  // Swipe Right -> Prev Page
                  setActivePageIndex(prev => Math.max(0, prev - 1));
              } else {
                  // Swipe Left -> Next Page
                  setActivePageIndex(prev => Math.min(currentEditionPages.length - 1, prev + 1));
              }
          }
      }

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

  // Handler for page navigation slider in Reader View
  const handlePageSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const idx = parseInt(e.target.value);
      if (idx >= 0 && idx < currentEditionPages.length) {
          setActivePageIndex(idx);
      }
  };

  useEffect(() => {
    if (isCropping && cropperImgRef.current && !cropPreview) {
        if (cropperRef.current) cropperRef.current.destroy();
        
        // Defer Cropper initialization to prevent UI freeze during modal open animation
        const timer = setTimeout(() => {
            const cropper = new Cropper(cropperImgRef.current!, {
                // Optimized Configuration for "Light Weight" & "Smooth" feel
                viewMode: 1, // Restrict crop box to canvas size
                dragMode: 'move', // Allow moving image by default
                autoCropArea: 0.6, // Start with a slightly smaller focused box
                restore: false,
                guides: false, // Cleaner look
                center: false, // Cleaner look
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                zoomable: true,
                zoomOnWheel: false, // Prevent accidental scroll zooming on desktop
                toggleDragModeOnDblclick: false, // Consistent interaction
                background: false,
                responsive: true,
                minContainerWidth: 300,
                minContainerHeight: 300,
                ready() { 
                    setWorkshopScale(1); 
                },
                zoom(e) { setWorkshopScale(e.detail.ratio); }
            } as any);
            cropperRef.current = cropper;
        }, 150); // 150ms delay for smoother modal transition

        return () => clearTimeout(timer);
    }
    return () => { if (cropperRef.current) { cropperRef.current.destroy(); cropperRef.current = null; } };
  }, [isCropping, cropPreview]);

  const generateBrandedClip = async () => {
    if (!cropperRef.current) return;
    setIsProcessing(true);
    
    // Defer heavy processing to next tick to allow UI to show 'Busy' state
    setTimeout(async () => {
        if (!cropperRef.current) return;

        // Optimization: Reduced scale factor from 3 to 1.5 for faster generation
        // 1.5x provides good quality for mobile/social sharing without huge memory overhead
        const scaleFactor = 1.5; 
        
        const cropData = cropperRef.current.getData();

        const croppedCanvas = (cropperRef.current as any).getCroppedCanvas({
            width: Math.round(cropData.width * scaleFactor),
            height: Math.round(cropData.height * scaleFactor),
            fillColor: '#fff',
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });

        if (!croppedCanvas) { setIsProcessing(false); return; }
        
        const finalCanvas = document.createElement('canvas');
        const ctx = finalCanvas.getContext('2d');
        if (!ctx) return;
        
        const clipWidth = croppedCanvas.width;
        const clipHeight = croppedCanvas.height;

        // Adjusted threshold for narrow column layout logic (scaled)
        const isNarrow = clipWidth < (450 * scaleFactor);
        
        // Scaled footer height calculation
        const baseFooterHeight = Math.max(50 * scaleFactor, Math.min(clipHeight * 0.12, 150 * scaleFactor));
        const footerHeight = isNarrow ? baseFooterHeight * 1.8 : baseFooterHeight;
        
        finalCanvas.width = clipWidth;
        finalCanvas.height = clipHeight + footerHeight;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        ctx.drawImage(croppedCanvas, 0, 0);
        
        ctx.fillStyle = watermarkSettings.backgroundColor || '#1a1a1a';
        ctx.fillRect(0, clipHeight, finalCanvas.width, footerHeight);
        
        const padding = Math.max(10 * scaleFactor, clipWidth * 0.05);
        const dateStr = safeFormat(activePage?.date, 'MMMM do, yyyy');
        
        const brandLabel = (watermarkSettings.text || APP_NAME).toUpperCase();
        const fontSizePercent = (watermarkSettings.fontSize || 30) / 100;
        
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
            const minSize = 8 * scaleFactor;
            ctx.font = `bold ${size}px ${fontFace}`;
            while (ctx.measureText(text).width > maxWidth && size > minSize) {
                size -= (0.5 * scaleFactor);
                ctx.font = `bold ${size}px ${fontFace}`;
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
            const initialSize = footerHeight * fontSizePercent;
            const brandFontSize = getFittingFontSize(brandLabel, initialSize, maxBrandWidth, '"Playfair Display", serif');
            ctx.font = `bold ${brandFontSize}px "Playfair Display", serif`;
            ctx.fillStyle = watermarkSettings.textColor || '#bfa17b';
            ctx.fillText(brandLabel, currentX, line1Y);
            
            const fullDateStr = `CJ NEWSHUB ARCHIVE: ${dateStr}`;
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
            
            const fullDateStr = `CJ NEWSHUB GLOBAL ARCHIVE: ${dateStr}`;
            const baseFontSize = footerHeight * fontSizePercent;
            const totalAvailableWidth = clipWidth - currentX - (padding * 2);
            
            ctx.font = `bold ${baseFontSize}px "Playfair Display", serif`;
            const brandW = ctx.measureText(brandLabel).width;
            ctx.font = `500 ${baseFontSize * 0.6}px "Inter", sans-serif`;
            const dateW = ctx.measureText(fullDateStr).width;
            
            let fontSize = baseFontSize;
            if ((brandW + dateW + padding) > totalAvailableWidth) {
                const scale = totalAvailableWidth / (brandW + dateW + padding);
                fontSize = Math.max(10 * scaleFactor, baseFontSize * scale);
            }

            ctx.font = `bold ${fontSize}px "Playfair Display", serif`;
            ctx.fillStyle = watermarkSettings.textColor || '#bfa17b';
            ctx.textAlign = 'left';
            ctx.fillText(brandLabel, currentX, textY);
            
            ctx.font = `500 ${fontSize * 0.6}px "Inter", sans-serif`;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.textAlign = 'right';
            ctx.fillText(fullDateStr, clipWidth - padding, textY);
        }
        
        // Output high quality JPEG at 0.80 quality (Optimized for size while keeping resolution)
        const finalDataUrl = finalCanvas.toDataURL('image/jpeg', 0.80);
        setCropPreview(finalDataUrl);
        setIsProcessing(false);
    }, 50); // 50ms delay allows spinner to render
  };

  const handleDownload = () => {
    if (!cropPreview) return;
    const link = document.createElement('a');
    link.href = cropPreview;
    link.download = `CJ_NEWSHUB_EXTRACT_${activePage?.date}.jpg`;
    link.click();
  };

  const handleShare = async () => {
      if (!cropPreview || !navigator.share) return;
      if (isSharing.current) return;
      
      isSharing.current = true;
      try {
          const blob = await (await fetch(cropPreview)).blob();
          const file = new File([blob], `CJNEWSHUB_CLIP_${activePage?.date}.jpg`, { type: 'image/jpeg' });
          
          const shareData = { files: [file], title: 'News Clipping', text: `Extracted from CJ NEWSHUB Global Edition` };
          
          // Helper for canShare check if available
          if (navigator.canShare && navigator.canShare(shareData)) {
             await navigator.share(shareData);
          } else {
             // Fallback to text share if files not supported or valid
             await navigator.share({ title: 'News Clipping', text: `Extracted from CJ NEWSHUB Global Edition` });
          }
      } catch (err: any) { 
          // Ignore abort errors (user cancellation)
          if (err.name !== 'AbortError') {
              console.error('Share failed', err); 
          }
      } finally {
          isSharing.current = false;
      }
  };

  return (
    <div className="flex flex-col bg-news-paper font-sans h-[100dvh]">
      <style>{`
        /* CUSTOM CROPPER STYLES FOR SMOOTH MOBILE UX */
        
        /* 1. Large, circular, touch-friendly handles (Points) */
        .cropper-point {
            width: 20px !important;
            height: 20px !important;
            background-color: #c5a059 !important; /* News Gold */
            border: 2px solid #fff !important;
            border-radius: 50% !important;
            opacity: 1 !important;
            z-index: 20 !important;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
        }

        /* 2. Adjust specific corner handle positions to be perfectly centered on corners */
        .cropper-point.point-ne { top: -10px !important; right: -10px !important; }
        .cropper-point.point-nw { top: -10px !important; left: -10px !important; }
        .cropper-point.point-se { bottom: -10px !important; right: -10px !important; }
        .cropper-point.point-sw { bottom: -10px !important; left: -10px !important; }
        
        /* Side handles - slightly smaller but still touchable */
        .cropper-point.point-n { top: -10px !important; margin-left: -10px !important; }
        .cropper-point.point-s { bottom: -10px !important; margin-left: -10px !important; }
        .cropper-point.point-e { right: -10px !important; margin-top: -10px !important; }
        .cropper-point.point-w { left: -10px !important; margin-top: -10px !important; }

        /* 3. Solid, high-contrast dashed lines */
        .cropper-line {
            background-color: transparent !important;
            border: 1px dashed #c5a059 !important;
            opacity: 0.8 !important;
        }
        
        /* 4. Instant-load dimming background (Modal) */
        .cropper-modal {
            background-color: #000 !important;
            opacity: 0.75 !important;
            transition: opacity 0.2s ease-in-out;
        }

        /* 5. Selection box (Face) - Transparent but interactive */
        .cropper-face {
            background-color: transparent !important;
            opacity: 0 !important;
        }
        
        /* 6. Outline borders */
        .cropper-view-box {
            outline: 1px solid #c5a059 !important;
            border-radius: 0 !important;
        }
        
        /* 7. Hide center indicator for cleaner look */
        .cropper-center {
            display: none !important;
        }
      `}</style>

      {viewMode === 'grid' && (
        <div className="flex items-center justify-between px-4 md:px-8 py-3 bg-white border-b border-gray-100 z-10 sticky top-0 shadow-sm shrink-0">
           <div className="flex items-center gap-4">
              <button onClick={() => onNavigate('/')} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-news-black transition-all">
                  <ArrowLeft size={18} />
              </button>
              <div className="relative">
                  <button 
                    onClick={() => setShowCalendar(!showCalendar)} 
                    className="flex items-center bg-gray-50 rounded-full px-1 border border-gray-200 hover:border-news-gold hover:bg-white transition-all group"
                  >
                      <div className="p-1.5 bg-white rounded-full group-hover:bg-news-gold group-hover:text-white transition-colors text-gray-400"><Calendar size={16} /></div>
                      <div className="px-3 text-[9px] font-black tracking-[0.2em] font-mono text-news-black uppercase">{safeFormat(selectedDate, 'dd MMM yyyy')}</div>
                  </button>

                  {/* CALENDAR POPUP */}
                  {showCalendar && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50 w-72 animate-in fade-in zoom-in-95">
                          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                              <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={16}/></button>
                              <span className="text-xs font-bold uppercase tracking-widest text-news-black">{format(calendarMonth, 'MMMM yyyy')}</span>
                              <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={16}/></button>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center mb-2">
                              {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <span key={d} className="text-[9px] font-bold text-gray-400">{d}</span>)}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                              {generateCalendarDays(calendarMonth).map((date, idx) => {
                                  if (!date) return <div key={`empty-${idx}`}></div>;
                                  const isAvailable = hasEdition(date);
                                  const isSelected = format(date, 'yyyy-MM-dd') === selectedDate;
                                  return (
                                      <button 
                                          key={date.toISOString()} 
                                          disabled={!isAvailable}
                                          onClick={() => handleDateSelect(date)}
                                          className={`
                                              h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-all
                                              ${isSelected ? 'bg-news-black text-white font-bold' : ''}
                                              ${!isSelected && isAvailable ? 'bg-news-gold/10 text-news-black hover:bg-news-gold hover:text-white font-bold cursor-pointer' : ''}
                                              ${!isSelected && !isAvailable ? 'text-gray-300 cursor-default' : ''}
                                          `}
                                      >
                                          {date.getDate()}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  )}
                  {showCalendar && <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)}></div>}
              </div>
           </div>
           <div className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 hidden md:block">CJ NEWSHUB ARCHIVE</div>
        </div>
      )}

      {viewMode === 'grid' && (
          <div className="flex-1 overflow-y-auto p-6 md:p-12 animate-in fade-in duration-500">
              
              <div className="max-w-7xl mx-auto space-y-10">
                  <div className="border-b border-gray-200 pb-6 flex flex-col md:flex-row justify-between items-end gap-4">
                      <div>
                        <h1 className="text-3xl md:text-5xl font-serif font-black text-gray-900 mb-2 uppercase tracking-tighter">CJ NEWSHUB</h1>
                        <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-3">
                            <Calendar size={12} className="text-news-gold"/> Edition: {safeFormat(selectedDate, 'MMMM do, yyyy')}
                        </p>
                      </div>
                      <div className="w-full md:w-auto">
                          {/* Banner Ad for E-Paper Section */}
                          <AdvertisementBanner 
                            ads={advertisements} 
                            size="LEADERBOARD" 
                            placement="EPAPER"
                            globalAdsEnabled={globalAdsEnabled}
                            className="!my-0"
                          />
                      </div>
                  </div>
                  
                  {/* MOBILE: 2-COLUMN GRID | DESKTOP: 4-COLUMN GRID */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 pb-10">
                      {currentEditionPages.map((page, idx) => (
                          <div key={page.id} onClick={() => { setActivePageIndex(idx); setViewMode('reader'); }} className="group cursor-pointer space-y-2 md:space-y-4">
                              <div className="relative aspect-[1/1.4] overflow-hidden rounded-lg md:rounded-xl border border-gray-200 shadow-sm transition-all duration-500 group-hover:scale-[1.03] group-hover:shadow-2xl bg-white">
                                  <img src={page.imageUrl} className="w-full h-full object-cover object-top transition-all duration-700" alt={`P${page.pageNumber}`} />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                      <div className="bg-news-black text-white p-3 md:p-4 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-2xl">
                                          <Maximize size={20} className="md:w-6 md:h-6" />
                                      </div>
                                  </div>
                                  <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-white/90 backdrop-blur-sm border border-gray-100 text-[8px] md:text-[10px] font-black px-1.5 py-0.5 md:px-2 md:py-1 rounded shadow-sm text-gray-600">
                                      P. {page.pageNumber}
                                  </div>
                              </div>
                              <div className="text-center">
                                <p className="text-[8px] md:text-[10px] font-black tracking-[0.3em] text-gray-400 group-hover:text-news-accent transition-colors uppercase">Page {page.pageNumber}</p>
                              </div>
                          </div>
                      ))}
                  </div>
                  {currentEditionPages.length === 0 && (
                      <div className="py-20 text-center text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-xl">
                          <Newspaper size={48} className="mx-auto mb-4 opacity-20" />
                          <p className="text-sm font-bold uppercase tracking-widest">No edition available for this date.</p>
                          <button onClick={() => setShowCalendar(true)} className="mt-4 text-news-accent font-bold text-xs uppercase underline">Browse Archive</button>
                      </div>
                  )}
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
                          <span className="text-[9px] font-black uppercase tracking-[0.2em]">EXTRACT CLIP</span>
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
                          <EPaperViewer 
                            page={activePage} 
                            imageClassName="max-w-[100vw] max-h-[calc(100dvh-80px)] w-auto h-auto block shadow-[0_0_50px_rgba(0,0,0,0.5)] object-contain" 
                            disableInteractivity={true} 
                          />
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-4 opacity-30">
                          <Loader2 size={32} className="animate-spin text-news-gold" />
                          <p className="font-black uppercase tracking-[0.5em] text-[9px]">Awaiting Archival Connection...</p>
                      </div>
                  )}
                  {scale > 1 && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85vw] md:w-[480px] px-6 py-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full z-[60] flex items-center gap-4 shadow-2xl animate-in slide-in-from-bottom-4 safe-area-bottom" onMouseEnter={() => { isOverSlider.current = true; }} onMouseLeave={() => { isOverSlider.current = false; }} onTouchStart={(e) => e.stopPropagation()} >
                          <div className="text-news-gold opacity-50"><MoveHorizontal size={14} /></div>
                          <input type="range" min="0" max="1" step="0.001" value={hSliderVal} onChange={handleSliderChange} className="flex-1 accent-news-gold h-1 bg-white/10 rounded-full appearance-none cursor-pointer" />
                          <div className="hidden md:flex items-center gap-2 text-[8px] font-black text-news-gold uppercase tracking-[0.2em] bg-white/5 px-2 py-1 rounded">HORIZON NAV</div>
                      </div>
                  )}
                  {/* Page Navigation Slider & Arrows */}
                  {scale === 1 && (
                    <>
                        <div className="absolute inset-y-0 left-0 flex items-center px-2 md:px-4 z-20">
                            <button onClick={() => setActivePageIndex(prev => Math.max(0, prev - 1))} disabled={activePageIndex === 0} className="p-3 md:p-4 text-white/20 hover:text-white transition-all disabled:opacity-0 bg-white/5 hover:bg-white/10 rounded-full border border-white/5"><ChevronLeft size={24} /></button>
                        </div>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 md:px-4 z-20">
                            <button onClick={() => setActivePageIndex(prev => Math.min(currentEditionPages.length - 1, prev + 1))} disabled={activePageIndex === currentEditionPages.length - 1} className="p-3 md:p-4 text-white/20 hover:text-white transition-all disabled:opacity-0 bg-white/5 hover:bg-white/10 rounded-full border border-white/5"><ChevronRight size={24} /></button>
                        </div>
                        
                        {/* Page Slider - Visible mostly on Mobile/Tablet */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90vw] md:w-[400px] bg-black/40 backdrop-blur-md rounded-full py-2 px-4 z-30 flex items-center gap-3 border border-white/10 safe-area-bottom">
                            <span className="text-[10px] font-bold text-white/60 w-8 text-right">{activePageIndex + 1}</span>
                            <input 
                                type="range" 
                                min="0" 
                                max={currentEditionPages.length - 1} 
                                value={activePageIndex} 
                                onChange={handlePageSliderChange}
                                className="flex-1 accent-news-gold h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-[10px] font-bold text-white/60 w-8">{currentEditionPages.length}</span>
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
            {!cropPreview && (
                <div className="px-4 md:px-6 py-2 md:py-3 bg-black/95 border-b border-white/5 flex items-center justify-between shrink-0 shadow-2xl safe-area-top">
                    {/* Left Side: Title */}
                    <div className="flex items-center gap-3">
                        {/* Mobile Close Button (Left) */}
                        <button onClick={() => { setIsCropping(false); setCropPreview(null); }} className="md:hidden p-1.5 hover:bg-white/10 rounded-full text-white transition-all"><X size={24} /></button>
                        
                        <div>
                            <h2 className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.3em] text-news-gold leading-none">Workshop</h2>
                            <p className="text-[7px] text-gray-600 uppercase tracking-widest font-bold hidden md:block mt-1">CJ NEWSHUB Digital Lab</p>
                        </div>
                    </div>

                    {/* Right Side: Controls + Desktop Close */}
                    <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex gap-3">
                            <div className="hidden md:flex items-center gap-3 bg-white/5 rounded-full px-3 py-1 border border-white/10 mr-2">
                                <button onClick={() => cropperRef.current?.zoom(-0.2)} className="p-1.5 hover:bg-white/10 text-white rounded-full"><ZoomOut size={16} /></button>
                                <span className="text-[9px] font-mono font-black text-news-gold w-10 text-center">{Math.round(workshopScale * 100)}%</span>
                                <button onClick={() => cropperRef.current?.zoom(0.2)} className="p-1.5 hover:bg-white/10 text-white rounded-full"><ZoomIn size={16} /></button>
                            </div>
                            <button onClick={generateBrandedClip} disabled={isProcessing} className="bg-news-gold text-black px-4 md:px-10 py-2.5 rounded-full flex items-center gap-2 hover:bg-white transition-all shadow-xl disabled:opacity-50 active:scale-95">
                                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} 
                                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{isProcessing ? 'Busy' : 'Export Clip'}</span>
                            </button>
                        </div>

                        {/* Desktop Close Button (Right) */}
                        <button onClick={() => { setIsCropping(false); setCropPreview(null); }} className="hidden md:flex p-2 hover:bg-white/10 rounded-full text-white transition-all border border-white/10 ml-2">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
            
            <div className="flex-1 overflow-hidden relative flex flex-col bg-[#0a0a0a]">
                <div className={`relative flex flex-col items-center justify-center w-full h-full p-2 md:p-8 transition-opacity duration-300 ${cropPreview ? 'opacity-0' : 'opacity-100'}`}>
                    {workshopScale > 1 && !cropPreview && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-news-gold text-black px-5 py-1.5 rounded-full font-black uppercase text-[8px] tracking-[0.3em] shadow-2xl animate-bounce pointer-events-none"><Hand size={12} /> Pan Mode Active</div>}
                    <div className="w-full h-full flex items-center justify-center">
                        <img ref={cropperImgRef} src={activePage?.imageUrl} className="max-w-full max-h-full block" crossOrigin="anonymous" alt="Archive workspace" />
                    </div>
                </div>

                {/* FULL SCREEN PREVIEW MODAL */}
                {cropPreview && (
                    <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 md:p-12 animate-in fade-in zoom-in-95 duration-300">
                        {/* Actions Top Right */}
                        <div className="absolute top-6 right-6 z-50">
                             <button onClick={() => setCropPreview(null)} className="p-3 bg-white/10 rounded-full text-white hover:text-white hover:bg-white/20 transition-all backdrop-blur-md">
                                <X size={24} />
                             </button>
                        </div>

                        {/* Title */}
                        <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
                            <h3 className="text-news-gold font-black uppercase tracking-[0.3em] text-xs md:text-sm shadow-black drop-shadow-md">Generated Clip</h3>
                        </div>

                        {/* Centered Image */}
                        <div className="max-w-full max-h-[70vh] relative shadow-2xl rounded-sm overflow-hidden border border-white/10 bg-white">
                             <img src={cropPreview} className="max-w-full max-h-[70vh] object-contain block" alt="Branded Archival Result" />
                        </div>

                        {/* Download Confirmation */}
                        <div className="mt-8 flex flex-col items-center gap-4">
                            <div className="flex gap-4">
                                <button onClick={handleShare} className="bg-white/10 text-white border border-white/10 px-8 py-3 rounded-full hover:bg-white/20 transition-all flex items-center gap-3 font-bold uppercase tracking-widest text-xs">
                                    <Share2 size={16} /> Share
                                </button>
                                <button onClick={handleDownload} className="bg-news-gold text-black px-8 py-3 rounded-full hover:bg-white transition-all flex items-center gap-3 shadow-xl font-bold uppercase tracking-widest text-xs">
                                    <Download size={16} /> Download
                                </button>
                            </div>
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
