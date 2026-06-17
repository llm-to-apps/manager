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
    const serviceName = `app-${projectId}`;

    try {
      const service = await this.findServiceByName(serviceName);

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
    const devPort = input.ports?.dev ?? 8080;
    const devDomain = input.devDomain ?? input.domain;
    const image = input.image ?? this.config.userInstanceImage;
    const serviceName = input.serviceName || `app-${input.id}`;
    const resources = this.createProjectResources(input);

    if (input.services.mysql) {
      await this.mysqlService.provisionProjectDatabase(input.services.mysql);
    }

    const env = this.toDockerEnv({
      ...projectEnv,
      PROJECT_ID: input.id,
      REPO_URL: input.git,
      GIT_REPO_URL: input.git,
      APP_DOMAIN: input.domain,
      APP_DEV_DOMAIN: devDomain,
      APP_PORT: String(appPort),
      AGENT_PORT: String(agentPort),
      APP_DEV_PORT: String(devPort)
    });

    try {
      const existingService = await this.findServiceByName(serviceName);

      if (existingService?.ID) {
        return {
          ok: true,
          existing: true,
          serviceId: existingService.ID,
          serviceName
        };
      }

      const service = await this.docker.createService({
        Name: serviceName,
        Labels: {
          'os7.project_id': input.id,
          'traefik.enable': 'true',
          [`traefik.http.routers.${serviceName}.rule`]: `Host(\`${input.domain}\`)`,
          [`traefik.http.routers.${serviceName}.entrypoints`]: 'web',
          [`traefik.http.routers.${serviceName}.service`]: serviceName,
          [`traefik.http.routers.${serviceName}.middlewares`]:
            `${serviceName}-no-cache`,
          [`traefik.http.middlewares.${serviceName}-no-cache.headers.customresponseheaders.Cache-Control`]:
            'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          [`traefik.http.middlewares.${serviceName}-no-cache.headers.customresponseheaders.Pragma`]:
            'no-cache',
          [`traefik.http.middlewares.${serviceName}-no-cache.headers.customresponseheaders.Expires`]:
            '0',
          [`traefik.http.services.${serviceName}.loadbalancer.server.port`]:
            String(appPort),
          [`traefik.http.routers.${serviceName}-runtime.rule`]:
            `Host(\`${input.domain}\`) && PathPrefix(\`/platform/app/runtime\`)`,
          [`traefik.http.routers.${serviceName}-runtime.entrypoints`]: 'web',
          [`traefik.http.routers.${serviceName}-runtime.priority`]: '110',
          [`traefik.http.routers.${serviceName}-runtime.service`]:
            `${serviceName}-runtime`,
          [`traefik.http.routers.${serviceName}-runtime.middlewares`]:
            `${serviceName}-runtime-strip`,
          [`traefik.http.middlewares.${serviceName}-runtime-strip.stripprefix.prefixes`]:
            '/platform/app',
          [`traefik.http.services.${serviceName}-runtime.loadbalancer.server.port`]:
            String(agentPort),
          [`traefik.http.routers.${serviceName}-dev.rule`]:
            `Host(\`${devDomain}\`)`,
          [`traefik.http.routers.${serviceName}-dev.entrypoints`]: 'web',
          [`traefik.http.routers.${serviceName}-dev.priority`]: '1000',
          [`traefik.http.routers.${serviceName}-dev.service`]:
            `${serviceName}-dev`,
          [`traefik.http.routers.${serviceName}-dev.middlewares`]:
            `${serviceName}-no-cache`,
          [`traefik.http.services.${serviceName}-dev.loadbalancer.server.port`]:
            String(devPort),
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
          Placement: {
            Preferences: [
              {
                Spread: {
                  SpreadDescriptor: 'node.id'
                }
              }
            ]
          },
          RestartPolicy: {
            Condition: 'any',
            Delay: 5 * 1_000_000_000,
            Window: 60 * 1_000_000_000
          },
          Resources: {
            Reservations: {
              MemoryBytes: resources.memoryReservationBytes,
              NanoCPUs: resources.cpuReservationNanoCpus
            },
            Limits: {
              MemoryBytes: resources.memoryLimitBytes,
              NanoCPUs: resources.cpuLimitNanoCpus
            }
          }
        },
        UpdateConfig: {
          Parallelism: 1,
          Delay: 10 * 1_000_000_000,
          FailureAction: 'rollback',
          Monitor: 30 * 1_000_000_000,
          Order: 'stop-first'
        },
        RollbackConfig: {
          Parallelism: 1,
          Delay: 10 * 1_000_000_000,
          FailureAction: 'pause',
          Monitor: 30 * 1_000_000_000,
          Order: 'stop-first'
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
    const serviceName = input.serviceName || `app-${projectId}`;
    let removedService = false;
    let removedDatabase = false;

    try {
      const service = await this.findServiceByName(serviceName);

      if (service?.ID) {
        await this.docker.getService(service.ID).remove();
        removedService = true;
      }

      if (input.services?.mysql) {
        await this.mysqlService.deleteProjectDatabase(input.services.mysql);
        removedDatabase = true;
      }

      return {
        ok: true,
        projectId,
        serviceName,
        removedService,
        removedDatabase
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

  private createProjectResources(input: CreateProjectServiceDto) {
    return {
      memoryReservationBytes:
        megabytesToBytes(input.resources?.memory?.reservationMb) ??
        this.config.projectMemoryReservationBytes,
      memoryLimitBytes:
        megabytesToBytes(input.resources?.memory?.limitMb) ??
        this.config.projectMemoryLimitBytes,
      cpuReservationNanoCpus:
        cpusToNanoCpus(input.resources?.cpu?.reservation) ??
        this.config.projectCpuReservationNanoCpus,
      cpuLimitNanoCpus:
        cpusToNanoCpus(input.resources?.cpu?.limit) ??
        this.config.projectCpuLimitNanoCpus
    };
  }

  private getServiceImage(service: ServiceSummary) {
    return service.Spec?.TaskTemplate?.ContainerSpec?.Image;
  }

  private async findServiceByName(serviceName: string) {
    const services = await this.docker.listServices({
      filters: JSON.stringify({
        name: [serviceName]
      })
    });

    return services.find((candidate) => candidate.Spec?.Name === serviceName);
  }

  private toDockerEnv(env: Record<string, string>) {
    return Object.entries(env).map(([key, value]) => `${key}=${value}`);
  }
}

function megabytesToBytes(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return Math.max(1, Math.floor(value)) * 1024 * 1024;
}

function cpusToNanoCpus(value: number | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return Math.floor(Math.max(0.001, value) * 1_000_000_000);
}
