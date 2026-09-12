export interface MathComponent {
  id: string;                    // e.g. "c1", "c2"
  latexChunk: string;            // e.g. "X_k" or "\\frac{1}{N}\\sum_{n=0}^{N-1}"
  plainPhrase: string;           // e.g. "the energy at a particular frequency"
  technicalName: string;         // e.g. "Frequency domain sample at bin k"
  roleIntuition: string;         // e.g. "The recipe ingredient strength"
  paletteIndex: number;          // 0 to 5
}

export interface AdeptBreakdown {
  analogy: string;               // Real-world analogy (e.g. smoothie ingredients)
  diagramConcept: string;        // Visual intuition / geometry (e.g. spin around circle)
  concreteExample: string;       // Concrete simple example
  plainDefinition: string;       // Plain language summary
  technicalDefinition: string;   // Formal mathematical definition
}

export interface ColorizedEquation {
  id: string;
  title: string;
  normalizedLatex: string;
  colorizedLatex: string;
  narrativeSentence: string;
  components: MathComponent[];
  adept: AdeptBreakdown;
  source?: 'library' | 'ai' | 'user';
  timestamp?: number;
}

export type PaletteType = 'vibrant' | 'okabe-ito' | 'high-contrast';

export interface UserSettings {
  apiKey?: string;
  palette: PaletteType;
  showNumberedBadges: boolean;
  autoDetectArxiv: boolean;
}

export interface SnipCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}
