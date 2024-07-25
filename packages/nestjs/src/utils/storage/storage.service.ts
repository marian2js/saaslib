import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Injectable, Logger } from '@nestjs/common'
import { Readable } from 'stream'

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name)
  private s3Client: S3Client

  constructor() {
    const endpoint = process.env.AWS_S3_ENDPOINT
    this.s3Client = new S3Client({
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
      },
      ...(endpoint && { endpoint }),
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

  async ensureBucket(bucketName: string): Promise<void> {
    const exists = await this.bucketExists(bucketName)
    if (!exists) {
      await this.createBucket(bucketName)
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
      this.logger.log(`File uploaded to ${bucketName}/${key}`)
      return key
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`)
      throw error
    }
  }

  async readTextFile(bucketName: string, key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    try {
      const { Body } = await this.s3Client.send(command)
      const readableStream = Body as Readable
      let data = ''
      readableStream.on('data', (chunk) => {
        data += chunk
      })
      readableStream.on('end', () => {
        return data
      })
    } catch (error) {
      this.logger.error(`Failed to read file: ${error.message}`)
      throw error
    }
  }

  async uploadFromUrl(bucketName: string, key: string, url: string): Promise<string> {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch file from URL: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream'

      const readableStream = response.body.getReader()
      for await (const chunk of readableStream) {
        data += chunk
      }
      this.logger.log(`File read successfully from ${key} in bucket ${bucketName}`)
      return data
    } catch (error) {
      this.logger.error(`Failed to read file: ${error.message}`)
      throw error
    }
  }
      const buffer = await response.arrayBuffer()
      const params = {
        Bucket: bucketName,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: contentType,
      }
      const command = new PutObjectCommand(params)
      await this.s3Client.send(command)

      this.logger.log(`File uploaded from URL to ${bucketName}/${key}`)
      return key
    } catch (error) {
      this.logger.error(`Failed to upload file from URL: ${error.message}`)
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

  async deleteFile(bucketName: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })

    try {
      await this.s3Client.send(command)
      this.logger.log(`File deleted from ${bucketName}/${key}`)
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`)
      throw error
    }
  }
}
