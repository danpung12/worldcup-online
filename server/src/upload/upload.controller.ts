import { Body, Controller, Post } from '@nestjs/common';
import { UploadService } from './upload.service';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned-url')
  createPresignedUrl(@Body() body: { fileName: string; contentType: string }) {
    return this.uploadService.createPresiignedUrl(
      body.fileName,
      body.contentType,
    );
  }
}
