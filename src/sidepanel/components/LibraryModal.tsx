import React from 'react';
import { X, BookOpen, ChevronRight } from 'lucide-react';
import libraryEquations from '../../shared/library.json';
import { ColorizedEquation } from '../../shared/types';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectEquation: (eq: ColorizedEquation) => void;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectEquation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-dotted border-neutral-400 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col text-neutral-900">
        <div className="flex items-center justify-between border-b border-dotted border-neutral-300 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="bg-black text-white p-1 rounded-full">
              <BookOpen className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-sm tracking-wide">Library (0ms Instant)</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-dashed border-neutral-300 hover:border-black flex items-center justify-center text-neutral-500 hover:text-black transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-2 flex-grow pr-1">
          {libraryEquations.map((eq) => (
            <button
              key={eq.id}
              onClick={() => {
                onSelectEquation(eq as ColorizedEquation);
                onClose();
              }}
              className="w-full text-left p-3 rounded-xl bg-neutral-50/70 border border-dotted border-neutral-300 hover:border-black hover:bg-white transition-all duration-150 flex items-center justify-between group shadow-sm"
            >
              <div className="space-y-1">
                <div className="text-xs font-bold text-neutral-900 group-hover:text-black transition-colors">
                  {eq.title}
                </div>
                <div className="text-[11px] text-neutral-500 line-clamp-1 italic">
                  "{eq.narrativeSentence}"
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-black group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-2" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
