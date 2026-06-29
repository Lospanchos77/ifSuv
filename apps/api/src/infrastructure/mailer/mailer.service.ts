import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  passwordResetTemplate,
  type PasswordResetTemplateInput,
} from './templates/password-reset.template';

interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface SentMail {
  to: string;
  subject: string;
  text: string;
  html: string;
  sentAt: Date;
}

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly captured: SentMail[] = [];
  private readonly isTest: boolean;

  constructor(private readonly config: ConfigService) {
    this.from = this.config.getOrThrow<string>('MAILER_FROM');
    this.isTest = this.config.get<string>('NODE_ENV') === 'test';

    if (this.isTest) {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    } else {
      const user = this.config.get<string>('MAILER_USER');
      const pass = this.config.get<string>('MAILER_PASS');
      this.transporter = nodemailer.createTransport({
        host: this.config.getOrThrow<string>('MAILER_HOST'),
        port: this.config.get<number>('MAILER_PORT', 1025),
        secure: this.config.get<boolean>('MAILER_SECURE', false),
        auth: user && pass ? { user, pass } : undefined,
      });
    }
  }

  async sendMail(input: SendMailInput): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      if (this.isTest) {
        this.captured.push({ ...input, sentAt: new Date() });
      }
    } catch (err) {
      this.logger.error(
        `sendMail failed to=${input.to}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  async sendPasswordReset(
    input: PasswordResetTemplateInput & { to: string },
  ): Promise<void> {
    const { to, ...tplInput } = input;
    const content = passwordResetTemplate(tplInput);
    await this.sendMail({ to, ...content });
  }

  /** Test-only helper. */
  getLastMail(): SentMail | null {
    return this.captured.length === 0
      ? null
      : (this.captured[this.captured.length - 1] ?? null);
  }

  /** Test-only helper. */
  clearCapturedMails(): void {
    this.captured.length = 0;
  }
}
