
import React, { useState, useEffect } from 'react';
import { Article, Advertisement } from '../types';
import { ArrowLeft, Clock, Calendar, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, User, ArrowRight, Newspaper, AlignLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from '../components/Link';
import AdvertisementBanner from '../components/Advertisement';

interface ArticleViewProps {
  articles: Article[];
  articleId?: string;
  onNavigate: (path: string) => void;
  advertisements: Advertisement[];
  globalAdsEnabled: boolean;
}

const ArticleView: React.FC<ArticleViewProps> = ({ articles, articleId, onNavigate, advertisements, globalAdsEnabled }) => {
  const [article, setArticle] = useState<Article | undefined>(undefined);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [moreArticles, setMoreArticles] = useState<Article[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [readTime, setReadTime] = useState(0);

  useEffect(() => {
    const found = articles.find(a => a.id === articleId);
    setArticle(found);
    
    if (found) {
      // Calculate Word Count
      const text = found.content.replace(/<[^>]*>/g, ' '); // Strip HTML tags
      const count = text.trim().split(/\s+/).length;
      setWordCount(count);
      setReadTime(Math.ceil(count / 200)); // Approx 200 wpm

      // 1. Related Articles (Same Category)
      let related = articles
        .filter(a => a.category === found.category && a.id !== found.id)
        .slice(0, 3);
      
      // If not enough related, fill with recent
      if (related.length < 3) {
        const others = articles
          .filter(a => a.id !== found.id && !related.find(r => r.id === a.id))
          .slice(0, 3 - related.length);
        related = [...related, ...others];
      }
      setRelatedArticles(related);

      // 2. More Articles (General Pool)
      // Exclude current and already shown related articles
      const usedIds = new Set([found.id, ...related.map(r => r.id)]);
      const remaining = articles.filter(a => !usedIds.has(a.id));
      
      // Sort by newest
      remaining.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      
      setMoreArticles(remaining.slice(0, 4));
    }
  }, [articleId, articles]);

  if (!article) {
    return <div className="text-center py-20 text-gray-500">Article not found.</div>;
  }
  
  const [authorName, authorRole] = article.author.split(',').map(s => s.trim());

  return (
    <div className="animate-in fade-in duration-500 pb-16">
      
      {/* Top Mobile Banner */}
      <AdvertisementBanner 
        ads={advertisements} 
        size="MOBILE_BANNER" 
        placement="ARTICLE"
        globalAdsEnabled={globalAdsEnabled}
      />

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 px-4 md:px-0">
        
        {/* Main Content Column */}
        <div className="flex-1">
            {/* Navigation */}
            <Link to="/" onNavigate={onNavigate} className="inline-flex items-center text-gray-500 hover:text-news-accent hover:underline my-8 transition-colors text-sm font-medium">
            <ArrowLeft size={16} className="mr-1" /> Back to Headlines
            </Link>

            {/* Header Section */}
            <header className="mb-8">
                <span className="inline-block bg-news-secondary text-white text-xs font-bold px-3 py-1 uppercase tracking-widest rounded-sm mb-4">
                    {article.category}
                </span>
                
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-serif font-bold text-gray-900 mb-4 leading-tight">
                    {article.title}
                </h1>

                {article.subline && (
                    <h2 className="text-xl md:text-2xl font-serif text-gray-700 leading-snug mb-6 border-l-4 border-news-gold pl-4 italic">
                        {article.subline}
                    </h2>
                )}

                <div className="flex flex-col md:flex-row md:items-center justify-between border-y border-gray-200 py-6">
                    <div className="flex items-center space-x-4 mb-4 md:mb-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                            {/* Fixed: Removed non-existent md:size prop from User icon */}
                            <User size={20} />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 text-sm uppercase tracking-wide">By {authorName}</p>
                            {authorRole && <p className="text-xs text-gray-500 italic -mt-0.5">{authorRole}</p>}
                            <div className="flex items-center text-gray-500 text-xs md:text-sm space-x-3 mt-1">
                                <span className="flex items-center"><Calendar size={12} className="mr-1"/> {format(new Date(article.publishedAt), 'MMM d, yyyy')}</span>
                                <span className="flex items-center"><Clock size={12} className="mr-1"/> {readTime} min read</span>
                                <span className="flex items-center"><AlignLeft size={12} className="mr-1"/> {wordCount} words</span>
                            </div>
                        </div>
                    </div>

                    {/* Social Share */}
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-500 uppercase mr-2 hidden md:inline">Share</span>
                        <button className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-600 transition-colors"><Twitter size={18} /></button>
                        <button className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-800 transition-colors"><Facebook size={18} /></button>
                        <button className="p-2 rounded-full bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 transition-colors"><Linkedin size={18} /></button>
                        <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"><LinkIcon size={18} /></button>
                    </div>
                </div>
            </header>

            {/* Featured Image */}
            <figure className="mb-10 -mx-4 md:mx-0">
                <img 
                    src={article.imageUrl} 
                    alt={article.title} 
                    className="w-full h-auto md:rounded-sm shadow-sm"
                />
                <figcaption className="text-xs md:text-sm text-gray-500 mt-2 italic text-center px-4">
                    Featured image for {article.category} section.
                </figcaption>
            </figure>

            {/* Article Content */}
            <article className="prose prose-lg prose-slate max-w-none font-serif text-gray-800 leading-loose mb-12" dangerouslySetInnerHTML={{ __html: article.content }} />

            {/* Tags */}
            <div className="mt-10 pt-6 border-t border-gray-100 mb-10">
                <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wide">#{article.category}</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wide">#News</span>
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wide">#Trending</span>
                </div>
            </div>
            
             {/* Bottom Leaderboard */}
             <AdvertisementBanner 
                ads={advertisements} 
                size="LEADERBOARD" 
                placement="ARTICLE"
                globalAdsEnabled={globalAdsEnabled}
            />

        </div>

        {/* Right Sidebar (Desktop) */}
        <div className="hidden md:block w-[300px] flex-shrink-0 space-y-8 mt-16">
             <div className="sticky top-24">
                
                {/* Rectangle Ad */}
                <AdvertisementBanner 
                    ads={advertisements} 
                    size="RECTANGLE" 
                    placement="ARTICLE"
                    globalAdsEnabled={globalAdsEnabled}
                />
                
                {/* Skyscraper Ad */}
                 <AdvertisementBanner 
                    ads={advertisements} 
                    size="SKYSCPER" 
                    placement="ARTICLE"
                    globalAdsEnabled={globalAdsEnabled}
                    className="hidden lg:flex"
                />
                
                {/* Mini Related List */}
                <div className="bg-gray-50 border border-gray-200 p-6 mt-8">
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">In This Section</h4>
                    <div className="space-y-4">
                        {relatedArticles.map(rel => (
                            <Link to={`/article/${rel.id}`} onNavigate={onNavigate} key={rel.id} className="block group">
                                <h5 className="font-serif font-bold text-sm text-gray-900 group-hover:text-news-accent transition-colors leading-snug mb-1">
                                    {rel.title}
                                </h5>
                                <span className="text-xs text-gray-500">{format(new Date(rel.publishedAt), 'MMM d')}</span>
                            </Link>
                        ))}
                    </div>
                </div>
             </div>
        </div>

      </div>

      {/* --- BOTTOM SECTION: EXTENDED READS --- */}
      <div className="bg-gray-50 border-t border-gray-200 mt-12 py-12">
        <div className="max-w-6xl mx-auto px-4">
            
            {/* 1. Read Next (Related) */}
            <div className="mb-16">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="font-serif font-bold text-2xl md:text-3xl text-gray-900">Read Next</h3>
                    <Link to="#" onNavigate={onNavigate} className="text-xs font-bold uppercase tracking-widest text-news-accent flex items-center hover:underline">
                        View {article.category} <ArrowRight size={14} className="ml-1"/>
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {relatedArticles.map(rel => (
                        <Link to={`/article/${rel.id}`} onNavigate={onNavigate} key={rel.id} className="group block bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="overflow-hidden relative">
                                <img 
                                    src={rel.imageUrl} 
                                    alt={rel.title}
                                    className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500"
                                />
                                <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 uppercase rounded-sm backdrop-blur-sm">
                                    {rel.category}
                                </span>
                            </div>
                            <div className="p-5">
                                <h4 className="text-lg font-serif font-bold text-gray-900 mb-2 leading-snug group-hover:text-news-accent transition-colors">
                                    {rel.title}
                                </h4>
                                <div className="text-xs text-gray-400 flex items-center">
                                    <Clock size={12} className="mr-1" />
                                    {format(new Date(rel.publishedAt), 'MMM d')}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* 2. More News (Latest) */}
            {moreArticles.length > 0 && (
                <div>
                     <h3 className="font-serif font-bold text-2xl md:text-3xl text-gray-900 mb-8 pb-4 border-b border-gray-200">
                        Latest Headlines
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {moreArticles.map(more => (
                             <Link to={`/article/${more.id}`} onNavigate={onNavigate} key={more.id} className="group block">
                                <div className="flex flex-row md:flex-col gap-4 items-start">
                                    <div className="w-24 md:w-full flex-shrink-0 rounded-md overflow-hidden bg-gray-200">
                                        <img 
                                            src={more.imageUrl} 
                                            alt={more.title}
                                            className="w-full h-auto group-hover:opacity-90 transition-opacity"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-news-accent uppercase tracking-widest mb-1">
                                            {more.category}
                                        </div>
                                        <h5 className="font-serif font-bold text-base text-gray-900 leading-snug group-hover:underline decoration-2 underline-offset-2">
                                            {more.title}
                                        </h5>
                                    </div>
                                </div>
                             </Link>
                        ))}
                     </div>
                </div>
            )}
            
        </div>
      </div>

    </div>
  );
};

export default ArticleView;
