import * as ImapSimple from 'imap-simple';
import { simpleParser, AddressObject } from 'mailparser';
import nodemailer from 'nodemailer';
import { type InsertEmail, EmailFolder } from '@shared/schema';
import { storage } from '../storage';

// Helper to extract text from address object
function getAddressText(addr: AddressObject | AddressObject[] | undefined): string {
  if (!addr) return '';
  if (Array.isArray(addr)) return addr.map(a => a.text).join(', ');
  return addr.text || '';
}

// Email configuration
function getImapConfig(): ImapSimple.ImapSimpleOptions {
  const user = process.env.EMAIL_ADDRESS?.trim();
  const password = process.env.EMAIL_PASSWORD?.trim();
  const host = process.env.IMAP_HOST?.trim();

  if (!user || !password || !host) {
    throw new Error('Email configuration missing: EMAIL_ADDRESS, EMAIL_PASSWORD, and IMAP_HOST are required');
  }

  return {
    imap: {
      user,
      password,
      host,
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    }
  };
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST?.trim(),
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_ADDRESS?.trim(),
    pass: process.env.EMAIL_PASSWORD?.trim(),
  },
});

export class EmailService {
  private static async withConnection<T>(
    operation: (connection: ImapSimple.ImapSimple) => Promise<T>
  ): Promise<T> {
    const config = getImapConfig();
    const connection = await ImapSimple.connect(config);
    try {
      return await operation(connection);
    } finally {
      try {
        connection.end();
      } catch (endError) {
        console.error('Error closing IMAP connection:', endError);
      }
    }
  }

  static async fetchEmails(): Promise<InsertEmail[]> {
    console.log('Connecting to email server...');
    const imapConfig = getImapConfig();
    console.log('IMAP Config:', {
      host: imapConfig.imap.host,
      port: imapConfig.imap.port,
      user: imapConfig.imap.user,
    });

    return this.withConnection(async (connection) => {
      console.log('Connected to email server');

      await connection.openBox('INBOX');
      console.log('Opened INBOX');

      const searchCriteria = ['UNSEEN'];
      const fetchOptions = {
        bodies: [''],
        struct: true,
        markSeen: false
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      console.log(`Found ${messages.length} unread messages`);

      // Limit to most recent 50 emails
      const recentMessages = messages.slice(-50).reverse();

      const emails: InsertEmail[] = [];

      for (const message of recentMessages) {
        try {
          const allParts = message.parts.filter((part: any) => part.which === '');
          const bodyPart = allParts.length > 0 ? allParts[0] : message.parts[0];

          if (bodyPart && bodyPart.body) {
            const parsed = await simpleParser(bodyPart.body);

            const fromText = getAddressText(parsed.from);
            const toText = getAddressText(parsed.to);
            const ccText = getAddressText(parsed.cc);
            const bccText = getAddressText(parsed.bcc);

            const email: InsertEmail = {
              messageId: message.attributes.uid.toString(),
              subject: parsed.subject || 'No Subject',
              sender: fromText || 'Unknown Sender',
              recipients: toText ? [toText] : [],
              cc: ccText ? [ccText] : [],
              bcc: bccText ? [bccText] : [],
              content: parsed.text || '',
              htmlContent: parsed.html || null,
              folder: EmailFolder.INBOX,
              processed: false,
              flags: message.attributes.flags || [],
              receivedAt: parsed.date || new Date(),
              attachments: parsed.attachments || []
            };

            emails.push(email);
            await storage.createEmail(email);
          }
        } catch (err) {
          console.error('Error parsing email:', err);
        }
      }

      return emails;
    });
  }

  static async sendEmail(
    to: string | string[],
    subject: string,
    text: string,
    html?: string,
    cc?: string | string[],
    bcc?: string | string[],
    attachments?: any[]
  ) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_ADDRESS,
        to: Array.isArray(to) ? to.join(', ') : to,
        cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
        bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
        subject,
        text,
        html,
        attachments
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  static async markEmailAsRead(messageId: string) {
    return this.withConnection(async (connection) => {
      await connection.openBox('INBOX');
      const uid = parseInt(messageId, 10);
      if (!isNaN(uid)) {
        await connection.addFlags(uid, ['\\Seen']);
      }
    });
  }

  static async moveEmailToFolder(messageId: string, targetFolder: string) {
    return this.withConnection(async (connection) => {
      await connection.openBox('INBOX');
      await connection.moveMessage(messageId, targetFolder);
    });
  }

  static async archiveEmail(messageId: string) {
    return this.moveEmailToFolder(messageId, 'Archive');
  }

  static async deleteEmail(messageId: string) {
    return this.withConnection(async (connection) => {
      await connection.openBox('INBOX');
      const uid = parseInt(messageId, 10);
      if (!isNaN(uid)) {
        await connection.addFlags(uid, ['\\Deleted']);
      }
      // Use the underlying IMAP connection for expunge
      await new Promise<void>((resolve, reject) => {
        (connection as any).imap.expunge((err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  static async replyToEmail(
    originalEmail: { sender: string; subject: string; messageId: string },
    replyText: string,
    replyHtml?: string,
    attachments?: any[]
  ) {
    const subject = originalEmail.subject.startsWith('Re: ')
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`;

    await this.sendEmail(
      originalEmail.sender,
      subject,
      replyText,
      replyHtml,
      undefined,
      undefined,
      attachments
    );

    await this.markEmailAsRead(originalEmail.messageId);
  }

  static async forwardEmail(
    originalEmail: { subject: string; content: string; sender: string },
    forwardTo: string | string[],
    additionalText?: string,
    attachments?: any[]
  ) {
    const subject = originalEmail.subject.startsWith('Fwd: ')
      ? originalEmail.subject
      : `Fwd: ${originalEmail.subject}`;

    const forwardedContent = `
${additionalText || ''}

---------- Forwarded message ---------
From: ${originalEmail.sender}
Subject: ${originalEmail.subject}

${originalEmail.content}
    `;

    await this.sendEmail(
      forwardTo,
      subject,
      forwardedContent,
      undefined,
      undefined,
      undefined,
      attachments
    );
  }
}