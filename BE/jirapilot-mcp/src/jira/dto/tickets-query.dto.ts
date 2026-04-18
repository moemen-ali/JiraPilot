import { IsArray, ArrayMinSize, ArrayMaxSize, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class TicketsQueryDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  keys: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxResults?: number;
}
