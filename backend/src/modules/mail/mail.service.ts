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

function renderEmailHtml(content: string): string {
  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="font-family: Arial, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #111827;">
    ${content}
  </body>
</html>`;
}

/**
 * Reuses the same Gmail-SMTP nodemailer pattern already proven working in
 * `AuthService.sendReportToEmail` (same `MAIL_USER`/`MAIL_PASS` env vars),
 * factored into a small reusable service so account-recovery emails don't
 * duplicate transport setup. `sendReportToEmail` itself is left untouched —
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
      'Đặt lại mật khẩu BeaconVie',
      renderEmailHtml(`
        <h2>Xin chào ${escapeHtml(fullname || 'bạn')},</h2>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản này.</p>
        <p><a href="${resetUrl}">Nhấn vào đây để đặt lại mật khẩu</a></p>
        <p>Liên kết có hiệu lực trong 30 phút và chỉ dùng được một lần.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này — mật khẩu hiện tại của bạn sẽ không thay đổi.</p>
      `),
    );
  }

  async sendVerificationEmail(to: string, fullname: string, verifyUrl: string) {
    await this.send(
      to,
      'Xác minh email BeaconVie',
      renderEmailHtml(`
        <h2>Xin chào ${escapeHtml(fullname || 'bạn')},</h2>
        <p>Vui lòng xác minh địa chỉ email của bạn để hoàn tất đăng ký.</p>
        <p><a href="${verifyUrl}">Nhấn vào đây để xác minh email</a></p>
        <p>Liên kết có hiệu lực trong 24 giờ.</p>
      `),
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
