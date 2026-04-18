import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JiraController } from './jira.controller';
import { JiraService } from './jira.service';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: () => ({
        timeout: 10000,
        baseURL: process.env.JIRA_BASE_URL,
      }),
    }),
  ],
  controllers: [JiraController],
  providers: [JiraService],
  exports: [JiraService],
})
export class JiraModule {}
