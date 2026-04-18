import { IsString, IsObject } from 'class-validator';

export class RunAgentDto {
  @IsString()
  agentId: string;

  @IsObject()
  formValues: Record<string, string>;
}
