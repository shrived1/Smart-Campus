import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ compact = false, className = '' }) => {
  const { isLightMode, toggleTheme } = useTheme();

  const nextModeLabel = isLightMode ? 'Switch to Dark Theme' : 'Switch to High-Contrast Light Mode';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={nextModeLabel}
      aria-pressed={isLightMode}
      title={nextModeLabel}
      className={`sc-theme-toggle inline-flex items-center gap-2 rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
        compact ? 'p-2 text-xs' : 'py-1.5 px-3 text-xs font-semibold'
      } ${
        isLightMode
          ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-xs'
          : 'bg-[#141021] text-slate-200 border-[#2a1e45] hover:bg-[#1c162f] hover:text-[#00E5FF]'
      } ${className}`}
    >
      {isLightMode ? (
        <Moon size={16} className="text-cyan-300 shrink-0" />
      ) : (
        <Sun size={16} className="text-[#00E5FF] shrink-0" />
      )}
      {!compact && (
        <span className="hidden sm:inline">
          {isLightMode ? 'Dark Theme' : 'Light Mode'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;
