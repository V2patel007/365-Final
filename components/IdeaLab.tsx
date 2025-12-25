
import React, { useState } from 'react';
import { gemini } from '../services/geminiService';
import { IdeaSuggestion } from '../types';
import { Sparkles, Loader2, Plus, BrainCircuit } from 'lucide-react';

interface IdeaLabProps {
  onUseIdea: (idea: IdeaSuggestion) => void;
  isDarkMode?: boolean;
}

const IdeaLab: React.FC<IdeaLabProps> = ({ onUseIdea, isDarkMode }) => {
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<IdeaSuggestion[]>([]);

  const handleGenerate = async () => {
    if (!niche) return;
    setLoading(true);
    try {
      const result = await gemini.generateIdeas(niche);
      setIdeas(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`rounded-2xl md:rounded-[32px] overflow-hidden border shadow-sm ${isDarkMode ? 'glass border-white/5' : 'bg-white border-slate-200'}`}>
      <div className={`p-5 md:p-8 border-b ${isDarkMode ? 'border-white/5 bg-gradient-to-r from-indigo-500/5 to-purple-500/5' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-3 mb-6">
          <BrainCircuit className="text-indigo-400 w-5 h-5 md:w-6 md:h-6" />
          <h2 className={`text-lg md:text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Product Idea Lab</h2>
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <input 
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Focus? (e.g. Creator Economy, SaaS)"
            className={`flex-1 rounded-xl md:rounded-2xl px-4 md:px-5 py-3 md:py-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all
              ${isDarkMode ? 'bg-white/[0.05] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
          />
          <button 
            onClick={handleGenerate}
            disabled={loading || !niche}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-6 md:px-10 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Sparkles className="w-4 h-4 md:w-5 md:h-5" />}
            Generate
          </button>
        </div>
      </div>

      <div className="p-4 md:p-8">
        {!loading && ideas.length === 0 && (
          <div className="text-center py-16 md:py-24 text-slate-500">
            <Sparkles className="w-12 md:w-16 h-12 md:h-16 mx-auto mb-4 md:mb-6 opacity-10" />
            <p className="text-[11px] md:text-sm font-medium">Spark a 2026-ready application concept instantly.</p>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-40 md:h-48 animate-pulse rounded-2xl md:rounded-3xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-100'}`} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {ideas.map((idea, idx) => (
            <div key={idx} className={`border p-5 rounded-2xl md:rounded-3xl hover:border-indigo-500/40 transition-all group flex flex-col
              ${isDarkMode ? 'bg-white/[0.03] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-3 md:mb-4">
                <h4 className={`font-black text-sm md:text-base group-hover:text-indigo-400 transition-colors ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{idea.title}</h4>
                <span className={`text-[8px] md:text-[9px] px-2 py-1 rounded-full font-black uppercase tracking-widest
                  ${idea.complexity === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                    idea.complexity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}
                `}>
                  {idea.complexity}
                </span>
              </div>
              <p className={`text-[11px] md:text-sm mb-4 md:mb-6 line-clamp-3 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{idea.description}</p>
              <div className="flex flex-wrap gap-1.5 md:gap-2 mb-6 md:mb-8">
                {idea.techStack.map(t => (
                  <span key={t} className={`text-[9px] px-2 py-1 rounded-lg font-bold uppercase tracking-tighter
                    ${isDarkMode ? 'bg-white/5 text-slate-400 border border-white/5' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                    {t}
                  </span>
                ))}
              </div>
              <button 
                onClick={() => onUseIdea(idea)}
                className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-500 hover:text-white text-[10px] md:text-xs font-black transition-all active:scale-95"
              >
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Plan this App
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IdeaLab;
