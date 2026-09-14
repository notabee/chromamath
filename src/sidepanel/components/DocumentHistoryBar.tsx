import React from 'react';
import { ColorizedEquation } from '../../shared/types';
import { Sparkles, Trash2 } from 'lucide-react';

interface DocumentHistoryBarProps {
  history: ColorizedEquation[];
  activeEquationId?: string;
  docId: string;
  onSelectEquation: (equation: ColorizedEquation) => void;
  onClearHistory: () => void;
}

export const DocumentHistoryBar: React.FC<DocumentHistoryBarProps> = ({
  history,
  activeEquationId,
  docId,
  onSelectEquation,
  onClearHistory,
}) => {
  if (!history || history.length === 0) return null;

  const displayDocLabel = docId && docId !== 'global'
    ? (docId.startsWith('arxiv:') ? `arXiv ${docId.replace('arxiv:', '')}` : docId)
    : 'Recent Formulas';

  return (
    <div className="bg-white border-2 border-dotted border-neutral-300 rounded-2xl p-2.5 shadow-sm space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
          <span className="text-[11px] font-bold text-neutral-800 uppercase tracking-wider">
            {displayDocLabel}
          </span>
          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded-full font-semibold">
            {history.length}
          </span>
        </div>

        <button
          onClick={onClearHistory}
          title="Clear cached formulas for this paper"
          className="text-neutral-400 hover:text-neutral-700 text-[10px] flex items-center gap-0.5 transition-colors px-1"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>

      {/* Horizontal Scrollable Pill Strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 -mx-1 px-1 scrollbar-none">
        {history.map((eq, index) => {
          const isActive = eq.id === activeEquationId;
          return (
            <button
              key={eq.id || index}
              onClick={() => onSelectEquation(eq)}
              title={eq.title}
              className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-black text-white font-semibold shadow-sm'
                  : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 hover:border-neutral-400'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-serif font-bold ${
                  isActive ? 'bg-neutral-800 text-neutral-200' : 'bg-neutral-200 text-neutral-700'
                }`}
              >
                {index + 1}
              </span>
              <span className="max-w-[120px] truncate">{eq.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
