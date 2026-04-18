import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class SprintQueryDto {
  @IsString()
  sprintName: string;

  @IsOptional()
  @IsString()
  projectKey?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxResults?: number;
}
