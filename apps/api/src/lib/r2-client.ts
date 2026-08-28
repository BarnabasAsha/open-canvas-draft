import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
}

// R2 is S3-API-compatible, so the AWS SDK works against it unmodified —
// just point `endpoint` at the account's R2 endpoint instead of AWS.
// `region: "auto"` is R2's own convention (it isn't actually
// region-partitioned the way S3 is). `endpoint` is taken directly from
// R2_ENDPOINT rather than derived from an account id — Cloudflare's own
// "Manage API Tokens" screen hands you the ready-made endpoint URL
// alongside the access key pair, so there's no need to reconstruct it.
export class R2Client {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(endpoint: string, accessKeyId: string, secretAccessKey: string, bucket: string) {
    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
    this.bucket = bucket;
  }

  async putObject(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: input.key, Body: input.body, ContentType: input.contentType }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export function createR2ClientFromEnv(): R2Client {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error("R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME are required");
  }
  return new R2Client(endpoint, accessKeyId, secretAccessKey, bucket);
}

// Not needed to construct R2Client itself (the public URL only matters to
// callers building an asset's URL after upload), but every call site needs
// it validated BEFORE calling putObject — checking only afterward means a
// missing env var is discovered only after the object is already sitting
// in the bucket with nothing in Postgres ever going to reference it.
export function getR2PublicUrl(): string {
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (!publicUrl) throw new Error("R2_PUBLIC_URL is required");
  return publicUrl;
}
