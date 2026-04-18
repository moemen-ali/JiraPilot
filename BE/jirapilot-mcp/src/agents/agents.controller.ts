import { Controller, Post, Body, Headers, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
import { AgentsService } from './agents.service';
import { JiraService } from '../jira/jira.service';
import { OpenRouterService } from '../openrouter/openrouter.service';
import { RunAgentDto } from './dto/run-agent.dto';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly jiraService: JiraService,
    private readonly openRouterService: OpenRouterService,
  ) {}

  /** List available agents (no token required for discovery) */
  @Post('list')
  @HttpCode(200)
  listAgents() {
    return this.agentsService
      .getAllAgents()
      .map(({ systemPrompt, ...rest }) => rest);
  }

  /**
   * Run an agent end-to-end:
   *  1. Fetch Jira data based on agent type
   *  2. Build user message from Jira data + form inputs
   *  3. Stream OpenRouter response back as SSE
   */
  @Post('run')
  async runAgent(
    @Body() dto: RunAgentDto,
    @Headers('x-jira-token') jiraToken: string,
    @Headers('x-openrouter-key') openRouterKey: string,
    @Headers('x-model') model: string | undefined,
    @Res() res: Response,
  ) {
    const agent = this.agentsService.getAgent(dto.agentId);
    const selectedModel = model || 'qwen/qwen3-coder:free';

    // ── Step 1: Fetch Jira data ─────────────────────────────────────────────
    let jiraData: any = {};
    const jiraRoute = this.agentsService.getJiraRoute(dto.agentId);

    if (jiraRoute && jiraToken) {
      jiraData = await this.fetchJiraData(jiraRoute, dto.formValues, jiraToken);
    }

    // ── Step 2: Build the user message ──────────────────────────────────────
    const userMessage = this.buildUserMessage(jiraData, dto.formValues);

    // ── Step 3: Stream LLM response as SSE ──────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const stream = this.openRouterService.streamChat(
        openRouterKey,
        selectedModel,
        agent.systemPrompt,
        userMessage,
      );

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.write(`data: [DONE]\n\n`);
    } catch (err: any) {
      res.write(
        `data: ${JSON.stringify({ error: err.message || 'Stream failed' })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  // ── Jira data fetcher ───────────────────────────────────────────────────────

  private async fetchJiraData(
    route: string,
    formValues: Record<string, string>,
    jiraToken: string,
  ) {
    switch (route) {
      case 'sprint':
        return this.jiraService.getSprintIssues(
          {
            sprintName: formValues.sprint_name || formValues.sprintName || '',
            projectKey: formValues.project_key || formValues.projectKey,
          },
          jiraToken,
        );
      case 'tickets':
        return this.jiraService.getTickets(
          {
            keys: (formValues.ticket_key || formValues.ticketKeys || '')
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean),
          },
          jiraToken,
        );
      case 'epic':
        return this.jiraService.getEpicWithChildren(
          {
            epicKey: formValues.epic_key || formValues.epicKey || '',
          },
          jiraToken,
        );
      default:
        return {};
    }
  }

  // ── User message builder ────────────────────────────────────────────────────

  private buildUserMessage(
    jiraData: any,
    formValues: Record<string, string>,
  ): string {
    let message = '';

    if (jiraData && Object.keys(jiraData).length > 0) {
      message +=
        '## Jira Data\n\n```json\n' +
        JSON.stringify(jiraData, null, 2) +
        '\n```\n\n';
    }

    message += '## Form Inputs\n\n';
    for (const [key, value] of Object.entries(formValues)) {
      message += `- **${key}**: ${value}\n`;
    }

    return message;
  }
}
