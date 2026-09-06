// =============================================================================
// File: src/lib/email/EmailNotificationEngine.ts
// Description: Notification composition + delivery with an HONEST transport
// model (D-A3). When SMTP env configuration exists (EMAIL_SMTP_HOST or
// EMAIL_SMTP_URL + EMAIL_FROM) messages are delivered via nodemailer and the
// outbox record flips to SENT. Without transport configuration the message is
// composed into a persisted outbox row in state QUEUED (DEMO) — we never claim
// a message was sent when no transport exists.
//
// Runtime store: /tmp/korie-email-outbox.json (env EMAIL_STORE_PATH override).
// NEVER committed; it is demo runtime state only.
// =============================================================================

import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const EMAIL_STORE_PATH = process.env.EMAIL_STORE_PATH || '/tmp/korie-email-outbox.json';

export type EmailTemplateId = 'ADASHI_INSUFFICIENT_FUNDS' | 'ADASHI_OVERDUE_REMINDER';

export type NotificationStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
export type NotificationTransportMode = 'SMTP' | 'DEMO_OUTBOX';

export interface EmailNotificationRecord {
  id: string;
  templateId: EmailTemplateId;
  customerId: string;
  toEmail: string;
  toName: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  status: NotificationStatus;
  transportMode: NotificationTransportMode;
  adashiId?: string;
  obligationId?: string;
  amount?: number;
  currency?: string;
  errorMessage?: string;
  attemptCount: number;
  readAt?: string;
  createdAt: string;
  sentAt?: string;
  updatedAt: string;
}

interface TemplateVariables {
  customerFirstName: string;
  groupName: string;
  amount: string;
  currency: string;
  dueDate: string;
  walletBalance: string;
}

const TEMPLATES: Record<
  EmailTemplateId,
  {
    subject: (v: TemplateVariables) => string;
    bodyText: (v: TemplateVariables) => string;
  }
> = {
  ADASHI_INSUFFICIENT_FUNDS: {
    subject: (v) => `Action needed: ${v.groupName} contribution could not be collected`,
    bodyText: (v) =>
      `Dear ${v.customerFirstName},\n\n` +
      `We attempted to auto-collect your Adashi contribution of ${v.currency} ${v.amount} ` +
      `for "${v.groupName}" (due ${v.dueDate}), but your KoriePay wallet balance ` +
      `(${v.currency} ${v.walletBalance}) is not enough to cover it.\n\n` +
      `Your account is now negative-flagged for this obligation and the cycle remains open. ` +
      `Please fund your wallet, then pay the contribution to keep your savings circle on track ` +
      `and avoid the grace-period deadline.\n\n` +
      `— KoriePay Adashi team`,
  },
  ADASHI_OVERDUE_REMINDER: {
    subject: (v) => `Reminder: ${v.groupName} contribution is overdue`,
    bodyText: (v) =>
      `Dear ${v.customerFirstName},\n\n` +
      `Your Adashi contribution of ${v.currency} ${v.amount} for "${v.groupName}" ` +
      `(due ${v.dueDate}) is now overdue.\n\n` +
      `Please pay it promptly so the cycle's beneficiary is not delayed. ` +
      `You can pay from the circle page in your KoriePay app.\n\n` +
      `— KoriePay Adashi team`,
  },
};

function isSmtpConfigured(): boolean {
  return Boolean(process.env.EMAIL_SMTP_HOST || process.env.EMAIL_SMTP_URL);
}

function smtpFromEnv(): {
  host: string;
  port: number;
  secure: boolean;
  auth?: { user: string; pass: string };
  from: string;
} {
  const from = process.env.EMAIL_FROM || 'KoriePay Demo <no-reply@demo.koriepay.ng>';
  const url = process.env.EMAIL_SMTP_URL;
  if (url) {
    try {
      const parsed = new URL(url);
      return {
        host: parsed.hostname,
        port: Number(parsed.port || 587),
        secure: parsed.protocol === 'smtps:',
        auth:
          parsed.username || parsed.password
            ? { user: decodeURIComponent(parsed.username), pass: decodeURIComponent(parsed.password) }
            : undefined,
        from,
      };
    } catch {
      /* fall through to host-based config */
    }
  }
  return {
    host: process.env.EMAIL_SMTP_HOST || '',
    port: Number(process.env.EMAIL_SMTP_PORT || 587),
    secure: process.env.EMAIL_SMTP_SECURE === 'true' || Number(process.env.EMAIL_SMTP_PORT) === 465,
    auth:
      process.env.EMAIL_SMTP_USER || process.env.EMAIL_SMTP_PASS
        ? { user: process.env.EMAIL_SMTP_USER || '', pass: process.env.EMAIL_SMTP_PASS || '' }
        : undefined,
    from,
  };
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toISOString().slice(0, 10);
  } catch {
    return isoDate;
  }
}

export class EmailNotificationEngine {
  private static instance: EmailNotificationEngine;

  private records: EmailNotificationRecord[] = [];
  private transporter?: Transporter;
  private smtpOk = false;

  private constructor() {
    this.hydrate();
    this.initTransport();
  }

  public static getInstance(): EmailNotificationEngine {
    if (!EmailNotificationEngine.instance) {
      EmailNotificationEngine.instance = new EmailNotificationEngine();
    }
    return EmailNotificationEngine.instance;
  }

  private initTransport() {
    if (!isSmtpConfigured()) {
      this.smtpOk = false;
      return;
    }
    try {
      const cfg = smtpFromEnv();
      this.transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: cfg.auth,
      });
      this.smtpOk = true;
    } catch {
      this.transporter = undefined;
      this.smtpOk = false;
    }
  }

  private hydrate() {
    try {
      if (!fs.existsSync(EMAIL_STORE_PATH)) return;
      const data = JSON.parse(fs.readFileSync(EMAIL_STORE_PATH, 'utf8'));
      if (Array.isArray(data.records)) this.records = data.records;
    } catch {
      /* corrupt/missing store — start empty */
    }
  }

  private persist() {
    try {
      fs.mkdirSync(path.dirname(EMAIL_STORE_PATH), { recursive: true });
      fs.writeFileSync(EMAIL_STORE_PATH, JSON.stringify({ records: this.records }));
    } catch {
      /* non-fatal */
    }
  }

  public isSmtpConfigured(): boolean {
    return this.smtpOk;
  }

  public getOutbox(): EmailNotificationRecord[] {
    this.hydrate();
    return [...this.records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public listByCustomer(customerId: string): EmailNotificationRecord[] {
    return this.getOutbox().filter((r) => r.customerId === customerId);
  }

  public hasOpenReminder(customerId: string, templateId: EmailTemplateId, obligationId: string): boolean {
    return this.records.some(
      (r) =>
        r.customerId === customerId &&
        r.templateId === templateId &&
        r.obligationId === obligationId &&
        (r.status === 'QUEUED' || r.status === 'SENDING'),
    );
  }

  /**
   * Compose a notification and either deliver it (SMTP configured) or persist
   * it honestly as QUEUED in DEMO_OUTBOX mode. Never fabricates SENT.
   */
  public async composeAndQueue(params: {
    templateId: EmailTemplateId;
    customerId: string;
    toEmail: string;
    toName: string;
    variables: TemplateVariables;
    adashiId?: string;
    obligationId?: string;
  }): Promise<EmailNotificationRecord> {
    this.hydrate();
    const template = TEMPLATES[params.templateId];
    const now = new Date();
    const record: EmailNotificationRecord = {
      id: `ntf_${now.getTime()}_${Math.random().toString(36).substring(2, 7)}`,
      templateId: params.templateId,
      customerId: params.customerId,
      toEmail: params.toEmail,
      toName: params.toName,
      subject: template.subject(params.variables),
      bodyText: template.bodyText(params.variables),
      status: 'QUEUED',
      transportMode: this.smtpOk ? 'SMTP' : 'DEMO_OUTBOX',
      adashiId: params.adashiId,
      obligationId: params.obligationId,
      amount: params.variables.amount ? Number(params.variables.amount) : undefined,
      currency: params.variables.currency,
      attemptCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.records.unshift(record);

    if (!this.smtpOk || !this.transporter) {
      // Honest demo fallback: composed, stored, NOT sent. Do not pretend.
      this.persist();
      return record;
    }

    record.status = 'SENDING';
    record.attemptCount = 1;
    try {
      const cfg = smtpFromEnv();
      const info = await this.transporter.sendMail({
        from: cfg.from,
        to: record.toEmail,
        subject: record.subject,
        text: record.bodyText,
      });
      const accepted = Array.isArray(info.accepted) && info.accepted.length > 0;
      record.status = accepted ? 'SENT' : 'FAILED';
      record.errorMessage = accepted ? undefined : 'SMTP did not accept the message';
      record.sentAt = accepted ? new Date().toISOString() : undefined;
    } catch (error: any) {
      record.status = 'FAILED';
      record.errorMessage = error?.message || 'SMTP delivery failed';
    }
    record.updatedAt = new Date().toISOString();
    this.persist();
    return record;
  }

  public markRead(id: string, customerId: string): boolean {
    this.hydrate();
    const rec = this.records.find((r) => r.id === id && r.customerId === customerId);
    if (!rec) return false;
    rec.readAt = new Date().toISOString();
    rec.updatedAt = rec.readAt;
    this.persist();
    return true;
  }
}

export const emailNotificationEngine = EmailNotificationEngine.getInstance();

export function formatAdashiTemplateVariables(params: {
  customerFirstName: string;
  groupName: string;
  amount: number;
  currency: string;
  dueDate: string;
  walletBalance: number;
}): TemplateVariables {
  const amount = params.amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const balance = params.walletBalance.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return {
    customerFirstName: params.customerFirstName,
    groupName: params.groupName,
    amount,
    currency: params.currency,
    dueDate: formatDate(params.dueDate),
    walletBalance: balance,
  };
}
