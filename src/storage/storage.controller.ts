import { Body, Controller, Param, Post } from "@nestjs/common";
import {
  EnsurePlatformBucketDto,
  ProvisionProjectStorageDto,
} from "./storage.dto";
import { StorageService } from "./storage.service";

@Controller("storage")
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post("platform-bucket")
  ensurePlatformBucket(@Body() input: EnsurePlatformBucketDto) {
    return this.storageService.ensurePlatformBucket(input);
  }

  @Post("projects/:projectId")
  provisionProjectStorage(
    @Param("projectId") projectId: string,
    @Body() input: ProvisionProjectStorageDto,
  ) {
    return this.storageService.provisionProjectStorage(projectId, input);
  }
}
