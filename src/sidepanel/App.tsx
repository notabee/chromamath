import React, { useState } from 'react';
import { Header } from './components/Header';
import { QuickActions } from './components/QuickActions';
import { ApiKeyNotice } from './components/ApiKeyNotice';
import { InteractiveEquation } from './components/InteractiveEquation';
import { NarrativeSentence } from './components/NarrativeSentence';
import { AdeptView } from './components/AdeptView';
import { ComponentsGlossary } from './components/ComponentsGlossary';
import { SettingsModal } from './components/SettingsModal';
import { InputLatexModal } from './components/InputLatexModal';
import { LibraryModal } from './components/LibraryModal';
import { useSettings } from './hooks/useSettings';
import { useEquation } from './hooks/useEquation';
import { Copy, Check, AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  const { palette, showNumberedBadges, cyclePalette, toggleBadges } = useSettings();
  const {
    equation,
    isLoading,
    errorMessage,
    copyStatus,
    lastFailedLatex,
    setEquation,
    explainLatex,
    copyLatex,
    copyMarkdown,
    clearError,
  } = useEquation(palette);

  const [hoveredChunkId, setHoveredChunkId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const handleSnipFromPaper = () => {
    clearError();
    chrome.runtime?.sendMessage({ type: 'START_SNIP' });
  };

  const handleApiKeySaved = () => {
    clearError();
    if (lastFailedLatex) {
      explainLatex(lastFailedLatex);
    }
  };

  const isApiKeyMissing = Boolean(
    errorMessage && (errorMessage.includes('API Key') || errorMessage.includes('apiKey'))
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7] text-neutral-900 font-sans">
      <Header
        palette={palette}
        onCyclePalette={cyclePalette}
        showNumberedBadges={showNumberedBadges}
        onToggleBadges={toggleBadges}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
      />

      <main className="flex-grow p-4 space-y-4 max-w-xl mx-auto w-full">
        {/* Quick Action Toolbar */}
        <QuickActions
          onSnip={handleSnipFromPaper}
          onPasteTex={() => setIsInputOpen(true)}
          onOpenLibrary={() => setIsLibraryOpen(true)}
        />

        {/* API Key Setup Banner */}
        {isApiKeyMissing && <ApiKeyNotice onSaved={handleApiKeySaved} />}

        {/* Error Banner */}
        {errorMessage && !isApiKeyMissing && (
          <div className="p-3 bg-white border-2 border-dotted border-red-300 rounded-2xl text-xs text-red-700 flex items-start gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-grow leading-relaxed font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="p-8 bg-white border-2 border-dotted border-neutral-300 rounded-2xl flex flex-col items-center justify-center gap-3 text-neutral-700 shadow-sm">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
            <span className="text-xs font-semibold">Deconstructing formula with Gemini 2.0 Flash...</span>
          </div>
        )}

        {/* Equation Details Card */}
        {equation && !isLoading && (
          <>
            {/* Title & Copy Bar */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">{equation.title}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-neutral-500 font-medium">
                    {equation.source === 'library' ? '⚡ Instant Library' : '✨ Gemini'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyLatex}
                  title="Copy LaTeX code with \\color"
                  className="px-2.5 py-1 rounded-full border border-dashed border-neutral-300 hover:border-black bg-white text-neutral-700 hover:text-black text-xs flex items-center gap-1 transition-colors font-medium"
                >
                  {copyStatus === 'latex' ? <Check className="w-3 h-3 text-black" /> : <Copy className="w-3 h-3" />}
                  <span className="text-[10px]">TeX</span>
                </button>
                <button
                  onClick={copyMarkdown}
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
        onSubmitLatex={explainLatex}
      />
      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectEquation={setEquation}
      />
    </div>
  );
}
