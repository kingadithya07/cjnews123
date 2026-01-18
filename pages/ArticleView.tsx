
import React, { useState, useEffect, useMemo } from 'react';
import { Article, Advertisement } from '../types';
import { ArrowLeft, Clock, Calendar, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, User, ArrowRight, Newspaper, AlignLeft, Check, Loader2, Tag as TagIcon, BookOpen, FileText, Copy } from 'lucide-react';
import { format, isValid } from 'date-fns';
import Link from '../components/Link';
import AdvertisementBanner from '../components/Advertisement';
import { createSlug, getDeviceMetadata } from '../utils';
import { supabase } from '../supabaseClient';

interface ArticleViewProps {
  articles: Article[];
  articleId?: string;
  onNavigate: (path: string) => void;
  advertisements: Advertisement[];
  globalAdsEnabled: boolean;
}

const ArticleView: React.FC<ArticleViewProps> = ({ articles = [], articleId, onNavigate, advertisements = [], globalAdsEnabled }) => {
  const [article, setArticle] = useState<Article | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  
  // Metrics
  const [wordCount, setWordCount] = useState(0);
  const [readTime, setReadTime] = useState(0);
  
  // Share State
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!articleId) { setIsLoading(false); return; }
    setIsLoading(true);
    const found = articles.find(a => a.id === articleId);
    setArticle(found);
    
    if (found && found.content) {
        // Strip HTML tags for accurate word count
        const textContent = found.content.replace(/<[^>]+>/g, ' ');
        const words = textContent.trim().split(/\s+/).length;
        setWordCount(words);
        setReadTime(Math.ceil(words / 200)); // Avg reading speed 200 wpm
    }
    
    setIsLoading(false);
    window.scrollTo(0, 0); // Reset scroll on article change
  }, [articleId, articles]);

  // Logic for "Already Published Articles" (Related/Recent)
  const relatedArticles = useMemo(() => {
      if (!article) return [];
      return articles
        .filter(a => a.id !== article.id) // Exclude current
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()) // Sort by newest
        .slice(0, 4); // Take top 4
  }, [articles, article]);

  const handleShare = async () => {
      if (!article) return;
      const url = window.location.href;
      const shareData = {
          title: article.title,
          text: article.subline || article.title,
          url: url
      };

      if (navigator.share) {
          try {
              await navigator.share(shareData);
          } catch (err) {
              console.log('Share dialog closed');
          }
      } else {
          navigator.clipboard.writeText(url);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      }
  };

  const safeFormat = (dateValue: any, formatStr: string) => {
    if (!dateValue) return 'N/A';
    const d = new Date(dateValue);
    return isValid(d) ? format(d, formatStr) : 'N/A';
  };

  if (isLoading) return <div className="flex flex-col items-center justify-center py-40 text-gray-400"><Loader2 size={48} className="animate-spin text-news-gold" /></div>;
  if (!article) return <div className="flex flex-col items-center justify-center py-40 text-gray-400"><Newspaper size={48} className="mb-4 opacity-20" /><p className="font-serif text-lg">Story not found.</p></div>;

  return (
    <div className="animate-in fade-in duration-500 pb-16">
      
      <AdvertisementBanner ads={advertisements} size="MOBILE_BANNER" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 px-0 w-full">
        <div className="flex-1 min-w-0">
            <header className="mb-8 mt-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-wrap gap-2">
                        {article.categories.map(cat => <span key={cat} className="inline-block bg-news-secondary text-white text-xs font-bold px-3 py-1 uppercase tracking-widest rounded-sm">{cat}</span>)}
                    </div>
                    
                    {/* SHARE BUTTON */}
                    <button 
                        onClick={handleShare}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-gray-100 hover:bg-news-gold hover:text-white transition-all px-4 py-2 rounded-full text-gray-600"
                    >
                        {isCopied ? <Check size={14} /> : <Share2 size={14} />}
                        {isCopied ? 'Link Copied' : 'Share Story'}
                    </button>
                </div>
                
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-6 leading-tight">{article.title}</h1>
                
                <div className="flex flex-col sm:flex-row sm:items-center border-y border-gray-200 py-4 gap-4 sm:gap-8">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                            {article.authorAvatar ? <img src={article.authorAvatar} className="w-full h-full object-cover" /> : <User size={20} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-900 uppercase text-xs">{article.author}</span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{format(new Date(article.publishedAt), 'MMMM dd, yyyy')}</span>
                        </div>
                    </div>
                    
                    {/* Metrics Section */}
                    <div className="flex items-center gap-6 text-gray-400">
                        <div className="flex items-center gap-1.5" title={`${wordCount} words`}>
                            <FileText size={14} className="text-news-gold" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{wordCount} Words</span>
                        </div>
                        <div className="flex items-center gap-1.5" title={`${readTime} min read`}>
                            <BookOpen size={14} className="text-news-gold" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{readTime} Min Read</span>
                        </div>
                    </div>
                </div>
            </header>

            <img src={article.imageUrl} className="w-full h-auto mb-10 shadow-lg rounded" alt={article.title} />

            <AdvertisementBanner ads={advertisements} size="RECTANGLE" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />

            <article 
              className="prose prose-slate max-w-none w-full font-serif text-gray-800 !leading-snug text-lg" 
              dangerouslySetInnerHTML={{ __html: article.content || '<p>Report pending...</p>' }} 
            />

            {/* --- TAG DISPLAY SECTION --- */}
            {article.tags && article.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        <TagIcon size={12}/> Story Tags
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {article.tags.map(tag => (
                            <Link 
                                key={tag} 
                                to={`/tag/${tag}`} 
                                onNavigate={onNavigate}
                                className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 hover:bg-news-black hover:text-white transition-colors cursor-pointer"
                            >
                                #{tag}
                            </Link>
                        ))}
                    </div>
                </div>
            )}
            
            <AdvertisementBanner ads={advertisements} size="LEADERBOARD" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />

            {/* --- ALREADY PUBLISHED / RELATED ARTICLES SECTION --- */}
            {relatedArticles.length > 0 && (
                <div className="mt-16 pt-10 border-t-4 border-black">
                    <h3 className="text-xl font-serif font-black text-gray-900 mb-8 uppercase tracking-tight flex items-center gap-3">
                        <span className="w-2 h-8 bg-news-gold rounded-full"></span>
                        Latest Dispatches
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {relatedArticles.map((relArticle) => (
                            <Link 
                                key={relArticle.id} 
                                to={`/article/${relArticle.slug || relArticle.id}`} 
                                onNavigate={onNavigate} 
                                className="group flex flex-col h-full bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all"
                            >
                                <div className="aspect-video relative overflow-hidden bg-gray-100">
                                    <img 
                                        src={relArticle.imageUrl} 
                                        alt={relArticle.title} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                                    />
                                    <div className="absolute top-2 left-2">
                                        <span className="bg-white/90 backdrop-blur text-black text-[9px] font-black px-2 py-1 uppercase rounded-sm">
                                            {relArticle.categories[0]}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <h4 className="font-serif font-bold text-gray-900 mb-2 leading-tight group-hover:text-news-blue transition-colors line-clamp-2">
                                        {relArticle.title}
                                    </h4>
                                    <div className="mt-auto pt-3 flex items-center justify-between text-gray-400 border-t border-gray-50">
                                        <span className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                                            <Clock size={10} /> {safeFormat(relArticle.publishedAt, 'MMM d')}
                                        </span>
                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-news-gold" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <div className="hidden md:block w-[300px] flex-shrink-0 pt-20">
             <div className="sticky top-24 space-y-6">
                <AdvertisementBanner ads={advertisements} size="RECTANGLE" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />
                <AdvertisementBanner ads={advertisements} size="SKYSCRAPER" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />
             </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleView;
