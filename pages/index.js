import { useState, useEffect } from 'react';
import { 
  RefreshCw, Search, ExternalLink, Clock, AlertTriangle, 
  CheckCircle2, Layers, Filter, ShieldCheck, Sparkles, AlertCircle, Loader2 
} from 'lucide-react';

export default function Dashboard() {
  const [token, setToken] = useState('');
  const [saveToken, setSaveToken] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('pw_sme_token');
    if (saved) {
      setToken(saved);
    }
  }, []);

  const handleRefresh = async () => {
    if (!token) {
      setError('Please paste an active PW Bearer Token first.');
      return;
    }
    
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

    if (saveToken) {
      localStorage.setItem('pw_sme_token', cleanToken);
    }

    setError('');
    setLoading(true);
    setStatusText('Connecting directly to PW Servers...');

    const headers = {
      'Authorization': `Bearer ${cleanToken}`,
      'client-id': '5eb393ee95fab7468a79d189',
      'client-type': 'ADMIN',
      'client-version': '1.0.0',
      'Accept': 'application/json, text/plain, */*'
    };

    try {
      setStatusText('Fetching active batch list...');
      const batchesRes = await fetch('https://admin-api.penpencil.co/v3/admin/batches?page=1&limit=40', { headers });

      if (!batchesRes.ok) {
        throw new Error(`Authentication failed (Status ${batchesRes.status}). Token expire ho chuka hai, please PW Portal se naya token copy karein.`);
      }

      const batchesData = await batchesRes.json();
      if (!batchesData.success) {
        throw new Error(batchesData.message || 'Failed to fetch batch master list.');
      }

      const activeBatches = (batchesData.data || []).filter(b => 
        !b.name.includes('2024') && !b.name.includes('2025')
      );

      let allPendingDoubts = [];
      let processedCount = 0;

      for (const batch of activeBatches) {
        processedCount++;
        setStatusText(`Scanning Batch (${processedCount}/${activeBatches.length}): ${batch.name}`);

        try {
          const detailsRes = await fetch(`https://admin-api.penpencil.co/v3/admin/batches/${batch._id}/details`, { headers });
          const details = await detailsRes.json();
          
          if (details.success && details.data?.subjects) {
            for (const subject of details.data.subjects) {
              const countUrl = `https://admin-api.penpencil.co/v1/admin/doubts/subject-matter-expert/batch/${batch._id}/subject/${subject._id}/get-counts?page=1&countType=CHAPTER_WISE&batchSubjectId=${subject.batchSubjectId || ''}`;
              const countRes = await fetch(countUrl, { headers });
              const countData = await countRes.json();

              if (countData.success && countData.data?.totalPending > 0) {
                const doubtUrl = `https://admin-api.penpencil.co/v1/admin/doubts/subject-matter-expert/batch/${batch._id}/subject/${subject._id}/get-awaiting-doubts?page=1&limit=50`;
                const doubtRes = await fetch(doubtUrl, { headers });
                const doubtData = await doubtRes.json();

                if (doubtData.success && doubtData.data) {
                  const now = new Date();
                  doubtData.data.forEach(d => {
                    const createdAt = new Date(d.createdAt);
                    const pendingHours = ((now - createdAt) / (1000 * 60 * 60)).toFixed(1);

                    allPendingDoubts.push({
                      doubtId: d._id || d.doubtId || 'N/A',
                      batchName: batch.name,
                      batchId: batch._id,
                      subject: subject.name,
                      chapter: d.chapterName || 'General',
                      lecture: d.lectureName || 'N/A',
                      slide: d.slideNumber || '1',
                      doubtText: d.text || d.question || 'No description provided.',
                      createdAtIST: createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                      pendingHours: parseFloat(pendingHours),
                      portalLink: `https://admin.penpencil.co/doubts/sme/${batch._id}/${subject._id}`
                    });
                  });
                }
              }
            }
          }
        } catch (batchErr) {
          console.warn(`Skipped batch ${batch.name}`);
        }
      }

      setData({
        lastRefreshed: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        totalCount: allPendingDoubts.length,
        doubts: allPendingDoubts
      });

    } catch (err) {
      setError(err.message || 'Direct network error. Please verify active VPN or Browser CORS settings.');
    } finally {
      setLoading(false);
      setStatusText('');
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
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        
        {/* Header Section */}
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

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex flex-col gap-1">
              <input 
                type="password" 
                placeholder="Paste Bearer Token..." 
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full sm:w-72 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 px-4 py-2 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition duration-200"
              />
              <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer pl-1">
                <input 
                  type="checkbox" 
                  checked={saveToken} 
                  onChange={(e) => setSaveToken(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 w-3 h-3"
                />
                Remember token in this browser
              </label>
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition duration-200 h-10"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Scanning...' : 'Sync Pending Doubts'}
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-xl flex items-center gap-3 text-xs backdrop-blur-md">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Progress Indicator */}
        {loading && (
          <div className="bg-indigo-950/40 border border-indigo-500/30 p-8 rounded-2xl backdrop-blur-xl flex flex-col items-center justify-center gap-4 text-center">
            <div className="relative">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-indigo-200">{statusText}</h3>
              <p className="text-xs text-slate-400 mt-1">Direct Browser-to-PW Connection Active</p>
            </div>
          </div>
        )}

        {/* Analytics Cards */}
        {data && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-5 rounded-2xl">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Total Pending
              </div>
              <div className="text-3xl font-extrabold text-white mt-3 tracking-tight">{data.totalCount}</div>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md p-5 rounded-2xl">
              <div className="text-slate-400 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Critical SLA (&gt;24 hrs)
              </div>
