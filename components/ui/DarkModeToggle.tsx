'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

export default function DarkModeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
      {/* Toggle pill */}
      <span
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
          isDark ? 'bg-gray-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            isDark ? 'translate-x-[18px]' : 'translate-x-[3px]'
          }`}
        />
      </span>
    </button>
  );
}
