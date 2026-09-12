import { PaletteType } from './types';

export interface ColorScheme {
  hex: string;
  bgHex: string;
  borderHex: string;
  name: string;
  underlineStyle: string;
}

export const PALETTES: Record<PaletteType, ColorScheme[]> = {
  vibrant: [
    { hex: '#8B5CF6', bgHex: '#8B5CF61A', borderHex: '#8B5CF6', name: 'Purple', underlineStyle: 'solid' },
    { hex: '#3B82F6', bgHex: '#3B82F61A', borderHex: '#3B82F6', name: 'Blue', underlineStyle: 'dashed' },
    { hex: '#10B981', bgHex: '#10B9811A', borderHex: '#10B981', name: 'Emerald', underlineStyle: 'dotted' },
    { hex: '#EF4444', bgHex: '#EF44441A', borderHex: '#EF4444', name: 'Red', underlineStyle: 'double' },
    { hex: '#F59E0B', bgHex: '#F59E0B1A', borderHex: '#F59E0B', name: 'Amber', underlineStyle: 'wavy' },
    { hex: '#EC4899', bgHex: '#EC48991A', borderHex: '#EC4899', name: 'Pink', underlineStyle: 'solid' },
  ],
  'okabe-ito': [
    // Standard Okabe-Ito palette (safe for Protanopia, Deuteranopia, Tritanopia)
    { hex: '#0072B2', bgHex: '#0072B21A', borderHex: '#0072B2', name: 'Deep Blue', underlineStyle: 'solid' },
    { hex: '#E69F00', bgHex: '#E69F001A', borderHex: '#E69F00', name: 'Orange', underlineStyle: 'dashed' },
    { hex: '#009E73', bgHex: '#009E731A', borderHex: '#009E73', name: 'Bluish Green', underlineStyle: 'dotted' },
    { hex: '#D55E00', bgHex: '#D55E001A', borderHex: '#D55E00', name: 'Vermillion', underlineStyle: 'double' },
    { hex: '#CC79A7', bgHex: '#CC79A71A', borderHex: '#CC79A7', name: 'Reddish Purple', underlineStyle: 'wavy' },
    { hex: '#56B4E9', bgHex: '#56B4E91A', borderHex: '#56B4E9', name: 'Sky Blue', underlineStyle: 'solid' },
  ],
  'high-contrast': [
    { hex: '#C084FC', bgHex: '#C084FC26', borderHex: '#C084FC', name: 'Light Purple', underlineStyle: 'solid' },
    { hex: '#60A5FA', bgHex: '#60A5FA26', borderHex: '#60A5FA', name: 'Light Blue', underlineStyle: 'dashed' },
    { hex: '#34D399', bgHex: '#34D39926', borderHex: '#34D399', name: 'Mint', underlineStyle: 'dotted' },
    { hex: '#F87171', bgHex: '#F8717126', borderHex: '#F87171', name: 'Coral', underlineStyle: 'double' },
    { hex: '#FBBF24', bgHex: '#FBBF2426', borderHex: '#FBBF24', name: 'Gold', underlineStyle: 'wavy' },
    { hex: '#F472B6', bgHex: '#F472B626', borderHex: '#F472B6', name: 'Rose', underlineStyle: 'solid' },
  ]
};

export function getColor(palette: PaletteType, index: number): ColorScheme {
  const list = PALETTES[palette] || PALETTES.vibrant;
  return list[index % list.length];
}
