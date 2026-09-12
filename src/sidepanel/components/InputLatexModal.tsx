import React, { useState } from 'react';
import { X, Terminal, ArrowRight } from 'lucide-react';

interface InputLatexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitLatex: (latex: string) => void;
}

export const InputLatexModal: React.FC<InputLatexModalProps> = ({
  isOpen,
  onClose,
  onSubmitLatex,
}) => {
  const [latexInput, setLatexInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (latexInput.trim()) {
      onSubmitLatex(latexInput.trim());
      setLatexInput('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-dotted border-neutral-400 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-neutral-900">
        <div className="flex items-center justify-between border-b border-dotted border-neutral-300 pb-3">
          <div className="flex items-center gap-2">
            <span className="bg-black text-white p-1 rounded-full">
              <Terminal className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-sm tracking-wide">Paste LaTeX</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-dashed border-neutral-300 hover:border-black flex items-center justify-center text-neutral-500 hover:text-black transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1">
              LaTeX Expression
            </label>
            <textarea
              rows={3}
              value={latexInput}
              onChange={(e) => setLatexInput(e.target.value)}
              placeholder="e.g. \nabla \cdot \mathbf{E} = \frac{\rho}{\varepsilon_0}"
              className="w-full bg-neutral-50 border border-dotted border-neutral-400 rounded-xl p-3 text-sm text-neutral-900 font-mono placeholder-neutral-400 focus:outline-none focus:border-black"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-dotted border-neutral-300">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-500 hover:text-black font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!latexInput.trim()}
              className="px-4 py-2 text-xs font-bold bg-black hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
            >
              Explain <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
