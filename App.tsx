
import React, { useState, useEffect, useMemo } from 'react';
import { ProjectEntry, ProjectStatus, IdeaSuggestion, GlobalStats, AppSettings, SyncStatus } from './types';
import ProjectEditor from './components/ProjectEditor';
import IdeaLab from './components/IdeaLab';
import { parseRoadmapCsv } from './services/csvService';
import { sheetService } from './services/googleSheetService';
import { 
  Calendar as CalendarIcon, 
  BarChart3, 
  Rocket, 
  ChevronLeft, 
  ChevronRight, 
  Trophy,
  CheckCircle2,
  Send,
  Flame,
  Plus,
  Zap,
  Filter,
  Menu,
  X,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ArrowRight,
  RefreshCw,
  Key,
  ExternalLink,
  ShieldCheck,
  Layers,
  Database,
  Cloud,
  Settings as SettingsIcon,
  CloudUpload,
  CloudDownload,
  Link as LinkIcon,
  AlertCircle,
  HelpCircle,
  Check
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

const INITIAL_DATA_KEY = 'dev365_2026_data_v1';
const SETTINGS_KEY = 'dev365_settings_v1';
const THEME_KEY = 'dev365_theme_pref';
const SIDEBAR_COLLAPSED_KEY = 'dev365_sidebar_collapsed';
const DEFAULT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwy34GhGZ1-Uj9W96ZMbQ3Os5P7bCPP4dpDLtx7oVofoWooylzWQRXJDpK9N5T_VOBQCA/exec';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Record<string, ProjectEntry>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'planner' | 'dashboard' | 'lab'>('planner');
  const [viewMonth, setViewMonth] = useState(new Date(2026, 0, 1));
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  
  // Cloud Sync State
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return { 
      autoSyncEnabled: true,
      googleSheetWebAppUrl: DEFAULT_WEBAPP_URL
    };
  });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isSyncing: false });
  const [isUrlValid, setIsUrlValid] = useState<boolean | null>(null);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleOpenSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(INITIAL_DATA_KEY);
    const defaultRoadmap = parseRoadmapCsv();
    
    if (saved) {
      const parsedSaved = JSON.parse(saved);
      const merged = { ...defaultRoadmap, ...parsedSaved };
      setProjects(merged);
    } else {
      setProjects(defaultRoadmap);
    }
    
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme !== null) setIsDarkMode(savedTheme === 'dark');

    const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (savedCollapsed !== null) setIsSidebarCollapsed(savedCollapsed === 'true');
  }, []);

  useEffect(() => {
    if (Object.keys(projects).length > 0) {
      localStorage.setItem(INITIAL_DATA_KEY, JSON.stringify(projects));
    }
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (settings.googleSheetWebAppUrl) {
      sheetService.testConnection(settings.googleSheetWebAppUrl).then(setIsUrlValid);
    } else {
      setIsUrlValid(null);
    }
  }, [settings]);

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme ? 'dark' : 'light');
  };

  const toggleSidebarCollapse = () => {
    const nextState = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextState);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(nextState));
  };

  const resetRoadmap = () => {
    if (window.confirm("This will reset all progress and notes back to the original 365-day plan. Are you sure?")) {
      const defaultRoadmap = parseRoadmapCsv();
      setProjects(defaultRoadmap);
      localStorage.setItem(INITIAL_DATA_KEY, JSON.stringify(defaultRoadmap));
      window.location.reload();
    }
  };

  const calculateProgress = (p: ProjectEntry) => {
    const milestones = [
      p.ideaFinalized, 
      !!p.prd, 
      !!p.studioPrompt, 
      p.uiReady, 
      p.mvpCompleted, 
      p.status === ProjectStatus.PUBLISHED
    ];
    const completed = milestones.filter(Boolean).length;
    return Math.round((completed / milestones.length) * 100);
  };

  const handleCloudPush = async () => {
    if (!settings.googleSheetWebAppUrl) return;
    setSyncStatus({ isSyncing: true });
    const success = await sheetService.syncAll(settings.googleSheetWebAppUrl, projects);
    setSyncStatus({ 
      isSyncing: false, 
      lastSync: success ? Date.now() : syncStatus.lastSync,
      error: success ? undefined : "Cloud push failed. Verify Web App Deployment."
    });
  };

  const handleCloudPull = async () => {
    if (!settings.googleSheetWebAppUrl) return;
    setSyncStatus({ isSyncing: true });
    const cloudData = await sheetService.fetchAll(settings.googleSheetWebAppUrl);
    if (cloudData) {
      setProjects(prev => ({ ...prev, ...cloudData }));
      setSyncStatus({ isSyncing: false, lastSync: Date.now() });
      alert("Successfully pulled and merged cloud data.");
    } else {
      setSyncStatus({ isSyncing: false, error: "Cloud pull failed. Verify your Web App URL." });
    }
  };

  const stats = useMemo<GlobalStats>(() => {
    const projectList = Object.values(projects) as ProjectEntry[];
    const completedStatuses = [ProjectStatus.COMPLETED, ProjectStatus.PUBLISHED];
    const completedDates = new Set(
      projectList
        .filter(p => completedStatuses.includes(p.status))
        .map(p => p.id)
    );
    
    let streakCount = 0;
    if (completedDates.size > 0) {
      const sorted = Array.from(completedDates).sort().reverse();
      const lastCompleted = new Date(sorted[0]);
      let checkDate = new Date(lastCompleted);
      
      const getFormattedDate = (date: Date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };

      let currentID = getFormattedDate(checkDate);
      while (completedDates.has(currentID)) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
        currentID = getFormattedDate(checkDate);
      }
    }

    return {
      total: 365,
      completed: projectList.filter(p => p.status === ProjectStatus.COMPLETED).length,
      published: projectList.filter(p => p.status === ProjectStatus.PUBLISHED).length,
      streak: streakCount
    };
  }, [projects]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return (Object.values(projects) as ProjectEntry[]).filter(p => 
      p.title.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q)) ||
      (p.techStack && p.techStack.some(t => t.toLowerCase().includes(q))) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
    ).sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0));
  }, [searchQuery, projects]);

  const chartData = useMemo(() => {
    const statuses = Object.values(ProjectStatus);
    const projectList = Object.values(projects) as ProjectEntry[];
    return statuses.map(s => ({
      name: s,
      value: projectList.filter(p => p.status === s).length
    }));
  }, [projects]);

  const handleSaveProject = (updated: ProjectEntry, closeEditor: boolean = true) => {
    setProjects(prev => ({ ...prev, [updated.id]: updated }));
    if (settings.googleSheetWebAppUrl && settings.autoSyncEnabled) {
      sheetService.saveOne(settings.googleSheetWebAppUrl, updated);
    }
    if (closeEditor) {
      setSelectedId(null);
    }
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => {
      const next = { ...prev };
      const defaults = parseRoadmapCsv();
      if (defaults[id]) {
        next[id] = defaults[id];
      } else {
        delete next[id];
      }
      return next;
    });
    setSelectedId(null);
  };

  const handleUseIdea = (idea: IdeaSuggestion) => {
    const targetId = Object.keys(projects).find(id => projects[id].status === ProjectStatus.PLANNED && !projects[id].ideaFinalized) 
      || new Date().toISOString().split('T')[0];

    const current = projects[targetId];
    const newProject: ProjectEntry = {
      ...current,
      title: idea.title,
      description: idea.description,
      techStack: idea.techStack || [],
      tags: [...(current.tags || []), 'AI-Lab'],
    };
    setProjects(prev => ({ ...prev, [targetId]: newProject }));
    setActiveTab('planner');
    setSelectedId(targetId);
  };

  const calendarData = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push({ blank: true, key: `blank-${i}` });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const id = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const project = projects[id] || null;
      const filteredProject = (filterStatus === null || project?.status === filterStatus) ? project : null;

      days.push({
        blank: false,
        id,
        date: i,
        fullDateStr: new Date(year, month, i).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        isToday: id === new Date().toISOString().split('T')[0],
        project: filteredProject,
        hasProjectHiddenByFilter: filterStatus !== null && project !== null && project.status !== filterStatus,
        key: id
      });
    }
    return days;
  }, [viewMonth, projects, filterStatus]);

  const statusColors = {
    [ProjectStatus.PLANNED]: isDarkMode ? 'border-rose-500/30 bg-rose-500/10 text-rose-300 ring-rose-500/20' : 'border-rose-200 bg-rose-50 text-rose-700',
    [ProjectStatus.DEVELOPING]: isDarkMode ? 'border-blue-500/30 bg-blue-500/10 text-blue-300 ring-blue-500/20' : 'border-blue-200 bg-blue-50 text-blue-700',
    [ProjectStatus.COMPLETED]: isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 ring-emerald-500/20' : 'border-emerald-200 bg-emerald-50 text-emerald-700',
    [ProjectStatus.PUBLISHED]: isDarkMode ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 ring-indigo-500/20' : 'border-indigo-200 bg-indigo-50 text-indigo-700',
  };

  const getDotColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.PLANNED: return 'bg-rose-500';
      case ProjectStatus.DEVELOPING: return 'bg-blue-500';
      case ProjectStatus.COMPLETED: return 'bg-emerald-500';
      case ProjectStatus.PUBLISHED: return 'bg-indigo-500';
      default: return 'bg-slate-400';
    }
  };

  if (hasApiKey === false) {
    return (
      <div className={`flex flex-col items-center justify-center h-screen w-full ${isDarkMode ? 'bg-[#0f1219] text-white' : 'bg-slate-50 text-slate-900'} px-6 text-center`}>
        <div className="max-w-md space-y-8 p-10 glass rounded-[40px] border-white/5 shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="bg-indigo-600 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl shadow-indigo-500/40">
            <Key className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black mb-4">Gemini API Required</h1>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              To power the AI brainstorming, PRD generation, and social content tools for your 365-day challenge, you need to select a paid Gemini API key.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleOpenSelectKey}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3"
              >
                <ShieldCheck className="w-5 h-5" /> Select API Key
              </button>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs font-bold text-slate-500 hover:text-indigo-400 flex items-center justify-center gap-2 transition-colors"
              >
                Learn about Billing <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-full ${isDarkMode ? 'bg-[#0f1219]' : 'bg-slate-50'} ${isDarkMode ? 'text-white' : 'text-slate-900'} overflow-hidden`}>
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <nav className={`fixed md:relative flex flex-col h-full ${isDarkMode ? 'sidebar-glass' : 'bg-white border-r border-slate-200'} z-[50] transition-all duration-300 ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'} ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}`}>
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg"><Rocket className="text-white w-5 h-5" /></div>
            {!isSidebarCollapsed && <h1 className="text-xl font-black">Dev365 <span className="text-indigo-500">2026</span></h1>}
          </div>
        </div>

        <div className="px-3 md:px-4 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="text" placeholder={isSidebarCollapsed ? "" : "Search roadmap..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={`w-full ${isSidebarCollapsed ? 'pl-9 pr-0' : 'pl-10 pr-4'} py-2.5 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900'}`} />
          </div>
        </div>

        <div className="flex-1 px-3 md:px-4 py-4 space-y-2 overflow-y-auto no-scrollbar">
          <NavButton active={activeTab === 'planner' && !searchQuery} icon={CalendarIcon} label="Planner" isCollapsed={isSidebarCollapsed} onClick={() => { setActiveTab('planner'); setSearchQuery(''); setSidebarOpen(false); }} />
          <NavButton active={activeTab === 'dashboard' && !searchQuery} icon={BarChart3} label="Dashboard" isCollapsed={isSidebarCollapsed} onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); setSidebarOpen(false); }} />
          <NavButton active={activeTab === 'lab' && !searchQuery} icon={Plus} label="Idea Lab" isCollapsed={isSidebarCollapsed} onClick={() => { setActiveTab('lab'); setSearchQuery(''); setSidebarOpen(false); }} />
        </div>

        <div className="p-4 space-y-4">
          <button onClick={() => setShowSettings(true)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${showSettings ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'} ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <SettingsIcon className="w-5 h-5" />
            {!isSidebarCollapsed && <span>Cloud Settings</span>}
          </button>
          <button onClick={toggleSidebarCollapse} className={`hidden md:flex w-full items-center justify-center p-3 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>{isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}</button>
          <button onClick={toggleTheme} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600'} ${isSidebarCollapsed ? 'justify-center p-3' : ''}`}>
            {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}{!isSidebarCollapsed && <span className="text-xs font-bold">Theme</span>}
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col h-full min-w-0 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.05),transparent_50%)]">
        <header className={`flex items-center justify-between p-4 md:p-6 border-b ${isDarkMode ? 'bg-[#0f1219]/80 border-white/5' : 'bg-white/80 border-slate-200'} backdrop-blur-md z-40`}>
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 bg-white/5 rounded-lg text-slate-400" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
            <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] truncate pr-4">{searchQuery ? "Search Results" : activeTab}</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
             {activeTab === 'dashboard' && (
                <button onClick={resetRoadmap} className="flex items-center gap-2 px-2 md:px-3 py-2 text-[8px] md:text-[10px] font-black text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all border border-rose-500/20"><RefreshCw className="w-2.5 h-2.5 md:w-3 md:h-3" /> <span className="hidden md:inline">Reset Roadmap</span><span className="md:hidden">Reset</span></button>
             )}
             {settings.googleSheetWebAppUrl && (
               <div className="flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${syncStatus.error ? 'bg-rose-500' : isUrlValid ? 'bg-emerald-500' : 'bg-amber-500'} ${syncStatus.isSyncing ? 'animate-ping' : 'animate-pulse'}`} />
                  <span className="text-[8px] font-black uppercase text-slate-500 hidden sm:inline">{syncStatus.isSyncing ? 'Syncing...' : isUrlValid ? 'Linked' : 'Connecting'}</span>
               </div>
             )}
             <button onClick={() => { setViewMonth(new Date(2026, 0, 1)); setFilterStatus(null); }} className={`px-3 md:px-4 py-2 text-[8px] md:text-[10px] font-black rounded-lg border transition-all ${isDarkMode ? 'text-slate-400 hover:text-white bg-white/5 border-white/5' : 'text-slate-600 border-slate-200'}`}>2026 Start</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto w-full no-scrollbar">
          {searchQuery ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {searchResults.map(p => (
                <div key={p.id} onClick={() => setSelectedId(p.id)} className={`p-5 rounded-[24px] border transition-all cursor-pointer group flex flex-col ${isDarkMode ? 'bg-white/5 border-white/5 hover:border-indigo-500/50 hover:bg-white/10 shadow-xl' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${statusColors[p.status]}`}>{p.status}</div>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">D{p.dayNumber}</span>
                  </div>
                  <h4 className="font-black text-lg mb-2 truncate group-hover:text-indigo-400 transition-colors">{p.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">{p.description}</p>
                  <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.category}</span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'planner' && (
                <div className="space-y-6">
                  {/* Month Navigation & Filtering Toolbar */}
                  <div className={`glass rounded-3xl p-4 md:p-6 flex flex-col lg:flex-row items-center justify-between gap-6 ${isDarkMode ? 'border-white/5' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} className={`p-2 md:p-3 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}><ChevronLeft className="w-5 h-5" /></button>
                      <div className="text-center min-w-[100px] md:min-w-[140px]">
                        <div className="text-lg md:text-2xl font-black leading-none">{viewMonth.toLocaleString('default', { month: 'long' })}</div>
                        <div className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">2026 Roadmap</div>
                      </div>
                      <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} className={`p-2 md:p-3 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}><ChevronRight className="w-5 h-5" /></button>
                    </div>

                    <div className="flex items-center flex-wrap justify-center gap-2">
                      <FilterButton active={filterStatus === null} onClick={() => setFilterStatus(null)} label="All" icon={<Layers className="w-3 h-3" />} isDarkMode={isDarkMode} />
                      {Object.values(ProjectStatus).map(status => (
                        <FilterButton key={status} active={filterStatus === status} onClick={() => setFilterStatus(status)} label={status} isDarkMode={isDarkMode} dotColor={getDotColor(status)} />
                      ))}
                    </div>
                  </div>

                  <div className={`border ${isDarkMode ? 'border-white/5 glass' : 'bg-white border-slate-200 shadow-sm'} rounded-3xl overflow-hidden`}>
                    <div className={`grid grid-cols-7 border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'} bg-white/[0.02]`}>
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (<div key={day} className="py-2 md:py-4 text-center text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">{day}</div>))}
                    </div>
                    <div className="grid grid-cols-7">
                      {calendarData.map((day) => (
                        <div key={day.key} onClick={() => !day.blank && setSelectedId(day.id)} className={`min-h-[60px] md:min-h-[140px] p-2 md:p-3 border-r border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'} transition-all group relative ${day.blank ? 'opacity-20' : 'cursor-pointer hover:bg-indigo-50/10'}`}>
                          {!day.blank && (
                            <>
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] md:text-[11px] font-black font-mono transition-all group-hover:scale-110 ${day.isToday ? 'text-indigo-400 underline decoration-2 underline-offset-4' : 'text-slate-500'}`}>{day.date}</span>
                                {day.project?.status === ProjectStatus.PUBLISHED && <Send className="hidden md:block w-3 h-3 text-indigo-500" />}
                              </div>
                              
                              {!day.blank && day.project && (
                                <div className="md:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center justify-center">
                                  <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(day.project.status)} shadow-sm shadow-black/20`} />
                                </div>
                              )}

                              {day.project && (
                                <div className={`hidden md:flex p-2 rounded-xl border text-[10px] font-bold h-full max-h-[85px] overflow-hidden transition-all flex-col animate-in fade-in zoom-in-95 duration-200 ${statusColors[day.project.status]}`}>
                                  <div className="line-clamp-2 mb-1">{day.project.title}</div>
                                  <div className="mt-auto flex items-center justify-between opacity-60">
                                     <span className="font-black text-[9px]">{calculateProgress(day.project)}%</span>
                                     <span className="text-[8px]">D{day.project.dayNumber}</span>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <StatCard label="Total Planned" value={365} icon={<Rocket className="w-5 h-5"/>} color="text-indigo-400" isDarkMode={isDarkMode} />
                    <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="w-5 h-5"/>} color="text-emerald-400" isDarkMode={isDarkMode} />
                    <StatCard label="Live Apps" value={stats.published} icon={<Send className="w-5 h-5"/>} color="text-blue-400" isDarkMode={isDarkMode} />
                    <StatCard label="Current Streak" value={stats.streak} icon={<Flame className="w-5 h-5"/>} color="text-orange-500" isDarkMode={isDarkMode} />
                  </div>

                  <div className={`p-5 md:p-8 rounded-[32px] border ${isDarkMode ? 'glass border-white/5' : 'bg-white border-slate-200'}`}>
                    <h3 className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] mb-8">2026 Milestone Tracker</h3>
                    <div className="h-[250px] md:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#1e293b" : "#f1f5f9"} vertical={false} />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#0f1219' : '#fff', borderRadius: '16px' }} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.name === ProjectStatus.PUBLISHED ? '#6366f1' : entry.name === ProjectStatus.COMPLETED ? '#10b981' : entry.name === ProjectStatus.DEVELOPING ? '#60a5fa' : '#334155'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'lab' && <IdeaLab onUseIdea={handleUseIdea} isDarkMode={isDarkMode} />}
            </>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className={`w-full max-w-xl p-6 md:p-10 rounded-[40px] border shadow-2xl animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] no-scrollbar ${isDarkMode ? 'bg-[#0f1219] border-white/5' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between items-center mb-8 sticky top-0 bg-inherit py-2 z-10">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-xl"><Cloud className="text-white w-5 h-5" /></div>
                <h3 className="text-xl font-black">Cloud Database Setup</h3>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-full"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-8">
              {/* Deployment Guide */}
              <div className={`p-5 rounded-2xl border ${isDarkMode ? 'bg-indigo-500/5 border-indigo-500/10' : 'bg-indigo-50 border-indigo-100'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Setup Guide</span>
                </div>
                <ol className="text-[10px] md:text-xs text-slate-500 space-y-2 list-decimal pl-4 leading-relaxed">
                  <li>Open a <strong>Google Sheet</strong> and click <i>Extensions &gt; Apps Script</i>.</li>
                  <li>Paste the code from <code>backend/Code.gs</code>.</li>
                  <li><strong>Run manualSetup</strong> in the script editor once.</li>
                  <li>Click <strong>Deploy &gt; New Deployment</strong>.</li>
                  <li>Set <i>Execute as: Me</i> and <i>Who has access: Anyone</i>.</li>
                  <li><strong>CRITICAL:</strong> Do not click 'Run' on doPost; it will error. Copy the Web App URL below.</li>
                </ol>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Web App URL</label>
                <div className="relative group">
                   <input 
                    type="url" 
                    value={settings.googleSheetWebAppUrl || ''} 
                    onChange={(e) => setSettings({...settings, googleSheetWebAppUrl: e.target.value})}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className={`w-full border rounded-2xl pl-12 pr-12 py-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all
                      ${isDarkMode ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-700' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                  />
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isUrlValid === true && <Check className="w-5 h-5 text-emerald-500" />}
                    {isUrlValid === false && settings.googleSheetWebAppUrl && <AlertCircle className="w-5 h-5 text-rose-500" />}
                    {syncStatus.isSyncing && <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/5">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">Instant Auto-Sync</div>
                  <div className="text-[10px] text-slate-500">Automatically push changes on every project save</div>
                </div>
                <button 
                  onClick={() => setSettings({...settings, autoSyncEnabled: !settings.autoSyncEnabled})}
                  className={`w-12 h-6 rounded-full transition-all relative ${settings.autoSyncEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.autoSyncEnabled ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={handleCloudPush}
                  disabled={!settings.googleSheetWebAppUrl || syncStatus.isSyncing}
                  className="flex items-center justify-center gap-3 p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all disabled:opacity-30 group"
                >
                  <CloudUpload className="w-5 h-5 text-indigo-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Push All Local</span>
                </button>
                <button 
                   onClick={handleCloudPull}
                   disabled={!settings.googleSheetWebAppUrl || syncStatus.isSyncing}
                   className="flex items-center justify-center gap-3 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all disabled:opacity-30 group"
                >
                  <CloudDownload className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Pull From Cloud</span>
                </button>
              </div>

              {syncStatus.error && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {syncStatus.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedId && projects[selectedId] && (
        <ProjectEditor 
          project={projects[selectedId]}
          onSave={handleSaveProject}
          onDelete={handleDeleteProject}
          onClose={() => setSelectedId(null)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};

const FilterButton = ({ active, onClick, label, isDarkMode, dotColor, icon }: any) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border shrink-0 ${active ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/20' : (isDarkMode ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400')}`}>
    {icon}
    {dotColor && <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />}
    {label}
  </button>
);

const NavButton = ({ active, icon: Icon, label, isCollapsed, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${active ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 shadow-lg' : 'text-slate-500 hover:text-slate-300'} ${isCollapsed ? 'justify-center' : ''}`}>
    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-indigo-500' : 'text-slate-500'}`} />
    {!isCollapsed && <span>{label}</span>}
  </button>
);

const StatCard = ({ label, value, icon, color, isDarkMode }: any) => (
  <div className={`p-4 md:p-8 rounded-2xl md:rounded-[32px] border ${isDarkMode ? 'glass border-white/5' : 'bg-white border-slate-200 shadow-sm'} transition-transform hover:scale-[1.02]`}>
    <div className="flex justify-between items-start mb-2 md:mb-4">
      <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
      <div className={`p-1.5 md:p-2 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-slate-50'} ${color}`}>{icon}</div>
    </div>
    <div className="text-xl md:text-4xl font-black">{value}</div>
  </div>
);

export default App;
