
import React from 'react';
import { ProjectEntry, ProjectStatus } from '../types';
import { CheckCircle2, Circle, Send, Code2, ExternalLink } from 'lucide-react';

interface ProjectCardProps {
  project: ProjectEntry;
  onClick: () => void;
}

const statusIcons = {
  [ProjectStatus.PLANNED]: <Circle className="w-4 h-4 text-slate-400" />,
  [ProjectStatus.DEVELOPING]: <Code2 className="w-4 h-4 text-blue-400 animate-pulse" />,
  [ProjectStatus.COMPLETED]: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  [ProjectStatus.PUBLISHED]: <Send className="w-4 h-4 text-indigo-400" />,
};

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  const isToday = new Date().toISOString().split('T')[0] === project.id;

  return (
    <div 
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 group
        ${isToday ? 'bg-indigo-950/30 border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-slate-400">{project.id}</span>
        {statusIcons[project.status]}
      </div>
      
      <h3 className="font-semibold text-slate-100 truncate mb-1">
        {project.title || "Untitled Project"}
      </h3>
      
      <p className="text-xs text-slate-400 line-clamp-2 mb-3 h-8">
        {project.description || "No description set yet. Click to plan."}
      </p>
      
      <div className="flex flex-wrap gap-1">
        {project.techStack.slice(0, 3).map((tech, i) => (
          <span key={i} className="px-1.5 py-0.5 rounded bg-slate-700 text-[10px] text-slate-300">
            {tech}
          </span>
        ))}
        {project.techStack.length > 3 && (
          <span className="text-[10px] text-slate-500 self-center">+{project.techStack.length - 3}</span>
        )}
      </div>

      <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-4 h-4 text-slate-400" />
      </div>
    </div>
  );
};

export default ProjectCard;
