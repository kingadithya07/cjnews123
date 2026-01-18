
import React, { useState, useEffect } from 'react';
import { Article, EPaperPage, Advertisement } from '../types';
import { ArrowRight, TrendingUp, Clock, ChevronRight, ChevronLeft, MapPin, User, Star, ArrowLeft, Newspaper, Calendar, X, Filter, Tag as TagIcon } from 'lucide-react';
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

  const displayArticles = selectedCategory 
    ? articles.filter(a => a.categories.includes(selectedCategory))
    : articles;

  const featuredCandidates = displayArticles.filter(a => a.isFeatured);
  const sliderArticles = featuredCandidates.length > 0 
      ? featuredCandidates.slice(0, 5) 
      : displayArticles.slice(0, 5);

  const sliderIds = new Set(sliderArticles.map(a => a.id));
  const trendingArticles = displayArticles.filter(a => !sliderIds.has(a.id)).slice(0, 6);
  const trendingIds = new Set(trendingArticles.map(a => a.id));
  const mainFeedArticles = displayArticles.filter(a => !sliderIds.has(a.id) && !trendingIds.has(a.id)).slice(0, 14);
  const homeCategorySections = !selectedCategory ? categories.filter(c => c !== 'General') : [];
  const latestEPaper = ePaperPages.find(p => p.pageNumber === 1) || ePaperPages[0];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % (sliderArticles.length || 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused, sliderArticles.length]);

  const nextSlide = (e?: React.MouseEvent) => {
      e?.preventDefault();
      setCurrentSlide((prev) => (prev + 1) % sliderArticles.length);
  };

  const prevSlide = (e?: React.MouseEvent) => {
      e?.preventDefault();
      setCurrentSlide((prev) => (prev - 1 + sliderArticles.length) % sliderArticles.length);
  };

  if (selectedCategory) {
      const filteredCategoryArticles = dateFilter 
          ? displayArticles.filter(a => a.publishedAt.startsWith(dateFilter))
          : displayArticles;

      return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-7xl mx-auto px-4 md:px-0">
            <div className="pt-6 flex justify-between items-center">
                <button onClick={() => onNavigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-news-black transition-colors text-xs font-bold uppercase tracking-widest group">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Home
                </button>
            </div>

            <div className="bg-news-black text-white py-12 px-6 rounded-lg shadow-xl relative overflow-hidden">
                <h1 className="font-serif text-4xl md:text-5xl font-bold uppercase tracking-tight text-center relative z-10">{selectedCategory}</h1>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 text-gray-500">
                    <Filter size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">{filteredCategoryArticles.length} Articles Found</span>
                </div>
                <div className="relative flex items-center w-full md:w-auto">
                    <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm font-bold text-gray-700 outline-none w-full" />
                </div>
            </div>

            <AdvertisementBanner ads={advertisements} size="LEADERBOARD" placement="CATEGORY" currentCategory={selectedCategory} globalAdsEnabled={globalAdsEnabled} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCategoryArticles.map(article => (
                    <Link key={article.id} to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="group block bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                        <div className="aspect-video relative overflow-hidden">
                            <img src={article.imageUrl} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={article.title} />
                            <div className="absolute top-2 left-2"><span className="bg-white/90 backdrop-blur text-black text-[8px] font-black px-2 py-1 uppercase rounded-sm">{article.categories[0]}</span></div>
                        </div>
                        <div className="p-5">
                            <h3 className="font-serif font-bold text-lg leading-snug text-gray-900 group-hover:text-news-accent transition-colors mb-2">{article.title}</h3>
                            {/* --- CARD TAGS --- */}
                            {article.tags && article.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {article.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className="text-[8px] font-black text-news-accent uppercase tracking-tighter bg-red-50 px-1.5 py-0.5 rounded">#{tag}</span>
                                    ))}
                                </div>
                            )}
                            <div className="text-xs text-gray-400 flex items-center">
                                <Clock size={12} className="mr-1" /> {safeFormat(article.publishedAt, 'MMM d, yyyy')}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <AdvertisementBanner ads={advertisements} size="MOBILE_BANNER" placement="HOME" globalAdsEnabled={globalAdsEnabled} />

      <div className="max-w-7xl mx-auto -mx-4 md:mx-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-auto lg:h-[560px]">
              <div className="lg:col-span-2 w-full h-[250px] sm:h-[350px] md:h-[500px] lg:h-full relative rounded-none md:rounded-2xl overflow-hidden shadow-2xl bg-news-black group border-y md:border border-gray-800" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
                  <div className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                      {sliderArticles.map((article) => (
                          <div key={article.id} className="w-full shrink-0 relative h-full bg-[#050505]">
                              <img src={article.imageUrl} alt={article.title} className="absolute inset-0 w-full h-full object-contain z-10" />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 md:p-10 pt-24 z-20">
                                  <Link to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="block group/title max-w-2xl">
                                      <h2 className="text-lg md:text-3xl font-display font-black text-white leading-tight mb-3 group-hover/title:text-news-gold transition-colors tracking-tight line-clamp-2 md:line-clamp-none">{article.title}</h2>
                                  </Link>
                                  {article.tags && article.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mb-4">
                                          {article.tags.slice(0, 4).map(tag => (
                                              <span key={tag} className="text-[7px] md:text-[9px] font-black text-news-gold border border-news-gold/30 px-2 py-0.5 rounded uppercase tracking-widest">#{tag}</span>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
                  <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/20 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all z-30 border border-white/10"><ChevronLeft size={20} /></button>
                  <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/20 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all z-30 border border-white/10"><ChevronRight size={20} /></button>
              </div>
              <div className="lg:col-span-1 hidden lg:flex flex-col h-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative">
                  {latestEPaper && (
                      <Link to="/epaper" onNavigate={onNavigate} className="flex-1 flex flex-col h-full">
                          <div className="flex-1 bg-gray-100 p-4 flex items-center justify-center relative"><img src={latestEPaper.imageUrl} className="max-h-[310px] w-auto shadow-2xl" /></div>
                          <div className="bg-white p-6 border-t border-gray-100 z-10">
                              <span className="text-[10px] font-black uppercase text-news-accent flex items-center gap-1.5 mb-2"><Newspaper size={12}/> Digital Edition</span>
                              <h3 className="font-serif font-bold text-2xl text-gray-900 leading-tight mb-3">Today's E-Paper</h3>
                              <div className="w-full bg-news-black text-white text-xs font-black uppercase py-3 rounded text-center">Read Full Edition</div>
                          </div>
                      </Link>
                  )}
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-0">
           <div className="flex items-center gap-2 mb-6 border-b border-gray-200 pb-3">
               <TrendingUp className="text-news-accent" size={20}/>
               <h3 className="text-lg font-black uppercase tracking-widest text-gray-900">Trending Now</h3>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {trendingArticles.map((article, idx) => (
                   <Link key={article.id} to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="group flex gap-4 items-start p-4 bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all">
                       <div className="w-20 h-20 shrink-0 rounded-md overflow-hidden bg-gray-200 relative border border-gray-100">
                           <img src={article.imageUrl} loading="lazy" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"/>
                       </div>
                       <div className="flex-1 min-w-0">
                           <h4 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2 group-hover:text-news-accent mb-2">{article.title}</h4>
                           {article.tags && article.tags.length > 0 && (
                               <div className="flex flex-wrap gap-1 mb-2">
                                   {article.tags.slice(0, 2).map(tag => (
                                       <span key={tag} className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">#{tag}</span>
                                   ))}
                               </div>
                           )}
                           <div className="text-[10px] text-gray-400 font-bold uppercase"><Clock size={10} className="inline mr-1"/> {safeFormat(article.publishedAt, 'MMM d')}</div>
                       </div>
                   </Link>
               ))}
           </div>
      </div>

      <AdvertisementBanner ads={advertisements} size="BILLBOARD" placement="HOME" globalAdsEnabled={globalAdsEnabled} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 px-4 md:px-0 max-w-7xl mx-auto">
        <div className="lg:col-span-8 space-y-8">
            <h3 className="text-[10px] font-black text-gray-900 mb-6 flex items-center uppercase tracking-[0.3em] border-b border-gray-100 pb-3">Latest Stories</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
               {mainFeedArticles.map(article => (
                   <Link key={article.id} to={`/article/${article.slug || article.id}`} onNavigate={onNavigate} className="group block flex flex-col h-full">
                       <div className="overflow-hidden mb-4 relative shadow-sm rounded-lg">
                            <img src={article.imageUrl} loading="lazy" className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700 aspect-video object-cover"/>
                            <div className="absolute top-2 left-2"><span className="bg-white/90 backdrop-blur text-black text-[9px] font-black px-2 py-1 uppercase rounded-sm">{article.categories[0]}</span></div>
                       </div>
                       <h3 className="text-base font-serif font-bold text-gray-900 mb-3 leading-tight group-hover:text-news-accent">{article.title}</h3>
                       {article.tags && article.tags.length > 0 && (
                           <div className="flex flex-wrap gap-1.5 mb-3">
                               {article.tags.slice(0, 3).map(tag => (
                                   <span key={tag} className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">#{tag}</span>
                               ))}
                           </div>
                       )}
                       <p className="text-xs text-gray-500 line-clamp-3 mb-4 flex-grow font-sans leading-relaxed" dangerouslySetInnerHTML={{ __html: article.content.substring(0, 140) + '...' }}/>
                       <div className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em] flex items-center">Read Story <ArrowRight size={12} className="ml-1 group-hover:translate-x-1 transition-transform"/></div>
                   </Link>
               ))}
            </div>
        </div>
        <div className="lg:col-span-4 space-y-10">
             <AdvertisementBanner ads={advertisements} size="HALF_PAGE" placement="HOME" globalAdsEnabled={globalAdsEnabled} className="!my-0"/>
             <AdvertisementBanner ads={advertisements} size="RECTANGLE" placement="HOME" globalAdsEnabled={globalAdsEnabled} className="!my-0"/>
        </div>
      </div>
    </div>
  );
};

export default ReaderHome;
