import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min
} from 'class-validator';

export class CreateProjectServiceDto {
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @IsString()
  @IsNotEmpty()
  repoUrl!: string;

  @IsString()
  @IsNotEmpty()
  databaseUrl!: string;

  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  appPort?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  agentPort?: number;

  @IsOptional()
  @IsString()
  startCommand?: string;

  @IsOptional()
  @IsString()
  migrateCommand?: string;

  @IsOptional()
  @IsString()
  seedCommand?: string;

  @IsOptional()
  @IsString()
  image?: string;
}
