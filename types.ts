
export enum ProjectStatus {
  PLANNED = 'Planned',
  DEVELOPING = 'Developing',
  COMPLETED = 'Completed',
  PUBLISHED = 'Published'
}

export interface PlatformPosts {
  x?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  medium?: string;
}

export interface PrdVersion {
  timestamp: number;
  content: string;
}

export interface AppSettings {
  googleSheetWebAppUrl?: string;
  autoSyncEnabled: boolean;
}

export interface SyncStatus {
  lastSync?: number;
  isSyncing: boolean;
  error?: string;
}

export interface ProjectEntry {
  id: string; // ISO Date String: YYYY-MM-DD
  title: string;
  description: string;
  useCase?: string;
  targetAudience?: string;
  status: ProjectStatus;
  techStack: string[];
  tags: string[];
  githubUrl?: string;
  demoUrl?: string;
  socialPost?: string; // Legacy field
  platformPosts?: PlatformPosts; // Specific posts for each platform
  notes?: string;

  // Roadmap Execution Fields
  authPayments?: string;
  buildTime?: number;
  ctaAdded?: boolean;
  category?: string;
  coreLogicBuilt?: boolean;
  demoVideoRecorded?: boolean;
  feedbackCollected?: boolean;
  ideaFinalized?: boolean;
  mvpCompleted?: boolean;
  postedInstagram?: boolean;
  postedLinkedIn?: boolean;
  postedX?: boolean;
  postedFacebook?: boolean;
  postedMedium?: boolean;
  pricingModel?: string;
  promptDesigned?: boolean;
  revenueGenerated?: number;
  scaleWorthy?: boolean;
  uiReady?: boolean;
  usersSignups?: number;
  dayNumber?: number;
  prd?: string; // Project Requirements Document
  prdHistory?: PrdVersion[]; // Version history for the PRD
  studioPrompt?: string;
}

export interface IdeaSuggestion {
  title: string;
  description: string;
  techStack: string[];
  complexity: 'Easy' | 'Medium' | 'Hard';
}

export interface GlobalStats {
  total: number;
  completed: number;
  published: number;
  streak: number;
}
