import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  readonly host = process.env.HOST || '0.0.0.0';
  readonly port = Number(process.env.PORT || 80);
  readonly dockerSocket = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
  readonly mysqlHost = process.env.MYSQL_HOST || 'mysql';
  readonly mysqlPort = Number(process.env.MYSQL_PORT || 3306);
  readonly mysqlRootUser = process.env.MYSQL_ROOT_USER || 'root';
  readonly mysqlRootPassword = process.env.MYSQL_ROOT_PASSWORD;
  readonly userInstanceImage =
    process.env.USER_INSTANCE_IMAGE || 'ghcr.io/llm-to-apps/user-instance:latest';
  readonly stackName = process.env.STACK_NAME || 'os7';
  readonly dbNetworkId = `${this.stackName}_db`;
  readonly ingressNetworkId = `${this.stackName}_ingress`;
  readonly projectMemoryReservationBytes = megabytesEnv(
    'PROJECT_MEMORY_RESERVATION_MB',
    128
  );
  readonly projectMemoryLimitBytes = megabytesEnv('PROJECT_MEMORY_LIMIT_MB', 768);
  readonly projectCpuReservationNanoCpus = cpusEnv(
    'PROJECT_CPU_RESERVATION',
    0.05
  );
  readonly projectCpuLimitNanoCpus = cpusEnv('PROJECT_CPU_LIMIT', 1);

  requireProjectNetworks() {
    return {
      dbNetworkId: this.dbNetworkId,
      ingressNetworkId: this.ingressNetworkId
    };
  }

  requireMysqlRootConfig() {
    if (!this.mysqlRootUser || !this.mysqlRootPassword) {
      throw new Error('MYSQL_ROOT_USER and MYSQL_ROOT_PASSWORD must be configured');
    }

    return {
      host: this.mysqlHost,
      port: this.mysqlPort,
      user: this.mysqlRootUser,
      password: this.mysqlRootPassword
    };
  }
}

function megabytesEnv(key: string, fallback: number) {
  const value = Number(process.env[key] || fallback);

  return Math.max(1, Math.floor(value)) * 1024 * 1024;
}

function cpusEnv(key: string, fallback: number) {
  const value = Number(process.env[key] || fallback);

  return Math.floor(Math.max(0.001, value) * 1_000_000_000);
}
