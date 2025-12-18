import React, { useEffect, useState } from 'react';
import { SavedVibe } from '../types';
import { Button } from './Button';
import { LibraryIcon, TrashIcon, SparklesIcon } from './Icons';

interface VibeLibraryProps {
  onLoadVibe: (vibe: SavedVibe) => void;
}

export const VibeLibrary: React.FC<VibeLibraryProps> = ({ onLoadVibe }) => {
  const [vibes, setVibes] = useState<SavedVibe[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('afriSunoVibes');
    if (saved) {
      try {
        setVibes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse vibes", e);
      }
    }
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = vibes.filter(v => v.id !== id);
    setVibes(updated);
    localStorage.setItem('afriSunoVibes', JSON.stringify(updated));
  };

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-900/30 rounded-lg">
           <LibraryIcon className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Vibe Library</h2>
          <p className="text-gray-400 text-sm">Your saved prompts and lyrics.</p>
        </div>
      </div>

      {vibes.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-2xl">
          <SparklesIcon className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400">No vibes saved yet</h3>
          <p className="text-gray-600 text-sm mt-2">Generate a song and click save to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {vibes.map((vibe) => (
            <div 
              key={vibe.id}
              className="bg-suno-card border border-gray-800 rounded-xl p-5 hover:border-suno-accent/50 transition-all cursor-pointer group shadow-lg"
              onClick={() => onLoadVibe(vibe)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-suno-accent bg-suno-accent/10 px-2 py-1 rounded">
                  {formatDate(vibe.timestamp)}
                </span>
                <button 
                  onClick={(e) => handleDelete(vibe.id, e)}
                  className="text-gray-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Vibe"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              
              <h4 className="text-white font-medium mb-2 line-clamp-1">{vibe.idea}</h4>
              
              <div className="bg-black/30 rounded p-3 mb-3 border border-gray-800">
                <p className="text-xs text-gray-400 font-mono line-clamp-2">
                  {vibe.stylePrompt}
                </p>
              </div>

              <div className="flex justify-end">
                 <span className="text-xs text-gray-500 font-medium group-hover:text-white transition-colors">
                   Click to Load →
                 </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};