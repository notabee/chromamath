import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InteractiveEquation } from './components/InteractiveEquation';
import { NarrativeSentence } from './components/NarrativeSentence';
import { AdeptView } from './components/AdeptView';
import { ComponentsGlossary } from './components/ComponentsGlossary';
import { SettingsModal } from './components/SettingsModal';
import { InputLatexModal } from './components/InputLatexModal';
import { LibraryModal } from './components/LibraryModal';
import { ColorizedEquation, PaletteType } from '../shared/types';
import libraryEquations from '../shared/library.json';
import { Scissors, Terminal, BookOpen, Copy, Check, AlertCircle, Loader2, Key, ExternalLink } from 'lucide-react';
import { getColor } from '../shared/palettes';

export default function App() {
  // Default to Transformer Scaled Dot-Product Attention (iconic for arXiv!)
  const [equation, setEquation] = useState<ColorizedEquation>(
    (libraryEquations.find(e => e.id === 'transformer-attention') || libraryEquations[0]) as ColorizedEquation
  );
  const [palette, setPalette] = useState<PaletteType>('vibrant');
  const [showNumberedBadges, setShowNumberedBadges] = useState(false);
  const [hoveredChunkId, setHoveredChunkId] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [inlineKey, setInlineKey] = useState('');
  const [lastFailedLatex, setLastFailedLatex] = useState<string | null>(null);

  const handleSaveInlineKey = () => {
    if (!inlineKey.trim()) return;
    chrome.storage?.sync?.set({ apiKey: inlineKey.trim() }, () => {
      setErrorMessage(null);
      if (lastFailedLatex) {
        handleExplainCustomLatex(lastFailedLatex);
      }
    });
  };

  // Load user settings and active equation on mount
  useEffect(() => {
    chrome.storage?.sync?.get(['palette', 'showNumberedBadges'], (res) => {
      if (res?.palette) setPalette(res.palette);
      if (res?.showNumberedBadges !== undefined) setShowNumberedBadges(res.showNumberedBadges);
    });

    chrome.runtime?.sendMessage?.({ type: 'GET_CURRENT_EQUATION' }, (res) => {
      if (res?.equation) {
        setEquation(res.equation);
      }
    });

    const handleRuntimeMessage = (message: any) => {
      if (message.type === 'EQUATION_UPDATED' && message.equation) {
        setEquation(message.equation);
        setIsLoading(false);
        setErrorMessage(null);
      }
    };

    chrome.runtime?.onMessage?.addListener(handleRuntimeMessage);
    return () => {
      chrome.runtime?.onMessage?.removeListener(handleRuntimeMessage);
    };
  }, []);

  const handleCyclePalette = () => {
    const sequence: PaletteType[] = ['vibrant', 'okabe-ito', 'high-contrast'];
    const next = sequence[(sequence.indexOf(palette) + 1) % sequence.length];
    setPalette(next);
    chrome.storage?.sync?.set({ palette: next });
  };

  const handleToggleBadges = () => {
    const next = !showNumberedBadges;
    setShowNumberedBadges(next);
    chrome.storage?.sync?.set({ showNumberedBadges: next });
  };

  const handleSnipFromPaper = () => {
    setErrorMessage(null);
    chrome.runtime?.sendMessage({ type: 'START_SNIP' });
  };

  const handleExplainCustomLatex = (latex: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLastFailedLatex(latex);

    chrome.runtime?.sendMessage(
      { type: 'EXPLAIN_LATEX', latex },
      (response) => {
        setIsLoading(false);
        if (response?.success && response.equation) {
          setEquation(response.equation);
          setLastFailedLatex(null);
        } else {
          setErrorMessage(response?.error || 'Failed to analyze LaTeX equation.');
        }
      }
    );
  };

  const handleCopyLatex = () => {
    if (!equation) return;
    // Generate Overleaf / LaTeX snippet with custom colors
    const colorDefs = equation.components
      .map((c, i) => {
        const col = getColor(palette, c.paletteIndex);
        return `\\definecolor{c${i + 1}}{HTML}{${col.hex.replace('#', '')}}`;
      })
      .join('\n');

    let colorizedMath = equation.normalizedLatex;
    equation.components.forEach((c, i) => {
      colorizedMath = colorizedMath.replace(c.latexChunk, `{\\color{c${i + 1}} ${c.latexChunk}}`);
    });

    const latexSnippet = `% ChromaMath: ${equation.title}
\\usepackage{xcolor}
${colorDefs}

\\[
  ${colorizedMath}
\\]

% Plain-English Narrative:
% "${equation.narrativeSentence}"
`;

    navigator.clipboard.writeText(latexSnippet);
    setCopyStatus('latex');
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleCopyMarkdown = () => {
    if (!equation) return;
    const md = `### ${equation.title}

$$${equation.normalizedLatex}$$

> **Intuition:** ${equation.narrativeSentence}

- **Analogy:** ${equation.adept.analogy}
- **Concrete Example:** ${equation.adept.concreteExample}
- **Technical Definition:** ${equation.adept.technicalDefinition}
`;
    navigator.clipboard.writeText(md);
    setCopyStatus('markdown');
    setTimeout(() => setCopyStatus(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] text-neutral-900 font-sans">
      <Header
        palette={palette}
        onCyclePalette={handleCyclePalette}
        showNumberedBadges={showNumberedBadges}
        onToggleBadges={handleToggleBadges}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
      />

      <main className="flex-grow p-4 space-y-4 max-w-xl mx-auto w-full">
        {/* Quick Action Squircles (matching minimal wireframe pattern) */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={handleSnipFromPaper}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-black hover:bg-neutral-800 text-white rounded-2xl text-xs font-bold transition-all hover:scale-[1.02] shadow-sm"
          >
            <Scissors className="w-4 h-4" />
            <span>Snip Paper</span>
          </button>

          <button
            onClick={() => setIsInputOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-white hover:border-black border-2 border-dotted border-neutral-300 text-neutral-800 rounded-2xl text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <Terminal className="w-4 h-4 text-neutral-600" />
            <span>Paste TeX</span>
          </button>

          <button
            onClick={() => setIsLibraryOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 bg-white hover:border-black border-2 border-dotted border-neutral-300 text-neutral-800 rounded-2xl text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <BookOpen className="w-4 h-4 text-neutral-600" />
            <span>Library</span>
          </button>
        </div>

        {/* Error / API Key Setup Notification */}
        {errorMessage && (errorMessage.includes('API Key') || errorMessage.includes('apiKey')) ? (
          <div className="p-4 bg-white border-2 border-dotted border-neutral-400 rounded-2xl text-xs text-neutral-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-neutral-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-neutral-900" />
                Free Gemini API Key Required
              </span>
              <span className="bg-black text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                Setup
              </span>
            </div>
            <p className="text-neutral-600 text-[11px] leading-relaxed">
              This custom equation requires AI deconstruction. Google Gemini 3.6 Flash is <strong>100% free</strong> (1,500 requests/day, no credit card needed).
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
            >
              <span>👉 Get Free API Key (Google AI Studio)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <div className="flex gap-2 pt-1">
              <input
                type="password"
                value={inlineKey}
                onChange={(e) => setInlineKey(e.target.value)}
                placeholder="Paste your AIzaSy... key here"
                className="flex-1 bg-neutral-50 border border-dotted border-neutral-400 rounded-xl px-2.5 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
              />
              <button
                onClick={handleSaveInlineKey}
                disabled={!inlineKey.trim()}
                className="px-3.5 py-2 bg-black hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-colors whitespace-nowrap"
              >
                Save & Retry
              </button>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="p-3 bg-white border-2 border-dotted border-red-300 rounded-2xl text-xs text-red-700 flex items-start gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-grow leading-relaxed font-medium">{errorMessage}</div>
          </div>
        ) : null}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="p-8 bg-white border-2 border-dotted border-neutral-300 rounded-2xl flex flex-col items-center justify-center gap-3 text-neutral-700 shadow-sm">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
            <span className="text-xs font-semibold">Deconstructing formula with Gemini 3.6 Flash...</span>
          </div>
        )}

        {/* Equation Details Card */}
        {equation && !isLoading && (
          <>
            {/* Header / Title */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">{equation.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-neutral-500 font-medium">
                    {equation.source === 'library' ? '⚡ Instant Library' : '✨ Gemini 3.6 Flash'}
                  </span>
                </div>
              </div>

              {/* Copy actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyLatex}
                  title="Copy LaTeX code with \color"
                  className="px-2.5 py-1 rounded-full border border-dashed border-neutral-300 hover:border-black bg-white text-neutral-700 hover:text-black text-xs flex items-center gap-1 transition-colors font-medium"
                >
                  {copyStatus === 'latex' ? <Check className="w-3 h-3 text-black" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[10px]">TeX</span>
                </button>
                <button
                  onClick={handleCopyMarkdown}
                  title="Copy Markdown with ADEPT breakdown"
                  className="px-2.5 py-1 rounded-full border border-dashed border-neutral-300 hover:border-black bg-white text-neutral-700 hover:text-black text-xs flex items-center gap-1 transition-colors font-medium"
                >
                  {copyStatus === 'markdown' ? <Check className="w-3 h-3 text-black" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[10px]">MD</span>
                </button>
              </div>
            </div>

            {/* 1. Interactive Formula */}
            <InteractiveEquation
              latex={equation.normalizedLatex}
              components={equation.components}
              palette={palette}
              showNumberedBadges={showNumberedBadges}
              hoveredChunkId={hoveredChunkId}
              onHover={setHoveredChunkId}
            />

            {/* 2. Plain-English Narrative */}
            <NarrativeSentence
              sentence={equation.narrativeSentence}
              components={equation.components}
              palette={palette}
              showNumberedBadges={showNumberedBadges}
              hoveredChunkId={hoveredChunkId}
              onHover={setHoveredChunkId}
            />

            {/* 3. ADEPT Deep Dive Card */}
            <AdeptView adept={equation.adept} />

            {/* 4. Components Glossary */}
            <ComponentsGlossary
              components={equation.components}
              palette={palette}
              showNumberedBadges={showNumberedBadges}
              hoveredChunkId={hoveredChunkId}
              onHover={setHoveredChunkId}
            />
          </>
        )}
      </main>

      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <InputLatexModal
        isOpen={isInputOpen}
        onClose={() => setIsInputOpen(false)}
        onSubmitLatex={handleExplainCustomLatex}
      />
      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectEquation={(eq) => setEquation(eq)}
      />
    </div>
  );
}
