import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class JiraTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    // Always allow health check and agent listing — no token needed
    if (request.url === '/health' || request.url === '/agents/list') return true;

    const jiraToken = request.headers['x-jira-token'];
    if (!jiraToken || typeof jiraToken !== 'string' || jiraToken.trim() === '') {
      throw new UnauthorizedException(
        'Missing X-Jira-Token header. Set your Jira API token in JiraPilot settings.',
      );
    }

    // /agents/run also requires an OpenRouter key
    if (request.url === '/agents/run') {
      const orKey = request.headers['x-openrouter-key'];
      if (!orKey || typeof orKey !== 'string' || orKey.trim() === '') {
        throw new UnauthorizedException(
          'Missing X-OpenRouter-Key header. Set your OpenRouter key in JiraPilot settings.',
        );
      }
    }

    return true;
  }
}
