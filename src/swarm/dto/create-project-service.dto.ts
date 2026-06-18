import {
  IsInt,
  IsDefined,
  IsNotEmpty,
  IsNumber,
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
  @IsOptional()
  @ValidateNested()
  @Type(() => MysqlServiceConfigDto)
  mysql?: MysqlServiceConfigDto;
}

export class DeleteMysqlServiceConfigDto {
  @IsString()
  @IsNotEmpty()
  db!: string;

  @IsString()
  @IsNotEmpty()
  user!: string;
}

export class DeleteProjectServicesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => DeleteMysqlServiceConfigDto)
  mysql?: DeleteMysqlServiceConfigDto;
}

export class DeleteProjectServiceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  serviceName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeleteProjectServicesDto)
  services?: DeleteProjectServicesDto;
}

export class UpdateProjectServiceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  serviceName?: string;

  @IsString()
  @IsNotEmpty()
  image!: string;
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

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  dev?: number;
}

export class ProjectMemoryResourcesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  reservationMb?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limitMb?: number;
}

export class ProjectCpuResourcesDto {
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  reservation?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  limit?: number;
}

export class ProjectResourcesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectMemoryResourcesDto)
  memory?: ProjectMemoryResourcesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectCpuResourcesDto)
  cpu?: ProjectCpuResourcesDto;
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

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  devDomain?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  serviceName?: string;

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
  @ValidateNested()
  @Type(() => ProjectResourcesDto)
  resources?: ProjectResourcesDto;

  @IsOptional()
  @IsString()
  image?: string;
}
