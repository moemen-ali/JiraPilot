'use client';

import { useState, useEffect } from 'react';
import { parseAgent } from '@/lib/agentParser';

const AGENT_FILES = [
  'release-notes',
  'prd-generator',
  'ticket-summary',
  'sprint-summary',
];

export function useAgentList() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAgents() {
      try {
        const results = await Promise.all(
          AGENT_FILES.map(async (id) => {
            const res = await fetch(`/agents/${id}.md`);
            if (!res.ok) throw new Error(`Failed to load agent: ${id}`);
            const text = await res.text();
            return parseAgent(text, id);
          })
        );
        setAgents(results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadAgents();
  }, []);

  return { agents, loading, error };
}