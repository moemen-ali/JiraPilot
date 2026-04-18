import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { JiraModule } from './jira/jira.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JiraModule,
    AgentsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
