
import React, { useState, useEffect, useRef } from 'react';
import { Article, Advertisement } from '../types';
import { ArrowLeft, Clock, Calendar, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, User, ArrowRight, Newspaper, AlignLeft, Check } from 'lucide-react';
import { format, isValid } from 'date-fns';
import Link from '../components/Link';
import AdvertisementBanner from '../components/Advertisement';
import { createSlug } from '../utils';
import { supabase } from '../supabaseClient';

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
  const [copied, setCopied] = useState(false);
  const isSharing = useRef(false);

  // Helper for safe date formatting
  const safeFormat = (dateValue: any, formatStr: string) => {
    if (!dateValue) return 'N/A';
    const d = new Date(dateValue);
    return isValid(d) ? format(d, formatStr) : 'N/A';
  };

  useEffect(() => {
    const found = articles.find(a => a.id === articleId);
    setArticle(found);
    
    if (found) {
      // Calculate Word Count
      const text = found.content.replace(/<[^>]*>/g, ' '); // Strip HTML tags
      const count = text.trim().split(/\s+/).length;
      setWordCount(count);
      setReadTime(Math.ceil(count / 200)); // Approx 200 wpm

      // 1. Related Articles (Overlap in categories)
      // Find articles that share at least one category with the current article
      let related = articles
        .filter(a => a.id !== found.id && a.categories.some(cat => found.categories.includes(cat)))
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

  // Track View Count
  useEffect(() => {
      const incrementView = async () => {
          if (!articleId) return;
          try {
              // Attempt to increment view in DB
              const { data } = await supabase.from('articles').select('views').eq('id', articleId).single();
              // If data exists, update it. Note: 'views' column must exist in DB.
              // If it doesn't exist, this will just fail silently in the background which is acceptable for a prototype.
              if (data) {
                  await supabase.from('articles').update({ views: (data.views || 0) + 1 }).eq('id', articleId);
              }
          } catch (e) {
              // Ignore errors if views column missing or network issue
              console.warn("Could not increment view count", e);
          }
      };
      
      // Only increment if we actually found the article object in props first
      if (articles.find(a => a.id === articleId)) {
          incrementView();
      }
  }, [articleId, articles]);

  const getPermalink = () => {
      if (!article) return '';
      
      // Robust Logic: Database Slug -> Generated Slug -> ID Fallback
      let identifier = article.slug;
      
      // If no slug in DB or it's empty
      if (!identifier || identifier.trim() === '') {
          identifier = createSlug(article.title);
      }
      
      // If title generated an empty slug (e.g. symbols only), fall back to ID
      if (!identifier || identifier.trim() === '') {
          identifier = article.id;
      }
      
      // Final safety check to ensure we don't return ".../article/"
      if (!identifier) return window.location.href;
      
      return `${window.location.origin}/#/article/${identifier}`;
  };

  const handleCopyLink = () => {
      const permalink = getPermalink();
      if (!permalink) return;

      navigator.clipboard.writeText(permalink).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      });
  };

  const handleShare = async () => {
      if (!article) return;
      const permalink = getPermalink();
      
      if (navigator.share) {
          if (isSharing.current) return;
          isSharing.current = true;
          try {
              await navigator.share({
                  title: article.title,
                  text: article.subline || article.title,
                  url: permalink
              });
          } catch (error: any) {
              // Ignore abort errors (user cancellation)
              if (error.name !== 'AbortError') {
                  console.error('Share failed:', error);
              }
          } finally {
              isSharing.current = false;
          }
      } else {
          handleCopyLink();
      }
  };

  const handleSocialShare = (platform: 'twitter' | 'facebook' | 'linkedin') => {
      if (!article) return;
      const permalink = getPermalink();
      const text = encodeURIComponent(article.title);
      const url = encodeURIComponent(permalink);
      
      let shareUrl = '';
      if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
      if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
      if (platform === 'linkedin') shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
      
      window.open(shareUrl, '_blank', 'width=600,height=400');
  };

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
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-wrap gap-2">
                        {article.categories.map(cat => (
                            <span key={cat} className="inline-block bg-news-secondary text-white text-xs font-bold px-3 py-1 uppercase tracking-widest rounded-sm">
                                {cat}
                            </span>
                        ))}
                    </div>
                    {/* Share Button (Top Right - Mobile/Universal) */}
                    <div className="flex gap-2">
                        <button onClick={handleShare} className="flex items-center gap-2 bg-gray-100 hover:bg-news-gold hover:text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors text-gray-600">
                            <Share2 size={14} /> <span className="hidden sm:inline">Share</span>
                        </button>
                    </div>
                </div>
                
                {/* Desktop: Reduced font size to text-3xl (same as mobile base) which is smaller than previous 4xl */}
                <h1 className="text-3xl md:text-3xl font-serif font-bold text-gray-900 mb-6 leading-tight">
                    {article.title}
                </h1>

                {article.subline && (
                    <h2 className="text-xl md:text-lg font-serif text-gray-700 leading-snug mb-8 border-l-4 border-news-gold pl-4 italic">
                        {article.subline}
                    </h2>
                )}

                {/* Profile Name, Date, Duration in Straight Line */}
                <div className="flex items-center border-y border-gray-200 py-4 gap-4 flex-wrap">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                        {article.authorAvatar ? (
                            <img src={article.authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                        ) : (
                            <User size={18} />
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-600 font-medium">
                        <span className="font-bold text-gray-900 uppercase tracking-wide">{authorName}</span>
                        <span className="text-gray-300">|</span>
                        <span className="flex items-center whitespace-nowrap"><Calendar size={14} className="mr-1.5 text-news-gold"/> {safeFormat(article.publishedAt, 'MMM d, yyyy')}</span>
                        <span className="text-gray-300">|</span>
                        <span className="flex items-center whitespace-nowrap"><Clock size={14} className="mr-1.5 text-news-gold"/> {readTime} min read</span>
                        <span className="text-gray-300">|</span>
                        <span className="flex items-center whitespace-nowrap"><AlignLeft size={14} className="mr-1.5 text-news-gold"/> {wordCount} words</span>
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
                    Featured image for {article.categories[0]} section.
                </figcaption>
            </figure>

            {/* Article Content - Enforcing 14px on mobile via prose modifiers, falling back to regular size on desktop */}
            <article 
              className="prose prose-slate max-w-none font-serif text-gray-800 leading-loose mb-12 prose-p:text-[14px] md:prose-p:text-[17px] prose-li:text-[14px] md:prose-li:text-[17px] prose-headings:font-serif" 
              dangerouslySetInnerHTML={{ __html: article.content }} 
            />

            {/* Tags */}
            <div className="mt-10 pt-6 border-t border-gray-100 mb-10">
                <div className="flex flex-wrap gap-2">
                    {article.categories.map(cat => (
                         <span key={cat} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase tracking-wide">#{cat}</span>
                    ))}
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
                
                {/* In This Section Box */}
                <div className="bg-gray-50 border border-gray-200 p-6 mt-8">
                    {/* Share moved here */}
                    <div className="mb-6 pb-6 border-b border-gray-200 space-y-4">
                        <div>
                             <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 block">Share Article</span>
                             <div className="flex gap-2">
                                <button onClick={() => handleSocialShare('twitter')} className="flex-1 py-2 rounded bg-white border border-gray-200 hover:bg-blue-50 text-gray-600 hover:text-blue-400 transition-colors flex justify-center"><Twitter size={16} /></button>
                                <button onClick={() => handleSocialShare('facebook')} className="flex-1 py-2 rounded bg-white border border-gray-200 hover:bg-blue-50 text-gray-600 hover:text-blue-800 transition-colors flex justify-center"><Facebook size={16} /></button>
                                <button onClick={() => handleSocialShare('linkedin')} className="flex-1 py-2 rounded bg-white border border-gray-200 hover:bg-blue-50 text-gray-600 hover:text-blue-700 transition-colors flex justify-center"><Linkedin size={16} /></button>
                                <button onClick={handleCopyLink} className="flex-1 py-2 rounded bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors flex justify-center relative">
                                    {copied ? <Check size={16} className="text-green-600"/> : <LinkIcon size={16} />}
                                </button>
                             </div>
                        </div>
                    </div>

                    <h4 className="font-bold text-sm uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">In This Section</h4>
                    <div className="space-y-4">
                        {relatedArticles.map(rel => (
                            <Link to={`/article/${rel.slug || rel.id}`} onNavigate={onNavigate} key={rel.id} className="block group">
                                <h5 className="font-serif font-bold text-sm text-gray-900 group-hover:text-news-accent transition-colors leading-snug mb-1">
                                    {rel.title}
                                </h5>
                                <span className="text-xs text-gray-500">{safeFormat(rel.publishedAt, 'MMM d')}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Skyscraper Ad */}
                 <AdvertisementBanner 
                    ads={advertisements} 
                    size="SKYSCRAPER" 
                    placement="ARTICLE"
                    globalAdsEnabled={globalAdsEnabled}
                    className="hidden lg:flex"
                />
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
                        View {article.categories[0]} <ArrowRight size={14} className="ml-1"/>
                    </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {relatedArticles.map(rel => (
                        <Link to={`/article/${rel.slug || rel.id}`} onNavigate={onNavigate} key={rel.id} className="group block bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                            <div className="overflow-hidden relative">
                                <img 
                                    src={rel.imageUrl} 
                                    alt={rel.title}
                                    className="w-full h-auto transform group-hover:scale-105 transition-transform duration-500"
                                />
                                <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 uppercase rounded-sm backdrop-blur-sm">
                                    {rel.categories[0]}
                                </span>
                            </div>
                            <div className="p-5">
                                <h4 className="text-lg font-serif font-bold text-gray-900 mb-2 leading-snug group-hover:text-news-accent transition-colors">
                                    {rel.title}
                                </h4>
                                <div className="text-xs text-gray-400 flex items-center">
                                    <Clock size={12} className="mr-1" />
                                    {safeFormat(rel.publishedAt, 'MMM d')}
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
                     {/* Changed from grid-cols-1 md:grid-cols-2 lg:grid-cols-4 to grid-cols-1 to make them one by one */}
                     <div className="grid grid-cols-1 gap-6">
                        {moreArticles.map(more => (
                             <Link to={`/article/${more.slug || more.id}`} onNavigate={onNavigate} key={more.id} className="group block bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                                <div className="flex flex-row gap-6 items-start">
                                    <div className="w-24 md:w-32 flex-shrink-0 rounded-md overflow-hidden bg-gray-200 aspect-video">
                                        <img 
                                            src={more.imageUrl} 
                                            alt={more.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-news-accent uppercase tracking-widest mb-1">
                                            {more.categories[0]}
                                        </div>
                                        <h5 className="font-serif font-bold text-lg text-gray-900 leading-snug group-hover:text-news-accent transition-colors mb-1">
                                            {more.title}
                                        </h5>
                                        <p className="text-xs text-gray-500 line-clamp-2 hidden sm:block">
                                            {more.subline || more.summary || more.content.replace(/<[^>]*>/g, '').slice(0, 100) + '...'}
                                        </p>
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
