import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private s3Client: S3Client

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      },
    })
  }

  async bucketExists(bucketName: string): Promise<boolean> {
    const command = new HeadBucketCommand({ Bucket: bucketName })
    try {
      await this.s3Client.send(command)
      return true
    } catch (error) {
      if (error.name === 'NotFound') {
        return false
      }
      throw error
    }
  }

  async createBucket(bucketName: string): Promise<void> {
    const command = new CreateBucketCommand({ Bucket: bucketName })
    try {
      await this.s3Client.send(command)
      this.logger.log(`Bucket created successfully: ${bucketName}`)
    } catch (error) {
      this.logger.error(`Failed to create bucket: ${error.message}`)
      throw error
    }
  }

  async uploadTextFile(bucketName: string, key: string, text: string): Promise<string> {
    const params = {
      Bucket: bucketName,
      Key: key,
      Body: text,
      ContentType: 'application/json',
    }

    try {
      const command = new PutObjectCommand(params)
      await this.s3Client.send(command)
      this.logger.log(`File uploaded successfully to ${key} in bucket ${bucketName}`)
      return key
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`)
      throw error
    }
  }

  async getPresignedUrl(
    key: string,
    contentType: string,
    options?: {
      bucketName?: string // Option to specify bucket name
      expiresIn?: number // Expiry time in seconds
      maxSize?: number // Maximum allowed file size in bytes
      allowedFileTypes?: string[] // Allowed file types
    },
  ): Promise<string> {
    const bucketName = options?.bucketName || process.env.AWS_S3_BUCKET

    const params = {
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    }

    try {
      const command = new PutObjectCommand(params)
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: options?.expiresIn || 300, // Default to 5 minutes
      })
      this.logger.log(`Generated pre-signed URL: ${url}`)
      return url
    } catch (error) {
      this.logger.error(`Failed to generate pre-signed URL: ${error.message}`)
      throw error
    }
  }
}
