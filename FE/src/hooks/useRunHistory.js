'use client';

import { useState, useCallback } from 'react';

const STORAGE_KEY = 'JIRAPILOT_RUN_HISTORY';
const MAX_RUNS = 50;

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function loadRuns() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function useRunHistory() {
  const [runs, setRuns] = useState(() => loadRuns());

  const addRun = useCallback((entry) => {
    const run = {
      id: `run-${Date.now()}`,
      whenTs: new Date().toISOString(),
      ...entry,
    };
    setRuns(prev => {
      const next = [run, ...prev].slice(0, MAX_RUNS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRuns = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setRuns([]);
  }, []);

  const runsWithRelTime = runs.map(r => ({ ...r, when: relativeTime(r.whenTs) }));

  return { runs: runsWithRelTime, addRun, clearRuns };
}
