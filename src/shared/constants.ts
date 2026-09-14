import { PaletteType } from './types';

export const STORAGE_KEYS = {
  API_KEY: 'apiKey',
  PALETTE: 'palette',
  SHOW_NUMBERED_BADGES: 'showNumberedBadges',
  AUTO_DETECT_ARXIV: 'autoDetectArxiv',
  EQUATION_CACHE: 'chromamath_equation_cache',
} as const;

export const TIMEOUTS = {
  GEMINI_FETCH_MS: 28000,
  CLIENT_TIMEOUT_MS: 32000,
  DISCOVERY_PROBE_MS: 6000,
  PILL_RESET_MS: 3500,
  COPY_FEEDBACK_MS: 2000,
} as const;

export const GEMINI_CONFIG = {
  PRIMARY_MODEL: 'gemini-1.5-flash',
  FALLBACK_MODELS: [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
  ],
  TEMPERATURE: 0.2,
} as const;

export const PALETTE_SEQUENCE: PaletteType[] = ['vibrant', 'okabe-ito', 'high-contrast'];

export const DEFAULT_EQUATION_ID = 'transformer-attention';
