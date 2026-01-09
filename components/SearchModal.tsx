
import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Clock, ArrowRight, FileText } from 'lucide-react';
import { Article } from '../types';
import Link from './Link';
import { format } from 'date-fns';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  onNavigate: (path: string) => void;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, articles, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      setQuery('');
      setResults([]);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
    
    const filtered = articles.filter(article => {
      const title = article.title.toLowerCase();
      const content = (article.content || '').toLowerCase();
      const category = (article.categories?.[0] || '').toLowerCase();
      
      // Check if ALL search terms match at least one field (AND logic for better relevance)
      return searchTerms.every(term => 
        title.includes(term) || content.includes(term) || category.includes(term)
      );
    }).slice(0, 8); // Limit to 8 suggestions

    setResults(filtered);
  }, [query, articles]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-news-paper/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
      {/* Search Header */}
      <div className="max-w-4xl mx-auto w-full px-4 pt-6 pb-4">
        <div className="relative flex items-center">
          <Search className="absolute left-4 text-gray-400" size={24} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search news, topics, or authors..."
            className="w-full bg-white border border-gray-200 pl-14 pr-12 py-5 rounded-2xl shadow-xl text-lg md:text-2xl font-serif font-bold text-news-black placeholder:text-gray-300 focus:outline-none focus:border-news-gold focus:ring-2 focus:ring-news-gold/20 transition-all"
          />
          <button 
            onClick={onClose}
            className="absolute right-3 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-20">
        <div className="max-w-4xl mx-auto w-full">
          {query && results.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                <FileText size={12} /> Top Recommendations
              </div>
              <div className="divide-y divide-gray-100">
                {results.map((article) => (
                  <Link 
                    key={article.id}
                    to={`/article/${article.slug || article.id}`}
                    onNavigate={(path) => {
                      onNavigate(path);
                      onClose();
                    }}
                    className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="w-16 h-16 md:w-24 md:h-16 shrink-0 bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
                      <img src={article.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black uppercase text-news-accent tracking-widest bg-red-50 px-1.5 py-0.5 rounded">
                          {article.categories[0]}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <Clock size={10} /> {format(new Date(article.publishedAt), 'MMM d')}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-gray-900 leading-tight group-hover:text-news-blue transition-colors line-clamp-2">
                        {article.title}
                      </h4>
                    </div>
                    <div className="self-center opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                      <ArrowRight size={20} className="text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {query && results.length === 0 && (
            <div className="text-center py-20 opacity-50">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <Search size={32} className="text-gray-400" />
              </div>
              <p className="font-serif text-lg text-gray-600">No matches found for "{query}"</p>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">Try different keywords</p>
            </div>
          )}

          {!query && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
               <div className="p-6 bg-white border border-gray-100 rounded-xl">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Popular Topics</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Politics', 'Technology', 'World', 'Sports', 'Business'].map(tag => (
                      <button 
                        key={tag} 
                        onClick={() => setQuery(tag)} 
                        className="px-3 py-1.5 bg-gray-50 hover:bg-news-black hover:text-white rounded-lg text-xs font-bold text-gray-600 transition-colors border border-gray-200"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
