
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { EPaperPage, Article, WatermarkSettings } from '../types';
import EPaperViewer from '../components/EPaperViewer';
import { 
  ChevronLeft, ChevronRight, Calendar, ZoomIn, ZoomOut, 
  Maximize, Minimize, RotateCcw, X, Grid, ArrowLeft, Loader2
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';

interface EPaperReaderProps {
  pages: EPaperPage[];
  articles?: Article[];
  onNavigate: (path: string) => void;
  // Added watermarkSettings to fix type error in App.tsx
  watermarkSettings?: WatermarkSettings;
}

const EPaperReader: React.FC<EPaperReaderProps> = ({ pages, onNavigate }) => {
  
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

  // --- View Logic (Zoom/Pan) ---
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ clientX: number, clientY: number, originX: number, originY: number } | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [activePageIndex, selectedDate]);

  const handleZoomIn = () => setScale(s => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.5, 1));
  const handleReset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-gray-900 text-white overflow-hidden relative font-sans">
      
      {/* Refined Toolbar */}
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
             <div className="hidden md:flex items-center bg-white/5 border border-white/10 rounded-full p-1.5">
                <button onClick={handleZoomOut} disabled={scale <= 1} className="p-1.5 hover:bg-white/10 rounded-full disabled:opacity-20"><ZoomOut size={18} /></button>
                <span className="px-3 text-xs font-mono w-14 text-center text-news-gold">{Math.round(scale * 100)}%</span>
                <button onClick={handleZoomIn} disabled={scale >= 4} className="p-1.5 hover:bg-white/10 rounded-full disabled:opacity-20"><ZoomIn size={18} /></button>
                <div className="w-px h-4 bg-white/10 mx-1"></div>
                <button onClick={handleReset} className="p-1.5 hover:bg-white/10 rounded-full text-gray-400" title="Reset Zoom"><RotateCcw size={16}/></button>
             </div>
             <button onClick={toggleFullscreen} className="hidden lg:flex items-center gap-2 bg-news-black border border-white/10 hover:border-news-gold/50 hover:text-news-gold px-5 py-2.5 rounded-full font-black text-[10px] uppercase tracking-[0.15em] transition-all">
                {isFullscreen ? <Minimize size={16}/> : <Maximize size={16} />} {isFullscreen ? 'WINDOW' : 'FULLSCREEN'}
             </button>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
         {/* Page Selector Sidebar */}
         <div className={`absolute md:static inset-y-0 left-0 z-30 w-64 md:w-52 bg-[#0d0d0d] border-r border-white/5 transform transition-transform duration-300 ease-in-out md:transform-none overflow-y-auto custom-scrollbar shrink-0 ${showMobileSidebar ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
            <div className="p-6 space-y-6">
               <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 mb-2 border-b border-white/5 pb-2">Digital Edition</h4>
               {currentEditionPages.map((page, idx) => (
                  <div key={page.id} onClick={() => { setActivePageIndex(idx); setShowMobileSidebar(false); }} className={`cursor-pointer group relative transition-all duration-300 ${idx === activePageIndex ? 'scale-105' : 'opacity-40 hover:opacity-100'}`}>
                     <div className={`rounded-sm overflow-hidden border-2 ${idx === activePageIndex ? 'border-news-gold shadow-2xl shadow-news-gold/20' : 'border-transparent'}`}><img src={page.imageUrl} className="w-full h-auto object-cover" alt={`P${page.pageNumber}`} /></div>
                     <p className={`text-center text-[10px] mt-3 font-black tracking-widest ${idx === activePageIndex ? 'text-news-gold' : 'text-gray-500'}`}>PAGE {page.pageNumber}</p>
                  </div>
               ))}
            </div>
         </div>
         {showMobileSidebar && <div className="absolute inset-0 bg-black/80 z-20 md:hidden" onClick={() => setShowMobileSidebar(false)}></div>}

         <div ref={viewerRef} className={`flex-1 bg-[#151515] overflow-hidden relative touch-none flex items-center justify-center cursor-${scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'}`} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
             {activePage ? (
                 <div className="w-full h-full flex items-center justify-center p-6">
                    <div 
                        ref={contentRef}
                        style={{ 
                            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                            transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.165, 0.84, 0.44, 1)',
                            transformOrigin: 'center',
                            display: 'inline-block',
                            position: 'relative'
                        }}
                    >
                        <EPaperViewer 
                            page={activePage} 
                            imageClassName="max-h-[82vh] h-auto w-auto max-w-full block"
                        />
                    </div>
                 </div>
             ) : (
                 <div className="flex flex-col items-center gap-4 text-gray-500">
                     <Loader2 className="animate-spin" size={32} />
                     <p className="font-black uppercase tracking-widest text-xs">Accessing Archives...</p>
                 </div>
             )}

             <button onClick={() => setShowMobileSidebar(true)} className="md:hidden absolute bottom-6 left-6 bg-news-gold text-black p-4 rounded-full shadow-2xl z-40">
                 <Grid size={24} />
             </button>
         </div>
      </div>
    </div>
  );
};

export default EPaperReader;
