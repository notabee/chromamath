import { useState, useEffect, useCallback } from 'react';
import { ColorizedEquation, PaletteType } from '../../shared/types';
import {
  sendExtensionMessage,
  ExplainResponse,
  GetEquationResponse,
  DocumentHistoryResponse
} from '../../shared/messages';
import { exportToOverleafLatex, exportToMarkdown } from '../../shared/latex';
import { TIMEOUTS } from '../../shared/constants';

export function useEquation(palette: PaletteType) {
  const [equation, setEquation] = useState<ColorizedEquation | null>(null);
  const [documentHistory, setDocumentHistory] = useState<ColorizedEquation[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('global');
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
        if (res?.docId) {
          setActiveDocId(res.docId);
        }
      })
      .catch(() => {});

    sendExtensionMessage<DocumentHistoryResponse>({ type: 'GET_DOCUMENT_HISTORY' })
      .then((res) => {
        if (res?.equations) {
          setDocumentHistory(res.equations);
        }
        if (res?.docId) {
          setActiveDocId(res.docId);
        }
      })
      .catch(() => {});

    const handleMessage = (message: any) => {
      if (message.type === 'DECONSTRUCTION_STARTED') {
        setIsLoading(true);
        setErrorMessage(null);
      } else if (message.type === 'EQUATION_UPDATED') {
        setEquation(message.equation || null);
        if (message.docId) {
          setActiveDocId(message.docId);
        }
        setIsLoading(false);
        setErrorMessage(null);
      } else if (message.type === 'DOCUMENT_HISTORY_UPDATED') {
        if (message.equations) {
          setDocumentHistory(message.equations);
        }
        if (message.docId) {
          setActiveDocId(message.docId);
        }
      } else if (message.type === 'DECONSTRUCTION_ERROR') {
        setIsLoading(false);
        setErrorMessage(message.error || 'Deconstruction failed.');
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
        { type: 'EXPLAIN_LATEX', latex, docId: activeDocId },
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
  }, [activeDocId]);

  const selectHistoryEquation = useCallback((selectedEq: ColorizedEquation) => {
    setEquation(selectedEq);
    sendExtensionMessage({
      type: 'SELECT_CACHED_EQUATION',
      equationId: selectedEq.id,
      docId: activeDocId
    }).catch(() => {});
  }, [activeDocId]);

  const clearDocumentHistory = useCallback(() => {
    setDocumentHistory([]);
    setEquation(null);
    sendExtensionMessage({
      type: 'CLEAR_DOCUMENT_CACHE',
      docId: activeDocId
    }).catch(() => {});
  }, [activeDocId]);

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
    documentHistory,
    activeDocId,
    isLoading,
    errorMessage,
    copyStatus,
    lastFailedLatex,
    setEquation,
    explainLatex,
    selectHistoryEquation,
    clearDocumentHistory,
    copyLatex,
    copyMarkdown,
    clearError,
  };
}

