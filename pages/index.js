import { useState } from 'react';
import { RefreshCw, Search, ExternalLink, Clock, AlertCircle, BookOpen } from 'lucide-react';

export default function Dashboard() {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const handleRefresh = async () => {
    if (!token) {
      setError('Please paste your active PW Portal Bearer Token first.');
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
        setError(result.error || 'Failed to refresh doubts');
      }
    } catch (err) {
      setError('Network request timed out or failed.');
    } finally {
      setLoading(false);
    }
  };

  const filteredDoubts = (data?.doubts || []).filter(d => 
    d.batchName.toLowerCase().includes(search.toLowerCase()) ||
    d.subject.toLowerCase().includes(search.toLowerCase()) ||
    d.doubtId.toLowerCase().includes(search.toLowerCase()) ||
    d.doubtText.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-800 p-6 rounded-xl border border-slate-700">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen className="text-blue-400" /> PW Pending Doubts Master Dashboard
            </h1>
            <p className="text-sm text-slate-400">Live Doubt Monitor for Subject Matter Experts (SMEs)</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <input 
              type="password" 
              placeholder="Paste PW Bearer Token" 
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="bg-slate-950 border border-slate-700 px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 w-full sm:w-64"
            />
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-semibold px-6 py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing All Batches...' : 'Refresh All Doubts'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-500 text-red-200 p-4 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 text-red-400" /> {error}
          </div>
        )}

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Pending Doubts</span>
              <div className="text-3xl font-extrabold text-blue-400 mt-2">{data.totalCount}</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Critical Wait (&gt;24 hrs)</span>
              <div className="text-3xl font-extrabold text-amber-400 mt-2">
                {data.doubts.filter(d => d.pendingHours > 24).length}
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl">
              <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Last Refreshed (IST)</span>
              <div className="text-lg font-bold text-emerald-400 mt-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> {data.lastRefreshed}
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Batch, Subject, Doubt ID, or Question Text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {data && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-900/60 text-slate-400 text-xs uppercase border-b border-slate-700">
                <tr>
                  <th className="p-4">Doubt ID</th>
                  <th className="p-4">Batch Name</th>
                  <th className="p-4">Subject / Chapter</th>
                  <th className="p-4">Doubt Text</th>
                  <th className="p-4">Wait Time</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filteredDoubts.length > 0 ? (
                  filteredDoubts.map((row) => (
                    <tr key={row.doubtId} className="hover:bg-slate-700/30 transition">
                      <td className="p-4 font-mono text-xs text-blue-300">{row.doubtId}</td>
                      <td className="p-4 font-medium text-slate-200">{row.batchName}</td>
                      <td className="p-4 text-slate-300">
                        <div className="font-semibold">{row.subject}</div>
                        <div className="text-xs text-slate-400">{row.chapter} (Slide {row.slide})</div>
                      </td>
                      <td className="p-4 text-slate-300 max-w-xs truncate" title={row.doubtText}>
                        {row.doubtText}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          row.pendingHours > 24 ? 'bg-red-950 text-red-300 border border-red-700' : 'bg-slate-700 text-slate-200'
                        }`}>
                          {row.pendingHours} hrs
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <a
                          href={row.portalLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs bg-slate-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md font-medium transition"
                        >
                          Solve <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      No pending doubts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
