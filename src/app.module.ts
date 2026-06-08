import { Module } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { DockerController } from './docker/docker.controller';
import { DockerService } from './docker/docker.service';
import { HealthController } from './health/health.controller';
import { SwarmController } from './swarm/swarm.controller';

@Module({
  controllers: [HealthController, DockerController, SwarmController],
  providers: [ConfigService, DockerService]
})
export class AppModule {}
