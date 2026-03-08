import { useState } from "react";
import { Check, Type, X } from "lucide-react";

export interface FontOption {
  name: string;
  family: string;
  category: 'playful' | 'royal' | 'normal' | 'modern' | 'handwritten';
  googleFont: string;
}

export const FONT_OPTIONS: FontOption[] = [
  // Playful
  { name: 'Quicksand', family: "'Quicksand', sans-serif", category: 'playful', googleFont: 'Quicksand:wght@300;400;500;600;700' },
  { name: 'Nunito', family: "'Nunito', sans-serif", category: 'playful', googleFont: 'Nunito:wght@300;400;600;700' },
  { name: 'Comfortaa', family: "'Comfortaa', cursive", category: 'playful', googleFont: 'Comfortaa:wght@300;400;600;700' },
  { name: 'Baloo 2', family: "'Baloo 2', cursive", category: 'playful', googleFont: 'Baloo+2:wght@400;500;600;700' },
  { name: 'Patrick Hand', family: "'Patrick Hand', cursive", category: 'playful', googleFont: 'Patrick+Hand' },
  // Royal
  { name: 'Playfair Display', family: "'Playfair Display', serif", category: 'royal', googleFont: 'Playfair+Display:wght@400;500;600;700' },
  { name: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", category: 'royal', googleFont: 'Cormorant+Garamond:wght@300;400;500;600;700' },
  { name: 'Cinzel', family: "'Cinzel', serif", category: 'royal', googleFont: 'Cinzel:wght@400;500;600;700' },
  { name: 'EB Garamond', family: "'EB Garamond', serif", category: 'royal', googleFont: 'EB+Garamond:wght@400;500;600;700' },
  { name: 'Libre Baskerville', family: "'Libre Baskerville', serif", category: 'royal', googleFont: 'Libre+Baskerville:wght@400;700' },
  // Normal
  { name: 'Inter', family: "'Inter', sans-serif", category: 'normal', googleFont: 'Inter:wght@300;400;500;600;700' },
  { name: 'Open Sans', family: "'Open Sans', sans-serif", category: 'normal', googleFont: 'Open+Sans:wght@300;400;500;600;700' },
  { name: 'Roboto', family: "'Roboto', sans-serif", category: 'normal', googleFont: 'Roboto:wght@300;400;500;700' },
  { name: 'Lato', family: "'Lato', sans-serif", category: 'normal', googleFont: 'Lato:wght@300;400;700' },
  { name: 'Source Sans 3', family: "'Source Sans 3', sans-serif", category: 'normal', googleFont: 'Source+Sans+3:wght@300;400;500;600;700' },
  // Modern
  { name: 'DM Sans', family: "'DM Sans', sans-serif", category: 'modern', googleFont: 'DM+Sans:wght@300;400;500;600;700' },
  { name: 'Outfit', family: "'Outfit', sans-serif", category: 'modern', googleFont: 'Outfit:wght@300;400;500;600;700' },
  { name: 'Space Grotesk', family: "'Space Grotesk', sans-serif", category: 'modern', googleFont: 'Space+Grotesk:wght@300;400;500;600;700' },
  { name: 'Sora', family: "'Sora', sans-serif", category: 'modern', googleFont: 'Sora:wght@300;400;500;600;700' },
  { name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", category: 'modern', googleFont: 'Plus+Jakarta+Sans:wght@300;400;500;600;700' },
  // Handwritten
  { name: 'Caveat', family: "'Caveat', cursive", category: 'handwritten', googleFont: 'Caveat:wght@400;500;600;700' },
  { name: 'Dancing Script', family: "'Dancing Script', cursive", category: 'handwritten', googleFont: 'Dancing+Script:wght@400;500;600;700' },
  { name: 'Kalam', family: "'Kalam', cursive", category: 'handwritten', googleFont: 'Kalam:wght@300;400;700' },
  { name: 'Indie Flower', family: "'Indie Flower', cursive", category: 'handwritten', googleFont: 'Indie+Flower' },
];

const CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = {
  playful: { label: 'Playful', emoji: '🎈' },
  royal: { label: 'Royal', emoji: '👑' },
  normal: { label: 'Classic', emoji: '📝' },
  modern: { label: 'Modern', emoji: '⚡' },
  handwritten: { label: 'Handwritten', emoji: '✍️' },
};

const FONT_PICKER_KEY = 'weatherza-chat-font';

export const getStoredFont = (): FontOption => {
  try {
    const stored = localStorage.getItem(FONT_PICKER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const found = FONT_OPTIONS.find(f => f.name === parsed.name);
      if (found) return found;
    }
  } catch {}
  return FONT_OPTIONS[0];
};

export const loadGoogleFont = (font: FontOption) => {
  const id = `gfont-${font.name.replace(/\s/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${font.googleFont}&display=swap`;
  document.head.appendChild(link);
};

interface FontPickerProps {
  selectedFont: FontOption;
  onSelectFont: (font: FontOption) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const FontPicker = ({ selectedFont, onSelectFont, isOpen, onClose }: FontPickerProps) => {
  const [activeCategory, setActiveCategory] = useState<string>('playful');

  if (!isOpen) return null;

  const filteredFonts = FONT_OPTIONS.filter(f => f.category === activeCategory);

  const handleSelect = (font: FontOption) => {
    loadGoogleFont(font);
    localStorage.setItem(FONT_PICKER_KEY, JSON.stringify({ name: font.name }));
    onSelectFont(font);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-background/95 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl w-[90vw] max-w-[540px] max-h-[75vh] flex flex-col overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2.5" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            <div className="p-2 rounded-xl bg-primary/20">
              <Type className="w-5 h-5 text-primary" />
            </div>
            Choose Chat Font
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current font indicator */}
        <div className="px-6 pb-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-xs text-muted-foreground">Current:</span>
            <span className="text-sm font-semibold text-primary" style={{ fontFamily: selectedFont.family }}>{selectedFont.name}</span>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 px-6 pb-3 overflow-x-auto">
          {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === key
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
              }`}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Font grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredFonts.map(font => {
              loadGoogleFont(font);
              const isSelected = selectedFont.name === font.name;
              return (
                <button
                  key={font.name}
                  onClick={() => handleSelect(font)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-left transition-all group ${
                    isSelected
                      ? 'bg-primary/20 border-2 border-primary/50 shadow-md shadow-primary/10'
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10 hover:border-white/10'
                  }`}
                >
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{font.name}</span>
                    <span
                      className="text-[15px] text-foreground truncate"
                      style={{ fontFamily: font.family }}
                    >
                      Hello, how's the weather?
                    </span>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-3">
                      <Check className="w-3.5 h-3.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
