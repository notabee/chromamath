import { ColorizedEquation, SnipCoordinates } from './types';
import { TIMEOUTS } from './constants';

export type ExtensionMessage =
  | { type: 'EXPLAIN_LATEX'; latex: string }
  | { type: 'GET_CURRENT_EQUATION' }
  | { type: 'SET_CURRENT_EQUATION'; equation: ColorizedEquation }
  | { type: 'EQUATION_UPDATED'; equation: ColorizedEquation }
  | { type: 'START_SNIP' }
  | { type: 'TRIGGER_SNIP_OVERLAY' }
  | { type: 'SNIP_COMPLETED'; coords: SnipCoordinates }
  | { type: 'CROP_IMAGE'; screenshotUrl: string; coords: SnipCoordinates };

export interface ExplainResponse {
  success: boolean;
  equation?: ColorizedEquation;
  error?: string;
}

export interface GetEquationResponse {
  equation: ColorizedEquation | null;
}

export interface CropImageResponse {
  success: boolean;
  croppedDataUrl?: string;
  error?: string;
}

/**
 * Type-safe wrapper around chrome.runtime.sendMessage with timeout protection.
 */
export function sendExtensionMessage<TResponse = any>(
  message: ExtensionMessage,
  timeoutMs: number = TIMEOUTS.CLIENT_TIMEOUT_MS
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Extension request timed out after ${Math.round(timeoutMs / 1000)}s`));
      }
    }, timeoutMs);

    try {
      if (!chrome?.runtime?.sendMessage) {
        clearTimeout(timer);
        reject(new Error('chrome.runtime.sendMessage is not available in this context'));
        return;
      }

      chrome.runtime.sendMessage(message, (response) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message || 'Extension connection error'));
          return;
        }

        resolve(response as TResponse);
      });
    } catch (err: any) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  });
}
