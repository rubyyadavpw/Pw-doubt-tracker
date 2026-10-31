import { useState } from 'react';
import { 
  RefreshCw, Search, ExternalLink, Clock, AlertTriangle, 
  CheckCircle2, Layers, Filter, ShieldCheck, Sparkles, AlertCircle 
} from 'lucide-react';

export default function Dashboard() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [error, setError] = useState('');

  const handleRefresh = async () => {
    if (!token) {
      setError('Active PW Bearer Token required to initiate scan.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Unable to sync with PW Servers.');
      }
    } catch (err) {
      setError('Connection timeout. Please verify network or token validity.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDoubts = (data?.doubts || []).filter(d => {
    const matchesSearch = 
      d.batchName.toLowerCase().includes(search.toLowerCase()) ||
      d.subject.toLowerCase().includes(search.toLowerCase()) ||
      d.doubtId.toLowerCase().includes(search.toLowerCase()) ||
      d.doubtText.toLowerCase().includes(search.toLowerCase());

    if (selectedFilter === 'CRITICAL') return matchesSearch && d.pendingHours > 24;
    if (selectedFilter === 'MODERATE') return matchesSearch && d.pendingHours > 12 && d.pendingHours <= 24;
    if (selectedFilter === 'FRESH') return matchesSearch && d.pendingHours <= 12;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-12">
      {/* Top Header Glow */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Navigation / Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl border border-slate-800/80 shadow-2xl">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  PW Pending Doubts Tracker
                </h1>
                <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> SME Live Batch Monitoring System
                </p>
              </div>
            </div>
          </div>

          {/* Token & Action Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:w-80">
              <input 
                type="password" 
                placeholder="Paste Bearer Token..." 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 px-4 py-2.5 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition duration-200"
              />
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition duration-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Scanning Batches...' : 'Sync Pending Doubts'}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl flex items-center gap-3 text-xs backdrop-blur-md animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dynamic Analytics Grid */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-5 rounded-2xl relative overflow-hidden">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Total Pending
              </div>
              <div className="text-3xl font-extrabold text-white mt-3 tracking-tight">{data.totalCount}</div>
              <div className="text-[10px] text-slate-500 mt-1">Across all active batches</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-5 rounded-2xl relative overflow-hidden">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Critical SLA (&gt;24 hrs)
              </div>
              <div className="text-3xl font-extrabold text-rose-400 mt-3 tracking-tight">
                {data.doubts.filter(d => d.pendingHours > 24).length}
              </div>
              <div className="text-[10px] text-rose-500/80 mt-1">Requires immediate SME attention</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-5 rounded-2xl relative overflow-hidden">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Moderate Wait (12-24 hrs)
              </div>
              <div className="text-3xl font-extrabold text-amber-400 mt-3 tracking-tight">
                {data.doubts.filter(d => d.pendingHours > 12 && d.pendingHours <= 24).length}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Approaching SLA window</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-5 rounded-2xl relative overflow-hidden">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Last Refreshed
              </div>
              <div className="text-sm font-semibold text-emerald-400 mt-4">{data.lastRefreshed}</div>
              <div className="text-[10px] text-slate-500 mt-1">IST Live Timestamp</div>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        {data && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800/80">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search batch, subject, or doubt ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 focus:border-indigo-500/50 pl-10 pr-4 py-2 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition duration-200"
              />
            </div>

            {/* Quick Filter Pills */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              <Filter className="w-3.5 h-3.5 text-slate-500 mr-1 shrink-0" />
              {['ALL', 'CRITICAL', 'MODERATE', 'FRESH'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition duration-200 shrink-0 ${
                    selectedFilter === filter
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Data Table */}
        {data && (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800/80">
                    <th className="py-4 px-6">Doubt ID</th>
                    <th className="py-4 px-6">Batch Details</th>
                    <th className="py-4 px-6">Subject / Chapter</th>
                    <th className="py-4 px-6">Query Text</th>
                    <th className="py-4 px-6">Wait Time</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-xs">
                  {filteredDoubts.length > 0 ? (
                    filteredDoubts.map((row) => (
                      <tr key={row.doubtId} className="hover:bg-slate-800/30 transition duration-150">
                        <td className="py-4 px-6 font-mono text-indigo-300 font-medium">{row.doubtId}</td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-slate-200 block">{row.batchName}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-300">{row.subject}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{row.chapter} (Slide {row.slide})</div>
                        </td>
                        <td className="py-4 px-6 text-slate-400 max-w-xs truncate" title={row.doubtText}>
                          {row.doubtText}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-semibold ${
                            row.pendingHours > 24 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : row.pendingHours > 12 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {row.pendingHours} hrs
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <a
                            href={row.portalLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-1.5 rounded-lg text-[11px] font-medium border border-indigo-500/20 hover:border-transparent transition duration-200"
                          >
                            Solve <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-slate-500">
                        No pending doubts match your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
