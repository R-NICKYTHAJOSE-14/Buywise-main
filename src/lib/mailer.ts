import nodemailer from 'nodemailer'

export class MailNotConfiguredError extends Error {}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.EMAIL_FROM)
}

export async function sendOtpEmail(to: string, code: string) {
  if (!isMailConfigured()) throw new MailNotConfiguredError('SMTP is not configured')
  const port = Number(process.env.SMTP_PORT || 587)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Your Buywise sign-in code: ${code}`,
    text: `Your Buywise sign-in code is ${code}.\n\nIt expires in 5 minutes and can be used once. If you didn't request it, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:auto">
      <h2 style="color:#059669">Buywise</h2>
      <p>Your sign-in code is:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:16px 0">${code}</p>
      <p style="color:#666;font-size:13px">It expires in 5 minutes and can be used once. If you didn't request it, you can safely ignore this email.</p>
    </div>`,
  })
}
