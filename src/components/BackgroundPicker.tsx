import { useState, useEffect } from "react";
import { Search, X, RotateCcw, ImageIcon, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BG_STORAGE_KEY = 'weatherza-custom-bg';
const BG_COUNT_KEY = 'weatherza-bg-change-count';
const MAX_BG_CHANGES = 2;

export interface CustomBg {
  url: string;
  query: string;
}

export const getStoredBg = (): CustomBg | null => {
  try {
    const stored = localStorage.getItem(BG_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
};

export const getBgChangeCount = (): number => {
  return parseInt(localStorage.getItem(BG_COUNT_KEY) || '0', 10);
};

interface BackgroundPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBg: (bg: CustomBg | null) => void;
  currentBg: CustomBg | null;
}

interface PixabayHit {
  id: number;
  webformatURL: string;
  largeImageURL: string;
  previewURL: string;
  tags: string;
}

export const BackgroundPicker = ({ isOpen, onClose, onSelectBg, currentBg }: BackgroundPickerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PixabayHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [changeCount, setChangeCount] = useState(getBgChangeCount);
  const remaining = MAX_BG_CHANGES - changeCount;

  if (!isOpen) return null;

  const searchImages = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pixabay-proxy', {
        body: { query: searchQuery.trim(), category: 'nature', min_width: 1280, per_page: 20, image_type: 'photo' },
      });
      if (!error && data?.hits) {
        setResults(data.hits);
      }
    } catch (e) {
      console.error('Pixabay search error:', e);
    } finally {
      setLoading(false);
    }
  };

  const selectImage = (hit: PixabayHit) => {
    if (remaining <= 0 && !currentBg) return;
    const bg: CustomBg = { url: hit.largeImageURL || hit.webformatURL, query: searchQuery };
    localStorage.setItem(BG_STORAGE_KEY, JSON.stringify(bg));
    const newCount = changeCount + 1;
    localStorage.setItem(BG_COUNT_KEY, String(newCount));
    setChangeCount(newCount);
    onSelectBg(bg);
    onClose();
  };

  const revertBg = () => {
    localStorage.removeItem(BG_STORAGE_KEY);
    onSelectBg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background/95 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl w-[92vw] max-w-[600px] max-h-[80vh] flex flex-col overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            <div className="p-2 rounded-xl bg-primary/20">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            Set Background Image
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Usage counter & current bg */}
        <div className="px-6 pb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {remaining > 0 ? (
                <>🎨 <span className="text-primary font-semibold">{remaining}</span> background change{remaining !== 1 ? 's' : ''} remaining</>
              ) : (
                <>⚠️ No background changes remaining</>
              )}
            </span>
            {currentBg && (
              <button
                onClick={revertBg}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
              >
                <RotateCcw className="w-3 h-3" />
                Revert to Default
              </button>
            )}
          </div>

          {currentBg && (
            <div className="relative rounded-xl overflow-hidden h-16 border border-primary/20">
              <img src={currentBg.url} alt="Current background" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-xs text-white/80 font-medium">Current Background</span>
              </div>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="px-6 pb-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchImages()}
                placeholder="Search backgrounds... (e.g. aurora, mountains, ocean)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 transition-all"
              />
            </div>
            <button
              onClick={searchImages}
              disabled={loading || !searchQuery.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 text-primary-foreground"
              style={{ background: 'linear-gradient(135deg, hsl(28 100% 55%), hsl(28 100% 45%))' }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </div>
        </div>

        {/* Results grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-5">
          {results.length === 0 && !loading && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Search for nature images to set as your AI background
            </div>
          )}
          {loading && (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
              <span className="text-sm text-muted-foreground">Searching Pixabay...</span>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {results.map(hit => {
              const isCurrentBg = currentBg?.url === (hit.largeImageURL || hit.webformatURL);
              return (
                <button
                  key={hit.id}
                  onClick={() => selectImage(hit)}
                  disabled={remaining <= 0 && !currentBg}
                  className={`relative group rounded-xl overflow-hidden aspect-video border-2 transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed ${
                    isCurrentBg ? 'border-primary shadow-lg shadow-primary/20' : 'border-transparent hover:border-white/20'
                  }`}
                >
                  <img
                    src={hit.webformatURL}
                    alt={hit.tags}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    {isCurrentBg ? (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    ) : (
                      <span className="text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Select</span>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent">
                    <span className="text-[9px] text-white/70 line-clamp-1">{hit.tags}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
