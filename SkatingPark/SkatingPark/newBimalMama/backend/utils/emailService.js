import nodemailer from 'nodemailer';

const isEmailConfigured = () => {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM
  );
};

const buildTransporter = () => {
  if (!isEmailConfigured()) {
    console.warn('✉️  SMTP settings not provided. Emails will be logged to console.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

const transporter = buildTransporter();

export const sendPasswordResetCode = async ({ to, name, code }) => {
  const subject = 'Your Skating Park password reset code';
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Hi ${name || 'there'},</h2>
      <p>We received a request to reset the password for your Skating Park account.</p>
      <p>Please use the verification code below to complete your password reset:</p>
      <p style="font-size: 26px; font-weight: bold; letter-spacing: 4px; text-align:center; margin: 24px 0;">${code}</p>
      <p>This code will expire in 15 minutes. If you didn't request this, you can ignore this email.</p>
      <p>Thanks,<br/>Skating Park Team</p>
    </div>
  `;

  if (!transporter) {
    console.log('📧 Password reset code (email disabled):', { to, name, code });
    return { sent: false, logged: true };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    html
  });

  return { sent: true };
};

