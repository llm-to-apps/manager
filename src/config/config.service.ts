import { Injectable } from "@nestjs/common";

@Injectable()
export class ConfigService {
  readonly host = process.env.HOST || "0.0.0.0";
  readonly port = Number(process.env.PORT || 80);
  readonly dockerSocket = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
  readonly mysqlHost = process.env.MYSQL_HOST || "mysql";
  readonly mysqlPort = Number(process.env.MYSQL_PORT || 3306);
  readonly mysqlRootUser = process.env.MYSQL_ROOT_USER || "root";
  readonly mysqlRootPassword = process.env.MYSQL_ROOT_PASSWORD;
  readonly storageS3Endpoint =
    trimTrailingSlash(process.env.STORAGE_S3_ENDPOINT) ||
    "http://seaweedfs:8333";
  readonly storageS3InternalEndpoint =
    trimTrailingSlash(process.env.STORAGE_S3_INTERNAL_ENDPOINT) ||
    this.storageS3Endpoint;
  readonly storageS3Region = process.env.STORAGE_S3_REGION || "us-east-1";
  readonly storageS3AccessKeyId = process.env.STORAGE_S3_ACCESS_KEY_ID;
  readonly storageS3SecretAccessKey = process.env.STORAGE_S3_SECRET_ACCESS_KEY;
  readonly storageS3BucketPrefix =
    process.env.STORAGE_S3_BUCKET_PREFIX || "os7";
  readonly storageS3Bucket =
    process.env.STORAGE_S3_BUCKET || `${this.storageS3BucketPrefix}-web`;
  readonly storageS3ForcePathStyle =
    process.env.STORAGE_S3_FORCE_PATH_STYLE !== "false";
  readonly userInstanceImage =
    process.env.USER_INSTANCE_IMAGE ||
    "ghcr.io/llm-to-apps/user-instance:latest";
  readonly stackName = process.env.STACK_NAME || "os7";
  readonly dbNetworkId = `${this.stackName}_db`;
  readonly ingressNetworkId = `${this.stackName}_ingress`;
  readonly projectMemoryReservationBytes = megabytesEnv(
    "PROJECT_MEMORY_RESERVATION_MB",
    128,
  );
  readonly projectMemoryLimitBytes = megabytesEnv(
    "PROJECT_MEMORY_LIMIT_MB",
    768,
  );
  readonly projectCpuReservationNanoCpus = cpusEnv(
    "PROJECT_CPU_RESERVATION",
    0.05,
  );
  readonly projectCpuLimitNanoCpus = cpusEnv("PROJECT_CPU_LIMIT", 1);

  requireProjectNetworks() {
    return {
      dbNetworkId: this.dbNetworkId,
      ingressNetworkId: this.ingressNetworkId,
    };
  }

  requireMysqlRootConfig() {
    if (!this.mysqlRootUser || !this.mysqlRootPassword) {
      throw new Error(
        "MYSQL_ROOT_USER and MYSQL_ROOT_PASSWORD must be configured",
      );
    }

    return {
      host: this.mysqlHost,
      port: this.mysqlPort,
      user: this.mysqlRootUser,
      password: this.mysqlRootPassword,
    };
  }

  requireStorageAdminConfig() {
    if (!this.storageS3AccessKeyId || !this.storageS3SecretAccessKey) {
      throw new Error(
        "STORAGE_S3_ACCESS_KEY_ID and STORAGE_S3_SECRET_ACCESS_KEY must be configured",
      );
    }

    return {
      endpoint: this.storageS3Endpoint,
      internalEndpoint: this.storageS3InternalEndpoint,
      region: this.storageS3Region,
      accessKeyId: this.storageS3AccessKeyId,
      secretAccessKey: this.storageS3SecretAccessKey,
      bucketPrefix: this.storageS3BucketPrefix,
      bucket: this.storageS3Bucket,
      forcePathStyle: this.storageS3ForcePathStyle,
    };
  }
}

function trimTrailingSlash(value: string | undefined) {
  return value?.replace(/\/+$/, "");
}

function megabytesEnv(key: string, fallback: number) {
  const value = Number(process.env[key] || fallback);

  return Math.max(1, Math.floor(value)) * 1024 * 1024;
}

function cpusEnv(key: string, fallback: number) {
  const value = Number(process.env[key] || fallback);

  return Math.floor(Math.max(0.001, value) * 1_000_000_000);
}
