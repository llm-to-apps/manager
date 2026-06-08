import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  readonly host = process.env.HOST || '0.0.0.0';
  readonly port = Number(process.env.PORT || 8080);
  readonly dockerSocket = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
  readonly rootDomain = process.env.ROOT_DOMAIN || 'llmagents.com';
  readonly mysqlHost = process.env.MYSQL_HOST || 'mysql';
  readonly mysqlPort = Number(process.env.MYSQL_PORT || 3306);
  readonly mysqlRootUser = process.env.MYSQL_ROOT_USER || 'root';
  readonly mysqlRootPassword = process.env.MYSQL_ROOT_PASSWORD;
  readonly userInstanceImage =
    process.env.USER_INSTANCE_IMAGE || 'llagents/user-instance:latest';
  readonly publicNetworkId = process.env.PUBLIC_NETWORK_ID;
  readonly internalNetworkId = process.env.INTERNAL_NETWORK_ID;

  requireSwarmNetworks() {
    if (!this.publicNetworkId || !this.internalNetworkId) {
      throw new Error('PUBLIC_NETWORK_ID and INTERNAL_NETWORK_ID must be configured');
    }

    return {
      publicNetworkId: this.publicNetworkId,
      internalNetworkId: this.internalNetworkId
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
