export interface MailerConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  secure: boolean;
}

function loadConfig(): MailerConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "noreply@mofe.ir";

  if (!host || !user || !pass) {
    return null;
  }

  return { host, port, user, pass, from, secure: port === 465 };
}

export async function sendMail(to: string, subject: string, html: string) {
  const config = loadConfig();

  if (!config) {
    console.log("[mailer] No SMTP configured. Would send email:", { to, subject });
    console.log("[mailer] HTML body:", html.substring(0, 200) + "...");
    return;
  }

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.default.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
  });
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const subject = "بازنشانی رمز عبور - mofé";
  const html = `
    <div style="direction:rtl;font-family:Tahoma,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f5f0e6;border-radius:16px;">
      <h1 style="font-size:18px;color:#111;margin:0 0 16px;">بازنشانی رمز عبور</h1>
      <p style="color:#5f5a52;line-height:1.8;">برای بازنشانی رمز عبور خود، روی لینک زیر کلیک کنید:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#111;color:#f5f0e6;text-decoration:none;border-radius:12px;margin:16px 0;">بازنشانی رمز عبور</a>
      <p style="color:#5f5a52;font-size:13px;">این لینک تا ۱ ساعت معتبر است.</p>
    </div>
  `;

  await sendMail(email, subject, html);
}
