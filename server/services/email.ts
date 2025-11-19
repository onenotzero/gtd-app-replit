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

      const searchCriteria = ['ALL'];
      const fetchOptions = {
        bodies: [''],
        struct: true,
        markSeen: false
      };

      const messages = await connection.search(searchCriteria, fetchOptions);
      console.log(`Found ${messages.length} messages`);
      
      // Limit to most recent 50 emails
      const recentMessages = messages.slice(-50).reverse();

      const emails: InsertEmail[] = [];

      for (const message of recentMessages) {
        try {
          const allParts = message.parts.filter((part: any) => part.which === '');
          const bodyPart = allParts.length > 0 ? allParts[0] : message.parts[0];
          
          if (bodyPart && bodyPart.body) {
            const parsed = await simpleParser(bodyPart.body);

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