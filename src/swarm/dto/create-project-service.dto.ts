import {
  IsInt,
  IsDefined,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

export class MysqlServiceConfigDto {
  @IsString()
  @IsNotEmpty()
  db!: string;

  @IsString()
  @IsNotEmpty()
  user!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class ProjectServicesDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => MysqlServiceConfigDto)
  mysql!: MysqlServiceConfigDto;
}

export class ProjectPortsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  app?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  agent?: number;
}

export class CreateProjectServiceDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  git!: string;

  @IsString()
  @IsNotEmpty()
  domain!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => ProjectServicesDto)
  services!: ProjectServicesDto;

  @IsOptional()
  @IsObject()
  env?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectPortsDto)
  ports?: ProjectPortsDto;

  @IsOptional()
  @IsString()
  image?: string;
}
