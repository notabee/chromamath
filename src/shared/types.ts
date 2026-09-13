export interface SubComponentPart {
  id: string;                    // e.g. "sub-1", "sub-2"
  latexChunk: string;            // e.g. "e", "i 2\\pi", "k", "\\frac{n}{N}"
  plainPhrase: string;           // e.g. "spin", "around a circle", "at that frequency", "time step"
  technicalName: string;         // e.g. "Complex rotation engine", "Full 360° complex orbit"
  roleIntuition: string;         // e.g. "Continuous growth/rotation base"
  paletteIndex?: number;         // Micro-palette index (0-5)
}

export interface SubBreakdown {
  label: string;                 // e.g. "Anatomy of the Rotation Engine"
  narrativeSentence?: string;    // e.g. "Spin around a circle at that frequency for each time step"
  parts: SubComponentPart[];
  whyItExists?: string;          // e.g. "Euler's formula winds the signal around a circle without sines and cosines"
}

export interface MathComponent {
  id: string;                    // e.g. "c1", "c2"
  latexChunk: string;            // e.g. "X_k" or "\\frac{1}{N}\\sum_{n=0}^{N-1}"
  plainPhrase: string;           // e.g. "the energy at a particular frequency"
  technicalName: string;         // e.g. "Frequency domain sample at bin k"
  roleIntuition: string;         // e.g. "The recipe ingredient strength"
  paletteIndex: number;          // 0 to 5
  subBreakdown?: SubBreakdown;   // Optional hierarchical drill-down
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
