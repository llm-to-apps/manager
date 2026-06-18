import { Module } from "@nestjs/common";
import { ConfigService } from "./config/config.service";
import { DockerController } from "./docker/docker.controller";
import { DockerService } from "./docker/docker.service";
import { HealthController } from "./health/health.controller";
import { MysqlService } from "./mysql/mysql.service";
import { StorageController } from "./storage/storage.controller";
import { StorageService } from "./storage/storage.service";
import { SwarmController } from "./swarm/swarm.controller";

@Module({
  controllers: [
    HealthController,
    DockerController,
    SwarmController,
    StorageController,
  ],
  providers: [ConfigService, DockerService, MysqlService, StorageService],
})
export class AppModule {}
