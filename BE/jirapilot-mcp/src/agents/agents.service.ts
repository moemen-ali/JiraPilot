import { Injectable, NotFoundException } from '@nestjs/common';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import * as matter from 'gray-matter';

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  inputs: any[];
  systemPrompt: string;
}

const AGENT_IDS = [
  'release-notes',
  'sprint-summary',
  'ticket-summary',
  'prd-generator',
];

// Maps each agent to the Jira endpoint it needs
const AGENT_JIRA_ROUTE: Record<string, string> = {
  'release-notes': 'sprint',
  'sprint-summary': 'sprint',
  'ticket-summary': 'tickets',
  'prd-generator': 'epic',
};

@Injectable()
export class AgentsService {
  private readonly agents = new Map<string, AgentConfig>();

  constructor() {
    this.loadAllAgents();
  }

  private loadAllAgents() {
    for (const id of AGENT_IDS) {
      const filePath = join(__dirname, 'prompts', `${id}.md`);
      if (!existsSync(filePath)) {
        console.warn(`Agent prompt file not found: ${filePath}`);
        continue;
      }
      const raw = readFileSync(filePath, 'utf-8');
      const { data, content } = matter(raw);
      this.agents.set(id, {
        id,
        name: data.name || id,
        description: data.description || '',
        inputs: data.inputs || [],
        systemPrompt: content.trim(),
      });
    }
  }

  getAgent(id: string): AgentConfig {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new NotFoundException(`Agent "${id}" not found`);
    }
    return agent;
  }

  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  getJiraRoute(agentId: string): string | undefined {
    return AGENT_JIRA_ROUTE[agentId];
  }
}
