import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { JiraModule } from '../jira/jira.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';

@Module({
  imports: [JiraModule, OpenRouterModule],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
