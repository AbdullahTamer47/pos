import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailJobData } from '../queues.service';

@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor() {}

  async process(job: Job<EmailJobData>) {
    const { to, subject, template, context, tenantId, attachments } = job.data;

    this.logger.log(`Processing email job ${job.id}: ${subject} to ${to}`);

    try {
      const htmlContent = this.renderTemplate(template, context);

      const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_PORT;

      if (smtpConfigured) {
        await this.sendViaSMTP(to, subject, htmlContent, attachments);
      } else {
        this.logToConsole(to, subject, htmlContent, attachments);
      }

      this.logger.log(`Email sent successfully: ${subject} to ${to}`);

      return {
        jobId: job.id,
        to,
        subject,
        template,
        status: 'sent',
        tenantId,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Email failed to send to ${to}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      const attempts = job.attemptsMade;
      const maxAttempts = job.opts.attempts || 3;

      if (attempts >= maxAttempts) {
        this.logger.error(
          `Email permanently failed after ${maxAttempts} attempts: ${subject} to ${to}`,
        );
        return {
          jobId: job.id,
          to,
          subject,
          status: 'permanently_failed',
          error: (error as Error).message,
          attempts,
        };
      }

      throw error;
    }
  }

  private renderTemplate(template: string, context: Record<string, unknown>): string {
    let html = template;

    for (const [key, value] of Object.entries(context)) {
      html = html.replace(
        new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'),
        String(value ?? ''),
      );
    }

    return html;
  }

  private async sendViaSMTP(
    to: string,
    subject: string,
    html: string,
    attachments?: { filename: string; content: string; contentType: string }[],
  ): Promise<void> {
    const host = process.env.SMTP_HOST || 'localhost';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    const from = process.env.SMTP_FROM || 'noreply@smartpos.com';

    this.logger.log(`Sending email via SMTP (${host}:${port}): ${subject} to ${to}`);

    this.logger.log(`From: ${from}`);
    this.logger.log(`To: ${to}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Body length: ${html.length} chars`);

    if (attachments && attachments.length > 0) {
      this.logger.log(`Attachments: ${attachments.map((a) => a.filename).join(', ')}`);
    }

    if (process.env.NODE_ENV === 'development') {
      this.logger.log('[DEV MODE] SMTP send simulated - no actual email sent');
      return;
    }

    const nodemailer = await this.getNodemailer();
    if (nodemailer) {
      const transporter = (nodemailer as any).createTransport({
        host,
        port,
        secure: port === 465,
        auth: user ? { user, pass } : undefined,
      });

      await transporter.sendMail({
        from,
        to,
        subject,
        html,
        attachments: attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
    }
  }

  private logToConsole(
    to: string,
    subject: string,
    html: string,
    attachments?: { filename: string; contentType: string }[],
  ): void {
    this.logger.log('=== EMAIL (SMTP not configured - logging to console) ===');
    this.logger.log(`To: ${to}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Body: ${html.substring(0, 200)}...`);
    if (attachments && attachments.length > 0) {
      this.logger.log(`Attachments: ${attachments.map((a) => `${a.filename} (${a.contentType})`).join(', ')}`);
    }
    this.logger.log('=== END EMAIL ===');
  }

  private async getNodemailer(): Promise<unknown> {
    try {
      return await import('nodemailer');
    } catch {
      this.logger.warn('nodemailer not installed, falling back to console logging');
      return null;
    }
  }
}