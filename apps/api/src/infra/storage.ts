import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../lib/env.ts';

function clientFor(endpoint: string): S3Client {
  return new S3Client({
    region: env.STORAGE_REGION,
    endpoint,
    forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.STORAGE_ACCESS_KEY,
      secretAccessKey: env.STORAGE_SECRET_KEY,
    },
  });
}

const client = clientFor(env.STORAGE_ENDPOINT);

/** SigV4 covers the host, so the signature has to be made for the public one. */
const signingClient =
  env.STORAGE_PUBLIC_ENDPOINT === undefined ? client : clientFor(env.STORAGE_PUBLIC_ENDPOINT);

export type StorageKeyInput = {
  projectId: string | null;
  kind: string;
  documentId: string;
  extension: string;
};

export function buildStorageKey(input: StorageKeyInput): string {
  const scope = input.projectId ?? 'shared';
  const extension = input.extension.replace(/^\./, '').toLowerCase();
  return `projects/${scope}/${input.kind}/${input.documentId}.${extension}`;
}

export async function presignUpload(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    signingClient,
    new PutObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: env.SIGNED_URL_TTL_SECONDS },
  );
}

/** `inline` so a viewer renders the file; `attachment` makes it a download. */
export type Disposition = 'inline' | 'attachment';

export async function presignDownload(
  key: string,
  filename?: string,
  disposition: Disposition = 'inline',
): Promise<string> {
  return getSignedUrl(
    signingClient,
    new GetObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      ...(filename === undefined
        ? {}
        : { ResponseContentDisposition: `${disposition}; filename="${filename}"` }),
    }),
    { expiresIn: env.SIGNED_URL_TTL_SECONDS },
  );
}

export type StoredObject = { sizeBytes: number; contentType: string };

export async function headObject(key: string): Promise<StoredObject | null> {
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));
    return {
      sizeBytes: head.ContentLength ?? 0,
      contentType: head.ContentType ?? 'application/octet-stream',
    };
  } catch {
    return null;
  }
}

/** Null when the object is absent, so a caller can carry on without it. */
export async function getObject(key: string): Promise<Uint8Array | null> {
  try {
    const stored = await client.send(
      new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
    );
    if (stored.Body === undefined) return null;
    return await stored.Body.transformToByteArray();
  } catch {
    return null;
  }
}

export async function putObject(key: string, body: Uint8Array, contentType: string): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));
}
