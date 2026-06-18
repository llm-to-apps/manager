import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DockerService } from '../docker/docker.service';
import {
  CreateProjectServiceDto,
  DeleteProjectServiceDto,
  UpdateProjectServiceDto
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

  @Patch('projects/:id')
  updateProjectService(
    @Param('id') id: string,
    @Body() input: UpdateProjectServiceDto
  ) {
    return this.dockerService.updateProjectService(id, input);
  }

  @Delete('projects/:id')
  deleteProjectService(
    @Param('id') id: string,
    @Body() input: DeleteProjectServiceDto
  ) {
    return this.dockerService.deleteProjectService(id, input);
  }
}
