'use client';

import { useState, useEffect } from 'react';
import { listAgents } from '@/lib/mcpClient';

export function useAgentList(mcpUrl) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mcpUrl) {
      setError('MCP server URL not set. Configure it in Settings.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    listAgents(mcpUrl)
      .then(setAgents)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [mcpUrl]);

  return { agents, loading, error };
}
