import { useState, useEffect, useCallback } from 'react';
import { Search as SearchIcon, X, SlidersHorizontal } from 'lucide-react';
import BoardCard from '../components/BoardCard';
import { boardTypes, conditions } from '../data/boards';
import { useAuth } from '../context/AuthContext';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function Search() {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('All');
  const [condition, setCondition] = useState('Any');
  const [maxPrice, setMaxPrice] = useState(2000);
  const [tradeOnly, setTradeOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (type !== 'All') params.set('type', type);
    if (condition !== 'Any') params.set('condition', condition);
    if (maxPrice < 2000) params.set('maxPrice', maxPrice);
    if (tradeOnly) params.set('trade', 'true');

    setLoading(true);
    fetch(`/api/boards?${params}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
      .then(r => r.json())
      .then(data => { setResults(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [debouncedQuery, type, condition, maxPrice, tradeOnly, token]);

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-40 bg-[#0a0f1e]/95 backdrop-blur-sm border-b border-white/5 px-4 pt-12 pb-3">
        <h1 className="text-white font-bold text-xl mb-3">Find a Board</h1>

        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
            <SearchIcon size={16} className="text-slate-400 flex-shrink-0" />
            <input
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder-slate-500"
              placeholder="Brand, model, type..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && <button onClick={() => setQuery('')}><X size={14} className="text-slate-400" /></button>}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-colors ${showFilters ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-400'}`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3 bg-white/5 rounded-2xl p-4">
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Type</p>
              <div className="flex gap-2 flex-wrap">
                {boardTypes.map(t => (
                  <button key={t} onClick={() => setType(t)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${type === t ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-400'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Condition</p>
              <div className="flex gap-2 flex-wrap">
                {conditions.map(c => (
                  <button key={c} onClick={() => setCondition(c)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${condition === c ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-400'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Max Price</p>
                <span className="text-cyan-400 text-sm font-bold">{maxPrice === 2000 ? 'Any' : `$${maxPrice}`}</span>
              </div>
              <input type="range" min={50} max={2000} step={25} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} className="w-full accent-cyan-500" />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Trade Only</p>
              <button onClick={() => setTradeOnly(!tradeOnly)} className={`w-11 h-6 rounded-full transition-colors relative ${tradeOnly ? 'bg-cyan-500' : 'bg-white/10'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${tradeOnly ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-4">
        <p className="text-slate-400 text-sm mb-4">
          <span className="text-white font-semibold">{results.length}</span> results
        </p>
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="bg-white/5 rounded-2xl h-48 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {results.map(board => <BoardCard key={board.id} board={board} />)}
          </div>
        )}
        {!loading && results.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium">No results</p>
            <p className="text-sm mt-1">Try adjusting your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
