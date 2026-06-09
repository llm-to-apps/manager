import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { DockerService } from '../docker/docker.service';
import {
  CreateProjectServiceDto,
  DeleteProjectServiceDto
} from './dto/create-project-service.dto';

@Controller('swarm')
export class SwarmController {
  constructor(private readonly dockerService: DockerService) {}

  @Get('services')
  listServices() {
    return this.dockerService.listServices();
  }

  @Get('projects/:id')
  getProjectService(@Param('id') id: string) {
    return this.dockerService.getProjectServiceStatus(id);
  }

  @Post('projects')
  createProjectService(@Body() input: CreateProjectServiceDto) {
    return this.dockerService.createProjectService(input);
  }

  @Delete('projects/:id')
  deleteProjectService(
    @Param('id') id: string,
    @Body() input: DeleteProjectServiceDto
  ) {
    return this.dockerService.deleteProjectService(id, input);
  }
}
