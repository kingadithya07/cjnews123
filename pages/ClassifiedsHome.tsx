
import React, { useState } from 'react';
import { ClassifiedAd, Advertisement } from '../types';
import { MapPin, Phone, Tag, Clock, DollarSign, Filter, Search } from 'lucide-react';
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

  // Helper to format phone using the requested SQL pattern: ##-###-####
  const formatPhone = (val: string) => {
      const digits = val.replace(/\D/g, '');
      if (digits.length >= 10) {
          return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`;
      }
      return val;
  };

  const filteredAds = classifieds.filter(ad => {
    const matchesCategory = activeCategory === 'All' || ad.category === activeCategory;
    const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          ad.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="animate-in fade-in duration-500 min-h-screen bg-gray-50 pb-20">
      
      {/* Header Banner */}
      <div className="bg-news-black text-white py-16 px-4 mb-8">
         <div className="max-w-7xl mx-auto text-center">
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-4 tracking-tight">Marketplace & Classifieds</h1>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                Connect with your community. Find jobs, homes, services, and hidden treasures.
            </p>
         </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        
        {/* Banner Ad for Classifieds Section */}
        <AdvertisementBanner 
            ads={advertisements} 
            size="LEADERBOARD" 
            placement="CLASSIFIEDS"
            globalAdsEnabled={globalAdsEnabled}
            className="mb-8"
        />
        
        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-6 mb-10 items-center justify-between">
            {/* Search */}
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search listings..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-news-black focus:border-transparent outline-none shadow-sm"
                />
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2 justify-center">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                            activeCategory === cat 
                            ? 'bg-news-accent text-white shadow-md' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAds.length === 0 ? (
                <div className="col-span-full text-center py-20 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                    <Tag size={48} className="mx-auto mb-4 opacity-20"/>
                    <p className="text-lg font-serif">No classifieds found matching your criteria.</p>
                </div>
            ) : (
                filteredAds.map(ad => (
                    <div key={ad.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded">
                                    {ad.category}
                                </span>
                                {ad.price && (
                                    <span className="text-lg font-bold text-news-accent font-serif">
                                        {ad.price}
                                    </span>
                                )}
                            </div>
                            
                            <h3 className="text-xl font-bold text-gray-900 mb-2 font-serif leading-snug">{ad.title}</h3>
                            <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-4">{ad.content}</p>
                            
                            <div className="space-y-2 text-xs text-gray-500 border-t border-gray-100 pt-4">
                                {ad.location && (
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} className="text-gray-400"/> {ad.location}
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <Clock size={14} className="text-gray-400"/> Posted {format(new Date(ad.postedAt), 'MMM d, yyyy')}
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase">Contact</span>
                            <div className="flex items-center gap-2 font-bold text-sm text-gray-800">
                                <Phone size={14} className="text-news-gold"/>
                                {formatPhone(ad.contactInfo)}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>

      </div>
    </div>
  );
};

export default ClassifiedsHome;
