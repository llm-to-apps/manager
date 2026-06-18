import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class EnsurePlatformBucketDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bucket?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  user?: string;
}

export class ProvisionProjectStorageDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  bucket?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  user?: string;
}
