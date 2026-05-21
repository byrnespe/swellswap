import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import PhotoUploader from '../components/PhotoUploader';
import { useToast } from '../components/Toast';

const boardTypes = ['Shortboard', 'Longboard', 'Fish', 'Gun', 'Funboard', 'Foil', 'Other'];
const conditions = ['Excellent', 'Good', 'Fair', 'Rough'];
const finSystems = ['Thruster', 'Quad', 'Twin', 'Single', '2+1', 'Five-fin'];

export default function PostBoard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', brand: '', type: '', length: '', width: '', thickness: '',
    volume: '', fins: '', condition: '', price: '', trade: false,
    description: '', location: '',
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to post');
      toast('Board listed! 🤙 Surfers near you can now see it.', 'success');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="bg-emerald-500/20 rounded-full p-6 mb-6">
          <CheckCircle size={48} className="text-emerald-400" />
        </div>
        <h2 className="text-white font-bold text-2xl">Board Listed!</h2>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
          Your board is live. Surfers near you will see it in the feed.
        </p>
        <div className="flex gap-3 mt-8 w-full">
          <button onClick={() => navigate('/')} className="flex-1 bg-white/5 border border-white/10 text-slate-300 font-semibold py-3.5 rounded-2xl text-sm">
            View Feed
          </button>
          <button
            onClick={() => { setSubmitted(false); setForm({ title:'',brand:'',type:'',length:'',width:'',thickness:'',volume:'',fins:'',condition:'',price:'',trade:false,description:'',location:'' }); }}
            className="flex-1 bg-cyan-500 text-white font-semibold py-3.5 rounded-2xl text-sm"
          >
            List Another
          </button>
        </div>
      </div>
    );
  }

  const canSubmit = form.title && form.type && form.condition && form.price && form.location;

  return (
    <div className="pb-32">
      <div className="px-4 pt-14 pb-4 border-b border-white/5">
        <h1 className="text-white font-bold text-xl">List Your Board</h1>
        <p className="text-slate-400 text-sm mt-1">Reach surfers across NJ instantly</p>
      </div>

      <div className="px-4 pt-5 space-y-5">
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Photos</p>
          <PhotoUploader onChange={(urls) => set('images', urls)} />
        </div>

        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Board Info</p>
          <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/50" placeholder="Title (e.g. Lost Puddle Jumper 5'10)" value={form.title} onChange={e => set('title', e.target.value)} />
          <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/50" placeholder="Brand" value={form.brand} onChange={e => set('brand', e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            {boardTypes.map(t => (
              <button key={t} onClick={() => set('type', t)} className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${form.type === t ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-400'}`}>{t}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Dimensions</p>
          <div className="grid grid-cols-2 gap-3">
            {[{k:'length',p:"Length (e.g. 5'10\")"},{k:'width',p:'Width (e.g. 19.5")'},{k:'thickness',p:'Thickness (e.g. 2.5")'},{k:'volume',p:'Volume (e.g. 30L)'}].map(({k,p}) => (
              <input key={k} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/50" placeholder={p} value={form[k]} onChange={e => set(k, e.target.value)} />
            ))}
          </div>
        </div>

        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Fin Setup</p>
          <div className="flex gap-2 flex-wrap">
            {finSystems.map(f => (
              <button key={f} onClick={() => set('fins', f)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${form.fins === f ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-400'}`}>{f}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Condition</p>
          <div className="grid grid-cols-4 gap-2">
            {conditions.map(c => (
              <button key={c} onClick={() => set('condition', c)} className={`py-2.5 rounded-xl text-xs font-semibold transition-colors ${form.condition === c ? 'bg-cyan-500 text-white' : 'bg-white/5 text-slate-400'}`}>{c}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Pricing</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
            <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/50" placeholder="Price" value={form.price} onChange={e => set('price', e.target.value)} />
          </div>
          <button onClick={() => set('trade', !form.trade)} className={`mt-2 w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${form.trade ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-white/5 border-white/10'}`}>
            <span className={`text-sm font-medium ${form.trade ? 'text-cyan-400' : 'text-slate-400'}`}>🔄 Open to trades</span>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${form.trade ? 'bg-cyan-500' : 'bg-white/10'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.trade ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>
        </div>

        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Description</p>
          <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/50 resize-none" placeholder="Describe your board — dings, repairs, what it surfs like..." rows={4} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Location</p>
          <input className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-cyan-500/50" placeholder="City (e.g. Belmar, NJ)" value={form.location} onChange={e => set('location', e.target.value)} />
        </div>

        {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] p-4 bg-[#0a0f1e]/95 backdrop-blur-sm border-t border-white/5">
        <button
          onClick={submit}
          disabled={!canSubmit || loading}
          className={`w-full py-4 rounded-2xl font-bold text-base transition-all ${canSubmit && !loading ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 active:scale-[0.98]' : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
        >
          {loading ? 'Posting...' : `List Board for $${form.price || '—'}`}
        </button>
      </div>
    </div>
  );
}
