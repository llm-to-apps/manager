import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  readonly host = process.env.HOST || '0.0.0.0';
  readonly port = Number(process.env.PORT || 8080);
  readonly dockerSocket = process.env.DOCKER_SOCKET || '/var/run/docker.sock';
  readonly rootDomain = process.env.ROOT_DOMAIN || 'llmagents.com';
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
}
