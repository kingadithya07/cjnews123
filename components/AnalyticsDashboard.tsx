
import React, { useMemo, useState, useEffect } from 'react';
import { Article, UserRole, ArticleStatus } from '../types';
import { BarChart3, FileText, CheckCircle, Clock, TrendingUp, PieChart as PieChartIcon, AlertCircle, Globe, Users, Eye, Activity, MapPin } from 'lucide-react';

interface AnalyticsDashboardProps {
  articles: Article[];
  role: UserRole;
}

const COLORS = ['#0f2b46', '#c5a059', '#b91c1c', '#333333', '#64748b', '#94a3b8', '#cbd5e1'];
const GEO_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ articles, role }) => {
  // Simulate live data updates
  const [activeUsers, setActiveUsers] = useState(124);

  useEffect(() => {
    const interval = setInterval(() => {
        // Randomly fluctuate active users to simulate real-time
        setActiveUsers(prev => Math.max(50, prev + Math.floor(Math.random() * 10) - 5));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // --- Real-time Calculations ---
  const stats = useMemo(() => {
    const total = articles.length;
    const published = articles.filter(a => a.status === ArticleStatus.PUBLISHED).length;
    const drafts = articles.filter(a => a.status === ArticleStatus.DRAFT).length;
    const pending = articles.filter(a => a.status === ArticleStatus.PENDING).length;
    
    // Category Distribution
    const catMap: Record<string, number> = {};
    const tagMap: Record<string, number> = {};
    
    // Mock View Counts based on content length/random for demo
    let totalViews = 0;

    articles.forEach(a => {
      // Categories
      a.categories.forEach(cat => {
        catMap[cat] = (catMap[cat] || 0) + 1;
      });

      // Mock Tags & Trending based on content + random
      // In a real app, 'tags' would be a property on Article. 
      // Here we simulate trending topics from title keywords or categories
      const keywords = a.title.split(' ').filter(w => w.length > 4);
      const primaryKeyword = keywords[0] || a.categories[0];
      
      // Simulate views: Base + (Length * Random)
      const mockArticleViews = Math.floor(a.content.length * (Math.random() * 0.5 + 0.1));
      totalViews += mockArticleViews;

      tagMap[primaryKeyword] = (tagMap[primaryKeyword] || 0) + mockArticleViews;
    });
    
    const categories = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Trending Topics (Top 5 by calculated "views")
    const trending = Object.entries(tagMap)
      .map(([topic, views]) => ({ topic, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // Mock Geography Data (Deterministic based on total views for stability)
    const geoDistribution = [
        { name: 'United States', value: Math.floor(totalViews * 0.40) },
        { name: 'India', value: Math.floor(totalViews * 0.25) },
        { name: 'United Kingdom', value: Math.floor(totalViews * 0.15) },
        { name: 'Germany', value: Math.floor(totalViews * 0.10) },
        { name: 'Others', value: Math.floor(totalViews * 0.10) },
    ];

    // Estimated total words
    const totalWords = articles.reduce((acc, curr) => {
        const txt = curr.content.replace(/<[^>]*>/g, '');
        return acc + txt.split(/\s+/).length;
    }, 0);

    return { total, published, drafts, pending, categories, totalWords, totalViews, trending, geoDistribution };
  }, [articles]);

  // --- SVG Pie Chart Component ---
  const PieChart = ({ data, colors }: { data: { name: string; value: number }[], colors: string[] }) => {
    const total = data.reduce((acc, cur) => acc + cur.value, 0);
    let currentAngle = 0;

    if (total === 0) return <div className="text-center text-xs text-gray-400 py-10">No data available</div>;

    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-8">
        <div className="relative w-48 h-48 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
            {data.map((entry, index) => {
              const sliceAngle = (entry.value / total) * 360;
              const x1 = 50 + 50 * Math.cos((Math.PI * currentAngle) / 180);
              const y1 = 50 + 50 * Math.sin((Math.PI * currentAngle) / 180);
              const x2 = 50 + 50 * Math.cos((Math.PI * (currentAngle + sliceAngle)) / 180);
              const y2 = 50 + 50 * Math.sin((Math.PI * (currentAngle + sliceAngle)) / 180);
              
              const largeArc = sliceAngle > 180 ? 1 : 0;
              const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
              const color = colors[index % colors.length];
              
              currentAngle += sliceAngle;

              return (
                <path
                  key={entry.name}
                  d={pathData}
                  fill={color}
                  stroke="white"
                  strokeWidth="1"
                  className="hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <title>{entry.name}: {entry.value.toLocaleString()}</title>
                </path>
              );
            })}
            {/* Inner Circle for Donut Effect */}
            <circle cx="50" cy="50" r="30" fill="white" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total</span>
             <span className="text-sm font-black text-news-black">{total.toLocaleString()}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-2 w-full max-w-xs">
            {data.slice(0, 10).map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }}></span>
                        <span className="font-bold text-gray-700">{entry.name}</span>
                    </div>
                    <span className="font-mono text-gray-500 text-[10px]">{Math.round((entry.value/total)*100)}%</span>
                </div>
            ))}
        </div>
      </div>
    );
  };

  const StatCard = ({ icon: Icon, label, value, subtext, colorClass }: any) => (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
      <div className="flex justify-between items-start mb-2">
        <div className={`p-2 rounded-lg ${colorClass || 'bg-gray-50 text-gray-600'}`}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        {subtext && <p className="text-[10px] text-gray-400 mt-1">{subtext}</p>}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-gray-900 flex items-center gap-2">
              <Activity className="text-news-accent" /> Real-Time Analytics
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Live Data
          </span>
      </div>

      {/* Top Row Stats - Expanded */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard 
            icon={Eye} 
            label="Total Views" 
            value={stats.totalViews.toLocaleString()} 
            subtext="+12% from last week"
            colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
            icon={Users} 
            label="Active Readers" 
            value={activeUsers} 
            subtext="Right now"
            colorClass="bg-green-50 text-green-600"
        />
        <StatCard 
            icon={FileText} 
            label="Total Articles" 
            value={stats.total} 
            subtext="Content Inventory"
            colorClass="bg-gray-50 text-gray-600"
        />
        <StatCard 
            icon={CheckCircle} 
            label="Published" 
            value={stats.published} 
            subtext="Live on site"
            colorClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard 
            icon={AlertCircle} 
            label="Pending" 
            value={stats.pending} 
            subtext="Needs Review"
            colorClass="bg-yellow-50 text-yellow-600"
        />
        <StatCard 
            icon={Clock} 
            label="Avg. Read Time" 
            value="4m 12s" 
            subtext="Engagement Score"
            colorClass="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Visitor Geography Pie Chart */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-8 flex items-center gap-2 border-b border-gray-100 pb-4">
            <Globe size={18} className="text-news-gold" /> Visitor Geography
          </h4>
          <PieChart data={stats.geoDistribution} colors={GEO_COLORS} />
          <div className="mt-8 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
               <div>
                   <span className="block text-xl font-bold text-gray-900">42%</span>
                   <span className="text-[9px] uppercase tracking-widest text-gray-400">North America</span>
               </div>
               <div>
                   <span className="block text-xl font-bold text-gray-900">35%</span>
                   <span className="text-[9px] uppercase tracking-widest text-gray-400">Asia Pacific</span>
               </div>
               <div>
                   <span className="block text-xl font-bold text-gray-900">23%</span>
                   <span className="text-[9px] uppercase tracking-widest text-gray-400">Europe</span>
               </div>
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-8 flex items-center gap-2 border-b border-gray-100 pb-4">
            <PieChartIcon size={18} className="text-news-gold" /> Category Distribution
          </h4>
          <PieChart data={stats.categories} colors={COLORS} />
          <div className="mt-8 pt-4 border-t border-gray-100">
             <div className="flex justify-between items-center text-xs text-gray-500">
                 <span>Most Active Category</span>
                 <span className="font-bold text-news-black uppercase">{stats.categories[0]?.name || 'N/A'}</span>
             </div>
          </div>
        </div>

      </div>

      {/* Real-time Trending Topics */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <TrendingUp size={18} className="text-news-accent" /> Trending Topics (Real-Time)
                </h4>
                <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></span>
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Live</span>
                </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-gray-100">
               {stats.trending.map((topic, idx) => (
                   <div key={topic.topic} className="p-6 flex flex-col gap-2 hover:bg-gray-50 transition-colors group">
                       <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">0{idx + 1}</span>
                       <h5 className="font-serif font-bold text-lg text-gray-900 group-hover:text-news-accent transition-colors truncate">
                           #{topic.topic}
                       </h5>
                       <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                           <TrendingUp size={12} className="text-green-500" />
                           {topic.views.toLocaleString()} reads
                       </div>
                   </div>
               ))}
               {stats.trending.length === 0 && (
                   <div className="col-span-full p-8 text-center text-gray-400 italic text-sm">
                       Not enough data to determine trends.
                   </div>
               )}
           </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
