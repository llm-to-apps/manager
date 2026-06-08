import { Body, Controller, Get, Post } from '@nestjs/common';
import { DockerService } from '../docker/docker.service';
import { CreateProjectServiceDto } from './dto/create-project-service.dto';

@Controller('swarm')
export class SwarmController {
  constructor(private readonly dockerService: DockerService) {}

  @Get('services')
  listServices() {
    return this.dockerService.listServices();
  }

  @Post('projects')
  createProjectService(@Body() input: CreateProjectServiceDto) {
    return this.dockerService.createProjectService(input);
  }
}
