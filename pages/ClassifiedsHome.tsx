
import React, { useState } from 'react';
import { ClassifiedAd, Advertisement } from '../types';
import { MapPin, Phone, Tag, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';
import AdvertisementBanner from '../components/Advertisement';

interface ClassifiedsHomeProps {
  classifieds: ClassifiedAd[];
  adCategories: string[];
  advertisements: Advertisement[];
  globalAdsEnabled: boolean;
}

const ClassifiedsHome: React.FC<ClassifiedsHomeProps> = ({ classifieds, adCategories, advertisements, globalAdsEnabled }) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['All', ...adCategories];

  const filteredAds = classifieds.filter(ad => {
    const matchesCategory = activeCategory === 'All' || ad.category === activeCategory;
    const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ad.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="animate-in fade-in duration-500 min-h-screen bg-gray-50 pb-20">
      <div className="bg-news-black text-white py-16 px-4 mb-8">
         <div className="max-w-7xl mx-auto text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 tracking-tight">Marketplace & Classifieds</h1>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">Connect with your local community.</p>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        
        {/* Visual Marker: Top Slot for Marketplace */}
        <AdvertisementBanner 
            ads={advertisements} 
            size="LEADERBOARD" 
            placement="CLASSIFIEDS"
            globalAdsEnabled={globalAdsEnabled}
            className="mb-8"
        />
        
        <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-news-black outline-none" />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
                {categories.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? 'bg-news-accent text-white' : 'bg-white text-gray-600 border'}`}>
                        {cat}
                    </button>
                ))}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAds.map(ad => (
                <div key={ad.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                    <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded">{ad.category}</span>
                            <span className="text-lg font-bold text-news-accent font-serif">{ad.price}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2 font-serif">{ad.title}</h3>
                        <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-4">{ad.content}</p>
                    </div>
                    <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-sm text-gray-800"><Phone size={14} className="text-news-gold"/> {ad.contactInfo}</div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ClassifiedsHome;
