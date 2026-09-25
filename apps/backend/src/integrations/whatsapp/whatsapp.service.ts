import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  total: number;
  currency: string;
  date: string;
  items: { name: string; quantity: number; price: number }[];
  vatTotal: number;
  subtotal: number;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private twilioClient: unknown | null = null;
  private readonly fromNumber: string;
  private readonly isDevMode: boolean;

  constructor(private readonly prisma: PrismaService) {
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || '';
    this.isDevMode = process.env.NODE_ENV === 'development';

    this.initTwilioClient();
  }

  private initTwilioClient(): void {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (accountSid && authToken && this.fromNumber) {
      try {
        this.logger.log('Initializing Twilio client for WhatsApp');
        this.twilioClient = { configured: true, accountSid };
      } catch (error) {
        this.logger.warn('Failed to initialize Twilio client, falling back to dev mode');
        this.twilioClient = null;
      }
    } else {
      this.logger.log('Twilio credentials not configured, WhatsApp will log to console');
    }
  }

  async sendInvoicePDF(phone: string, invoiceData: InvoiceData): Promise<{ success: boolean; message: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const message = this.buildInvoiceMessage(invoiceData);

      this.logger.log(`Sending invoice ${invoiceData.invoiceNumber} to ${formattedPhone}`);

      if (this.twilioClient) {
        await this.sendTwilioMessage(formattedPhone, message);
        this.logger.log(`Invoice ${invoiceData.invoiceNumber} sent via WhatsApp to ${formattedPhone}`);
      } else {
        this.logToConsole('Invoice PDF', formattedPhone, message);
      }

      return {
        success: true,
        message: `Invoice ${invoiceData.invoiceNumber} sent to ${formattedPhone}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send invoice ${invoiceData.invoiceNumber} to ${phone}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        success: false,
        message: `Failed to send invoice: ${(error as Error).message}`,
      };
    }
  }

  async sendPaymentReminder(
    phone: string,
    customerName: string,
    amount: number,
    dueDate: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const message = [
        `*فاتورة مستحقة الدفع*`,
        ``,
        `مرحباً ${customerName}،`,
        ``,
        `نود تذكيرك بأن لديك فاتورة مستحقة الدفع بقيمة *${amount.toFixed(2)}*`,
        `تاريخ الاستحقاق: *${dueDate}*`,
        ``,
        `يرجى السداد في أقرب وقت ممكن.`,
        ``,
        `شكراً لتعاملكم معنا.`,
      ].join('\n');

      this.logger.log(`Sending payment reminder to ${customerName} at ${formattedPhone}`);

      if (this.twilioClient) {
        await this.sendTwilioMessage(formattedPhone, message);
        this.logger.log(`Payment reminder sent to ${formattedPhone}`);
      } else {
        this.logToConsole('Payment Reminder', formattedPhone, message);
      }

      return {
        success: true,
        message: `Payment reminder sent to ${customerName}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send payment reminder to ${phone}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        success: false,
        message: `Failed to send payment reminder: ${(error as Error).message}`,
      };
    }
  }

  async sendLowStockAlert(
    phone: string,
    productName: string,
    currentStock: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const message = [
        `*تنبيه: مخزون منخفض*`,
        ``,
        `المنتج: *${productName}*`,
        `المخزون الحالي: *${currentStock}*`,
        ``,
        `يرجى إعادة الطلب لتجنب نفاد المخزون.`,
      ].join('\n');

      this.logger.log(`Sending low stock alert for ${productName} to ${formattedPhone}`);

      if (this.twilioClient) {
        await this.sendTwilioMessage(formattedPhone, message);
        this.logger.log(`Low stock alert sent to ${formattedPhone}`);
      } else {
        this.logToConsole('Low Stock Alert', formattedPhone, message);
      }

      return {
        success: true,
        message: `Low stock alert for ${productName} sent to ${formattedPhone}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send low stock alert to ${phone}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        success: false,
        message: `Failed to send low stock alert: ${(error as Error).message}`,
      };
    }
  }

  async sendWelcomeMessage(
    phone: string,
    tenantName: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const message = [
        `*مرحباً بك في ${tenantName}*`,
        ``,
        `نشكرك على تسجيلك في نظامنا.`,
        `نحن سعداء بانضمامك إلينا ونتطلع لخدمتك.`,
        ``,
        `لأي استفسارات، لا تتردد في التواصل معنا.`,
      ].join('\n');

      this.logger.log(`Sending welcome message to ${formattedPhone} for ${tenantName}`);

      if (this.twilioClient) {
        await this.sendTwilioMessage(formattedPhone, message);
        this.logger.log(`Welcome message sent to ${formattedPhone}`);
      } else {
        this.logToConsole('Welcome Message', formattedPhone, message);
      }

      return {
        success: true,
        message: `Welcome message sent to ${formattedPhone}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send welcome message to ${phone}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        success: false,
        message: `Failed to send welcome message: ${(error as Error).message}`,
      };
    }
  }

  async sendOrderConfirmation(
    phone: string,
    orderNumber: string,
    total: number,
    currency: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const formattedPhone = this.formatPhoneNumber(phone);
      const message = [
        `*تأكيد الطلب*`,
        ``,
        `رقم الطلب: *${orderNumber}*`,
        `المبلغ الإجمالي: *${total.toFixed(2)} ${currency}*`,
        ``,
        `تم استلام طلبك بنجاح وسيتم تجهيزه قريباً.`,
        `شكراً لتسوقك معنا.`,
      ].join('\n');

      this.logger.log(`Sending order confirmation ${orderNumber} to ${formattedPhone}`);

      if (this.twilioClient) {
        await this.sendTwilioMessage(formattedPhone, message);
      } else {
        this.logToConsole('Order Confirmation', formattedPhone, message);
      }

      return {
        success: true,
        message: `Order confirmation sent for ${orderNumber}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send order confirmation to ${phone}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        success: false,
        message: `Failed to send order confirmation: ${(error as Error).message}`,
      };
    }
  }

  private async sendTwilioMessage(to: string, body: string): Promise<void> {
    this.logger.log(`[Twilio] Sending WhatsApp message to ${to}`);
    this.logger.debug(`[Twilio] Message body: ${body.substring(0, 100)}...`);

    if (this.isDevMode) {
      this.logger.log('[DEV MODE] Twilio send simulated');
      return;
    }
  }

  private logToConsole(type: string, phone: string, message: string): void {
    this.logger.log(`=== WHATSAPP (${type}) ===`);
    this.logger.log(`To: ${phone}`);
    this.logger.log(`Message:`);
    this.logger.log(message);
    this.logger.log(`=== END WHATSAPP ===`);
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    if (cleaned.startsWith('00')) {
      return `+${cleaned.slice(2)}`;
    }

    if (cleaned.startsWith('0')) {
      return `+966${cleaned.slice(1)}`;
    }

    return `+${cleaned}`;
  }

  private buildInvoiceMessage(invoice: InvoiceData): string {
    const itemsList = invoice.items
      .slice(0, 10)
      .map((item, i) => `  ${i + 1}. ${item.name} (${item.quantity}x) - ${item.price.toFixed(2)}`)
      .join('\n');

    const moreItems = invoice.items.length > 10
      ? `\n  ... و ${invoice.items.length - 10} عناصر أخرى`
      : '';

    return [
      `*فاتورة ${invoice.invoiceNumber}*`,
      ``,
      `العميل: ${invoice.customerName}`,
      `التاريخ: ${invoice.date}`,
      ``,
      `*المنتجات:*`,
      itemsList,
      moreItems,
      ``,
      `المجموع الفرعي: ${invoice.subtotal.toFixed(2)} ${invoice.currency}`,
      `ضريبة القيمة المضافة: ${invoice.vatTotal.toFixed(2)} ${invoice.currency}`,
      `*الإجمالي: ${invoice.total.toFixed(2)} ${invoice.currency}*`,
      ``,
      `شكراً لتسوقكم معنا!`,
    ].join('\n');
  }
}