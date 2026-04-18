/**
 * Calls the backend /agents/run endpoint and returns an SSE stream reader.
 * The backend handles: Jira fetch → prompt assembly → OpenRouter streaming.
 */
export async function runAgent(mcpBaseUrl, jiraToken, openRouterKey, model, agentId, formValues) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Jira-Token': jiraToken,
    'X-OpenRouter-Key': openRouterKey,
  };
  if (model) headers['X-Model'] = model;

  const response = await fetch(`${mcpBaseUrl}/agents/run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ agentId, formValues }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = typeof err.message === 'string'
      ? err.message
      : err.message?.message || `Request failed: ${response.status}`;
    throw new Error(msg);
  }

  return response;
}

/**
 * Reads an SSE stream from the backend /agents/run response.
 * Yields typed event objects:
 *   { type: 'content', text: string }
 *   { type: 'tool_use', id: string, name: string, input: object }
 *   { type: 'tool_result', tool_use_id: string }
 */
export async function* readSSEStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error(parsed.error);

        // Content text chunk
        if (parsed.content) {
          yield { type: 'content', text: parsed.content };
          continue;
        }

        // Tool use event (MCP call started)
        if (parsed.type === 'tool_use') {
          yield { type: 'tool_use', id: parsed.id, name: parsed.name, input: parsed.input };
          continue;
        }

        // Tool result event (MCP call completed)
        if (parsed.type === 'tool_result') {
          yield { type: 'tool_result', tool_use_id: parsed.tool_use_id };
          continue;
        }
      } catch (err) {
        if (err.message && !err.message.includes('JSON')) throw err;
      }
    }
  }
}
