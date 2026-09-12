import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      chrome.storage?.sync?.get(['apiKey'], (res) => {
        if (res?.apiKey) setApiKey(res.apiKey);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    chrome.storage?.sync?.set({ apiKey: apiKey.trim() }, () => {
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 1000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-2 border-dotted border-neutral-400 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 text-neutral-900">
        <div className="flex items-center justify-between border-b border-dotted border-neutral-300 pb-3">
          <div className="flex items-center gap-2">
            <span className="bg-black text-white p-1 rounded-full">
              <Key className="w-3.5 h-3.5" />
            </span>
            <span className="font-bold text-sm tracking-wide">Settings</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full border border-dashed border-neutral-300 hover:border-black flex items-center justify-center text-neutral-500 hover:text-black transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-neutral-800 mb-1">
              Google Gemini API Key (Free Tier)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your AIzaSy... key here"
              className="w-full bg-neutral-50 border border-dotted border-neutral-400 rounded-xl px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
            />
            <p className="text-[11px] text-neutral-500 mt-1.5 leading-normal">
              Used for vision OCR and on-the-fly math deconstruction for custom equations.
            </p>
          </div>

          <div className="bg-neutral-50 p-3.5 rounded-2xl border border-dotted border-neutral-300 text-xs text-neutral-700 space-y-1.5">
            <div className="font-bold text-neutral-900 flex items-center justify-between">
              <span>Need a free API key?</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-black font-semibold inline-flex items-center gap-1 underline underline-offset-2"
              >
                Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-neutral-500">
              • 100% free with no credit card required<br />
              • Generous free quota: 15 requests/min (1,500 requests/day)
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-dotted border-neutral-300">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-neutral-500 hover:text-black font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold bg-black hover:bg-neutral-800 text-white rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" /> Saved!
              </>
            ) : (
              'Save Key'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
