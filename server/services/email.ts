import * as ImapSimple from 'imap-simple';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';
import { type InsertEmail, EmailFolder } from '@shared/schema';
import { storage } from '../storage';

// Email configuration
const config = {
  imap: {
    user: process.env.EMAIL_ADDRESS?.trim(),
    password: process.env.EMAIL_PASSWORD?.trim(),
    host: process.env.IMAP_HOST?.trim(),
    port: parseInt(process.env.IMAP_PORT || '993'),
    tls: true,
    tlsOptions: { rejectUnauthorized: false }
  }
};

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
  static async fetchEmails(): Promise<InsertEmail[]> {
    try {
      console.log('Connecting to email server...');
      console.log('IMAP Config:', {
        host: config.imap.host,
        port: config.imap.port,
        user: config.imap.user,
      });

      const connection = await ImapSimple.connect(config);
      console.log('Connected to email server');

      await connection.openBox('INBOX');
      console.log('Opened INBOX');

      const searchCriteria = ['UNSEEN'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', 'FLAGS'],
        markSeen: false
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      console.log(`Found ${messages.length} unread messages`);

      const emails: InsertEmail[] = [];

      for (const message of messages) {
        const headerPart = message.parts.find(part => part.which === 'HEADER');
        const textPart = message.parts.find(part => part.which === 'TEXT');

        if (headerPart && textPart) {
          const parsed = await simpleParser(textPart.body);

          const email: InsertEmail = {
            messageId: message.attributes.uid.toString(),
            subject: parsed.subject || 'No Subject',
            sender: parsed.from?.text || 'Unknown Sender',
            recipients: parsed.to?.text ? [parsed.to.text] : [],
            cc: parsed.cc?.text ? [parsed.cc.text] : [],
            bcc: parsed.bcc?.text ? [parsed.bcc.text] : [],
            content: parsed.text || '',
            htmlContent: parsed.html || null,
            folder: EmailFolder.INBOX,
            processed: false,
            flags: message.attributes.flags,
            receivedAt: parsed.date || new Date(),
            attachments: parsed.attachments || []
          };

          emails.push(email);
          await storage.createEmail(email);
        }
      }

      connection.end();
      return emails;
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  static async sendEmail(to: string, subject: string, text: string, html?: string) {
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_ADDRESS,
        to,
        subject,
        text,
        html
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  static async markEmailAsRead(messageId: string) {
    try {
      const connection = await ImapSimple.connect(config);
      await connection.openBox('INBOX');

      const searchCriteria = ['ALL'];
      const fetchOptions = { bodies: ['HEADER'] };
      const messages = await connection.search(searchCriteria, fetchOptions);

      const message = messages.find(msg => msg.attributes.uid.toString() === messageId);
      if (message) {
        await connection.addFlags(message.attributes.uid, ['\\Seen']);
      }

      connection.end();
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw error;
    }
  }
}