import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from './Icons';

interface CopyBlockProps {
  label: string;
  content: string;
  isMono?: boolean;
}

export const CopyBlock: React.FC<CopyBlockProps> = ({ label, content, isMono = false }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-2 w-full h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-suno-muted">{label}</span>
        <button
          onClick={handleCopy}
          className="text-xs flex items-center gap-1 text-suno-accent hover:text-white transition-colors"
          title="Copy to clipboard"
        >
          {copied ? <CheckIcon className="w-3 h-3" /> : <CopyIcon className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="relative group flex-grow">
        <div className={`
          w-full h-full min-h-[150px] p-4 rounded-lg bg-suno-card border border-gray-800 
          text-gray-300 text-sm overflow-y-auto max-h-[500px]
          ${isMono ? 'font-mono leading-relaxed whitespace-pre-wrap' : 'font-sans leading-relaxed'}
        `}>
          {content}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-suno-card to-transparent pointer-events-none rounded-b-lg opacity-50"></div>
      </div>
    </div>
  );
};