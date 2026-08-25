import nodemailer from 'nodemailer';

const isSmtpConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

let transporter = null;

if (isSmtpConfigured) {
  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('SMTP mail transporter initialized successfully.');
  } catch (err) {
    console.warn('Failed to initialize SMTP transporter. Falling back to console logger.', err.message);
  }
} else {
  console.log('SMTP not configured. Using console logging fallback for outbound emails.');
}

/**
 * Send an email notification
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body content
 * @param {string} text - Plain text fallback
 */
export async function sendEmail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || 'Gastos App Store <noreply@gastosstore.com>';

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        subject,
        text: text || html.replace(/<[^>]+>/g, ''),
        html,
      });
      console.log(`[Email Sent] MessageId: ${info.messageId} to: ${to}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`[Email Error] Failed to send email to ${to}:`, err.message);
      // Don't crash request if email sending fails
      return { success: false, error: err.message };
    }
  } else {
    // Console fallback
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 [EMAIL MOCK / OUTBOX]
To: ${to}
From: ${from}
Subject: ${subject}
-----------------------------------------------------
${text || html.replace(/<[^>]+>/g, '')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);
    return { success: true, mock: true };
  }
}

/**
 * Notification template: App Approved
 */
export async function sendAppApprovedEmail(developer, app) {
  const appUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/app/${app.slug}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8eaed;">
      <div style="background: #1A73E8; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px;">🏪 Gastos App Store</h1>
      </div>
      <div style="padding: 28px;">
        <h2 style="color: #202124; margin-top: 0;">Congratulations ${developer.display_name}! 🎉</h2>
        <p style="color: #5f6368; font-size: 15px; line-height: 1.6;">
          Your application <strong>"${app.name}"</strong> (v${app.current_version}) has been reviewed and <span style="color: #34A853; font-weight: bold;">APPROVED</span> by our store administration team.
        </p>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e8eaed;">
          <p style="margin: 0; color: #202124; font-weight: bold;">Your app is now live in the store!</p>
          <p style="margin: 4px 0 0 0; color: #5f6368; font-size: 13px;">Users can now discover and download your app immediately.</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}" style="background: #1A73E8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">View Live App Listing →</a>
        </div>
        <p style="color: #5f6368; font-size: 13px;">
          Thank you for publishing with Gastos App Store.<br>
          — Gastos Store Review Team
        </p>
      </div>
    </div>
  `;
  return sendEmail({
    to: developer.email,
    subject: `✅ Your app "${app.name}" is now live on Gastos App Store!`,
    html,
  });
}

/**
 * Notification template: App Rejected
 */
export async function sendAppRejectedEmail(developer, app, reason) {
  const devDashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/developer/dashboard`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e8eaed;">
      <div style="background: #EA4335; padding: 24px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 24px;">🏪 Gastos App Store</h1>
      </div>
      <div style="padding: 28px;">
        <h2 style="color: #202124; margin-top: 0;">Submission Update: ${app.name}</h2>
        <p style="color: #5f6368; font-size: 15px; line-height: 1.6;">
          Hi ${developer.display_name}, thank you for your submission. Our review team reviewed your app <strong>"${app.name}"</strong>, and unfortunately we are unable to approve it at this time.
        </p>
        <div style="background: #fce8e6; border-left: 4px solid #EA4335; padding: 16px; border-radius: 4px; margin: 20px 0;">
          <strong style="color: #c5221f;">Feedback from Reviewer:</strong>
          <p style="margin: 8px 0 0 0; color: #3c4043; font-size: 14px; white-space: pre-wrap;">${reason || 'Does not meet store requirements'}</p>
        </div>
        <p style="color: #5f6368; font-size: 14px; line-height: 1.6;">
          You are welcome to update your app, fix the indicated issues, and submit an updated version for re-review from your developer dashboard.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${devDashboardUrl}" style="background: #1A73E8; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">Open Developer Dashboard</a>
        </div>
      </div>
    </div>
  `;
  return sendEmail({
    to: developer.email,
    subject: `Submission Feedback for "${app.name}" — Gastos App Store`,
    html,
  });
}
