import { Injectable, Logger } from '@nestjs/common'
import * as Minio from 'minio'

@Injectable()
export class StorageService {
  private client: Minio.Client
  private readonly logger = new Logger(StorageService.name)
  private readonly bucket = 'jarvis-documents'

  constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: Number(process.env.MINIO_PORT) || 9000,
      useSSL: false,
      accessKey: process.env.MINIO_ROOT_USER || 'jarvis',
      secretKey: process.env.MINIO_ROOT_PASSWORD || 'jarvis_minio_password',
    })
  }

  async ensureBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket)
    if (!exists) {
      await this.client.makeBucket(this.bucket)
      this.logger.log(`Bucket "${this.bucket}" created`)
    }
  }

  async uploadFile(objectName: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(this.bucket, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    })
    return `${this.bucket}/${objectName}`
  }

  async getFile(objectName: string): Promise<Buffer> {
    const dataStream = await this.client.getObject(this.bucket, objectName)
    const chunks: Buffer[] = []
    for await (const chunk of dataStream) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }

  async deleteFile(objectName: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectName)
  }

  getFileUrl(objectName: string): string {
    return `${this.bucket}/${objectName}`
  }
}
