'use client';

import { useState, useCallback, useRef } from 'react';
import { runAgent, readSSEStream } from '@/lib/mcpClient';

export function useAgentRunner() {
  const [output, setOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [tools, setTools] = useState([]); // [{ id, label, detail, state: 'running'|'done' }]
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const toolCounterRef = useRef(0);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setOutput('');
    setTools([]);
    setError(null);
    setIsStreaming(false);
    toolCounterRef.current = 0;
  }, []);

  const run = useCallback(async (agent, formValues) => {
    const jiraToken  = localStorage.getItem('JIRAPILOT_JIRA_TOKEN');
    const jiraEmail  = localStorage.getItem('JIRAPILOT_JIRA_EMAIL');
    const orKey      = localStorage.getItem('JIRAPILOT_OPENROUTER_KEY');
    const mcpUrl     = process.env.NEXT_PUBLIC_MCP_URL || localStorage.getItem('JIRAPILOT_MCP_URL') || 'http://localhost:3001';
    const model      = localStorage.getItem('JIRAPILOT_MODEL') || 'qwen/qwen3-coder:free';

    if (!jiraToken) {
      setError('Jira API token is missing. Add it in Settings.');
      return;
    }
    if (!orKey) {
      setError('OpenRouter API key is missing. Add it in Settings.');
      return;
    }
    if (!mcpUrl) {
      setError('MCP server URL is missing. Add it in Settings.');
      return;
    }

    setOutput('');
    setTools([]);
    setError(null);
    setIsStreaming(true);
    toolCounterRef.current = 0;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await runAgent(mcpUrl, jiraToken, jiraEmail, orKey, model, agent.id, formValues);

      let accumulated = '';
      for await (const event of readSSEStream(response)) {
        if (controller.signal.aborted) break;

        if (event.type === 'content') {
          accumulated += event.text;
          setOutput(accumulated);
        } else if (event.type === 'tool_use') {
          const toolId = ++toolCounterRef.current;
          // Format the detail from input object
          const inputStr = event.input
            ? Object.entries(event.input).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')
            : '';
          const detail = `${event.name}(${inputStr})`;
          setTools(prev => [...prev, {
            id: toolId,
            label: 'MCP · Jira',
            detail,
            state: 'running',
          }]);
        } else if (event.type === 'tool_result') {
          // Mark the most recent running tool as done
          setTools(prev => {
            const idx = [...prev].reverse().findIndex(t => t.state === 'running');
            if (idx === -1) return prev;
            const realIdx = prev.length - 1 - idx;
            return prev.map((t, i) => i === realIdx ? { ...t, state: 'done' } : t);
          });
        }
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(`⚠ ${err.message}`);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  // Derived run state for the UI
  const runState = isStreaming ? 'running' : (output ? 'done' : 'idle');

  return { output, isStreaming, runState, tools, error, run, abort, reset };
}
