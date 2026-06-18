import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import {
  CreateAccessKeyCommand,
  CreateUserCommand,
  EntityAlreadyExistsException,
  IAMClient,
  PutUserPolicyCommand,
} from "@aws-sdk/client-iam";
import {
  CreateBucketCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { ConfigService } from "../config/config.service";
import {
  EnsurePlatformBucketDto,
  ProvisionProjectStorageDto,
} from "./storage.dto";

type StorageCredentials = {
  bucket: string;
  user: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  internalEndpoint: string;
  region: string;
  forcePathStyle: string;
};

@Injectable()
export class StorageService {
  constructor(private readonly config: ConfigService) {}

  async ensurePlatformBucket(input: EnsurePlatformBucketDto) {
    const config = this.config.requireStorageAdminConfig();
    const bucket = input.bucket ?? config.bucket;
    const user = input.user ?? "web-platform";

    return this.provisionBucketUser({
      bucket,
      user,
    });
  }

  async provisionProjectStorage(
    projectId: string,
    input: ProvisionProjectStorageDto,
  ) {
    const config = this.config.requireStorageAdminConfig();
    const bucket =
      input.bucket ?? `${config.bucketPrefix}-project-${projectId}`;
    const user = input.user ?? `project-${projectId}`;

    return this.provisionBucketUser({
      bucket,
      user,
    });
  }

  private async provisionBucketUser({
    bucket,
    user,
  }: {
    bucket: string;
    user: string;
  }): Promise<StorageCredentials> {
    const config = this.config.requireStorageAdminConfig();
    const awsConfig = {
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      region: config.region,
    };
    const s3 = new S3Client(awsConfig);
    const iam = new IAMClient(awsConfig);

    try {
      await this.createBucketIfMissing(s3, bucket);
      await this.createUserIfMissing(iam, user);

      const accessKeyResult = await iam.send(
        new CreateAccessKeyCommand({
          UserName: user,
        }),
      );
      const accessKey = accessKeyResult.AccessKey;

      if (!accessKey?.AccessKeyId || !accessKey.SecretAccessKey) {
        throw new Error(`SeaweedFS did not return an access key for ${user}`);
      }

      await iam.send(
        new PutUserPolicyCommand({
          PolicyDocument: JSON.stringify(storagePolicy(bucket)),
          PolicyName: `${user}-storage`,
          UserName: user,
        }),
      );

      return {
        accessKeyId: accessKey.AccessKeyId,
        bucket,
        endpoint: config.endpoint,
        forcePathStyle: String(config.forcePathStyle),
        internalEndpoint: config.internalEndpoint,
        region: config.region,
        secretAccessKey: accessKey.SecretAccessKey,
        user,
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        ok: false,
        message: error instanceof Error ? error.message : "SeaweedFS API error",
      });
    }
  }

  private async createBucketIfMissing(s3: S3Client, bucket: string) {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (error) {
      if (isBucketAlreadyCreated(error)) {
        return;
      }

      throw error;
    }
  }

  private async createUserIfMissing(iam: IAMClient, user: string) {
    try {
      await iam.send(new CreateUserCommand({ UserName: user }));
    } catch (error) {
      if (error instanceof EntityAlreadyExistsException) {
        return;
      }

      if (error instanceof Error && error.name === "EntityAlreadyExists") {
        return;
      }

      throw error;
    }
  }
}

function isBucketAlreadyCreated(error: unknown) {
  if (!(error instanceof S3ServiceException)) {
    return false;
  }

  return (
    error.name === "BucketAlreadyOwnedByYou" ||
    error.name === "BucketAlreadyExists"
  );
}

function storagePolicy(bucket: string) {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "s3:ListBucket",
        Resource: `arn:aws:s3:::${bucket}`,
      },
      {
        Effect: "Allow",
        Action: ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
        Resource: `arn:aws:s3:::${bucket}/*`,
      },
    ],
  };
}
