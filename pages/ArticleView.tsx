
import React, { useState, useEffect, useRef } from 'react';
import { Article, Advertisement } from '../types';
import { ArrowLeft, Clock, Calendar, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, User, ArrowRight, Newspaper, AlignLeft, Check, Loader2 } from 'lucide-react';
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

const ArticleView: React.FC<ArticleViewProps> = ({ articles = [], articleId, onNavigate, advertisements = [], globalAdsEnabled }) => {
  const [article, setArticle] = useState<Article | undefined>(undefined);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [moreArticles, setMoreArticles] = useState<Article[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [readTime, setReadTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const isSharing = useRef(false);

  useEffect(() => {
    if (!articleId || !articles) return;
    const found = articles.find(a => a.id === articleId);
    setArticle(found);
    
    if (found) {
      const contentText = String(found.content || '');
      const text = contentText.replace(/<[^>]*>/g, ' '); 
      const count = text.trim().split(/\s+/).length;
      setWordCount(count);
      setReadTime(Math.ceil(count / 200));

      const currentCategories = found.categories || [];
      let related = articles
        .filter(a => {
            if (!a || a.id === found.id) return false;
            const aCats = a.categories || [];
            return aCats.some(cat => currentCategories.includes(cat));
        })
        .slice(0, 3);
      
      if (related.length < 3) {
        const others = articles
          .filter(a => a && a.id !== found.id && !related.find(r => r.id === a.id))
          .slice(0, 3 - related.length);
        related = [...related, ...others];
      }
      setRelatedArticles(related);

      const usedIds = new Set([found.id, ...related.map(r => r.id)]);
      const remaining = articles.filter(a => a && !usedIds.has(a.id));
      remaining.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      setMoreArticles(remaining.slice(0, 4));
    }
  }, [articleId, articles]);

  useEffect(() => {
      const incrementView = async () => {
          if (!articleId) return;
          try {
              const { data } = await supabase.from('articles').select('views').eq('id', articleId).maybeSingle();
              if (data) await supabase.from('articles').update({ views: (data.views || 0) + 1 }).eq('id', articleId);
          } catch (e) { console.warn("View tracking failed", e); }
      };
      if (article) incrementView();
  }, [articleId, article]);

  if (!articleId) {
      return (
          <div className="flex flex-col items-center justify-center py-40 text-gray-400">
              <Loader2 size={32} className="animate-spin text-news-gold mb-4" />
              <p className="font-serif text-sm font-bold uppercase tracking-widest">Identifying Story...</p>
          </div>
      );
  }

  if (!article) {
    return (
        <div className="flex flex-col items-center justify-center py-40 text-gray-400">
            <Newspaper size={48} className="mb-4 opacity-20" />
            <p className="font-serif text-lg">Story not found or currently unavailable.</p>
            <Link to="/" onNavigate={onNavigate} className="mt-4 text-xs font-bold uppercase tracking-widest text-news-accent hover:underline">Return Home</Link>
        </div>
    );
  }
  
  const authorName = String(article.author || 'Editorial Staff').split(',')[0].trim();
  const cats = article.categories || ['General'];
  const pubDate = article.publishedAt ? new Date(article.publishedAt) : new Date();

  return (
    <div className="animate-in fade-in duration-500 pb-16">
      <AdvertisementBanner ads={advertisements} size="MOBILE_BANNER" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 w-full">
        <div className="flex-1 min-w-0">
            <Link to="/" onNavigate={onNavigate} className="inline-flex items-center text-gray-500 hover:text-news-accent hover:underline my-8 text-sm font-medium">
                <ArrowLeft size={16} className="mr-1" /> Back to Newsroom
            </Link>

            <header className="mb-8">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-wrap gap-2">
                        {cats.map(cat => (
                            <span key={cat} className="inline-block bg-news-secondary text-white text-xs font-bold px-3 py-1 uppercase tracking-widest rounded-sm">{cat}</span>
                        ))}
                    </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 mb-6 leading-tight">{article.title}</h1>
                {article.subline && <h2 className="text-xl md:text-lg font-serif text-gray-700 leading-snug mb-8 border-l-4 border-news-gold pl-4 italic">{article.subline}</h2>}

                <div className="flex items-center border-y border-gray-200 py-4 gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 overflow-hidden">
                        {article.authorAvatar ? <img src={article.authorAvatar} className="w-full h-full object-cover" /> : <User size={20} />}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-900 uppercase tracking-wide text-xs md:text-sm">{authorName}</span>
                            <span className="text-gray-300">|</span>
                            <span className="flex items-center text-xs text-gray-600"><Calendar size={14} className="mr-1.5 text-news-gold"/> {isValid(pubDate) ? format(pubDate, 'MMM d, yyyy') : 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </header>

            <figure className="mb-10 -mx-4 md:mx-0">
                <img src={article.imageUrl || 'https://placehold.co/800x400'} alt={article.title} className="w-full h-auto md:rounded-sm shadow-sm bg-gray-100" />
            </figure>

            <article 
              className="prose prose-slate max-w-none w-full font-serif text-gray-800 !leading-loose prose-p:text-[18px] mb-12" 
              dangerouslySetInnerHTML={{ __html: String(article.content || '<p>Detailed report pending.</p>') }} 
            />
            
            <AdvertisementBanner ads={advertisements} size="LEADERBOARD" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />
        </div>

        <div className="hidden md:block w-[300px] flex-shrink-0 space-y-8 mt-16">
             <div className="sticky top-24">
                <AdvertisementBanner ads={advertisements} size="RECTANGLE" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />
                <div className="bg-gray-50 border border-gray-200 p-6 mt-8">
                    <h4 className="font-bold text-sm uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Related News</h4>
                    <div className="space-y-4">
                        {relatedArticles.map(rel => (
                            <Link to={`/article/${rel.slug || rel.id}`} onNavigate={onNavigate} key={rel.id} className="block group">
                                <h5 className="font-serif font-bold text-sm text-gray-900 group-hover:text-news-accent transition-colors leading-snug mb-1">{rel.title}</h5>
                                <span className="text-[10px] text-gray-400 font-bold uppercase">{rel.categories?.[0] || 'General'}</span>
                            </Link>
                        ))}
                    </div>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleView;
