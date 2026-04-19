import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { JiraService } from './jira.service';
import { SprintQueryDto } from './dto/sprint-query.dto';
import { SprintsQueryDto } from './dto/sprints-query.dto';
import { TicketsQueryDto } from './dto/tickets-query.dto';
import { EpicQueryDto } from './dto/epic-query.dto';

@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Post('projects')
  @HttpCode(200)
  async projects(
    @Headers('x-jira-token') jiraToken: string,
    @Headers('x-jira-email') jiraEmail: string,
  ) {
    return this.jiraService.getProjects(jiraToken, jiraEmail);
  }

  @Post('sprints')
  @HttpCode(200)
  async sprints(
    @Body() dto: SprintsQueryDto,
    @Headers('x-jira-token') jiraToken: string,
    @Headers('x-jira-email') jiraEmail: string,
  ) {
    return this.jiraService.getSprints(dto, jiraToken, jiraEmail);
  }

  @Post('sprint')
  @HttpCode(200)
  async sprint(
    @Body() dto: SprintQueryDto,
    @Headers('x-jira-token') jiraToken: string,
    @Headers('x-jira-email') jiraEmail: string,
  ) {
    return this.jiraService.getSprintIssues(dto, jiraToken, jiraEmail);
  }

  @Post('tickets')
  @HttpCode(200)
  async tickets(
    @Body() dto: TicketsQueryDto,
    @Headers('x-jira-token') jiraToken: string,
    @Headers('x-jira-email') jiraEmail: string,
  ) {
    return this.jiraService.getTickets(dto, jiraToken, jiraEmail);
  }

  @Post('epic')
  @HttpCode(200)
  async epic(
    @Body() dto: EpicQueryDto,
    @Headers('x-jira-token') jiraToken: string,
    @Headers('x-jira-email') jiraEmail: string,
  ) {
    return this.jiraService.getEpicWithChildren(dto, jiraToken, jiraEmail);
  }
}
