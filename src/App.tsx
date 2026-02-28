import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  Zap, 
  Activity, 
  Search, 
  ExternalLink, 
  ChevronRight,
  Loader2,
  Cpu,
  Ship,
  Landmark,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';

import { analyzeHeadline, GeopoliticalAnalysis } from './services/riskAnalyzer';
import { fetchNews, fetchCache, saveToCache, NewsItem, CachedAnalysis } from './services/newsService';
import GlobalMap from './components/GlobalMap';
import TrendChart from './components/TrendChart';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [cachedAnalyses, setCachedAnalyses] = useState<CachedAnalysis[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<GeopoliticalAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [customHeadline, setCustomHeadline] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const [newsData, cacheData] = await Promise.all([fetchNews(), fetchCache()]);
        setNews(newsData);
        setCachedAnalyses(cacheData);

        // Auto-analyze top 5 if cache is empty or sparse (simulating live monitoring)
        if (cacheData.length < 5 && newsData.length > 0) {
          const toAnalyze = newsData.slice(0, 5);
          for (const item of toAnalyze) {
            const analysis = await analyzeHeadline(item.headline);
            await saveToCache(item.id, item.headline, analysis, analysis.riskScore);
          }
          const updatedCache = await fetchCache();
          setCachedAnalyses(updatedCache);
        }
      } catch (error) {
        console.error("Initialization error:", error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const handleAnalyze = async (item: NewsItem | string) => {
    setLoading(true);
    const headline = typeof item === 'string' ? item : item.headline;
    const id = typeof item === 'string' ? `custom-${Date.now()}` : item.id;

    try {
      // Check cache first
      const cached = cachedAnalyses.find(c => c.id === id);
      if (cached) {
        setCurrentAnalysis(JSON.parse(cached.analysis));
        if (typeof item !== 'string') setSelectedNews(item);
      } else {
        const analysis = await analyzeHeadline(headline);
        setCurrentAnalysis(analysis);
        await saveToCache(id, headline, analysis, analysis.riskScore);
        const updatedCache = await fetchCache();
        setCachedAnalyses(updatedCache);
        if (typeof item !== 'string') setSelectedNews(item);
      }
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setLoading(false);
    }
  };

  const globalRiskIndex = useMemo(() => {
    if (cachedAnalyses.length === 0) return 0;
    const last15 = cachedAnalyses.slice(0, 15);
    const sum = last15.reduce((acc, curr) => acc + curr.risk_score, 0);
    return (sum / last15.length).toFixed(1);
  }, [cachedAnalyses]);

  const globalRiskLabel = useMemo(() => {
    const score = parseFloat(globalRiskIndex as string);
    if (score >= 7) return "Elevated Geopolitical Risk";
    if (score >= 4) return "Moderate Geopolitical Tension";
    return "Low Geopolitical Risk";
  }, [globalRiskIndex]);

  const trendData = useMemo(() => {
    return cachedAnalyses
      .map(c => ({
        date: c.timestamp,
        score: c.risk_score
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [cachedAnalyses]);

  const mapData = useMemo(() => {
    return cachedAnalyses.map(c => {
      const analysis: GeopoliticalAnalysis = JSON.parse(c.analysis);
      return { name: analysis.region, score: analysis.riskScore };
    });
  }, [cachedAnalyses]);

  const criticalEvents = useMemo(() => {
    return cachedAnalyses
      .filter(c => c.risk_score >= 7)
      .map(c => ({
        headline: c.headline,
        score: c.risk_score,
        analysis: JSON.parse(c.analysis) as GeopoliticalAnalysis
      }))
      .slice(0, 5);
  }, [cachedAnalyses]);

  const sectorImpacts = useMemo(() => {
    const sectors: Record<string, { count: number; reason: string[] }> = {
      'Energy': { count: 0, reason: [] },
      'Defense': { count: 0, reason: [] },
      'Semiconductors': { count: 0, reason: [] },
      'Shipping': { count: 0, reason: [] },
      'Banking': { count: 0, reason: [] },
      'Technology': { count: 0, reason: [] },
    };

    cachedAnalyses.forEach(c => {
      const analysis: GeopoliticalAnalysis = JSON.parse(c.analysis);
      analysis.industries.forEach(ind => {
        Object.keys(sectors).forEach(s => {
          if (ind.toLowerCase().includes(s.toLowerCase())) {
            sectors[s].count++;
            if (sectors[s].reason.length < 2) sectors[s].reason.push(analysis.consequences);
          }
        });
      });
    });

    return Object.entries(sectors).filter(([_, data]) => data.count > 0);
  }, [cachedAnalyses]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-zinc-400 font-mono">
        <Loader2 className="w-12 h-12 animate-spin mb-4 text-amber-500" />
        <div className="text-sm tracking-widest uppercase">Initializing GeoRisk Intelligence Network...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Shield className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">GeoRisk <span className="text-amber-500">AI</span></h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Geopolitical Risk Intelligence Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end border-r border-zinc-800 pr-6">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Global Risk Index</span>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-lg font-bold font-mono",
                  parseFloat(globalRiskIndex as string) >= 7 ? "text-red-500" :
                  parseFloat(globalRiskIndex as string) >= 4 ? "text-amber-500" :
                  "text-emerald-500"
                )}>
                  {globalRiskIndex} / 10
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">— {globalRiskLabel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Live Monitoring Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-12 gap-6">
        
        {/* Left Column: News & Custom Input */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          {/* Custom Input */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
              <Search className="w-3 h-3" /> Manual Analysis
            </h3>
            <div className="flex flex-col gap-2">
              <textarea 
                value={customHeadline}
                onChange={(e) => setCustomHeadline(e.target.value)}
                placeholder="Paste a custom geopolitical headline..."
                className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
              />
              <button 
                onClick={() => handleAnalyze(customHeadline)}
                disabled={!customHeadline || loading}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-black font-bold rounded-lg text-sm transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Run AI Analysis
              </button>
            </div>
          </section>

          {/* News Feed */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl flex flex-col h-[600px]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Activity className="w-3 h-3" /> Global Headlines
              </h3>
              <span className="text-[10px] font-mono text-zinc-600">{news.length} Items</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800">
              {news.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleAnalyze(item)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all group",
                    selectedNews?.id === item.id 
                      ? "bg-amber-500/10 border-amber-500/50" 
                      : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">{item.source}</span>
                    <ChevronRight className={cn("w-3 h-3 transition-transform", selectedNews?.id === item.id ? "rotate-90 text-amber-500" : "text-zinc-700 group-hover:translate-x-1")} />
                  </div>
                  <p className="text-xs font-medium leading-relaxed line-clamp-2 group-hover:text-zinc-100 transition-colors">
                    {item.headline}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Center Column: Map & Analysis */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
          {/* Map Section */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Globe className="w-3 h-3" /> Global Risk Map
              </h3>
              <div className="flex gap-4 text-[10px] font-mono uppercase">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Low</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Mod</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /> High</div>
              </div>
            </div>
            <div className="h-[400px]">
              <GlobalMap analyzedCountries={mapData} />
            </div>
          </section>

          {/* Analysis Detail */}
          <AnimatePresence mode="wait">
            {currentAnalysis ? (
              <motion.section
                key={selectedNews?.id || 'analysis'}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        currentAnalysis.riskLevel === 'High' ? "bg-red-500/20 text-red-500" :
                        currentAnalysis.riskLevel === 'Medium' ? "bg-amber-500/20 text-amber-500" :
                        "bg-emerald-500/20 text-emerald-500"
                      )}>
                        {currentAnalysis.riskLevel} Risk
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Score: {currentAnalysis.riskScore}/10</span>
                    </div>
                    <h2 className="text-xl font-bold leading-tight mb-2">{selectedNews?.headline || customHeadline}</h2>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {currentAnalysis.region}</span>
                      {selectedNews && (
                        <a href={selectedNews.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-amber-500 transition-colors">
                          <ExternalLink className="w-3 h-3" /> Source
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-zinc-800 flex items-center justify-center relative">
                    <svg className="w-full h-full -rotate-90">
                      <circle 
                        cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" 
                        className={cn(
                          currentAnalysis.riskLevel === 'High' ? "text-red-500" :
                          currentAnalysis.riskLevel === 'Medium' ? "text-amber-500" :
                          "text-emerald-500"
                        )}
                        strokeDasharray={2 * Math.PI * 28}
                        strokeDashoffset={2 * Math.PI * 28 * (1 - currentAnalysis.riskScore / 10)}
                      />
                    </svg>
                    <span className="absolute text-lg font-bold">{currentAnalysis.riskScore}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Key Entities</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentAnalysis.entities.map(e => (
                          <span key={e} className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300">{e}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Affected Sectors</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentAnalysis.industries.map(i => (
                          <span key={i} className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300">{i}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Economic Consequences</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{currentAnalysis.consequences}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">AI Reasoning</h4>
                      <div className="text-xs text-zinc-400 leading-relaxed prose prose-invert prose-xs">
                        <Markdown>{currentAnalysis.reasoning}</Markdown>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scenario Outlook */}
                <div className="border-t border-zinc-800 pt-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                    <Activity className="w-3 h-3" /> AI Scenario Outlook
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase mb-1 block">Best Case</span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{currentAnalysis.scenarios?.bestCase || "N/A"}</p>
                    </div>
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                      <span className="text-[10px] font-bold text-amber-500 uppercase mb-1 block">Base Case</span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{currentAnalysis.scenarios?.baseCase || "N/A"}</p>
                    </div>
                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                      <span className="text-[10px] font-bold text-red-500 uppercase mb-1 block">Worst Case</span>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{currentAnalysis.scenarios?.worstCase || "N/A"}</p>
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : (
              <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-zinc-600">
                <Shield className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">Select a headline to begin geopolitical risk analysis</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Alerts, Trends, Sectors */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
          {/* Risk Alerts */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-red-500" /> Critical Alerts
            </h3>
            <div className="space-y-3">
              {criticalEvents.length > 0 ? criticalEvents.map((event, idx) => (
                <div key={idx} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-red-500 uppercase">{event.analysis.region}</span>
                    <span className="text-[10px] font-mono text-red-400">SCORE: {event.score}</span>
                  </div>
                  <p className="text-xs font-medium leading-tight mb-2">{event.headline}</p>
                  <p className="text-[10px] text-zinc-500 line-clamp-2">{event.analysis.consequences}</p>
                </div>
              )) : (
                <p className="text-xs text-zinc-600 italic text-center py-4">No high-risk events detected in current window.</p>
              )}
            </div>
          </section>

          {/* Market Impact Signals */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-emerald-500" /> Market Impact Signals
            </h3>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2 block">Bullish Assets</span>
                <div className="flex flex-wrap gap-2">
                  {(currentAnalysis?.marketImpact?.bullish || ['Gold', 'Oil', 'Defense Stocks']).map(asset => (
                    <span key={asset} className="px-2 py-1 bg-emerald-500/5 border border-emerald-500/20 rounded text-[11px] text-emerald-400">{asset}</span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2 block">Bearish Assets</span>
                <div className="flex flex-wrap gap-2">
                  {(currentAnalysis?.marketImpact?.bearish || ['Airlines', 'European Equities', 'Shipping Routes']).map(asset => (
                    <span key={asset} className="px-2 py-1 bg-red-500/5 border border-red-500/20 rounded text-[11px] text-red-400">{asset}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Trend Visualization */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
              <TrendingUp className="w-3 h-3" /> Risk Score Trend
            </h3>
            <TrendChart data={trendData} />
          </section>

          {/* Sector Impact */}
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Sector Impact Analysis
            </h3>
            <div className="space-y-4">
              {sectorImpacts.map(([sector, data]) => (
                <div key={sector} className="group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-amber-500 transition-colors">
                      {sector === 'Energy' && <Flame className="w-4 h-4" />}
                      {sector === 'Defense' && <Shield className="w-4 h-4" />}
                      {sector === 'Semiconductors' && <Cpu className="w-4 h-4" />}
                      {sector === 'Shipping' && <Ship className="w-4 h-4" />}
                      {sector === 'Banking' && <Landmark className="w-4 h-4" />}
                      {sector === 'Technology' && <Zap className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold">{sector}</h4>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{data.count} Events Analyzed</p>
                    </div>
                  </div>
                  <div className="pl-11">
                    <p className="text-[10px] text-zinc-400 leading-relaxed italic border-l border-zinc-800 pl-3">
                      {data.reason[0]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950/50 py-8 mt-12">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-500">
            <Shield className="w-4 h-4" />
            <span className="text-xs font-mono uppercase tracking-widest">GeoRisk AI Intelligence Network v1.0.4</span>
          </div>
          <div className="flex gap-8 text-[10px] font-mono text-zinc-600 uppercase tracking-widest">
            <span>Data Source: Google News RSS</span>
            <span>Engine: Gemini 3 Flash</span>
            <span>Status: Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
