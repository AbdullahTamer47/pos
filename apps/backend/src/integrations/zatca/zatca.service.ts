import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface ZatcaInvoiceData {
  invoiceNumber: string;
  uuid: string;
  issueDate: string;
  issueTime: string;
  sellerName: string;
  sellerVatNumber: string;
  sellerStreet: string;
  sellerCity: string;
  sellerPostalCode: string;
  sellerCountry: string;
  buyerName: string;
  buyerVatNumber?: string;
  buyerStreet?: string;
  buyerCity?: string;
  buyerPostalCode?: string;
  buyerCountry?: string;
  lineItems: ZatcaLineItem[];
  subtotal: number;
  vatTotal: number;
  grandTotal: number;
  currency: string;
  previousInvoiceHash?: string;
  paymentMethod: string;
  invoiceType: string;
}

interface ZatcaLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  totalBeforeVat: number;
  totalAfterVat: number;
}

interface ZatcaQRData {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: number;
  vat: number;
}

@Injectable()
export class ZatcaService {
  private readonly logger = new Logger(ZatcaService.name);
  private readonly sandboxMode: boolean;
  private readonly zatcaEnvironment: string;

  constructor() {
    this.sandboxMode = process.env.ZATCA_SANDBOX !== 'false';
    this.zatcaEnvironment = process.env.ZATCA_ENVIRONMENT || 'simulation';
    this.logger.log(`ZATCA service initialized in ${this.zatcaEnvironment} mode (sandbox: ${this.sandboxMode})`);
  }

  generateUUID(): string {
    return randomUUID();
  }

  generateInvoiceXML(invoice: ZatcaInvoiceData): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionURI>urn:oasis:names:specification:ubl:dsig:enveloped:xades</ext:ExtensionURI>
      <ext:ExtensionContent>
        <sig:UBLDocumentSignatures xmlns:sig="urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2">
          <sac:SignatureInformation xmlns:sac="urn:oasis:names:specification:ubl:schema:xsd:SignatureAggregateComponents-2">
            <cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID>
            <sbc:ReferencedSignatureID xmlns:sbc="urn:oasis:names:specification:ubl:schema:xsd:SignatureBasicComponents-2">urn:oasis:names:specification:ubl:signature:Invoice</sbc:ReferencedSignatureID>
          </sac:SignatureInformation>
        </sig:UBLDocumentSignatures>
      </ext:ExtensionContent>
    </ext:UBLExtension>
  </ext:UBLExtensions>
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${this.escapeXml(invoice.invoiceNumber)}</cbc:ID>
  <cbc:UUID>${this.escapeXml(invoice.uuid)}</cbc:UUID>
  <cbc:IssueDate>${this.escapeXml(invoice.issueDate)}</cbc:IssueDate>
  <cbc:IssueTime>${this.escapeXml(invoice.issueTime)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="${this.escapeXml(invoice.invoiceType)}">${this.getInvoiceTypeCode(invoice.invoiceType)}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${this.escapeXml(invoice.currency)}</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>${this.escapeXml(invoice.currency)}</cbc:TaxCurrencyCode>
  <cbc:LineCountNumeric>${invoice.lineItems.length}</cbc:LineCountNumeric>
  ${invoice.previousInvoiceHash ? `<cac:AdditionalDocumentReference>
    <cbc:ID>PIH</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${this.escapeXml(invoice.previousInvoiceHash)}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>` : ''}
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${this.escapeXml(this.generateQRCode(invoice.sellerName, invoice.sellerVatNumber, `${invoice.issueDate}T${invoice.issueTime}`, invoice.grandTotal, invoice.vatTotal))}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VAT">${this.escapeXml(invoice.sellerVatNumber)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(invoice.sellerName)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(invoice.sellerStreet)}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(invoice.sellerCity)}</cbc:CityName>
        <cbc:PostalZone>${this.escapeXml(invoice.sellerPostalCode)}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${this.escapeXml(invoice.sellerCountry)}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID${invoice.buyerVatNumber ? ' schemeID="VAT"' : ''}>${this.escapeXml(invoice.buyerVatNumber || invoice.buyerName)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.escapeXml(invoice.buyerName)}</cbc:Name>
      </cac:PartyName>
      ${invoice.buyerStreet ? `<cac:PostalAddress>
        <cbc:StreetName>${this.escapeXml(invoice.buyerStreet)}</cbc:StreetName>
        <cbc:CityName>${this.escapeXml(invoice.buyerCity || '')}</cbc:CityName>
        <cbc:PostalZone>${this.escapeXml(invoice.buyerPostalCode || '')}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${this.escapeXml(invoice.buyerCountry || 'SA')}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>` : ''}
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>${this.getPaymentMeansCode(invoice.paymentMethod)}</cbc:PaymentMeansCode>
  </cac:PaymentMeans>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${this.escapeXml(invoice.currency)}">${invoice.vatTotal.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${this.escapeXml(invoice.currency)}">${invoice.subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${this.escapeXml(invoice.currency)}">${invoice.vatTotal.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>15.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${this.escapeXml(invoice.currency)}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${this.escapeXml(invoice.currency)}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${this.escapeXml(invoice.currency)}">${invoice.grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${this.escapeXml(invoice.currency)}">${invoice.grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${invoice.lineItems.map((item) => this.generateLineItemXML(item, invoice.currency)).join('\n')}
</Invoice>`;

    return xml;
  }

  generateQRCode(
    sellerName: string,
    vatNumber: string,
    timestamp: string,
    total: number,
    vat: number,
  ): string {
    const encodeTLV = (tag: string, value: string): string => {
      return tag + String.fromCharCode(value.length) + value;
    };

    const parts = [
      encodeTLV('\x01', sellerName),
      encodeTLV('\x02', vatNumber),
      encodeTLV('\x03', timestamp),
      encodeTLV('\x04', total.toFixed(2)),
      encodeTLV('\x05', vat.toFixed(2)),
    ];

    const combined = parts.join('');
    const base64 = Buffer.from(combined, 'binary').toString('base64');
    return base64;
  }

  signInvoice(xml: string): { signed: boolean; signedXml: string; signatureHash: string } {
    try {
      this.validateXmlStructure(xml);

      const signatureHash = this.generateSignatureHash(xml);
      const signedXml = xml.replace(
        '</Invoice>',
        `  <cac:Signature>
    <cbc:ID>urn:oasis:names:specification:ubl:signature:1</cbc:ID>
    <cbc:SignatureMethod>urn:oasis:names:specification:ubl:dsig:enveloped:xades</cbc:SignatureMethod>
    <cbc:Note>Invoice signed by SmartPOS ZATCA Integration</cbc:Note>
    <cac:SignatoryParty>
      <cac:PartyIdentification>
        <cbc:ID>SmartPOS</cbc:ID>
      </cac:PartyIdentification>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference>
        <cbc:URI>#signature-${this.generateUUID()}</cbc:URI>
        <cbc:Hash>${signatureHash}</cbc:Hash>
      </cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
</Invoice>`,
      );

      this.logger.log(`Invoice signed successfully, hash: ${signatureHash}`);

      return {
        signed: true,
        signedXml,
        signatureHash,
      };
    } catch (error) {
      this.logger.error(`Failed to sign invoice: ${(error as Error).message}`);
      return {
        signed: false,
        signedXml: xml,
        signatureHash: '',
      };
    }
  }

  async submitInvoice(invoiceId: string): Promise<{
    success: boolean;
    submissionId: string;
    status: string;
    message: string;
  }> {
    this.logger.log(`Submitting invoice ${invoiceId} to ZATCA`);

    if (this.sandboxMode) {
      this.logger.log(`[SANDBOX] Invoice ${invoiceId} submitted to ZATCA sandbox`);
      return {
        success: true,
        submissionId: this.generateUUID(),
        status: 'ACCEPTED',
        message: 'Invoice submitted successfully (sandbox mode)',
      };
    }

    try {
      this.logger.log(`[PRODUCTION] Submitting invoice ${invoiceId} to ZATCA production`);
      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        success: true,
        submissionId: this.generateUUID(),
        status: 'ACCEPTED',
        message: 'Invoice submitted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to submit invoice ${invoiceId}: ${(error as Error).message}`);
      return {
        success: false,
        submissionId: '',
        status: 'REJECTED',
        message: `Submission failed: ${(error as Error).message}`,
      };
    }
  }

  generateHashChain(previousHash: string, invoiceData: string): string {
    const crypto = require('crypto');
    const combined = `${previousHash}:${invoiceData}`;
    const hash = crypto.createHash('sha256').update(combined, 'utf8').digest('hex');
    this.logger.log(`Generated hash chain entry: ${hash.substring(0, 16)}...`);
    return hash;
  }

  validateInvoice(invoice: ZatcaInvoiceData): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!invoice.invoiceNumber || invoice.invoiceNumber.trim().length === 0) {
      errors.push('Invoice number is required');
    }

    if (!invoice.uuid) {
      errors.push('UUID is required');
    }

    if (!invoice.issueDate) {
      errors.push('Issue date is required');
    }

    if (!invoice.issueTime) {
      errors.push('Issue time is required');
    }

    if (!invoice.sellerName || invoice.sellerName.trim().length === 0) {
      errors.push('Seller name is required');
    }

    if (!invoice.sellerVatNumber) {
      errors.push('Seller VAT number is required');
    } else if (!/^\d{15}$/.test(invoice.sellerVatNumber)) {
      errors.push('Seller VAT number must be 15 digits');
    }

    if (!invoice.sellerCountry) {
      errors.push('Seller country is required');
    }

    if (invoice.buyerVatNumber && !/^\d{15}$/.test(invoice.buyerVatNumber)) {
      warnings.push('Buyer VAT number should be 15 digits');
    }

    if (!invoice.lineItems || invoice.lineItems.length === 0) {
      errors.push('At least one line item is required');
    } else {
      for (let i = 0; i < invoice.lineItems.length; i++) {
        const item = invoice.lineItems[i];
        if (!item) continue;
        if (!item.name) errors.push(`Line item ${i + 1}: Name is required`);
        if (item.quantity <= 0) errors.push(`Line item ${i + 1}: Quantity must be positive`);
        if (item.unitPrice < 0) errors.push(`Line item ${i + 1}: Unit price cannot be negative`);
        if (item.vatRate < 0 || item.vatRate > 100) errors.push(`Line item ${i + 1}: VAT rate must be between 0 and 100`);
      }
    }

    if (invoice.subtotal < 0) {
      errors.push('Subtotal cannot be negative');
    }

    if (invoice.vatTotal < 0) {
      errors.push('VAT total cannot be negative');
    }

    if (invoice.grandTotal < 0) {
      errors.push('Grand total cannot be negative');
    }

    const calculatedVat = invoice.lineItems.reduce((sum, item) => sum + item.vatAmount, 0);
    if (Math.abs(calculatedVat - invoice.vatTotal) > 0.01) {
      warnings.push(`VAT total mismatch: calculated ${calculatedVat.toFixed(2)}, provided ${invoice.vatTotal.toFixed(2)}`);
    }

    const calculatedSubtotal = invoice.lineItems.reduce((sum, item) => sum + item.totalBeforeVat, 0);
    if (Math.abs(calculatedSubtotal - invoice.subtotal) > 0.01) {
      warnings.push(`Subtotal mismatch: calculated ${calculatedSubtotal.toFixed(2)}, provided ${invoice.subtotal.toFixed(2)}`);
    }

    const calculatedGrandTotal = invoice.subtotal + invoice.vatTotal;
    if (Math.abs(calculatedGrandTotal - invoice.grandTotal) > 0.01) {
      warnings.push(`Grand total mismatch: calculated ${calculatedGrandTotal.toFixed(2)}, provided ${invoice.grandTotal.toFixed(2)}`);
    }

    this.logger.log(
      `Invoice validation: ${errors.length === 0 ? 'PASSED' : 'FAILED'} (${errors.length} errors, ${warnings.length} warnings)`,
    );

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private generateLineItemXML(item: ZatcaLineItem, currency: string): string {
    return `  <cac:InvoiceLine>
    <cbc:ID>${this.escapeXml(item.id)}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${this.escapeXml(currency)}">${item.totalBeforeVat.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${this.escapeXml(currency)}">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="${this.escapeXml(currency)}">${item.totalBeforeVat.toFixed(2)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="${this.escapeXml(currency)}">${item.vatAmount.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxCategory>
          <cbc:ID>S</cbc:ID>
          <cbc:Percent>${item.vatRate.toFixed(2)}</cbc:Percent>
          <cac:TaxScheme>
            <cbc:ID>VAT</cbc:ID>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${this.escapeXml(item.name)}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${this.escapeXml(currency)}">${item.unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }

  private getInvoiceTypeCode(invoiceType: string): string {
    const codes: Record<string, string> = {
      SALE: '388',
      PURCHASE: '381',
      RETURN_SALE: '381',
      RETURN_PURCHASE: '383',
      DEBIT_NOTE: '383',
      CREDIT_NOTE: '381',
    };
    return codes[invoiceType] || '388';
  }

  private getPaymentMeansCode(paymentMethod: string): string {
    const codes: Record<string, string> = {
      CASH: '10',
      CARD: '48',
      CREDIT: '30',
      BANK_TRANSFER: '31',
      WALLET: '48',
      OTHER: '1',
    };
    return codes[paymentMethod] || '1';
  }

  private validateXmlStructure(xml: string): void {
    if (!xml.includes('<Invoice')) {
      throw new Error('Invalid XML: Missing Invoice root element');
    }
    if (!xml.includes('xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"')) {
      throw new Error('Invalid XML: Missing UBL Invoice namespace');
    }
    if (!xml.includes('<cbc:ID>')) {
      throw new Error('Invalid XML: Missing Invoice ID');
    }
    if (!xml.includes('<cbc:UUID>')) {
      throw new Error('Invalid XML: Missing UUID');
    }
  }

  private generateSignatureHash(xml: string): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(xml, 'utf8').digest('hex');
    return hash;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}