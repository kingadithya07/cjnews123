
import React, { useState, useEffect, useRef } from 'react';
import { Article, Advertisement } from '../types';
import { ArrowLeft, Clock, Calendar, Share2, User, AlignLeft, Check, Loader2, Tag, Twitter, Facebook, Linkedin, Link as LinkIcon, ArrowRight } from 'lucide-react';
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
  if (!article) return <div className="flex flex-col items-center justify-center py-40 text-gray-400"><p className="font-serif text-lg">Story not found.</p><Link to="/" onNavigate={onNavigate} className="mt-4 text-xs font-bold uppercase tracking-widest text-news-accent">Return Home</Link></div>;

  return (
    <div className="animate-in fade-in duration-500 pb-16">
      <AdvertisementBanner ads={advertisements} size="MOBILE_BANNER" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />
      
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-12 px-4 md:px-0">
        <div className="flex-1 min-w-0">
            <header className="mb-8 mt-6">
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-6">{article.title}</h1>
                <div className="flex items-center border-y border-gray-100 py-4 gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 overflow-hidden">
                        {article.authorAvatar ? <img src={article.authorAvatar} className="w-full h-full object-cover" /> : <User size={20} />}
                    </div>
                    <span className="font-bold text-gray-900 uppercase text-xs">{article.author}</span>
                </div>
            </header>

            <img src={article.imageUrl} className="w-full h-auto mb-10 shadow-lg rounded" />
            
            {/* Slot Guide inside content */}
            <AdvertisementBanner ads={advertisements} size="RECTANGLE" placement="ARTICLE" globalAdsEnabled={globalAdsEnabled} />

            <article 
              className="prose prose-slate max-w-none font-serif text-gray-800 !leading-snug text-lg" 
              dangerouslySetInnerHTML={{ __html: article.content || '<p>Loading story...</p>' }} 
            />
            
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
