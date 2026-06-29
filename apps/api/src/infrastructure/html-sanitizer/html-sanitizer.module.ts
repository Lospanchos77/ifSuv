import { Global, Module } from '@nestjs/common';
import { HtmlSanitizerService } from './html-sanitizer.service';

@Global()
@Module({
  providers: [HtmlSanitizerService],
  exports: [HtmlSanitizerService],
})
export class HtmlSanitizerModule {}
