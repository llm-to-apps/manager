import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Dockerode from 'dockerode';
import { ConfigService } from '../config/config.service';
import { CreateProjectServiceDto } from '../swarm/dto/create-project-service.dto';

type ServiceSummary = {
  Spec?: {
    TaskTemplate?: Dockerode.TaskSpec & {
      ContainerSpec?: {
        Image?: string;
      };
    };
  };
};

@Injectable()
export class DockerService {
  private readonly docker: Dockerode;

  constructor(private readonly config: ConfigService) {
    this.docker = new Dockerode({
      socketPath: this.config.dockerSocket
    });
  }

  async getInfo() {
    const info = await this.docker.info();

    return {
      id: info.ID,
      name: info.Name,
      serverVersion: info.ServerVersion,
      swarm: info.Swarm
        ? {
            localNodeState: info.Swarm.LocalNodeState,
            controlAvailable: info.Swarm.ControlAvailable,
            nodeId: info.Swarm.NodeID,
            clusterId: info.Swarm.Cluster?.ID
          }
        : null
    };
  }

  async listServices() {
    try {
      const services = await this.docker.listServices();

      return services.map((service) => ({
        id: service.ID,
        name: service.Spec?.Name,
        image: this.getServiceImage(service),
        replicas: service.Spec?.Mode?.Replicated?.Replicas,
        createdAt: service.CreatedAt,
        updatedAt: service.UpdatedAt
      }));
    } catch (error) {
      throw this.toServiceUnavailable(error);
    }
  }

  async createProjectService(input: CreateProjectServiceDto) {
    const { publicNetworkId, internalNetworkId } =
      this.config.requireSwarmNetworks();
    const appPort = input.appPort ?? 3001;
    const agentPort = input.agentPort ?? 7001;
    const startCommand = input.startCommand ?? 'npm run dev';
    const migrateCommand = input.migrateCommand ?? 'npm run db:deploy';
    const image = input.image ?? this.config.userInstanceImage;
    const serviceName = `project-${input.projectId}`;
    const env = [
      `PROJECT_ID=${input.projectId}`,
      `REPO_URL=${input.repoUrl}`,
      `DATABASE_URL=${input.databaseUrl}`,
      `APP_DOMAIN=${input.domain}`,
      `APP_PORT=${appPort}`,
      `AGENT_PORT=${agentPort}`,
      `START_COMMAND=${startCommand}`,
      `MIGRATE_COMMAND=${migrateCommand}`
    ];

    if (input.seedCommand) {
      env.push(`SEED_COMMAND=${input.seedCommand}`);
    }

    try {
      const service = await this.docker.createService({
        Name: serviceName,
        Labels: {
          'llagents.project_id': input.projectId,
          'traefik.enable': 'true',
          [`traefik.http.routers.${serviceName}.rule`]: `Host(\`${input.domain}\`)`,
          [`traefik.http.routers.${serviceName}.entrypoints`]: 'websecure',
          [`traefik.http.routers.${serviceName}.tls.certresolver`]: 'letsencrypt',
          [`traefik.http.services.${serviceName}.loadbalancer.server.port`]:
            String(appPort)
        },
        TaskTemplate: {
          ContainerSpec: {
            Image: image,
            Env: env,
            Command: ['node', '/agent/bootstrap.js']
          },
          RestartPolicy: {
            Condition: 'any'
          },
          Resources: {
            Limits: {
              MemoryBytes: 1024 * 1024 * 1024
            }
          }
        },
        Mode: {
          Replicated: {
            Replicas: 1
          }
        },
        Networks: [
          { Target: publicNetworkId },
          { Target: internalNetworkId }
        ]
      });

      return {
        ok: true,
        serviceId: service.id,
        serviceName
      };
    } catch (error) {
      throw this.toServiceUnavailable(error);
    }
  }

  private toServiceUnavailable(error: unknown) {
    const message = error instanceof Error ? error.message : 'Docker API error';

    return new ServiceUnavailableException({
      ok: false,
      message
    });
  }

  private getServiceImage(service: ServiceSummary) {
    return service.Spec?.TaskTemplate?.ContainerSpec?.Image;
  }
}
