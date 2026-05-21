import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { extname } from 'path';
import { v4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });

  async createPresiignedUrl(fileName: string, contentType: string) {
    const Key = `images/${v4()}${extname(fileName)}`;
    const fileUrl = `${process.env.R2_PUBLIC_URL}/${Key}`;

    const uploadUrl = await getSignedUrl(
      this.s3,
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key,
        ContentType: contentType,
      }),
      { expiresIn: 60 },
    );

    return { uploadUrl, fileUrl, Key };
  }
}
