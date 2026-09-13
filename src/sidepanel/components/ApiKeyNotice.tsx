import React, { useState } from 'react';
import { Key, ExternalLink } from 'lucide-react';
import { STORAGE_KEYS } from '../../shared/constants';

interface ApiKeyNoticeProps {
  onSaved: () => void;
}

export const ApiKeyNotice: React.FC<ApiKeyNoticeProps> = ({ onSaved }) => {
  const [inlineKey, setInlineKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    if (!inlineKey.trim()) return;
    setIsSaving(true);
    chrome.storage?.sync?.set({ [STORAGE_KEYS.API_KEY]: inlineKey.trim() }, () => {
      setIsSaving(false);
      onSaved();
    });
  };

  return (
    <div className="p-4 bg-white border-2 border-dotted border-neutral-400 rounded-2xl text-xs text-neutral-800 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-bold text-neutral-900 flex items-center gap-1.5">
          <Key className="w-4 h-4 text-neutral-900" />
          Free Gemini API Key Required
        </span>
        <span className="bg-black text-white px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
          Setup
        </span>
      </div>
      <p className="text-neutral-600 text-[11px] leading-relaxed">
        This custom equation requires AI deconstruction. Google Gemini 2.0 Flash is <strong>100% free</strong> (1,500 requests/day, no credit card needed).
      </p>
      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-black hover:bg-neutral-800 text-white rounded-xl font-bold text-xs transition-all shadow-sm"
      >
        <span>👉 Get Free API Key (Google AI Studio)</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <div className="flex gap-2 pt-1">
        <input
          type="password"
          value={inlineKey}
          onChange={(e) => setInlineKey(e.target.value)}
          placeholder="Paste your AIzaSy... key here"
          className="flex-1 bg-neutral-50 border border-dotted border-neutral-400 rounded-xl px-2.5 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-black"
        />
        <button
          onClick={handleSave}
          disabled={!inlineKey.trim() || isSaving}
          className="px-3.5 py-2 bg-black hover:bg-neutral-800 disabled:opacity-40 text-white rounded-xl font-bold text-xs transition-colors whitespace-nowrap"
        >
          {isSaving ? 'Saving...' : 'Save & Retry'}
        </button>
      </div>
    </div>
  );
};
