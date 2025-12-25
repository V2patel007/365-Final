
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ProjectEntry, ProjectStatus, PlatformPosts, PrdVersion } from '../types';
import { 
  X, Save, Trash2, Send, Wand2, Loader2, Github, Globe, 
  FileText, Tag, CheckSquare, BarChart2, DollarSign, Users, Clock,
  Instagram, Linkedin, Twitter, Rocket, Plus, Hash, Sparkles, Copy, Check, Terminal, ClipboardList, Zap, Facebook, BookOpen, Calendar as CalendarIcon,
  Maximize2, Minimize2, Tags, History, RotateCcw, Bookmark, RefreshCw, Share2, Target, Briefcase
} from 'lucide-react';
import { gemini } from '../services/geminiService';

const COMMON_TECHS = [
  "React", "Tailwind", "Next.js", "Gemini API", "Firebase", "Supabase", 
  "TypeScript", "Node.js", "Express", "Python", "Flask", "FastAPI", 
  "Stripe", "MongoDB", "PostgreSQL", "OpenAI", "Vercel", "Netlify", 
  "Auth0", "Clerk", "Prisma", "Drizzle", "Radix UI", "Shadcn UI", 
  "Framer Motion", "Three.js", "WebSockets", "Redis"
];

interface ProjectEditorProps {
  project: ProjectEntry;
  onSave: (updated: ProjectEntry, closeEditor?: boolean) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
  isDarkMode?: boolean;
}

const ProjectEditor: React.FC<ProjectEditorProps> = ({ project, onSave, onClose, onDelete, isDarkMode }) => {
  const [edited, setEdited] = useState<ProjectEntry>(project);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [generatingPosts, setGeneratingPosts] = useState(false);
  const [generatingStudioPrompt, setGeneratingStudioPrompt] = useState(false);
  const [generatingPRD, setGeneratingPRD] = useState(false);
  const [brainstorming, setBrainstorming] = useState(false);
  const [techInput, setTechInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [activeSocialTab, setActiveSocialTab] = useState<keyof PlatformPosts>('x');
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [showPrdHistory, setShowPrdHistory] = useState(false);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);

  const lastSavedPrdRef = useRef<string>(project.prd || '');

  useEffect(() => {
    setEdited(prev => {
      if (prev.id !== project.id) return project;
      return prev;
    });
    lastSavedPrdRef.current = project.prd || '';
  }, [project]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (edited.prd !== lastSavedPrdRef.current) {
        setIsSyncing(true);
        onSave(edited, false);
        lastSavedPrdRef.current = edited.prd || '';
        setLastAutoSaveTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setTimeout(() => setIsSyncing(false), 1500);
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [edited, onSave]);

  const handleChange = (field: keyof ProjectEntry, value: any) => {
    setEdited(prev => ({ ...prev, [field]: value }));
  };

  const savePrdSnapshot = (content: string) => {
    if (!content.trim()) return;
    const snapshot: PrdVersion = {
      timestamp: Date.now(),
      content: content
    };
    setEdited(prev => {
      const history = prev.prdHistory || [];
      if (history.length > 0 && history[history.length - 1].content === content) return prev;
      return { ...prev, prdHistory: [...history, snapshot] };
    });
  };

  const handleBrainstorm = async () => {
    if (!edited.title) return;
    setBrainstorming(true);
    try {
      const details = await gemini.brainstormProjectDetails(edited.title, edited.category || 'General');
      setEdited(prev => ({
        ...prev,
        description: details.description || prev.description,
        useCase: details.useCase || prev.useCase,
        targetAudience: details.targetAudience || prev.targetAudience,
        techStack: Array.from(new Set([...prev.techStack, ...(details.techStack || [])])),
        pricingModel: details.pricingModel || prev.pricingModel,
        notes: (prev.notes ? prev.notes + '\n\n' : '') + "AI Suggestion: " + (details.notes || '')
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setBrainstorming(false);
    }
  };

  const handleGeneratePRD = async () => {
    if (!edited.title || !edited.description) return;
    setGeneratingPRD(true);
    try {
      const prdText = await gemini.generatePRD(edited.title, edited.description, edited.useCase || '', edited.targetAudience || '');
      if (edited.prd) savePrdSnapshot(edited.prd);
      handleChange('prd', prdText);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setGeneratingPRD(false);
    }
  };

  const handleGenerateStudioPrompt = async () => {
    if (!edited.prd) return;
    setGeneratingStudioPrompt(true);
    try {
      const promptText = await gemini.generateStudioPrompt(edited.prd);
      handleChange('studioPrompt', promptText);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setGeneratingStudioPrompt(false);
    }
  };

  const handleGenerateAllPosts = async () => {
    if (!edited.title || !edited.description) return;
    setGeneratingPosts(true);
    try {
      const posts = await gemini.generatePlatformPosts(edited.title, edited.description, edited.demoUrl || '');
      handleChange('platformPosts', posts);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : String(error));
    } finally {
      setGeneratingPosts(false);
    }
  };

  const handleCopyPrompt = () => {
    if (edited.studioPrompt) {
      navigator.clipboard.writeText(edited.studioPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const handleCopyPlatformPost = (platform: keyof PlatformPosts) => {
    const text = edited.platformPosts?.[platform];
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedPlatform(platform);
      setTimeout(() => setCopiedPlatform(null), 2000);
    }
  };

  const addTech = (tech: string) => {
    const cleanTech = tech.trim();
    if (cleanTech && !edited.techStack.includes(cleanTech)) {
      handleChange('techStack', [...edited.techStack, cleanTech]);
    }
    setTechInput('');
  };

  const removeTech = (index: number) => {
    const newStack = [...edited.techStack];
    newStack.splice(index, 1);
    handleChange('techStack', newStack);
  };

  const addTag = (tag: string) => {
    const cleanTag = tag.trim().toLowerCase();
    if (cleanTag && !edited.tags.includes(cleanTag)) {
      handleChange('tags', [...edited.tags, cleanTag]);
    }
    setTagInput('');
  };

  const removeTag = (index: number) => {
    const newTags = [...edited.tags];
    newTags.splice(index, 1);
    handleChange('tags', newTags);
  };

  const revertToVersion = (index: number) => {
    const version = edited.prdHistory![index];
    if (edited.prd) savePrdSnapshot(edited.prd);
    handleChange('prd', version.content);
    setSelectedHistoryIndex(null);
    setShowPrdHistory(false);
  };

  const ChecklistItem = ({ label, field }: { label: string, field: keyof ProjectEntry }) => (
    <label className={`flex items-center gap-2 text-[11px] md:text-sm cursor-pointer hover:text-white transition-colors py-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
      <input type="checkbox" checked={!!edited[field]} onChange={(e) => handleChange(field, e.target.checked)} className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500" />
      {label}
    </label>
  );

  const SocialTab = ({ platform, icon: Icon, label }: { platform: keyof PlatformPosts, icon: any, label: string }) => (
    <button 
      onClick={() => setActiveSocialTab(platform)} 
      className={`flex items-center gap-2 px-3 md:px-4 py-3 md:py-2 text-[10px] md:text-xs font-black transition-all border-b-2 shrink-0 
        ${activeSocialTab === platform ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5'}
      `}
    >
      <Icon className="w-3 md:w-3.5 h-3 md:h-3.5" />
      {label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[1000] flex justify-end bg-black/70 backdrop-blur-sm">
      <div className={`h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300 transition-all relative flex flex-col ${isDarkMode ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-200'} ${isFullScreen ? 'w-full' : 'w-full md:max-w-3xl'} no-scrollbar md:scrollbar-default`}>
        {/* Header */}
        <div className={`p-4 md:p-6 border-b flex justify-between items-center sticky top-0 z-[1100] ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex-1 min-w-0 pr-4">
            <h2 className={`text-base md:text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <Rocket className="w-4 h-4 md:w-5 md:h-5 text-indigo-500 shrink-0" /> <span className="truncate">Day {edited.dayNumber || '?'}: Mission Control</span>
            </h2>
            <div className="flex items-center gap-3">
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{edited.id}</p>
              <div className="flex items-center gap-1.5">
                {isSyncing ? (
                  <span className="text-[9px] text-indigo-400 font-bold flex items-center gap-1">
                    <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Syncing...
                  </span>
                ) : lastAutoSaveTime && (
                  <span className="text-[9px] text-slate-500 font-medium">Synced {lastAutoSaveTime}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setIsFullScreen(!isFullScreen)} className={`p-2 rounded-full transition-colors hidden md:flex items-center justify-center ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`} title={isFullScreen ? "Minimize" : "Maximize"}>
              {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button onClick={onClose} className={`p-2 rounded-full transition-colors flex items-center justify-center ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-600'}`}>
              <X className={`w-5 h-5 md:w-6 md:h-6`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 space-y-6 md:space-y-8 overflow-y-auto no-scrollbar md:scrollbar-default pb-20">
          {/* Phase & Title Section */}
          <section className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-2 tracking-widest">Project Phase</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.values(ProjectStatus).map(status => (
                  <button key={status} onClick={() => handleChange('status', status)} className={`py-3 md:py-2 px-2 rounded-lg text-[9px] md:text-[10px] font-bold transition-all border ${edited.status === status ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : (isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400')}`}>
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-4">
              <div className="flex-1 w-full">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">App Title</label>
                <input type="text" value={edited.title} onChange={(e) => handleChange('title', e.target.value)} className={`w-full border rounded-lg px-4 py-3 md:py-3 text-base md:text-xl font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} placeholder="App Title" />
              </div>
              <button onClick={handleBrainstorm} disabled={brainstorming || !edited.title} className="flex items-center justify-center gap-2 px-4 py-3 md:py-3.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl text-[10px] md:text-xs font-black hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50 group shrink-0">
                {brainstorming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 group-hover:rotate-12 transition-transform" />}
                AI BRAINSTORM
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Project Description</label>
                <textarea rows={3} value={edited.description} onChange={(e) => handleChange('description', e.target.value)} className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs md:text-sm ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} placeholder="What does this app do exactly?" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Briefcase className="w-3 h-3" /> App Use Case</label>
                  <textarea rows={2} value={edited.useCase || ''} onChange={(e) => handleChange('useCase', e.target.value)} className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-[11px] md:text-xs ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} placeholder="Primary problem solved..." />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Target className="w-3 h-3" /> Targeted Audience</label>
                  <textarea rows={2} value={edited.targetAudience || ''} onChange={(e) => handleChange('targetAudience', e.target.value)} className={`w-full border rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-[11px] md:text-xs ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} placeholder="Who is this built for?" />
                </div>
              </div>
            </div>
          </section>

          {/* Links Section */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Globe className="w-3 h-3" /> Demo URL</label>
                <input type="url" value={edited.demoUrl || ''} onChange={(e) => handleChange('demoUrl', e.target.value)} className={`w-full border rounded-lg px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} placeholder="https://..." />
             </div>
             <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Github className="w-3 h-3" /> GitHub Repo</label>
                <input type="url" value={edited.githubUrl || ''} onChange={(e) => handleChange('githubUrl', e.target.value)} className={`w-full border rounded-lg px-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`} placeholder="https://github.com/..." />
             </div>
          </section>

          {/* Steps: PRD & Studio Prompt */}
          <section className="space-y-6">
            <div className={`border rounded-2xl overflow-hidden shadow-inner ${isDarkMode ? 'bg-slate-800/20 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700 bg-slate-800/40' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-400" /><h3 className="text-[10px] font-black uppercase tracking-widest">Step 1: PRD</h3></div>
                <div className="flex items-center gap-2">
                  {edited.prdHistory && edited.prdHistory.length > 0 && (
                    <button onClick={() => setShowPrdHistory(!showPrdHistory)} className={`p-2 rounded-lg ${showPrdHistory ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'}`}><History className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={() => savePrdSnapshot(edited.prd || '')} disabled={!edited.prd} className="p-2 bg-slate-700 text-slate-300 rounded-lg disabled:opacity-30"><Bookmark className="w-3.5 h-3.5" /></button>
                  <button onClick={handleGeneratePRD} disabled={generatingPRD || !edited.title} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold">
                    {generatingPRD ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3 text-amber-400" />} {edited.prd ? 'Regenerate' : 'Build PRD'}
                  </button>
                </div>
              </div>
              <div className="p-3"><textarea rows={10} value={edited.prd || ''} onChange={(e) => handleChange('prd', e.target.value)} className={`w-full border rounded-xl px-4 py-3 text-[10px] font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'}`} placeholder="Detailed PRD will appear here..." /></div>
            </div>

            <div className={`border rounded-2xl overflow-hidden shadow-2xl ${isDarkMode ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-indigo-200'}`}>
               <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-indigo-500/20 bg-indigo-900/10' : 'border-indigo-100 bg-indigo-50/30'}`}>
                  <div className="flex items-center gap-3"><Terminal className="w-5 h-5 text-indigo-400" /><h3 className="text-[11px] font-black uppercase tracking-widest">Step 2: Studio Prompt</h3></div>
                  <button onClick={handleGenerateStudioPrompt} disabled={generatingStudioPrompt || !edited.prd} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-bold">
                    {generatingStudioPrompt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Generate
                  </button>
               </div>
               <div className="p-4 relative">
                  {edited.studioPrompt ? (
                    <div className="relative">
                      <pre className={`w-full border rounded-xl p-4 text-[10px] font-mono whitespace-pre-wrap max-h-64 overflow-y-auto ${isDarkMode ? 'bg-black/40 border-slate-800 text-indigo-200' : 'bg-slate-50 border-slate-100 text-indigo-900'}`}>{edited.studioPrompt}</pre>
                      <button onClick={handleCopyPrompt} className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-indigo-600 text-white rounded-lg transition-all">{copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}</button>
                    </div>
                  ) : <p className="py-12 text-center text-slate-600 text-xs italic">Complete Step 1 (PRD) to unlock the AI Studio Prompt generator.</p>}
               </div>
            </div>
          </section>

          {/* Stats & Milestones */}
          <section className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              <div className={`p-3 md:p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <label className="text-[8px] font-black text-slate-500 uppercase flex items-center gap-1 mb-2"><Clock className="w-3 h-3" /> Dev Hrs</label>
                <input type="number" value={edited.buildTime || 0} onChange={(e) => handleChange('buildTime', parseFloat(e.target.value))} className="w-full bg-transparent text-xl font-bold focus:outline-none" />
              </div>
              <div className={`p-3 md:p-4 rounded-xl border ${isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <label className="text-[8px] font-black text-slate-500 uppercase flex items-center gap-1 mb-2"><DollarSign className="w-3 h-3 text-emerald-500" /> Revenue</label>
                <input type="number" value={edited.revenueGenerated || 0} onChange={(e) => handleChange('revenueGenerated', parseFloat(e.target.value))} className="w-full bg-transparent text-xl font-bold focus:outline-none" />
              </div>
              <div className={`p-3 md:p-4 rounded-xl border col-span-2 md:col-span-1 ${isDarkMode ? 'bg-slate-800/30 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <label className="text-[8px] font-black text-slate-500 uppercase flex items-center gap-1 mb-2"><Users className="w-3 h-3 text-blue-500" /> Signups</label>
                <input type="number" value={edited.usersSignups || 0} onChange={(e) => handleChange('usersSignups', parseFloat(e.target.value))} className="w-full bg-transparent text-xl font-bold focus:outline-none" />
              </div>
            </div>

            <div className={`p-4 md:p-5 rounded-2xl border ${isDarkMode ? 'bg-indigo-950/20 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
              <h3 className="text-[10px] font-black text-indigo-400 uppercase mb-4 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> Build Milestones</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                <ChecklistItem label="Idea Finalized" field="ideaFinalized" />
                <ChecklistItem label="Prompt Designed" field="promptDesigned" />
                <ChecklistItem label="Core Logic Built" field="coreLogicBuilt" />
                <ChecklistItem label="UI/UX Ready" field="uiReady" />
                <ChecklistItem label="MVP Completed" field="mvpCompleted" />
                <ChecklistItem label="CTA Added" field="ctaAdded" />
              </div>
            </div>
          </section>

          {/* Social Launch Center */}
          <section className={`rounded-3xl border overflow-hidden shadow-2xl ${isDarkMode ? 'bg-slate-800/30 border-white/5' : 'bg-white border-slate-200'}`}>
            <div className={`p-5 md:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDarkMode ? 'bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <Share2 className="w-6 h-6 text-purple-400" />
                <div>
                  <h3 className={`text-sm md:text-base font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Social Launch Center</h3>
                  <p className="text-[10px] font-medium text-slate-500">Generate viral launch posts with one click.</p>
                </div>
              </div>
              <button 
                onClick={handleGenerateAllPosts} 
                disabled={generatingPosts || !edited.title || !edited.description}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase transition-all shadow-lg 
                  ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white border border-white/10' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'}
                `}
              >
                {generatingPosts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                Generate Social Bundle
              </button>
            </div>

            <div className={`flex items-center border-b overflow-x-auto no-scrollbar ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
              <SocialTab platform="x" icon={Twitter} label="X (Twitter)" />
              <SocialTab platform="linkedin" icon={Linkedin} label="LinkedIn" />
              <SocialTab platform="instagram" icon={Instagram} label="Instagram" />
              <SocialTab platform="facebook" icon={Facebook} label="Facebook" />
              <SocialTab platform="medium" icon={BookOpen} label="Medium" />
            </div>

            <div className="p-5 md:p-6 relative min-h-[160px]">
              {edited.platformPosts?.[activeSocialTab] ? (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className={`p-5 rounded-2xl border mb-2 relative group ${isDarkMode ? 'bg-black/30 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                    <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed font-medium">{edited.platformPosts[activeSocialTab]}</p>
                    <button 
                      onClick={() => handleCopyPlatformPost(activeSocialTab)}
                      className={`absolute top-4 right-4 p-2.5 rounded-xl transition-all shadow-xl
                        ${isDarkMode ? 'bg-white/10 hover:bg-indigo-600 text-white' : 'bg-white border border-slate-200 hover:border-indigo-400 text-slate-600 hover:text-indigo-600'}
                      `}
                    >
                      {copiedPlatform === activeSocialTab ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 mt-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Tone:</span>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                      {activeSocialTab === 'x' ? 'Viral & Punchy' : 
                       activeSocialTab === 'linkedin' ? 'Authority & Value' :
                       activeSocialTab === 'instagram' ? 'Vibrant & Story' :
                       activeSocialTab === 'facebook' ? 'Friendly & Social' : 'Deep Storytelling'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Sparkles className="w-10 h-10 text-slate-700 mb-4 opacity-20" />
                  <p className="text-[11px] font-medium text-slate-500 max-w-[200px]">Click generate to create custom launch content for this platform.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <div className={`p-4 md:p-6 border-t backdrop-blur-md sticky bottom-0 z-[1100] flex gap-3 md:gap-4 ${isDarkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'}`}>
          <button onClick={() => onSave(edited)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-xl transition-all active:scale-95 text-sm md:text-base"><Save className="w-4 md:w-5 h-4 md:h-5" /> Save Mission Progress</button>
          <button onClick={() => confirm("Remove from roadmap?") && onDelete(edited.id)} className="p-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl border border-rose-500/20"><Trash2 className="w-5 md:w-6 h-5 md:h-6" /></button>
        </div>
      </div>
    </div>
  );
};

export default ProjectEditor;
