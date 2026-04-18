import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class EpicQueryDto {
  @IsString()
  epicKey: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxResults?: number;
}
