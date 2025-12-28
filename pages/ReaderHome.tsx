import React, { useState, useEffect } from 'react';
import { Article, EPaperPage, Advertisement } from '../types';
import { ArrowRight, TrendingUp, Clock, ChevronRight, ChevronLeft, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';
import Link from '../components/Link';
import AdvertisementBanner from '../components/Advertisement';

interface ReaderHomeProps {
  articles: Article[];
  ePaperPages: EPaperPage[];
  onNavigate: (path: string) => void;
  advertisements: Advertisement[];
  globalAdsEnabled: boolean;
}

const ReaderHome: React.FC<ReaderHomeProps> = ({ articles, ePaperPages, onNavigate, advertisements, globalAdsEnabled }) => {
  // Data Slicing
  const sliderArticles = articles.slice(0, 5); // Top 5 for Slider
  const secondaryArticles = articles.slice(1, 7); // Next batch for Latest
  const sideListArticles = articles.slice(3, 8); // Overlapping batch for Trending
  const latestPaper = ePaperPages[0];
  
  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<'latest' | 'trending'>('latest');
  
  // Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance slider
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % (sliderArticles.length || 1));
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, sliderArticles.length]);

  const nextSlide = (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setCurrentSlide((prev) => (prev + 1) % sliderArticles.length);
  };

  const prevSlide = (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      setCurrentSlide((prev) => (prev - 1 + sliderArticles.length) % sliderArticles.length);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Top Mobile Banner (Visible only on small screens) */}
      <AdvertisementBanner 
        ads={advertisements} 
        size="MOBILE_BANNER" 
        placement="HOME"
        globalAdsEnabled={globalAdsEnabled}
      />

      {/* --- TOP SECTION: E-PAPER (Left) & SLIDER (Right) --- */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 1. Today's Edition Widget (Desktop: Left 3 cols, Mobile: Hidden/Stacked) */}
          <div className="hidden lg:block lg:col-span-3">
             {latestPaper && (
                <div className="border border-gray-200 bg-white h-full p-4 flex flex-col shadow-sm rounded-lg">
                    <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
                        <h3 className="font-bold text-gray-900 text-xs uppercase tracking-widest flex items-center gap-2">
                            <MapPin size={12} className="text-news-accent"/> Today's Paper
                        </h3>
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                             {format(new Date(), 'dd MMM')}
                        </span>
                    </div>
                     <Link to="/epaper" onNavigate={onNavigate} className="block group relative shadow-md flex-1 overflow-hidden bg-gray-100">
                        <img 
                            src={latestPaper.imageUrl} 
                            alt="E-Paper Preview" 
                            className="w-full h-full object-cover object-top grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                        <div className="absolute bottom-0 left-0 right-0 bg-news-black/95 text-white text-center py-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <span className="text-xs font-bold uppercase tracking-wider">Read Full Paper</span>
                        </div>
                     </Link>
                     <div className="mt-3 text-center">
                        <p className="text-[10px] text-gray-400">Digital Edition Available Daily</p>
                     </div>
                </div>
            )}
          </div>

          {/* 2. Unified Landscape Slider (Desktop: Right 9 cols, Mobile: Full Width) */}
          <div className="col-span-1 lg:col-span-9">
              <div 
                className="relative w-full bg-white md:bg-gray-100 group h-full"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                  <div className="w-full h-full overflow-hidden shadow-sm md:shadow-md rounded-lg md:rounded-xl bg-gray-900 border border-gray-200">
                      <div 
                          className="flex transition-transform duration-500 ease-in-out" 
                          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                      >
                          {sliderArticles.map((article) => {
                              const [authorName, authorRole] = article.author.split(',').map(s => s.trim());
                              return (
                              <div key={`slide-${article.id}`} className="w-full shrink-0 relative">
                                  {/* Image Section - Full Background */}
                                  <img 
                                    src={article.imageUrl} 
                                    alt={article.title} 
                                    className="w-full h-auto object-contain"
                                  />
                                  
                                  {/* Gradient Overlay for Text Readability */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                                  
                                  {/* Category Tag (Top Left) */}
                                  <span className="absolute top-4 left-4 bg-news-gold text-black text-[10px] md:text-xs font-bold px-2 py-1 uppercase tracking-widest shadow-sm z-10">
                                      {article.category}
                                  </span>

                                  {/* Content Section (Bottom Overlay) */}
                                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col justify-end z-20">
                                      <div className="flex items-center text-gray-300 text-[10px] md:text-xs font-bold uppercase tracking-wider divide-x divide-gray-600 mb-2">
                                        <span className="pr-3 flex items-center gap-1.5 text-news-gold"><Clock size={12}/> {format(new Date(article.publishedAt), 'MMM dd, yyyy')}</span>
                                        <span className="pl-3 flex items-center gap-1.5"><User size={12}/> By {authorName}{authorRole && <span className="text-gray-400 font-normal normal-case italic">/ {authorRole}</span>}</span>
                                      </div>
                                      
                                      <Link to={`/article/${article.id}`} onNavigate={onNavigate} className="group-hover:text-news-gold transition-colors w-fit">
                                          <h2 className="text-xl md:text-4xl font-serif font-bold text-white leading-tight mb-2 md:mb-3 line-clamp-2 drop-shadow-md">
                                              {article.title}
                                          </h2>
                                      </Link>
                                      
                                      {article.subline && (
                                          <p className="text-gray-300 text-sm md:text-base font-serif italic mb-4 line-clamp-2 md:line-clamp-2 max-w-2xl drop-shadow-sm hidden sm:block">
                                              {article.subline}
                                          </p>
                                      )}

                                      <Link 
                                        to={`/article/${article.id}`} 
                                        onNavigate={onNavigate} 
                                        className="inline-flex items-center text-white text-xs font-bold uppercase tracking-widest hover:text-news-gold transition-colors w-fit"
                                      >
                                          Read Full Story <ArrowRight size={14} className="ml-2" />
                                      </Link>
                                  </div>
                              </div>
                          )})}
                      </div>

                      {/* Slider Controls */}
                      <button 
                          onClick={prevSlide}
                          className="absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white text-white hover:text-black p-2 rounded-full backdrop-blur-sm z-30 transition-all border border-white/30"
                      >
                          <ChevronLeft size={24} />
                      </button>
                      <button 
                          onClick={nextSlide}
                          className="absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white text-white hover:text-black p-2 rounded-full backdrop-blur-sm z-30 transition-all border border-white/30"
                      >
                          <ChevronRight size={24} />
                      </button>

                      {/* Dots (Bottom Right) */}
                      <div className="absolute bottom-6 right-6 flex space-x-2 z-30 hidden md:flex">
                          {sliderArticles.map((_, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => setCurrentSlide(idx)}
                                  className={`w-2 h-2 rounded-full transition-all ${currentSlide === idx ? 'bg-news-gold w-6' : 'bg-white/50'}`}
                              />
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 1. Global Partner Banner */}
      <div className="w-full h-32 md:h-48 relative overflow-hidden bg-gray-900 group">
          <img 
            src="https://picsum.photos/1200/300?grayscale&blur=2" 
            alt="Banner" 
            className="w-full h-full object-cover opacity-60 group-hover:opacity-70 transition-opacity duration-700"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <span className="text-[10px] font-bold tracking-[0.3em] text-gray-400 uppercase mb-2">Premium Global Partners</span>
              <h2 className="text-white font-serif text-2xl md:text-3xl font-bold tracking-wide">
                  Discover the Untold Stories of Nature
              </h2>
          </div>
      </div>

      {/* Billboard Ad (Top of Page) */}
      <AdvertisementBanner 
        ads={advertisements} 
        size="BILLBOARD"
        placement="HOME"
        globalAdsEnabled={globalAdsEnabled}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 px-4 md:px-0 max-w-7xl mx-auto">
        
        {/* Main Content Area (Left 8 Cols) */}
        <div className="lg:col-span-8 space-y-8">
            
            {/* --- MOBILE: TABS FOR LATEST / TRENDING --- */}
            <div className="md:hidden">
               <div className="flex border-b border-gray-200 mb-6 sticky top-[60px] bg-[#f9f9f7] z-20 pt-2">
                   <button 
                     onClick={() => setMobileTab('latest')} 
                     className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${mobileTab === 'latest' ? 'border-b-2 border-news-black text-news-black' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                       Latest News
                   </button>
                   <button 
                     onClick={() => setMobileTab('trending')} 
                     className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${mobileTab === 'trending' ? 'border-b-2 border-news-black text-news-black' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                       Trending
                   </button>
               </div>

               <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 min-h-[300px]">
                   {mobileTab === 'latest' && (
                       <div className="space-y-6">
                           {secondaryArticles.map(article => (
                               <Link key={article.id} to={`/article/${article.id}`} onNavigate={onNavigate} className="flex gap-4 items-start group bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                                   <div className="w-24 h-20 shrink-0 bg-gray-100 rounded overflow-hidden">
                                       <img src={article.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                   </div>
                                   <div>
                                       <span className="text-[10px] text-news-accent font-bold uppercase tracking-wider mb-1 block">{article.category}</span>
                                       <h4 className="font-serif font-bold text-sm leading-snug text-gray-900 group-hover:text-news-accent transition-colors">
                                           {article.title}
                                       </h4>
                                       <span className="text-[10px] text-gray-400 mt-1 block">{format(new Date(article.publishedAt), 'MMM d')}</span>
                                   </div>
                               </Link>
                           ))}
                       </div>
                   )}

                   {mobileTab === 'trending' && (
                       <div className="space-y-2">
                           {sideListArticles.map((article, idx) => (
                               <div key={article.id} className="flex gap-4 items-center group bg-white p-3 rounded-lg border border-gray-100">
                                   <span className="text-2xl font-serif font-bold text-gray-200 group-hover:text-news-gold transition-colors w-8 text-center">{idx+1}</span>
                                   <Link to={`/article/${article.id}`} onNavigate={onNavigate} className="flex-1">
                                       <h4 className="font-bold text-sm text-gray-900 group-hover:text-news-accent transition-colors leading-snug">{article.title}</h4>
                                       <span className="text-[10px] text-gray-400 uppercase">{article.category}</span>
                                   </Link>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
            </div>

            {/* --- DESKTOP: LATEST HEADLINES (Grid) --- */}
            <div className="hidden md:block">
                <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center uppercase tracking-widest border-b border-black pb-2">
                    Latest Headlines
                </h3>
                
                {/* In-Feed Advertisement */}
                <AdvertisementBanner 
                    ads={advertisements} 
                    size="LEADERBOARD" 
                    placement="HOME"
                    globalAdsEnabled={globalAdsEnabled}
                    className="!mt-0 !mb-8"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                   {secondaryArticles.map(article => (
                       <Link key={article.id} to={`/article/${article.id}`} onNavigate={onNavigate} className="group block flex flex-col h-full">
                           <div className="overflow-hidden mb-4 relative shadow-sm">
                                <img 
                                    src={article.imageUrl} 
                                    alt={article.title} 
                                    className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700"
                                />
                                <span className="absolute top-0 left-0 bg-black text-white text-[10px] font-bold px-2 py-1 uppercase">
                                    {article.category}
                                </span>
                           </div>
                           <h3 className="text-xl font-serif font-bold text-gray-900 mb-2 leading-tight group-hover:text-news-accent transition-colors">
                               {article.title}
                           </h3>
                           <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-grow font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: article.content.substring(0, 150) + '...' }}/>
                           <div className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center mt-auto">
                               Read More <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform"/>
                           </div>
                       </Link>
                   ))}
                </div>
            </div>

        </div>

        {/* Sidebar (Right 4 Cols - Desktop Only) */}
        <div className="lg:col-span-4 space-y-10">
            
            {/* Trending List - Side by Side on Desktop */}
            <div className="hidden md:block">
                 <h3 className="font-sans font-bold text-sm uppercase tracking-widest border-b border-black pb-2 mb-6 flex justify-between items-center">
                    <span>Trending Now</span>
                    <TrendingUp className="w-4 h-4 text-news-accent"/>
                 </h3>
                 <div className="space-y-6">
                     {sideListArticles.map((article, idx) => (
                         <div key={article.id} className="group flex gap-4 items-start">
                             <div className="text-3xl font-serif font-bold text-gray-200 leading-none group-hover:text-news-gold transition-colors">
                                 0{idx + 1}
                             </div>
                             <Link to={`/article/${article.id}`} onNavigate={onNavigate} className="flex-1">
                                <h4 className="text-sm font-serif font-bold text-gray-900 mb-1 leading-snug group-hover:text-news-accent transition-colors">
                                    {article.title}
                                </h4>
                                <div className="flex items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                    <span className="text-gray-500 mr-2">{article.category}</span>
                                </div>
                             </Link>
                         </div>
                     ))}
                 </div>
            </div>

            {/* Sidebar Advertisement */}
             <AdvertisementBanner 
                ads={advertisements} 
                size="HALF_PAGE" 
                placement="HOME"
                globalAdsEnabled={globalAdsEnabled}
                className="!my-0"
            />
            
             <AdvertisementBanner 
                ads={advertisements} 
                size="RECTANGLE" 
                placement="HOME"
                globalAdsEnabled={globalAdsEnabled}
                className="!my-0"
            />

            {/* Newsletter Box */}
            <div className="bg-news-black text-white p-8 text-center border-t-4 border-news-gold">
                <h4 className="font-serif font-bold text-2xl mb-2">Morning Briefing</h4>
                <p className="text-xs text-gray-400 mb-6 leading-relaxed">Start your day with the stories you need to know. Delivered to your inbox.</p>
                <button className="w-full bg-news-gold text-black hover:bg-white transition-colors py-3 text-xs font-bold uppercase tracking-widest">
                    Sign Up Free
                </button>
            </div>

        </div>
      </div>
    </div>
  );
};

export default ReaderHome;