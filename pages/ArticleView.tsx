
import React, { useState, useEffect, useRef } from 'react';
import { Article, Advertisement } from '../types';
import { ArrowLeft, Clock, Calendar, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, User, ArrowRight, Newspaper, AlignLeft, Check, Loader2, Tag as TagIcon } from 'lucide-react';
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

  useEffect(() => {
    if (!articleId) { setIsLoading(false); return; }
    setIsLoading(true);
    const found = articles.find(a => a.id === articleId);
    setArticle(found);
    setIsLoading(false);
  }, [articleId, articles]);

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
                </div>
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-6 leading-tight">{article.title}</h1>
                <div className="flex items-center border-y border-gray-200 py-4 gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 shrink-0 overflow-hidden">
                        {article.authorAvatar ? <img src={article.authorAvatar} className="w-full h-full object-cover" /> : <User size={20} />}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 uppercase text-xs">{article.author}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{format(new Date(article.publishedAt), 'MMMM dd, yyyy')}</span>
                    </div>
                </div>
            </header>

            <img src={article.imageUrl} className="w-full h-auto mb-10 shadow-lg rounded" />

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
                            <span key={tag} className="text-[10px] font-bold uppercase tracking-widest text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 hover:bg-gray-100 transition-colors cursor-default">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            <AdvertisementBanner ads={advertisements} size="LEADERBOARD" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />
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
