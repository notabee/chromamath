import React from 'react';
import { Sparkles, Palette, Hash, Settings, BookOpen } from 'lucide-react';
import { PaletteType } from '../../shared/types';

interface HeaderProps {
  palette: PaletteType;
  onCyclePalette: () => void;
  showNumberedBadges: boolean;
  onToggleBadges: () => void;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  palette,
  onCyclePalette,
  showNumberedBadges,
  onToggleBadges,
  onOpenSettings,
  onOpenLibrary,
}) => {
  const paletteLabels: Record<PaletteType, string> = {
    vibrant: 'Vibrant',
    'okabe-ito': 'CVD Safe',
    'high-contrast': 'High Contrast'
  };

  return (
    <header className="px-4 py-3 bg-[#f5f5f7]/95 backdrop-blur border-b border-dotted border-neutral-300 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
        {/* Minimal Avatar Circle */}
        <div className="w-8 h-8 rounded-full border-2 border-black bg-white flex items-center justify-center font-bold text-xs text-black shadow-sm">
          CM
        </div>
        
        {/* Solid Black Capsule Pill Header */}
        <div className="bg-black text-white px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
          <span>ChromaMath</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-semibold tracking-normal">
            arXiv
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Browse Library */}
        <button
          onClick={onOpenLibrary}
          title="Browse Classic Equations"
          className="w-7 h-7 rounded-full border border-dashed border-neutral-400 hover:border-black bg-white flex items-center justify-center text-neutral-700 hover:text-black transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
        </button>

        {/* Palette Switcher */}
        <button
          onClick={onCyclePalette}
          title={`Color Theme: ${paletteLabels[palette]} (Click to switch)`}
          className="h-7 px-2.5 rounded-full border border-dashed border-neutral-400 hover:border-black bg-white flex items-center gap-1 text-neutral-700 hover:text-black transition-colors text-[10px] font-semibold"
        >
          <Palette className="w-3 h-3 text-neutral-800" />
          <span className="hidden sm:inline">{paletteLabels[palette]}</span>
        </button>

        {/* Numbered Badges Mode Toggle */}
        <button
          onClick={onToggleBadges}
          title={`Numbered Badges: ${showNumberedBadges ? 'ON' : 'OFF'}`}
          className={`w-7 h-7 rounded-full transition-colors flex items-center justify-center ${
            showNumberedBadges
              ? 'bg-black text-white shadow-sm'
              : 'border border-dashed border-neutral-400 hover:border-black bg-white text-neutral-700 hover:text-black'
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Settings (API Key)"
          className="w-7 h-7 rounded-full border border-dashed border-neutral-400 hover:border-black bg-white flex items-center justify-center text-neutral-700 hover:text-black transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
