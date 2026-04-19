function normalizeUrl(url) {
  if (!url) return url;
  return /^https?:\/\//i.test(url) ? url : `http://${url}`;
}

export async function listAgents(mcpBaseUrl) {
  mcpBaseUrl = normalizeUrl(mcpBaseUrl);
  const res = await fetch(`${mcpBaseUrl}/agents/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`Failed to load agents: ${res.status}`);
  return res.json();
}

/**
 * Fetches all Jira projects (workspaces) accessible with the current token.
 * Returns { projects: [{ id, key, name }] }.
 */
export async function fetchProjects(mcpBaseUrl, jiraToken, jiraEmail) {
  mcpBaseUrl = normalizeUrl(mcpBaseUrl);
  const headers = { 'Content-Type': 'application/json', 'X-Jira-Token': jiraToken };
  if (jiraEmail) headers['X-Jira-Email'] = jiraEmail;
  const res = await fetch(`${mcpBaseUrl}/jira/projects`, {
    method: 'POST',
    headers,
    body: '{}',
  });
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`);
  return res.json();
}

/**
 * Fetches active/future sprints for a given Jira project key.
 * Returns { sprints: [{ id, name, state }] }.
 */
export async function fetchSprints(mcpBaseUrl, jiraToken, jiraEmail, projectKey) {
  mcpBaseUrl = normalizeUrl(mcpBaseUrl);
  const headers = { 'Content-Type': 'application/json', 'X-Jira-Token': jiraToken };
  if (jiraEmail) headers['X-Jira-Email'] = jiraEmail;
  const res = await fetch(`${mcpBaseUrl}/jira/sprints`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ projectKey }),
  });
  if (!res.ok) throw new Error(`Failed to fetch sprints: ${res.status}`);
  return res.json();
}

/**
 * Tests the Jira connection by making a lightweight sprint search.
 * Returns { ok: boolean, message: string }.
 */
export async function testJiraConnection(mcpBaseUrl, jiraToken, jiraEmail) {
  mcpBaseUrl = normalizeUrl(mcpBaseUrl);
  try {
    const headers = { 'Content-Type': 'application/json', 'X-Jira-Token': jiraToken };
    if (jiraEmail) headers['X-Jira-Email'] = jiraEmail;
    const res = await fetch(`${mcpBaseUrl}/jira/sprint`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sprintName: '__connection_test__', maxResults: 1 }),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Invalid Jira token' };
    return { ok: true, message: 'Connected' };
  } catch {
    return { ok: false, message: 'MCP server unreachable' };
  }
}

/**
 * Tests the OpenRouter connection by calling their public models endpoint.
 * Returns { ok: boolean, message: string }.
 */
export async function testOpenRouterConnection(openRouterKey) {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${openRouterKey}` },
    });
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'Invalid API key' };
    if (!res.ok) return { ok: false, message: `Error ${res.status}` };
    return { ok: true, message: 'Connected' };
  } catch {
    return { ok: false, message: 'Cannot reach OpenRouter' };
  }
}

/**
 * Calls the backend /agents/run endpoint and returns an SSE stream reader.
 * The backend handles: Jira fetch → prompt assembly → OpenRouter streaming.
 */
export async function runAgent(mcpBaseUrl, jiraToken, jiraEmail, openRouterKey, model, agentId, formValues) {
  mcpBaseUrl = normalizeUrl(mcpBaseUrl);
  const headers = {
    'Content-Type': 'application/json',
    'X-Jira-Token': jiraToken,
    'X-OpenRouter-Key': openRouterKey,
  };
  if (jiraEmail) headers['X-Jira-Email'] = jiraEmail;
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
