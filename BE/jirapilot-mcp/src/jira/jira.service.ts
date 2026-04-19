import {
  Injectable,
  BadGatewayException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import { SprintQueryDto } from './dto/sprint-query.dto';
import { SprintsQueryDto } from './dto/sprints-query.dto';
import { TicketsQueryDto } from './dto/tickets-query.dto';
import { EpicQueryDto } from './dto/epic-query.dto';

@Injectable()
export class JiraService {
  constructor(private readonly http: HttpService) {}

  // ─── Projects (workspaces) ──────────────────────────────────────────────────

  async getProjects(jiraToken: string, jiraEmail?: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get('/rest/api/3/project/search', {
          headers: this.authHeaders(jiraToken, jiraEmail),
          params: { maxResults: 50, orderBy: 'name' },
        }),
      );
      return {
        projects: (data.values || []).map((p: any) => ({
          id: p.id,
          key: p.key,
          name: p.name,
        })),
      };
    } catch (err) {
      this.handleJiraError(err);
    }
  }

  // ─── Sprints for a project ──────────────────────────────────────────────────

  async getSprints(
    dto: SprintsQueryDto,
    jiraToken: string,
    jiraEmail?: string,
  ) {
    try {
      const boardRes = await firstValueFrom(
        this.http.get('/rest/agile/1.0/board', {
          headers: this.authHeaders(jiraToken, jiraEmail),
          params: { projectKeyOrId: dto.projectKey, maxResults: 10 },
        }),
      );
      const boards: any[] = boardRes.data.values || [];
      if (boards.length === 0) return { sprints: [] };

      const boardId = boards[0].id;
      const sprintsRes = await firstValueFrom(
        this.http.get(`/rest/agile/1.0/board/${boardId}/sprint`, {
          headers: this.authHeaders(jiraToken, jiraEmail),
          params: { state: 'active,future', maxResults: 50 },
        }),
      );
      return {
        sprints: (sprintsRes.data.values || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          state: s.state,
        })),
      };
    } catch (err) {
      this.handleJiraError(err);
    }
  }

  // ─── Sprint issues ──────────────────────────────────────────────────────────

  async getSprintIssues(
    dto: SprintQueryDto,
    jiraToken: string,
    jiraEmail?: string,
  ) {
    const sprintClause = dto.sprintId
      ? `sprint = ${dto.sprintId}`
      : `sprint = "${dto.sprintName}"`;
    const jql = dto.projectKey
      ? `${sprintClause} AND project = "${dto.projectKey}" ORDER BY status ASC`
      : `${sprintClause} ORDER BY status ASC`;

    const raw = await this.jiraSearch(
      jql,
      dto.maxResults ?? 50,
      jiraToken,
      jiraEmail,
    );

    return {
      sprint: dto.sprintName || dto.sprintId,
      total: raw.total,
      issues: raw.issues.map(this.toIssue),
    };
  }

  // ─── Specific tickets by key ────────────────────────────────────────────────

  async getTickets(
    dto: TicketsQueryDto,
    jiraToken: string,
    jiraEmail?: string,
  ) {
    const keys = dto.keys.map((k) => `"${k}"`).join(', ');
    const jql = `issueKey in (${keys}) ORDER BY created DESC`;

    const raw = await this.jiraSearch(
      jql,
      dto.maxResults ?? 50,
      jiraToken,
      jiraEmail,
    );

    return {
      total: raw.total,
      issues: raw.issues.map(this.toDetailedIssue),
    };
  }

  // ─── Epic + child issues ────────────────────────────────────────────────────

  async getEpicWithChildren(
    dto: EpicQueryDto,
    jiraToken: string,
    jiraEmail?: string,
  ) {
    const epicRaw = await this.jiraGet(
      `/rest/api/3/issue/${dto.epicKey}`,
      jiraToken,
      jiraEmail,
    );

    const jql = `"Epic Link" = "${dto.epicKey}" OR parent = "${dto.epicKey}" ORDER BY created ASC`;
    const raw = await this.jiraSearch(
      jql,
      dto.maxResults ?? 100,
      jiraToken,
      jiraEmail,
    );

    return {
      epic: {
        key: epicRaw.key,
        summary: epicRaw.fields.summary,
        description: this.extractText(epicRaw.fields.description),
        status: epicRaw.fields.status?.name,
        assignee: epicRaw.fields.assignee?.displayName ?? 'Unassigned',
      },
      children: raw.issues.map(this.toDetailedIssue),
      total: raw.total,
    };
  }

  // ─── Shared transforms ──────────────────────────────────────────────────────

  private toIssue = (issue: any) => ({
    key: issue.key,
    summary: issue.fields.summary,
    status: issue.fields.status?.name,
    assignee: issue.fields.assignee?.displayName ?? 'Unassigned',
    priority: issue.fields.priority?.name ?? 'None',
    type: issue.fields.issuetype?.name,
  });

  private toDetailedIssue = (issue: any) => ({
    ...this.toIssue(issue),
    description: this.extractText(issue.fields.description),
    labels: issue.fields.labels ?? [],
    fixVersions: issue.fields.fixVersions?.map((v: any) => v.name) ?? [],
    comments: (issue.fields.comment?.comments ?? [])
      .slice(-3)
      .map((c: any) => ({
        author: c.author?.displayName,
        body: this.extractText(c.body),
      })),
  });

  private extractText(adf: any): string {
    if (!adf) return '';
    if (typeof adf === 'string') return adf;
    const texts: string[] = [];
    const walk = (node: any) => {
      if (node?.type === 'text') texts.push(node.text);
      if (node?.content) node.content.forEach(walk);
    };
    walk(adf);
    return texts.join(' ').trim();
  }

  // ─── HTTP helpers ───────────────────────────────────────────────────────────

  private authHeaders(
    jiraToken: string,
    jiraEmail?: string,
  ): AxiosRequestConfig['headers'] {
    const auth = jiraEmail
      ? `Basic ${Buffer.from(`${jiraEmail}:${jiraToken}`).toString('base64')}`
      : `Bearer ${jiraToken}`;
    return {
      Authorization: auth,
      Accept: 'application/json',
    };
  }

  private async jiraSearch(
    jql: string,
    maxResults: number,
    jiraToken: string,
    jiraEmail?: string,
  ) {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          '/rest/api/3/search/jql',
          {
            jql,
            maxResults,
            fields: [
              'summary',
              'status',
              'assignee',
              'priority',
              'issuetype',
              'description',
              'labels',
              'fixVersions',
              'comment',
            ],
          },
          {
            headers: this.authHeaders(jiraToken, jiraEmail),
          },
        ),
      );
      return data;
    } catch (err) {
      this.handleJiraError(err);
    }
  }

  private async jiraGet(path: string, jiraToken: string, jiraEmail?: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(path, {
          headers: this.authHeaders(jiraToken, jiraEmail),
          params: { fields: 'summary,status,assignee,description' },
        }),
      );
      return data;
    } catch (err) {
      this.handleJiraError(err);
    }
  }

  private handleJiraError(err: any): never {
    const status = err.response?.status;
    if (status === 401 || status === 403) {
      throw new UnauthorizedException(
        'Jira rejected your token. Check your API token in JiraPilot settings.',
      );
    }
    const jiraMsg =
      err.response?.data?.errorMessages?.[0] ??
      err.response?.data?.message ??
      err.message;
    throw new BadGatewayException(`Jira API error: ${jiraMsg}`);
  }
}
