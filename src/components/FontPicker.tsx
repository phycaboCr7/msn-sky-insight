import { useState } from "react";
import { Check, Type } from "lucide-react";

export interface FontOption {
  name: string;
  family: string;
  category: 'playful' | 'royal' | 'normal' | 'modern' | 'handwritten';
  googleFont: string; // Google Fonts import name
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
  return FONT_OPTIONS[0]; // Quicksand default
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
    <div className="absolute bottom-full left-0 right-0 mb-2 z-50 animate-fade-in">
      <div className="bg-background/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-4 max-h-[360px] overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Type className="w-4 h-4 text-primary" />
            Choose Chat Font
          </h4>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">✕</button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
          {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === key
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              }`}
            >
              <span>{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Font list with preview */}
        <div className="space-y-1.5 overflow-y-auto max-h-[220px] pr-1">
          {filteredFonts.map(font => {
            // Preload font for preview
            loadGoogleFont(font);
            const isSelected = selectedFont.name === font.name;
            return (
              <button
                key={font.name}
                onClick={() => handleSelect(font)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-primary/20 border border-primary/40'
                    : 'bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10'
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-muted-foreground font-medium">{font.name}</span>
                  <span
                    className="text-base text-foreground"
                    style={{ fontFamily: font.family }}
                  >
                    The quick brown fox jumps over the lazy dog
                  </span>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-primary flex-shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
