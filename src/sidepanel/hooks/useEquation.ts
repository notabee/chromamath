import { useState, useEffect, useCallback } from 'react';
import { ColorizedEquation, PaletteType } from '../../shared/types';
import libraryEquations from '../../shared/library.json';
import { sendExtensionMessage, ExplainResponse, GetEquationResponse } from '../../shared/messages';
import { exportToOverleafLatex, exportToMarkdown } from '../../shared/latex';
import { DEFAULT_EQUATION_ID, TIMEOUTS } from '../../shared/constants';

export function useEquation(palette: PaletteType) {
  const [equation, setEquation] = useState<ColorizedEquation>(
    () => (libraryEquations.find(e => e.id === DEFAULT_EQUATION_ID) || libraryEquations[0]) as ColorizedEquation
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'latex' | 'markdown' | null>(null);
  const [lastFailedLatex, setLastFailedLatex] = useState<string | null>(null);

  // Sync with background on mount & listen for runtime broadcasts
  useEffect(() => {
    sendExtensionMessage<GetEquationResponse>({ type: 'GET_CURRENT_EQUATION' })
      .then((res) => {
        if (res?.equation) {
          setEquation(res.equation);
        }
      })
      .catch(() => {});

    const handleMessage = (message: any) => {
      if (message.type === 'EQUATION_UPDATED' && message.equation) {
        setEquation(message.equation);
        setIsLoading(false);
        setErrorMessage(null);
      }
    };

    chrome.runtime?.onMessage?.addListener(handleMessage);
    return () => {
      chrome.runtime?.onMessage?.removeListener(handleMessage);
    };
  }, []);

  const explainLatex = useCallback(async (latex: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    setLastFailedLatex(latex);

    try {
      const response = await sendExtensionMessage<ExplainResponse>(
        { type: 'EXPLAIN_LATEX', latex },
        TIMEOUTS.CLIENT_TIMEOUT_MS
      );

      setIsLoading(false);
      if (response?.success && response.equation) {
        setEquation(response.equation);
        setLastFailedLatex(null);
      } else {
        setErrorMessage(response?.error || 'Failed to analyze equation.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Failed to communicate with extension background.');
    }
  }, []);

  const copyLatex = useCallback(async () => {
    if (!equation) return;
    const snippet = exportToOverleafLatex(equation, palette);
    await navigator.clipboard.writeText(snippet);
    setCopyStatus('latex');
    setTimeout(() => setCopyStatus(null), TIMEOUTS.COPY_FEEDBACK_MS);
  }, [equation, palette]);

  const copyMarkdown = useCallback(async () => {
    if (!equation) return;
    const md = exportToMarkdown(equation);
    await navigator.clipboard.writeText(md);
    setCopyStatus('markdown');
    setTimeout(() => setCopyStatus(null), TIMEOUTS.COPY_FEEDBACK_MS);
  }, [equation]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  return {
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
  };
}
