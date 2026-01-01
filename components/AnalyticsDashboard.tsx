
import React, { useMemo } from 'react';
import { Article, UserRole, ArticleStatus } from '../types';
import { BarChart3, FileText, CheckCircle, Clock, TrendingUp, PieChart as PieChartIcon, AlertCircle } from 'lucide-react';

interface AnalyticsDashboardProps {
  articles: Article[];
  role: UserRole;
}

const COLORS = ['#0f2b46', '#c5a059', '#b91c1c', '#333333', '#64748b', '#94a3b8', '#cbd5e1'];

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ articles, role }) => {
  // --- Real-time Calculations ---
  const stats = useMemo(() => {
    const total = articles.length;
    const published = articles.filter(a => a.status === ArticleStatus.PUBLISHED).length;
    const drafts = articles.filter(a => a.status === ArticleStatus.DRAFT).length;
    const pending = articles.filter(a => a.status === ArticleStatus.PENDING).length;
    
    // Category Distribution
    const catMap: Record<string, number> = {};
    articles.forEach(a => {
      catMap[a.category] = (catMap[a.category] || 0) + 1;
    });
    
    const categories = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort highest first

    // Estimated total words (rough proxy for effort)
    const totalWords = articles.reduce((acc, curr) => {
        const txt = curr.content.replace(/<[^>]*>/g, '');
        return acc + txt.split(/\s+/).length;
    }, 0);

    return { total, published, drafts, pending, categories, totalWords };
  }, [articles]);

  // --- SVG Pie Chart Component ---
  const PieChart = ({ data }: { data: { name: string; value: number }[] }) => {
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
              const color = COLORS[index % COLORS.length];
              
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
                  <title>{entry.name}: {entry.value}</title>
                </path>
              );
            })}
            {/* Inner Circle for Donut Effect */}
            <circle cx="50" cy="50" r="30" fill="white" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</span>
             <span className="text-xl font-black text-news-black">{total}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-2 w-full max-w-xs">
            {data.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="font-bold text-gray-700">{entry.name}</span>
                    </div>
                    <span className="font-mono text-gray-500">{Math.round((entry.value / total) * 100)}%</span>
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
              <TrendingUp className="text-news-accent" /> Real-Time Performance
          </h2>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Live Data
          </span>
      </div>

      {/* Top Row Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
            icon={FileText} 
            label="Total Articles" 
            value={stats.total} 
            subtext="All time content"
            colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
            icon={CheckCircle} 
            label="Published" 
            value={stats.published} 
            subtext="Live on site"
            colorClass="bg-green-50 text-green-600"
        />
        <StatCard 
            icon={AlertCircle} 
            label="Pending/Draft" 
            value={stats.drafts + stats.pending} 
            subtext="In pipeline"
            colorClass="bg-yellow-50 text-yellow-600"
        />
        <StatCard 
            icon={Clock} 
            label="Total Words" 
            value={stats.totalWords.toLocaleString()} 
            subtext="Content volume"
            colorClass="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Pie Chart */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="font-bold text-gray-800 mb-8 flex items-center gap-2 border-b border-gray-100 pb-4">
            <PieChartIcon size={18} className="text-news-gold" /> Category Distribution
          </h4>
          <PieChart data={stats.categories} />
        </div>

        {/* Status Breakdown / Quick Facts */}
        <div className="bg-white p-6 md:p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h4 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-news-gold" /> Content Health
          </h4>
          
          <div className="flex-1 space-y-6">
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-600 uppercase tracking-wide">
                    <span>Publication Rate</span>
                    <span>{stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${stats.total > 0 ? (stats.published / stats.total) * 100 : 0}%` }}></div>
                </div>
             </div>

             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-600 uppercase tracking-wide">
                    <span>Draft Inventory</span>
                    <span>{stats.total > 0 ? Math.round((stats.drafts / stats.total) * 100) : 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-400 transition-all duration-500" style={{ width: `${stats.total > 0 ? (stats.drafts / stats.total) * 100 : 0}%` }}></div>
                </div>
             </div>

             <div className="p-4 bg-gray-50 rounded-lg mt-auto border border-gray-100">
                 <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                    This dashboard reflects real-time database statistics. Charts update automatically as articles are added, modified, or changed in status.
                 </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
