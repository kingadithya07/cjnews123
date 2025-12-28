
import React from 'react';
import { Article, UserRole } from '../types';
import { BarChart3, Users, Eye, Clock, TrendingUp, Newspaper, MousePointer2 } from 'lucide-react';

interface AnalyticsDashboardProps {
  articles: Article[];
  role: UserRole;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ articles, role }) => {
  // Mock aggregated data
  const totalViews = articles.length * 1240;
  const avgReadTime = "4:20";
  const engagementRate = "12.4%";
  
  const categories = Array.from(new Set(articles.map(a => a.category)));
  const statsByCategory = categories.map(cat => ({
    name: cat,
    count: articles.filter(a => a.category === cat).length,
    percentage: Math.round((articles.filter(a => a.category === cat).length / articles.length) * 100)
  }));

  const StatCard = ({ icon: Icon, label, value, trend }: any) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-news-paper rounded-lg text-news-accent">
          <Icon size={20} />
        </div>
        {trend && (
          <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
            <TrendingUp size={10} /> {trend}
          </span>
        )}
      </div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{label}</p>
      <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Row Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Newspaper} label="Total Articles" value={articles.length} trend="+12%" />
        <StatCard icon={Eye} label="Total Page Views" value={totalViews.toLocaleString()} trend="+18.5%" />
        <StatCard icon={Clock} label="Avg. Read Time" value={avgReadTime} />
        <StatCard icon={MousePointer2} label="Engagement Rate" value={engagementRate} trend="+2.1%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-8 flex items-center gap-2">
            <BarChart3 size={18} className="text-news-gold" /> Content Distribution by Category
          </h4>
          <div className="space-y-6">
            {statsByCategory.map(stat => (
              <div key={stat.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-gray-700">{stat.name}</span>
                  <span className="text-gray-400">{stat.count} Articles ({stat.percentage}%)</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-news-black transition-all duration-1000 ease-out" 
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reader Demographics (Mock) */}
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Users size={18} className="text-news-gold" /> Audience Reach
          </h4>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-news-paper rounded-lg">
                <span className="text-xs font-bold text-gray-600 uppercase">Subscribers</span>
                <span className="font-bold text-news-black">4,280</span>
             </div>
             <div className="flex items-center justify-between p-4 bg-news-paper rounded-lg">
                <span className="text-xs font-bold text-gray-600 uppercase">Guest Readers</span>
                <span className="font-bold text-news-black">12.1k</span>
             </div>
             <div className="flex items-center justify-between p-4 bg-news-paper rounded-lg border-l-4 border-news-accent">
                <span className="text-xs font-bold text-news-accent uppercase tracking-tighter">Premium Members</span>
                <span className="font-bold text-news-black">842</span>
             </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-100">
             <p className="text-[10px] text-gray-400 leading-relaxed italic">
                Analytics data is updated every 15 minutes. Views are calculated based on unique sessions longer than 10 seconds.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
