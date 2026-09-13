import { useState, useEffect, useCallback } from 'react';
import { PaletteType } from '../../shared/types';
import { STORAGE_KEYS, PALETTE_SEQUENCE } from '../../shared/constants';

export function useSettings() {
  const [palette, setPalette] = useState<PaletteType>('vibrant');
  const [showNumberedBadges, setShowNumberedBadges] = useState(false);

  useEffect(() => {
    chrome.storage?.sync?.get(
      [STORAGE_KEYS.PALETTE, STORAGE_KEYS.SHOW_NUMBERED_BADGES],
      (res) => {
        if (res?.[STORAGE_KEYS.PALETTE]) {
          setPalette(res[STORAGE_KEYS.PALETTE]);
        }
        if (res?.[STORAGE_KEYS.SHOW_NUMBERED_BADGES] !== undefined) {
          setShowNumberedBadges(res[STORAGE_KEYS.SHOW_NUMBERED_BADGES]);
        }
      }
    );
  }, []);

  const cyclePalette = useCallback(() => {
    setPalette((current) => {
      const nextIdx = (PALETTE_SEQUENCE.indexOf(current) + 1) % PALETTE_SEQUENCE.length;
      const nextPalette = PALETTE_SEQUENCE[nextIdx];
      chrome.storage?.sync?.set({ [STORAGE_KEYS.PALETTE]: nextPalette });
      return nextPalette;
    });
  }, []);

  const toggleBadges = useCallback(() => {
    setShowNumberedBadges((prev) => {
      const next = !prev;
      chrome.storage?.sync?.set({ [STORAGE_KEYS.SHOW_NUMBERED_BADGES]: next });
      return next;
    });
  }, []);

  return {
    palette,
    showNumberedBadges,
    cyclePalette,
    toggleBadges,
  };
}
