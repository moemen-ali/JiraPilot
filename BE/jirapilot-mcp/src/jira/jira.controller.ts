import { Controller, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { JiraService } from './jira.service';
import { SprintQueryDto } from './dto/sprint-query.dto';
import { TicketsQueryDto } from './dto/tickets-query.dto';
import { EpicQueryDto } from './dto/epic-query.dto';

@Controller('jira')
export class JiraController {
  constructor(private readonly jiraService: JiraService) {}

  @Post('sprint')
  @HttpCode(200)
  async sprint(
    @Body() dto: SprintQueryDto,
    @Headers('x-jira-token') jiraToken: string,
  ) {
    return this.jiraService.getSprintIssues(dto, jiraToken);
  }

  @Post('tickets')
  @HttpCode(200)
  async tickets(
    @Body() dto: TicketsQueryDto,
    @Headers('x-jira-token') jiraToken: string,
  ) {
    return this.jiraService.getTickets(dto, jiraToken);
  }

  @Post('epic')
  @HttpCode(200)
  async epic(
    @Body() dto: EpicQueryDto,
    @Headers('x-jira-token') jiraToken: string,
  ) {
    return this.jiraService.getEpicWithChildren(dto, jiraToken);
  }
}
