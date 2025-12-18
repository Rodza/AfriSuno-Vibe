
import React, { useState, useRef, useEffect } from 'react';
import { AppStep, GeneratedContent, SongContext, ViewMode, SavedVibe, ClarificationResponse } from './types';
import { getClarificationQuestion, generateSong, refineSong } from './services/gemini';
import { Button } from './components/Button';
import { MusicIcon, SparklesIcon, SendIcon, SaveIcon, CheckIcon, InfoIcon, WaveformIcon, LibraryIcon, LoaderIcon, DNAIcon } from './components/Icons';
import { CopyBlock } from './components/CopyBlock';
import { AudioEnhancer } from './components/AudioEnhancer';
import { VibeLibrary } from './components/VibeLibrary';
import { VibeCloner } from './components/VibeCloner';

function App() {
  // Navigation State
  const [view, setView] = useState<ViewMode>('generator');

  // Generator State
  const [step, setStep] = useState<AppStep>('initial');
  const [songIdea, setSongIdea] = useState('');
  const [clarificationData, setClarificationData] = useState<ClarificationResponse | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState('');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [refinementInput, setRefinementInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Save state
  const [isSaved, setIsSaved] = useState(false);

  // Auto-scroll to bottom of results when they appear
  const resultsRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (view === 'generator' && step === 'results' && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [step, generatedContent, view]);

  // Reset save state when content changes
  useEffect(() => {
    setIsSaved(false);
  }, [generatedContent]);

  // Handlers
  const handleInitialSubmit = async () => {
    if (!songIdea.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getClarificationQuestion(songIdea);
      setClarificationData(data);
      setStep('clarifying');
    } catch (e) {
      setError("Something went wrong connecting to the AI. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarificationSubmit = async (customAnswer?: string) => {
    const finalAnswer = customAnswer || clarificationAnswer;
    if (!finalAnswer.trim()) return;
    setIsLoading(true);
    setError(null);
    setStep('generating');
    
    try {
      const context: SongContext = {
        idea: songIdea,
        clarificationQuestion: clarificationData?.question || "",
        clarificationAnswer: finalAnswer
      };
      const result = await generateSong(context);
      setGeneratedContent(result);
      setStep('results');
    } catch (e) {
      setError("Failed to generate the vibe. Please try again.");
      setStep('clarifying');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefinementSubmit = async () => {
    if (!refinementInput.trim() || !generatedContent) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await refineSong(generatedContent, refinementInput);
      setGeneratedContent(result);
      setRefinementInput('');
    } catch (e) {
      setError("Failed to refine the vibe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveVibe = () => {
    if (!generatedContent) return;

    try {
      const existingVibesStr = localStorage.getItem('afriSunoVibes');
      const existingVibes = existingVibesStr ? JSON.parse(existingVibesStr) : [];
      
      const newVibe = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        idea: songIdea,
        lyrics: generatedContent.lyrics,
        stylePrompt: generatedContent.stylePrompt,
        linguisticAnalysis: generatedContent.linguisticAnalysis
      };

      const updatedVibes = [newVibe, ...existingVibes];
      localStorage.setItem('afriSunoVibes', JSON.stringify(updatedVibes));
      
      setIsSaved(true);
    } catch (e) {
      console.error("Failed to save vibe", e);
      setError("Failed to save to local storage.");
    }
  };

  const handleLoadVibe = (vibe: SavedVibe) => {
    setSongIdea(vibe.idea);
    setGeneratedContent({
      lyrics: vibe.lyrics,
      stylePrompt: vibe.stylePrompt,
      linguisticAnalysis: vibe.linguisticAnalysis
    });
    setStep('results');
    setView('generator');
    setIsSaved(true);
  };

  // Render Helpers
  const renderHeader = () => (
    <header className="mb-8 flex flex-col items-center sm:items-start gap-4 w-full">
      <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-suno-accent to-purple-800 rounded-lg shadow-lg shadow-purple-900/20">
            <MusicIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              AfriSuno <span className="font-light text-suno-accent">Vibe</span>
            </h1>
            <p className="text-suno-muted text-xs sm:text-sm hidden sm:block">
              Contemporary Afrikaans Prompt Architect
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-suno-card border border-gray-800 p-1 rounded-xl flex gap-1 overflow-x-auto max-w-full">
          <button
            onClick={() => setView('generator')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              view === 'generator' 
                ? 'bg-gray-800 text-white shadow-sm' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <SparklesIcon className="w-4 h-4 inline mr-2" />
            Vibe Architect
          </button>
          <button
            onClick={() => setView('cloner')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              view === 'cloner' 
                ? 'bg-gray-800 text-white shadow-sm' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <DNAIcon className="w-4 h-4 inline mr-2" />
            Vibe Cloner
          </button>
          <button
            onClick={() => setView('enhancer')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              view === 'enhancer' 
                ? 'bg-gray-800 text-white shadow-sm' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <WaveformIcon className="w-4 h-4 inline mr-2" />
            Audio Engine
          </button>
          <button
            onClick={() => setView('library')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              view === 'library' 
                ? 'bg-gray-800 text-white shadow-sm' 
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <LibraryIcon className="w-4 h-4 inline mr-2" />
            Library
          </button>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-suno-dark p-4 sm:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        {renderHeader()}

        <main className="flex flex-col gap-6 relative min-h-[500px]">
          
          {view === 'cloner' ? (
             <VibeCloner />
          ) : view === 'enhancer' ? (
            <AudioEnhancer />
          ) : view === 'library' ? (
            <VibeLibrary onLoadVibe={handleLoadVibe} />
          ) : (
            <>
              {/* Step 1: Initial Idea */}
              <section className={`transition-all duration-500 ${step === 'initial' ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                 <div className="bg-suno-card border border-gray-800 rounded-2xl p-6 shadow-xl">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Describe your modern Afrikaans song idea...
                    </label>
                    <textarea 
                      className="w-full bg-black/30 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 focus:ring-2 focus:ring-suno-accent focus:border-transparent transition-all resize-none h-32"
                      placeholder="e.g., A moody indie-pop track like Spoegwolf with heavy reverb and electronic elements..."
                      value={songIdea}
                      onChange={(e) => setSongIdea(e.target.value)}
                      disabled={step !== 'initial'}
                    />
                    {step === 'initial' && (
                      <div className="mt-4 flex justify-end">
                        <Button onClick={handleInitialSubmit} isLoading={isLoading} disabled={!songIdea.trim()}>
                          Next Step
                        </Button>
                      </div>
                    )}
                 </div>
              </section>

              {/* Step 2: Clarification */}
              {(step === 'clarifying' || step === 'generating' || step === 'results') && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="bg-suno-card border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-suno-accent/20 flex items-center justify-center flex-shrink-0">
                        <InfoIcon className="w-5 h-5 text-suno-accent" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-suno-accent text-xs font-bold uppercase tracking-widest mb-1">Architect Question</h3>
                        <p className="text-white text-lg font-medium leading-relaxed mb-4">
                          {clarificationData?.question || "Analyzing your vibe..."}
                        </p>
                        
                        {step === 'clarifying' && (
                          <div className="space-y-6">
                            {/* Structured Options */}
                            {clarificationData?.options && clarificationData.options.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {clarificationData.options.map((option, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => handleClarificationSubmit(option)}
                                    className="px-4 py-2 bg-suno-accent/10 border border-suno-accent/30 rounded-full text-xs font-medium text-suno-accent hover:bg-suno-accent hover:text-white transition-all duration-300"
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Custom Input */}
                            <div className="flex flex-col sm:flex-row gap-3">
                              <input 
                                className="flex-grow bg-black/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-suno-accent focus:border-transparent outline-none"
                                placeholder="Or type a custom answer..."
                                value={clarificationAnswer}
                                onChange={(e) => setClarificationAnswer(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleClarificationSubmit()}
                                autoFocus
                              />
                              <Button onClick={() => handleClarificationSubmit()} isLoading={isLoading} disabled={!clarificationAnswer.trim()}>
                                Generate Vibe
                              </Button>
                            </div>
                          </div>
                        )}

                        {(step === 'generating') && (
                          <div className="flex items-center gap-3 py-4 text-suno-muted animate-pulse">
                            <LoaderIcon className="w-5 h-5 animate-spin" />
                            <span>Crafting contemporary lyrics and style prompts...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Step 3: Results */}
              {step === 'results' && generatedContent && (
                <section ref={resultsRef} className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6 mb-20">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Lyrics Section */}
                    <div className="h-full">
                       <CopyBlock label="Modern Afrikaans Lyrics" content={generatedContent.lyrics} isMono />
                    </div>

                    {/* Prompts & Analysis */}
                    <div className="flex flex-col gap-6">
                       <CopyBlock label="Suno V5 English Style Prompt" content={generatedContent.stylePrompt} />
                       
                       {generatedContent.linguisticAnalysis && (
                         <div className="bg-blue-900/10 border border-blue-900/30 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2 text-blue-400">
                               <InfoIcon className="w-4 h-4" />
                               <span className="text-xs font-bold uppercase">Modern Style Analysis</span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed italic">
                              {generatedContent.linguisticAnalysis}
                            </p>
                         </div>
                       )}

                       {/* Action Bar */}
                       <div className="flex flex-wrap gap-3">
                          <Button 
                            variant="secondary" 
                            className="flex-grow" 
                            onClick={handleSaveVibe}
                            disabled={isSaved}
                          >
                             {isSaved ? (
                               <><CheckIcon className="w-4 h-4 mr-2 text-green-400" /> Saved to Library</>
                             ) : (
                               <><SaveIcon className="w-4 h-4 mr-2" /> Save to Library</>
                             )}
                          </Button>
                          <Button variant="ghost" className="px-6" onClick={() => { setStep('initial'); setGeneratedContent(null); setSongIdea(''); setClarificationAnswer(''); }}>
                            Start Fresh
                          </Button>
                       </div>
                    </div>
                  </div>

                  {/* Refinement Interface */}
                  <div className="bg-suno-card border border-gray-800 rounded-2xl p-6 shadow-xl">
                    <label className="block text-sm font-medium text-gray-400 mb-4">
                      Wanna tweak the contemporary sound? (e.g., "Add more synth-wave pads" or "Make the lyrics punchier")
                    </label>
                    <div className="flex gap-3">
                      <input 
                        className="flex-grow bg-black/30 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-suno-accent outline-none"
                        placeholder="Add your refinement feedback..."
                        value={refinementInput}
                        onChange={(e) => setRefinementInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefinementSubmit()}
                      />
                      <button 
                        onClick={handleRefinementSubmit}
                        disabled={isLoading || !refinementInput.trim()}
                        className="bg-gray-800 p-3 rounded-xl text-suno-accent hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        {isLoading ? <LoaderIcon className="w-6 h-6 animate-spin" /> : <SendIcon className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-4 rounded-xl text-sm animate-shake">
                  {error}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer Branding */}
      <footer className="mt-12 mb-8 text-center opacity-30">
        <p className="text-xs font-mono uppercase tracking-[0.2em]">Suno V5 Modern Architect • Contemporary Afrikaans Excellence</p>
      </footer>
    </div>
  );
}

export default App;
