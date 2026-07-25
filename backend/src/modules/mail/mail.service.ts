import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Reuses the same Gmail-SMTP nodemailer pattern already proven working in
 * `AuthService.sendReportToEmail` (same `MAIL_USER`/`MAIL_PASS` env vars),
 * factored into a small reusable service so account-recovery emails don't
 * duplicate transport setup. `sendReportToEmail` itself is left untouched â€”
 * this is an additive sibling, not a migration of existing working code.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  async sendPasswordResetEmail(to: string, fullname: string, resetUrl: string) {
    await this.send(
      to,
      'Äáº·t láº¡i máº­t kháº©u BeaconVie',
      `
        <h2>Xin chÃ o ${escapeHtml(fullname || 'báº¡n')},</h2>
        <p>ChÃºng tÃ´i nháº­n Ä‘Æ°á»£c yÃªu cáº§u Ä‘áº·t láº¡i máº­t kháº©u cho tÃ i khoáº£n nÃ y.</p>
        <p><a href="${resetUrl}">Nháº¥n vÃ o Ä‘Ã¢y Ä‘á»ƒ Ä‘áº·t láº¡i máº­t kháº©u</a></p>
        <p>LiÃªn káº¿t cÃ³ hiá»‡u lá»±c trong 30 phÃºt vÃ  chá»‰ dÃ¹ng Ä‘Æ°á»£c má»™t láº§n.</p>
        <p>Náº¿u báº¡n khÃ´ng yÃªu cáº§u Ä‘áº·t láº¡i máº­t kháº©u, hÃ£y bá» qua email nÃ y â€” máº­t kháº©u hiá»‡n táº¡i cá»§a báº¡n sáº½ khÃ´ng thay Ä‘á»•i.</p>
      `,
    );
  }

  async sendVerificationEmail(to: string, fullname: string, verifyUrl: string) {
    await this.send(
      to,
      'XÃ¡c minh email BeaconVie',
      `
        <h2>Xin chÃ o ${escapeHtml(fullname || 'báº¡n')},</h2>
        <p>Vui lÃ²ng xÃ¡c minh Ä‘á»‹a chá»‰ email cá»§a báº¡n Ä‘á»ƒ hoÃ n táº¥t Ä‘Äƒng kÃ½.</p>
        <p><a href="${verifyUrl}">Nháº¥n vÃ o Ä‘Ã¢y Ä‘á»ƒ xÃ¡c minh email</a></p>
        <p>LiÃªn káº¿t cÃ³ hiá»‡u lá»±c trong 24 giá».</p>
      `,
    );
  }

  private async send(to: string, subject: string, html: string) {
    await this.transporter.sendMail({
      from: `"BeaconVie" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
  }
}
