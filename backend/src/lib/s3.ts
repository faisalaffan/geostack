import { Client as MinioClient } from 'minio';
import { Config } from '../config.js';

let minio: MinioClient;

export function getS3(config?: Config): MinioClient {
  if (!minio && config) {
    minio = new MinioClient({
      endPoint: config.MINIO_ENDPOINT,
      port: parseInt(config.MINIO_PORT, 10),
      accessKey: config.MINIO_ACCESS_KEY,
      secretKey: config.MINIO_SECRET_KEY,
      useSSL: false,
    });
  }
  return minio!;
}

export async function ensureBucket(config: Config): Promise<void> {
  const client = getS3(config);
  const exists = await client.bucketExists(config.MINIO_BUCKET);
  if (!exists) {
    await client.makeBucket(config.MINIO_BUCKET);
  }
}

export async function uploadFile(
  config: Config,
  objectName: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const client = getS3(config);
  await client.putObject(config.MINIO_BUCKET, objectName, buffer, buffer.length, {
    'Content-Type': contentType,
  });
  return objectName;
}
