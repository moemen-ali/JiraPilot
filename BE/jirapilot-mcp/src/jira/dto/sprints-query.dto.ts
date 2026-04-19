import { IsString } from 'class-validator';

export class SprintsQueryDto {
  @IsString()
  projectKey: string;
}
