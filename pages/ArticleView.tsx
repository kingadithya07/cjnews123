
import React, { useState, useEffect, useRef } from 'react';
import { Article, Advertisement } from '../types';
import { ArrowLeft, Clock, Calendar, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, User, ArrowRight, Newspaper, AlignLeft, Check, Loader2, Tag } from 'lucide-react';
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
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [moreArticles, setMoreArticles] = useState<Article[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [readTime, setReadTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isSharing = useRef(false);

  useEffect(() => {
    if (!articleId) { setIsLoading(false); return; }
    setIsLoading(true);
    const found = articles.find(a => a.id === articleId);
    setArticle(found);
    if (found) {
      const text = (found.content || '').replace(/<[^>]*>/g, ' '); 
      const count = text.trim().split(/\s+/).length;
      setWordCount(count);
      setReadTime(Math.ceil(count / 200));
      setRelatedArticles(articles.filter(a => a.id !== found.id && a.categories.some(cat => found.categories.includes(cat))).slice(0, 3));
      setMoreArticles(articles.filter(a => a.id !== found.id).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 4));
    }
    setIsLoading(false);
  }, [articleId, articles]);

  if (isLoading) return <div className="flex flex-col items-center justify-center py-40 text-gray-400"><Loader2 size={48} className="animate-spin text-news-gold" /></div>;
  if (!article) return <div className="flex flex-col items-center justify-center py-40 text-gray-400"><Newspaper size={48} className="mb-4 opacity-20" /><p className="font-serif text-lg">Story not found.</p></div>;

  return (
    <div className="animate-in fade-in duration-500 pb-16">
      
      {/* Visual Marker: Mobile Top Slot */}
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
                    <span className="font-bold text-gray-900 uppercase text-xs">{article.author}</span>
                </div>
            </header>

            <img src={article.imageUrl} className="w-full h-auto mb-10 shadow-lg rounded" />

            {/* Visual Marker: Inline Content Ad */}
            <AdvertisementBanner ads={advertisements} size="RECTANGLE" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />

            <article 
              className="prose prose-slate max-w-none w-full font-serif text-gray-800 !leading-snug text-lg" 
              dangerouslySetInnerHTML={{ __html: article.content || '<p>Report pending...</p>' }} 
            />
            
            {/* Visual Marker: Bottom Desktop Slot */}
            <AdvertisementBanner ads={advertisements} size="LEADERBOARD" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />
        </div>

        <div className="hidden md:block w-[300px] flex-shrink-0 pt-20">
             <div className="sticky top-24 space-y-6">
                {/* Visual Markers: Sidebar Ads */}
                <AdvertisementBanner ads={advertisements} size="RECTANGLE" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />
                <AdvertisementBanner ads={advertisements} size="SKYSCRAPER" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />
             </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleView;
