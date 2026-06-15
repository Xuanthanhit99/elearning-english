import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CertificatesService } from './certificates.service';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post('courses/:courseId/generate')
  @UseGuards(JwtAuthGuard)
  generate(@Param('courseId') courseId: string, @Req() req: any) {
    return this.certificatesService.generate(req.user.id, courseId);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  myCertificates(@Req() req: any) {
    return this.certificatesService.myCertificates(req.user.id);
  }

  @Get(':code')
  verify(@Param('code') code: string) {
    return this.certificatesService.verify(code);
  }
}
