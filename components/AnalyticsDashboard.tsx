
import React, { useMemo } from 'react';
import { Article, UserRole, ArticleStatus } from '../types';
import { BarChart3, FileText, CheckCircle, Clock, PieChart as PieChartIcon, AlertCircle, Users, Activity, PenTool, Hash, Globe } from 'lucide-react';
import { format } from 'date-fns';

interface AnalyticsDashboardProps {
  articles: Article[];
  role: UserRole;
  activeVisitors?: number;
}

const COLORS = ['#0f2b46', '#c5a059', '#b91c1c', '#333333', '#64748b', '#94a3b8', '#cbd5e1'];
const STATUS_COLORS = {
    [ArticleStatus.PUBLISHED]: '#10b981', // Green
    [ArticleStatus.PENDING]: '#f59e0b',   // Yellow
    [ArticleStatus.DRAFT]: '#64748b'      // Gray
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ articles, role, activeVisitors }) => {
  // --- Real Calculations based on Props ---
  const stats = useMemo(() => {
    const total = articles.length;
    const published = articles.filter(a => a.status === ArticleStatus.PUBLISHED).length;
    const drafts = articles.filter(a => a.status === ArticleStatus.DRAFT).length;
    const pending = articles.filter(a => a.status === ArticleStatus.PENDING).length;
    
    // Category Distribution
    const catMap: Record<string, number> = {};
    // Author Distribution
    const authorMap: Record<string, number> = {};
    
    // Total Word Count Calculation
    let totalWords = 0;

    articles.forEach(a => {
      // Categories
      a.categories.forEach(cat => {
        catMap[cat] = (catMap[cat] || 0) + 1;
      });

      // Authors
      if (a.author) {
          authorMap[a.author] = (authorMap[a.author] || 0) + 1;
      }

      // Word Count
      const text = a.content.replace(/<[^>]*>/g, ' ');
      const words = text.trim().split(/\s+/).length;
      totalWords += words;
    });
    
    const categories = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const authors = Object.keys(authorMap).length;

    // Status Distribution
    const statusDist = [
        { name: 'Published', value: published, color: STATUS_COLORS[ArticleStatus.PUBLISHED] },
        { name: 'Pending', value: pending, color: STATUS_COLORS[ArticleStatus.PENDING] },
        { name: 'Drafts', value: drafts, color: STATUS_COLORS[ArticleStatus.DRAFT] },
    ].filter(d => d.value > 0);

    // Recent Activity (Top 5 most recent)
    const recent = [...articles]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 5);

    return { total, published, drafts, pending, categories, totalWords, authors, statusDist, recent };
  }, [articles]);

  // --- SVG Pie Chart Component ---
  const PieChart = ({ data, colors }: { data: { name: string; value: number; color?: string }[], colors: string[] }) => {
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
              const color = entry.color || colors[index % colors.length];
              
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
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color || colors[index % colors.length] }}></span>
                        <span className="font-bold text-gray-700">{entry.name}</span>
                    </div>
                    <span className="font-mono text-gray-500 text-[10px]">{Math.round((entry.value/total)*100)}% ({entry.value})</span>
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
              <Activity className="text-news-accent" /> Platform Analytics
          </h2>
      </div>

      {/* Top Row Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {activeVisitors !== undefined && (
             <StatCard 
                icon={Globe} 
                label="Active Readers" 
                value={activeVisitors.toLocaleString()} 
                subtext="Real-time"
                colorClass="bg-red-50 text-red-600 animate-pulse"
            />
        )}
        <StatCard 
            icon={FileText} 
            label="Total Articles" 
            value={stats.total.toLocaleString()} 
            subtext="All Time"
            colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
            icon={CheckCircle} 
            label="Published" 
            value={stats.published} 
            subtext="Live Content"
            colorClass="bg-green-50 text-green-600"
        />
        <StatCard 
            icon={AlertCircle} 
            label="Pending Review" 
            value={stats.pending} 
            subtext="Requires Action"
            colorClass="bg-yellow-50 text-yellow-600"
        />
        <StatCard 
            icon={PenTool} 
            label="Drafts" 
            value={stats.drafts} 
            subtext="In Progress"
            colorClass="bg-gray-50 text-gray-600"
        />
        <StatCard 
            icon={Hash} 
            label="Total Words" 
            value={(stats.totalWords / 1000).toFixed(1) + 'k'} 
            subtext="Content Volume"
            colorClass="bg-purple-50 text-purple-600"
        />
        <StatCard 
            icon={Users} 
            label="Contributors" 
            value={stats.authors} 
            subtext="Active Writers"
            colorClass="bg-indigo-50 text-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Status Pie Chart */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-8 flex items-center gap-2 border-b border-gray-100 pb-4">
            <BarChart3 size={18} className="text-news-gold" /> Content Status
          </h4>
          <PieChart data={stats.statusDist} colors={COLORS} />
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-8 flex items-center gap-2 border-b border-gray-100 pb-4">
            <PieChartIcon size={18} className="text-news-gold" /> Category Distribution
          </h4>
          <PieChart data={stats.categories} colors={COLORS} />
        </div>

      </div>

      {/* Recent Activity List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
           <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Clock size={18} className="text-news-accent" /> Recently Updated
                </h4>
           </div>
           <div className="divide-y divide-gray-100">
               {stats.recent.map((article, idx) => (
                   <div key={article.id} className="p-4 md:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                       <div className="flex items-center gap-4">
                           <span className="text-xs font-mono text-gray-400 w-6">0{idx + 1}</span>
                           <div>
                               <h5 className="font-bold text-sm text-gray-900 line-clamp-1">{article.title}</h5>
                               <div className="flex items-center gap-2 mt-1">
                                   <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                                       article.status === ArticleStatus.PUBLISHED ? 'bg-green-100 text-green-700' :
                                       article.status === ArticleStatus.PENDING ? 'bg-yellow-100 text-yellow-700' :
                                       'bg-gray-100 text-gray-600'
                                   }`}>
                                       {article.status}
                                   </span>
                                   <span className="text-[10px] text-gray-400">•</span>
                                   <span className="text-[10px] text-gray-500">{article.author}</span>
                                   <span className="text-[10px] text-gray-400">•</span>
                                   <span className="text-[10px] text-gray-500">{format(new Date(article.publishedAt), 'MMM d, h:mm a')}</span>
                               </div>
                           </div>
                       </div>
                       <div className="text-right hidden md:block">
                           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{article.categories[0]}</span>
                       </div>
                   </div>
               ))}
               {stats.recent.length === 0 && (
                   <div className="p-8 text-center text-gray-400 italic text-sm">
                       No activity recorded yet.
                   </div>
               )}
           </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
