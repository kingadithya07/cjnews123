
import React, { useState, useEffect } from 'react';
import { Article, EPaperPage, Advertisement } from '../types';
import { ArrowRight, TrendingUp, Clock, ChevronRight, ChevronLeft, MapPin, User, Star, ArrowLeft } from 'lucide-react';
import { format, isValid } from 'date-fns';
import Link from '../components/Link';
import AdvertisementBanner from '../components/Advertisement';

interface ReaderHomeProps {
  articles: Article[];
  ePaperPages: EPaperPage[];
  onNavigate: (path: string) => void;
  advertisements: Advertisement[];
  globalAdsEnabled: boolean;
  selectedCategory?: string;
  categories?: string[];
}

const ReaderHome: React.FC<ReaderHomeProps> = ({ articles, ePaperPages, onNavigate, advertisements, globalAdsEnabled, selectedCategory, categories = [] }) => {
  const safeFormat = (dateValue: any, formatStr: string) => {
    if (!dateValue) return 'N/A';
    const d = new Date(dateValue);
    return isValid(d) ? format(d, formatStr) : 'N/A';
  };

  // If a category is selected, filter everything
  const displayArticles = selectedCategory 
    ? articles.filter(a => a.categories.includes(selectedCategory))
    : articles;

  // --- LOGIC FOR HOME VIEW ---
  // 1. Featured Articles for Slider (Prioritize isFeatured, else take latest 5)
  const featuredCandidates = displayArticles.filter(a => a.isFeatured);
  const sliderArticles = featuredCandidates.length > 0 
      ? featuredCandidates.slice(0, 5) 
      : displayArticles.slice(0, 5);

  const sliderIds = new Set(sliderArticles.map(a => a.id));

  // 2. Trending / Latest Sidebar (Exclude slider)
  const trendingArticles = displayArticles
    .filter(a => !sliderIds.has(a.id))
    .slice(0, 6);
  
  const trendingIds = new Set(trendingArticles.map(a => a.id));

  // 3. Main Feed (The rest)
  const mainFeedArticles = displayArticles
    .filter(a => !sliderIds.has(a.id) && !trendingIds.has(a.id))
    .slice(0, 14);

  // 4. Category Sections (Only on Homepage when no category selected)
  // Take top 4 categories from the list, filtering out 'General' if preferred or just take first 4.
  const homeCategorySections = !selectedCategory ? categories.filter(c => c !== 'General').slice(0, 4) : [];

  const [mobileTab, setMobileTab] = useState<'latest' | 'trending'>('latest');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % (sliderArticles.length || 1));
    }, 6000);
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

  // --- CATEGORY VIEW RENDER ---
  if (selectedCategory) {
      return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-7xl mx-auto px-4 md:px-0">
            {/* Back Button */}
            <div className="pt-6">
                <button onClick={() => onNavigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-news-black transition-colors text-xs font-bold uppercase tracking-widest group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
                </button>
            </div>

            <div className="bg-news-black text-white py-12 px-6 rounded-lg mb-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <Star size={200} />
                </div>
                <h1 className="font-serif text-4xl md:text-5xl font-bold uppercase tracking-tight text-center relative z-10">
                    {selectedCategory}
                </h1>
                <p className="text-center text-news-gold text-xs font-bold uppercase tracking-[0.3em] mt-4 relative z-10">
                    Category Archive
                </p>
            </div>

            <AdvertisementBanner 
                ads={advertisements} 
                size="LEADERBOARD" 
                placement="CATEGORY"
                currentCategory={selectedCategory}
                globalAdsEnabled={globalAdsEnabled}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {displayArticles.length === 0 ? (
                    <div className="col-span-full text-center py-20 text-gray-400">No articles found in this section.</div>
                ) : (
                    displayArticles.map(article => (
                        <Link key={article.id} to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="group block bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                            <div className="aspect-video relative overflow-hidden">
                                <img src={article.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={article.title} />
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    <span className="bg-white/90 backdrop-blur text-black text-[8px] font-black px-2 py-1 uppercase tracking-widest rounded-sm w-fit shadow-sm flex items-center gap-1">
                                        <Star size={8} fill="currentColor" /> {article.categories[0]}
                                    </span>
                                </div>
                            </div>
                            <div className="p-5">
                                <h3 className="font-serif font-bold text-lg leading-snug text-gray-900 group-hover:text-news-accent transition-colors mb-2">
                                    {article.title}
                                </h3>
                                <div className="text-xs text-gray-400 flex items-center">
                                    <Clock size={12} className="mr-1" />
                                    {safeFormat(article.publishedAt, 'MMM d, yyyy')}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
      );
  }

  // --- HOME VIEW RENDER ---
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      
      <AdvertisementBanner 
        ads={advertisements} 
        size="MOBILE_BANNER" 
        placement="HOME"
        globalAdsEnabled={globalAdsEnabled}
      />

      {/* --- TOP SECTION: SLIDER & TRENDING --- */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[520px]">
          
          {/* Slider */}
          <div className="col-span-1 lg:col-span-8 h-[400px] lg:h-full">
              {sliderArticles.length > 0 ? (
              <div 
                className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-news-black group border border-gray-800"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
                  <div 
                      className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]" 
                      style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                  >
                      {sliderArticles.map((article) => {
                          const [authorName] = article.author.split(',');
                          const avatarUrl = article.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=bfa17b&color=1a1a1a&bold=true`;
                          const plainText = article.subline || article.content.replace(/<[^>]*>/g, '').substring(0, 120) + '...';
                          
                          return (
                          <div key={`slide-${article.id}`} className="w-full shrink-0 relative h-full">
                              <img 
                                src={article.imageUrl} 
                                alt={article.title} 
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[4s] group-hover:scale-105"
                              />
                              
                              <div className="absolute top-5 left-5 md:top-8 md:left-8 z-20 pointer-events-none flex flex-col gap-2">
                                  <span className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[7px] md:text-[8px] font-black px-2 py-1 md:px-3 md:py-1 uppercase tracking-[0.2em] shadow-lg inline-flex items-center gap-2 rounded-sm w-fit">
                                      <Star size={8} fill="currentColor" /> {article.categories[0]}
                                  </span>
                              </div>

                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 md:p-10 pt-24 flex flex-col justify-end items-start z-10">
                                  <div className="flex items-center gap-3 mb-2 md:mb-3">
                                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border border-white/20 overflow-hidden bg-gray-800 shrink-0">
                                          <img src={avatarUrl} alt={authorName} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex flex-col justify-center">
                                          <span className="text-gray-200 text-[8px] md:text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5">
                                              {authorName}
                                          </span>
                                          <span className="text-news-gold text-[7px] md:text-[8px] font-bold uppercase leading-none tracking-widest">
                                              {safeFormat(article.publishedAt, 'MMM dd')}
                                          </span>
                                      </div>
                                  </div>

                                  <Link to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="block group/title max-w-xl md:max-w-2xl">
                                      <h2 className="text-base md:text-2xl font-display font-black text-white leading-tight mb-2 md:mb-3 group-hover/title:text-news-gold transition-colors tracking-tight drop-shadow-lg">
                                          {article.title}
                                      </h2>
                                  </Link>

                                  <p className="hidden sm:block text-gray-300 font-sans text-[10px] md:text-xs font-medium mb-3 md:mb-5 line-clamp-2 max-w-lg leading-relaxed drop-shadow-md">
                                      {plainText}
                                  </p>

                                  <Link to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="flex items-center gap-2 text-white font-bold text-[8px] md:text-[9px] uppercase tracking-[0.2em] hover:text-news-gold transition-all group/btn pb-1 border-b border-white/20 hover:border-news-gold">
                                      Read Story <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform"/>
                                  </Link>
                              </div>
                          </div>
                      )})}
                  </div>

                  <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-black/20 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all z-20 border border-white/10"><ChevronLeft size={20} /></button>
                  <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 bg-black/20 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all z-20 border border-white/10"><ChevronRight size={20} /></button>

                  <div className="absolute bottom-6 right-6 md:right-10 flex gap-2 z-20">
                      {sliderArticles.map((_, idx) => (
                          <button key={idx} onClick={() => setCurrentSlide(idx)} className={`transition-all duration-300 rounded-full ${currentSlide === idx ? 'bg-news-gold w-6 h-1' : 'bg-white/30 hover:bg-white/50 w-2 h-1'}`} />
                      ))}
                  </div>
              </div>
              ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl text-gray-400 border border-gray-200">
                      <p className="text-[10px] font-black uppercase tracking-widest">Bureau Dispatches Awaited</p>
                  </div>
              )}
          </div>

          {/* Trending Sidebar */}
          <div className="hidden lg:flex lg:col-span-4 flex-col h-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
               <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
                   <h3 className="font-black text-gray-900 text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                       <TrendingUp size={14} className="text-news-accent"/> Trending Now
                   </h3>
               </div>
               <div className="flex-1 overflow-y-auto p-0 scrollbar-hide">
                   <div className="divide-y divide-gray-100">
                       {trendingArticles.map((article, idx) => (
                           <Link key={article.id} to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="block p-4 hover:bg-gray-50 transition-colors group">
                               <div className="flex gap-4">
                                    <div className="flex flex-col items-center justify-start pt-1">
                                        <span className="text-news-gold font-display font-black text-lg leading-none">0{idx + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[9px] font-bold text-news-accent uppercase tracking-wide mb-1 truncate flex items-center gap-1">
                                            <Star size={8} fill="currentColor" /> {article.categories[0]}
                                        </span>
                                        <h4 className="font-serif font-bold text-xs text-gray-900 leading-snug group-hover:text-news-accent line-clamp-2 transition-colors">
                                            {article.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-2 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                            <Clock size={10} /> {safeFormat(article.publishedAt, 'MMM d')}
                                        </div>
                                    </div>
                               </div>
                           </Link>
                       ))}
                   </div>
               </div>
               <div className="p-3 border-t border-gray-100 bg-gray-50 text-center shrink-0">
                   <Link to="#" onNavigate={onNavigate} className="text-[9px] font-black uppercase tracking-[0.25em] text-news-black hover:text-news-accent flex items-center justify-center gap-2">
                       Full Index <ArrowRight size={12}/>
                   </Link>
               </div>
          </div>
      </div>

      <AdvertisementBanner 
        ads={advertisements} 
        size="BILLBOARD" 
        placement="HOME" 
        globalAdsEnabled={globalAdsEnabled}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 px-4 md:px-0 max-w-7xl mx-auto">
        
        {/* LEFT COLUMN (Main Feed) */}
        <div className="lg:col-span-8 space-y-8">
            <div className="md:hidden">
               {/* Mobile Tabs */}
               <div className="flex border-b border-gray-200 mb-6 sticky top-[60px] bg-news-paper z-20 pt-2">
                   <button onClick={() => setMobileTab('latest')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${mobileTab === 'latest' ? 'border-b-2 border-news-black text-news-black' : 'text-gray-400 hover:text-gray-600'}`}>Latest</button>
                   <button onClick={() => setMobileTab('trending')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${mobileTab === 'trending' ? 'border-b-2 border-news-black text-news-black' : 'text-gray-400 hover:text-gray-600'}`}>Trending</button>
               </div>

               <div className="min-h-[300px]">
                   {mobileTab === 'latest' && (
                       <div className="space-y-8">
                           {mainFeedArticles.map(article => (
                               <Link key={article.id} to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="block group bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                   <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4 relative">
                                       <img src={article.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                                       <div className="absolute top-2 left-2 flex flex-col gap-1">
                                            <span className="bg-white/90 backdrop-blur text-black text-[9px] font-black px-2 py-1 uppercase tracking-wider rounded-sm w-fit shadow-sm flex items-center gap-1">
                                                <Star size={8} fill="currentColor" /> {article.categories[0]}
                                            </span>
                                       </div>
                                   </div>
                                   <div>
                                       <h4 className="font-serif font-bold text-base leading-tight text-gray-900 group-hover:text-news-accent transition-colors mb-2">{article.title}</h4>
                                       <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{article.subline || article.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...'}</p>
                                   </div>
                               </Link>
                           ))}
                       </div>
                   )}

                   {mobileTab === 'trending' && (
                       <div className="space-y-4">
                           {trendingArticles.map((article, idx) => (
                               <div key={article.id} className="flex gap-4 items-start group bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                   <span className="text-xl font-serif font-bold text-gray-200 group-hover:text-news-gold transition-colors w-8 text-center shrink-0 leading-none mt-1">0{idx+1}</span>
                                   <Link to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="flex-1">
                                       <span className="text-[9px] text-news-accent font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                                           <Star size={8} fill="currentColor" /> {article.categories[0]}
                                       </span>
                                       <h4 className="font-bold text-xs text-gray-900 group-hover:text-news-accent transition-colors leading-snug mb-1">{article.title}</h4>
                                   </Link>
                               </div>
                           ))}
                       </div>
                   )}
               </div>
            </div>

            <div className="hidden md:block">
                <h3 className="text-[10px] font-black text-gray-900 mb-6 flex items-center uppercase tracking-[0.3em] border-b border-gray-100 pb-3">Latest Dispatches</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
                   {mainFeedArticles.map(article => (
                       <Link key={article.id} to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="group block flex flex-col h-full">
                           <div className="overflow-hidden mb-4 relative shadow-sm rounded-lg">
                                <img src={article.imageUrl} alt={article.title} className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700 aspect-video object-cover"/>
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    <span className="bg-white/90 backdrop-blur text-black text-[9px] font-black px-2 py-1 uppercase tracking-widest rounded-sm w-fit shadow-sm flex items-center gap-1">
                                        <Star size={8} fill="currentColor" /> {article.categories[0]}
                                    </span>
                                </div>
                           </div>
                           <h3 className="text-base font-serif font-bold text-gray-900 mb-3 leading-tight group-hover:text-news-accent transition-colors">{article.title}</h3>
                           <p className="text-xs text-gray-500 line-clamp-3 mb-4 flex-grow font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: article.content.substring(0, 140) + '...' }}/>
                           <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] flex items-center mt-auto group-hover:text-news-black transition-colors">Read Story <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform"/></div>
                       </Link>
                   ))}
                </div>
            </div>
        </div>

        {/* RIGHT COLUMN (Ads only now) */}
        <div className="lg:col-span-4 space-y-10">
             <AdvertisementBanner ads={advertisements} size="HALF_PAGE" placement="HOME" globalAdsEnabled={globalAdsEnabled} className="!my-0"/>
             <AdvertisementBanner ads={advertisements} size="RECTANGLE" placement="HOME" globalAdsEnabled={globalAdsEnabled} className="!my-0"/>
        </div>
      </div>

      {/* --- CATEGORY SECTIONS (Below Main Fold) --- */}
      {homeCategorySections.map(category => {
          const categoryArticles = articles.filter(a => a.categories.includes(category)).slice(0, 4);
          if (categoryArticles.length === 0) return null;

          return (
              <div key={category} className="max-w-7xl mx-auto px-4 md:px-0 py-8 border-t border-gray-200">
                  <div className="flex justify-between items-end mb-6">
                      <h3 className="text-xl font-serif font-black text-gray-900 uppercase tracking-tight">{category} News</h3>
                      <Link to={`/category/${category}`} onNavigate={onNavigate} className="text-[9px] font-black text-news-accent uppercase tracking-widest hover:underline flex items-center gap-1">
                          View All <ChevronRight size={10} />
                      </Link>
                  </div>
                  
                  {/* Category Banner Ad */}
                  <AdvertisementBanner 
                    ads={advertisements} 
                    size="LEADERBOARD" 
                    placement="CATEGORY"
                    currentCategory={category}
                    globalAdsEnabled={globalAdsEnabled}
                    className="!my-0 mb-6 hidden md:flex"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {categoryArticles.map(article => (
                          <Link key={article.id} to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="group block">
                              <div className="aspect-[3/2] overflow-hidden rounded-lg mb-3 relative bg-gray-100">
                                  <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur text-white text-[8px] font-bold px-2 py-1 rounded-sm uppercase tracking-widest flex items-center gap-1">
                                      <Star size={8} fill="currentColor"/> {article.categories[0]}
                                  </span>
                              </div>
                              <h4 className="font-serif font-bold text-sm text-gray-900 leading-snug group-hover:text-news-accent transition-colors line-clamp-2">
                                  {article.title}
                              </h4>
                              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{article.subline || article.summary}</p>
                          </Link>
                      ))}
                  </div>
              </div>
          );
      })}

    </div>
  );
};

export default ReaderHome;
