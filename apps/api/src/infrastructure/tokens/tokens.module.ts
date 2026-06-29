import { Global, Module } from '@nestjs/common';
import { QrImageService } from './qr-image.service';
import { QrTokenService } from './qr-token.service';

@Global()
@Module({
  providers: [QrTokenService, QrImageService],
  exports: [QrTokenService, QrImageService],
})
export class TokensModule {}
