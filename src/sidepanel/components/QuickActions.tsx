import React from 'react';
import { Scissors, Terminal, BookOpen } from 'lucide-react';

interface QuickActionsProps {
  onSnip: () => void;
  onPasteTex: () => void;
  onOpenLibrary: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onSnip,
  onPasteTex,
  onOpenLibrary,
}) => {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <button
        onClick={onSnip}
        className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-black hover:bg-neutral-800 text-white rounded-2xl text-xs font-bold transition-all hover:scale-[1.02] shadow-sm"
      >
        <Scissors className="w-4 h-4" />
        <span>Snip Paper</span>
      </button>

      <button
        onClick={onPasteTex}
        className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-white hover:border-black border-2 border-dotted border-neutral-300 text-neutral-800 rounded-2xl text-xs font-semibold transition-all hover:scale-[1.02]"
      >
        <Terminal className="w-4 h-4 text-neutral-600" />
        <span>Paste TeX</span>
      </button>

      <button
        onClick={onOpenLibrary}
        className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-white hover:border-black border-2 border-dotted border-neutral-300 text-neutral-800 rounded-2xl text-xs font-semibold transition-all hover:scale-[1.02]"
      >
        <BookOpen className="w-4 h-4 text-neutral-600" />
        <span>Library</span>
      </button>
    </div>
  );
};
