import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Dockerode from 'dockerode';
import { ConfigService } from '../config/config.service';
import { MysqlService } from '../mysql/mysql.service';
import {
  CreateProjectServiceDto,
  DeleteProjectServiceDto
} from '../swarm/dto/create-project-service.dto';

type ServiceSummary = {
  ID?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  Spec?: {
    Name?: string;
    Mode?: {
      Replicated?: {
        Replicas?: number;
      };
    };
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

  constructor(
    private readonly config: ConfigService,
    private readonly mysqlService: MysqlService
  ) {
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

  async getProjectServiceStatus(projectId: string) {
    const serviceName = `project-${projectId}`;

    try {
      const services = await this.docker.listServices({
        filters: JSON.stringify({
          name: [serviceName]
        })
      });
      const service = services.find((candidate) => candidate.Spec?.Name === serviceName);

      if (!service) {
        return {
          ok: true,
          projectId,
          serviceName,
          exists: false,
          ready: false,
          desiredReplicas: 0,
          runningReplicas: 0,
          tasks: []
        };
      }

      const tasks = await this.docker.listTasks({
        filters: JSON.stringify({
          service: [service.ID]
        })
      });
      const desiredReplicas = service.Spec?.Mode?.Replicated?.Replicas ?? 1;
      const runningReplicas = tasks.filter(
        (task) =>
          task.DesiredState === 'running' &&
          task.Status?.State === 'running'
      ).length;

      return {
        ok: true,
        projectId,
        serviceId: service.ID,
        serviceName,
        exists: true,
        ready: runningReplicas >= desiredReplicas,
        desiredReplicas,
        runningReplicas,
        tasks: tasks.map((task) => ({
          id: task.ID,
          desiredState: task.DesiredState,
          state: task.Status?.State,
          message: task.Status?.Message,
          error: task.Status?.Err,
          containerId: task.Status?.ContainerStatus?.ContainerID
        }))
      };
    } catch (error) {
      throw this.toServiceUnavailable(error);
    }
  }

  async createProjectService(input: CreateProjectServiceDto) {
    const { dbNetworkId, ingressNetworkId } =
      this.config.requireProjectNetworks();
    const projectEnv = input.env ?? {};
    const appPort = input.ports?.app ?? 3001;
    const agentPort = input.ports?.agent ?? 7070;
    const image = input.image ?? this.config.userInstanceImage;
    const serviceName = `project-${input.id}`;

    await this.mysqlService.provisionProjectDatabase(input.services.mysql);

    const env = this.toDockerEnv({
      ...projectEnv,
      PROJECT_ID: input.id,
      REPO_URL: input.git,
      GIT_REPO_URL: input.git,
      APP_DOMAIN: input.domain,
      APP_PORT: String(appPort),
      AGENT_PORT: String(agentPort)
    });

    try {
      const service = await this.docker.createService({
        Name: serviceName,
        Labels: {
          'llagents.project_id': input.id,
          'traefik.enable': 'true',
          [`traefik.http.routers.${serviceName}.rule`]: `Host(\`${input.domain}\`)`,
          [`traefik.http.routers.${serviceName}.entrypoints`]: 'web',
          [`traefik.http.routers.${serviceName}.service`]: serviceName,
          [`traefik.http.services.${serviceName}.loadbalancer.server.port`]:
            String(appPort),
          [`traefik.http.routers.${serviceName}-tools.rule`]:
            `Host(\`${input.domain}\`) && PathPrefix(\`/agent-tools\`)`,
          [`traefik.http.routers.${serviceName}-tools.entrypoints`]: 'web',
          [`traefik.http.routers.${serviceName}-tools.priority`]: '100',
          [`traefik.http.routers.${serviceName}-tools.service`]:
            `${serviceName}-tools`,
          [`traefik.http.routers.${serviceName}-tools.middlewares`]:
            `${serviceName}-tools-strip`,
          [`traefik.http.middlewares.${serviceName}-tools-strip.stripprefix.prefixes`]:
            '/agent-tools',
          [`traefik.http.services.${serviceName}-tools.loadbalancer.server.port`]:
            String(agentPort)
        },
        TaskTemplate: {
          ContainerSpec: {
            Image: image,
            Env: env
          },
          Networks: [{ Target: dbNetworkId }, { Target: ingressNetworkId }],
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
        }
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

  async deleteProjectService(projectId: string, input: DeleteProjectServiceDto) {
    const serviceName = `project-${projectId}`;
    let removedService = false;

    try {
      const services = await this.docker.listServices({
        filters: JSON.stringify({
          name: [serviceName]
        })
      });
      const service = services.find((candidate) => candidate.Spec?.Name === serviceName);

      if (service?.ID) {
        await this.docker.getService(service.ID).remove();
        removedService = true;
      }

      await this.mysqlService.deleteProjectDatabase(input.services.mysql);

      return {
        ok: true,
        projectId,
        serviceName,
        removedService,
        removedDatabase: true
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

  private toDockerEnv(env: Record<string, string>) {
    return Object.entries(env).map(([key, value]) => `${key}=${value}`);
  }
}
