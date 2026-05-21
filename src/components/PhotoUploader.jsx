import { useState, useRef } from 'react';
import { Camera, X, ImagePlus, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PhotoUploader({ onChange }) {
  const { token } = useAuth();
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('images', f));
      const res = await fetch('/api/upload/images', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const newPreviews = [...previews, ...data.urls].slice(0, 6);
      setPreviews(newPreviews);
      onChange(newPreviews);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const remove = (idx) => {
    const next = previews.filter((_, i) => i !== idx);
    setPreviews(next);
    onChange(next);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {previews.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-white/5">
            <img
              src={url.startsWith('http') ? url : `http://localhost:3001${url}`}
              alt=""
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-1.5 right-1.5 bg-black/60 rounded-full p-1"
            >
              <X size={10} className="text-white" />
            </button>
            {i === 0 && (
              <div className="absolute bottom-1.5 left-1.5 bg-cyan-500/80 rounded px-1.5 py-0.5">
                <span className="text-white text-[9px] font-bold">MAIN</span>
              </div>
            )}
          </div>
        ))}

        {previews.length < 6 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-xl bg-white/5 border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:border-cyan-500/40 hover:text-cyan-400 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader size={20} className="animate-spin text-cyan-400" />
            ) : previews.length === 0 ? (
              <>
                <Camera size={22} />
                <span className="text-xs font-medium">Add Photos</span>
              </>
            ) : (
              <ImagePlus size={20} />
            )}
          </button>
        )}

        {[...Array(Math.max(0, 2 - previews.length))].map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square rounded-xl bg-white/5 border border-dashed border-white/8" />
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      <p className="text-slate-500 text-xs mt-2">
        {previews.length === 0 ? 'Add up to 6 photos. First photo is the main image.' : `${previews.length}/6 photos · Tap × to remove · Drag to reorder`}
      </p>
    </div>
  );
}
