
import React, { useState, useEffect } from 'react';
import { Article, EPaperPage, Advertisement } from '../types';
import { ArrowRight, TrendingUp, Clock, ChevronRight, ChevronLeft, MapPin, User, Star } from 'lucide-react';
import { format, isValid } from 'date-fns';
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
  // Data Slicing Logic
  
  // 1. Featured Articles for Slider (Prioritize isFeatured, else take latest 5)
  const featuredCandidates = articles.filter(a => a.isFeatured);
  const sliderArticles = featuredCandidates.length > 0 
      ? featuredCandidates.slice(0, 5) 
      : articles.slice(0, 5);

  // 2. Trending / Latest Sidebar (Right of slider)
  // Take articles not in the slider to avoid duplicates immediately next to it
  const sliderIds = new Set(sliderArticles.map(a => a.id));
  const trendingArticles = articles.filter(a => !sliderIds.has(a.id)).slice(0, 6); // Increased to 6 to fit taller layout

  // 3. Main Feed (Below)
  const mainFeedArticles = articles.filter(a => !sliderIds.has(a.id)).slice(6, 14);
  
  // 4. Side List (Bottom Right)
  const bottomSideArticles = articles.slice(14, 19);

  const latestPaper = ePaperPages[0];

  // Helper for safe date formatting
  const safeFormat = (dateValue: any, formatStr: string) => {
    if (!dateValue) return 'N/A';
    const d = new Date(dateValue);
    return isValid(d) ? format(d, formatStr) : 'N/A';
  };
  
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
    }, 6000); // Slightly slower for better readability
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

      {/* --- TOP SECTION: SLIDER (Left), TRENDING (Right) --- */}
      {/* Increased height to 500px for the poster look */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[500px]">
          
          {/* 1. Featured Slider (Desktop: Left 8 cols) */}
          <div className="col-span-1 lg:col-span-8 h-[450px] lg:h-full">
              {sliderArticles.length > 0 ? (
              <div 
                className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-news-black group border border-gray-800"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                  <div 
                      className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]" 
                      style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                      {sliderArticles.map((article) => {
                          const [authorName] = article.author.split(',');
                          // Generate avatar based on name
                          const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=bfa17b&color=1a1a1a&bold=true`;
                          
                          // Get plain text for summary
                          const plainText = article.subline || article.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
                          
                          return (
                          <div key={`slide-${article.id}`} className="w-full shrink-0 relative h-full">
                              {/* Full Background Image */}
                              <img 
                                src={article.imageUrl} 
                                alt={article.title} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-105"
                              />
                              
                              {/* Clean Gradient - Only at bottom to make text readable, leave rest clear to show image */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                              
                              {/* Physics/Math Pattern Overlay - Very subtle */}
                              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none mix-blend-overlay"></div>

                              {/* Content Container */}
                              <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end items-start z-10">
                                  
                                  {/* Top Left Tag */}
                                  <div className="absolute top-8 left-8 md:left-10 animate-in fade-in slide-in-from-top-4 duration-700 delay-100">
                                      <span className="bg-[#bfa17b] text-news-black text-xs font-black px-4 py-1.5 uppercase tracking-widest shadow-lg inline-flex items-center gap-2">
                                          {article.isFeatured && <Star size={10} fill="currentColor" />}
                                          {article.category}
                                      </span>
                                  </div>

                                  {/* Metadata with Profile Pic */}
                                  <div className="flex items-center gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-700 delay-100">
                                      {/* Profile Pic */}
                                      <div className="w-10 h-10 rounded-full border-2 border-[#bfa17b] overflow-hidden bg-gray-800 shrink-0 shadow-md">
                                          <img src={avatarUrl} alt={authorName} className="w-full h-full object-cover" />
                                      </div>
                                      {/* Author & Date */}
                                      <div className="flex flex-col justify-center">
                                          <span className="text-white text-xs font-bold uppercase tracking-widest leading-none mb-1">
                                              {authorName}
                                          </span>
                                          <div className="flex items-center gap-2 text-[#bfa17b] text-[10px] font-bold tracking-[0.1em] uppercase leading-none">
                                              <Clock size={10} />
                                              <span>{safeFormat(article.publishedAt, 'MMM dd, yyyy')}</span>
                                          </div>
                                      </div>
                                  </div>

                                  {/* Headline */}
                                  <Link to={`/article/${article.id}`} onNavigate={onNavigate} className="block group/title max-w-4xl">
                                      <h2 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold text-white leading-[1.1] mb-5 group-hover/title:text-[#bfa17b] transition-colors animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                                          {article.title}
                                      </h2>
                                  </Link>

                                  {/* Subline */}
                                  <p className="text-gray-300 font-serif text-lg md:text-xl italic mb-8 line-clamp-2 max-w-2xl border-l-2 border-[#bfa17b] pl-5 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 leading-relaxed">
                                      {plainText}
                                  </p>

                                  {/* CTA Button */}
                                  <Link to={`/article/${article.id}`} onNavigate={onNavigate} className="flex items-center gap-3 text-white font-bold text-xs uppercase tracking-[0.25em] hover:text-[#bfa17b] transition-all group/btn animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500 border-b border-transparent hover:border-[#bfa17b] pb-1">
                                      Read Full Story <ArrowRight size={16} className="group-hover/btn:translate-x-2 transition-transform"/>
                                  </Link>
                              </div>
                          </div>
                      )})}
                  </div>

                  {/* Slider Controls */}
                  <button 
                      onClick={prevSlide}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/10 z-20 group/nav shadow-lg"
                  >
                      <ChevronLeft size={24} className="group-hover/nav:-translate-x-0.5 transition-transform" />
                  </button>
                  <button 
                      onClick={nextSlide}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all border border-white/10 z-20 group/nav shadow-lg"
                  >
                      <ChevronRight size={24} className="group-hover/nav:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Pagination Dots */}
                  <div className="absolute bottom-10 right-10 md:right-12 flex gap-3 z-20">
                      {sliderArticles.map((_, idx) => (
                          <button
                              key={idx}
                              onClick={() => setCurrentSlide(idx)}
                              className={`transition-all duration-300 rounded-full shadow-lg ${currentSlide === idx ? 'bg-[#bfa17b] w-8 h-2' : 'bg-white/30 hover:bg-white/60 w-2 h-2'}`}
                          />
                      ))}
                  </div>
              </div>
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl text-gray-400 border border-gray-200">
                      <div className="text-center">
                          <p className="text-xs font-bold uppercase tracking-widest">No Featured News</p>
                      </div>
                  </div>
              )}
          </div>

          {/* 2. Trending/Latest News (Desktop: Right 4 cols) */}
          <div className="hidden lg:flex lg:col-span-4 flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
               <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
                   <h3 className="font-bold text-gray-900 text-[10px] uppercase tracking-widest flex items-center gap-2">
                       <TrendingUp size={14} className="text-news-accent"/> Trending Now
                   </h3>
               </div>
               <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                   <div className="divide-y divide-gray-100">
                       {trendingArticles.map((article, idx) => (
                           <Link key={article.id} to={`/article/${article.id}`} onNavigate={onNavigate} className="block p-4 hover:bg-gray-50 transition-colors group">
                               <div className="flex gap-4">
                                    <div className="flex flex-col items-center justify-start pt-1">
                                        <span className="text-news-gold font-display font-black text-2xl leading-none">0{idx + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[9px] font-bold text-news-accent uppercase tracking-wide block mb-1.5 truncate">{article.category}</span>
                                        <h4 className="font-serif font-bold text-base text-gray-900 leading-snug group-hover:text-news-accent line-clamp-2 transition-colors">
                                            {article.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                            <Clock size={10} /> {safeFormat(article.publishedAt, 'MMM d')}
                                        </div>
                                    </div>
                               </div>
                           </Link>
                       ))}
                       {trendingArticles.length === 0 && (
                           <div className="p-8 text-center text-gray-400 text-xs italic">No trending stories available.</div>
                       )}
                   </div>
               </div>
               <div className="p-3 border-t border-gray-100 bg-gray-50 text-center shrink-0">
                   <Link to="#" onNavigate={onNavigate} className="text-[10px] font-bold uppercase tracking-widest text-news-black hover:text-news-accent flex items-center justify-center gap-2">
                       View All Stories <ArrowRight size={12}/>
                   </Link>
               </div>
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
                           {mainFeedArticles.length > 0 ? mainFeedArticles.map(article => (
                               <Link key={article.id} to={`/article/${article.id}`} onNavigate={onNavigate} className="flex gap-4 items-start group bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                                   <div className="w-24 h-20 shrink-0 bg-gray-100 rounded overflow-hidden">
                                       <img src={article.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                   </div>
                                   <div>
                                       <span className="text-[10px] text-news-accent font-bold uppercase tracking-wider mb-1 block">{article.category}</span>
                                       <h4 className="font-serif font-bold text-sm leading-snug text-gray-900 group-hover:text-news-accent transition-colors">
                                           {article.title}
                                       </h4>
                                       <span className="text-[10px] text-gray-400 mt-1 block">{safeFormat(article.publishedAt, 'MMM d')}</span>
                                   </div>
                               </Link>
                           )) : (
                               <div className="text-center py-10 text-gray-400 text-xs italic">No additional articles found.</div>
                           )}
                       </div>
                   )}

                   {mobileTab === 'trending' && (
                       <div className="space-y-2">
                           {trendingArticles.length > 0 ? trendingArticles.map((article, idx) => (
                               <div key={article.id} className="flex gap-4 items-center group bg-white p-3 rounded-lg border border-gray-100">
                                   <span className="text-2xl font-serif font-bold text-gray-200 group-hover:text-news-gold transition-colors w-8 text-center">{idx+1}</span>
                                   <Link to={`/article/${article.id}`} onNavigate={onNavigate} className="flex-1">
                                       <h4 className="font-bold text-sm text-gray-900 group-hover:text-news-accent transition-colors leading-snug">{article.title}</h4>
                                       <span className="text-[10px] text-gray-400 uppercase">{article.category}</span>
                                   </Link>
                               </div>
                           )) : (
                               <div className="text-center py-10 text-gray-400 text-xs italic">No trending articles.</div>
                           )}
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
                   {mainFeedArticles.length > 0 ? mainFeedArticles.map(article => (
                       <Link key={article.id} to={`/article/${article.id}`} onNavigate={onNavigate} className="group block flex flex-col h-full">
                           <div className="overflow-hidden mb-4 relative shadow-sm rounded-lg">
                                <img 
                                    src={article.imageUrl} 
                                    alt={article.title} 
                                    className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700 aspect-video object-cover"
                                />
                                <span className="absolute top-2 left-2 bg-white/90 backdrop-blur text-black text-[9px] font-black px-2 py-1 uppercase tracking-wider rounded-sm">
                                    {article.category}
                                </span>
                           </div>
                           <h3 className="text-xl font-serif font-bold text-gray-900 mb-2 leading-tight group-hover:text-news-accent transition-colors">
                               {article.title}
                           </h3>
                           <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-grow font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: article.content.substring(0, 150) + '...' }}/>
                           <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center mt-auto group-hover:text-news-black transition-colors">
                               Read Article <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform"/>
                           </div>
                       </Link>
                   )) : (
                       <div className="col-span-full py-20 text-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                           <p className="font-serif italic">More articles will appear here.</p>
                       </div>
                   )}
                </div>
            </div>

        </div>

        {/* Sidebar (Right 4 Cols - Desktop Only) */}
        <div className="lg:col-span-4 space-y-10">
            
            {/* Editor's Picks / More News - Side by Side on Desktop */}
            <div className="hidden md:block">
                 <h3 className="font-sans font-bold text-sm uppercase tracking-widest border-b border-black pb-2 mb-6 flex justify-between items-center">
                    <span>Editor's Picks</span>
                    <Star className="w-4 h-4 text-news-accent"/>
                 </h3>
                 <div className="space-y-6">
                     {bottomSideArticles.length > 0 ? bottomSideArticles.map((article) => (
                         <div key={article.id} className="group flex gap-4 items-start">
                             <div className="w-20 h-20 bg-gray-100 shrink-0 overflow-hidden rounded-md border border-gray-200">
                                <img src={article.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                             </div>
                             <Link to={`/article/${article.id}`} onNavigate={onNavigate} className="flex-1">
                                <span className="text-[9px] font-bold text-news-gold uppercase tracking-wider mb-1 block">{article.category}</span>
                                <h4 className="text-sm font-serif font-bold text-gray-900 mb-1 leading-snug group-hover:text-news-accent transition-colors line-clamp-2">
                                    {article.title}
                                </h4>
                             </Link>
                         </div>
                     )) : (
                         <div className="text-sm text-gray-400 italic">No articles yet.</div>
                     )}
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

        </div>
      </div>
    </div>
  );
};

export default ReaderHome;
