const nodemailer = require('nodemailer');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getEmailDeliveryStatus(customTransport) {
  if (customTransport && typeof customTransport.sendMail === 'function') {
    return { configured: true, provider: 'custom-transport', missingEnv: [] };
  }
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
    return { configured: true, provider: 'resend', missingEnv: [] };
  }
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.trim()) {
    return { configured: true, provider: 'sendgrid', missingEnv: [] };
  }
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_HOST.trim() &&
    process.env.SMTP_USER &&
    process.env.SMTP_USER.trim() &&
    process.env.SMTP_PASS &&
    process.env.SMTP_PASS.trim()
  ) {
    return { configured: true, provider: 'smtp', missingEnv: [] };
  }
  return {
    configured: false,
    provider: 'unconfigured',
    missingEnv: ['RESEND_API_KEY or SENDGRID_API_KEY or (SMTP_HOST, SMTP_USER, SMTP_PASS)'],
  };
}

function buildVerificationEmailTemplate({ fullName, otpCode, expiresMinutes = 5 }) {
  const safeName = escapeHtml(fullName || 'TOLKFLOW Member');
  const safeOtp = escapeHtml(otpCode);
  const year = new Date().getFullYear();

  const subject = 'Verify Your Tolkflow Account — Security Code Inside';

  const text = [
    `TOLKFLOW — Connect Beyond Conversations`,
    ``,
    `Welcome to TOLKFLOW, ${fullName || 'Member'}!`,
    ``,
    `We received a request to verify your Tolkflow account.`,
    `Your 6-digit verification code is: ${otpCode}`,
    ``,
    `Expiration: This verification code expires in ${expiresMinutes} minutes and can only be used once.`,
    ``,
    `Security Warning: Never share this verification code with anyone, including TOLKFLOW staff. If you did not create an account on TOLKFLOW, please ignore this email or contact security@tolkflow.io.`,
    ``,
    `© ${year} TOLKFLOW Global Communication Platform`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#eff6ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#eff6ff;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dbeafe;box-shadow:0 12px 32px rgba(15,23,42,0.08);">
          <!-- Header with Tolkflow Logo -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 55%,#0284c7 100%);padding:28px 32px;text-align:center;">
              <div style="display:inline-block;vertical-align:middle;">
                <svg width="44" height="44" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="TOLKFLOW Logo" style="display:block;margin:0 auto 10px auto;">
                  <defs>
                    <linearGradient id="tfGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#38bdf8" />
                      <stop offset="100%" stop-color="#2563eb" />
                    </linearGradient>
                  </defs>
                  <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#tfGrad)" />
                  <path d="M14 17h20v4h-8v13h-4V21h-8v-4z" fill="#ffffff" />
                  <circle cx="34" cy="31" r="3.5" fill="#bae6fd" />
                </svg>
                <div style="font-size:22px;font-weight:800;letter-spacing:2px;color:#ffffff;">TOLKFLOW</div>
                <div style="font-size:12px;color:#bae6fd;margin-top:4px;letter-spacing:0.4px;">Connect Beyond Conversations</div>
              </div>
            </td>
          </tr>

          <!-- Welcome & Verification Code -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;font-weight:700;color:#0f172a;">Verify Your Tolkflow Account</h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
                Welcome to TOLKFLOW, <strong>${safeName}</strong>! Thank you for joining our global communication platform. Enter the 6-digit verification code below to activate your account:
              </p>

              <!-- 6-Digit Verification Code Box -->
              <div style="margin:24px 0;padding:22px;background-color:#f0f9ff;border:2px dashed #38bdf8;border-radius:16px;text-align:center;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.4px;color:#0369a1;margin-bottom:8px;">
                  Your Verification Code
                </div>
                <div style="font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:36px;font-weight:800;letter-spacing:10px;color:#1d4ed8;">
                  ${safeOtp}
                </div>
                <div style="margin-top:10px;font-size:13px;font-weight:600;color:#0284c7;">
                  Expires in ${expiresMinutes} minutes &bull; Single-use only
                </div>
              </div>

              <!-- Security Warning -->
              <div style="margin:20px 0 0 0;padding:14px 16px;background-color:#fef2f2;border-left:4px solid #ef4444;border-radius:10px;">
                <div style="font-size:13px;font-weight:700;color:#991b1b;margin-bottom:4px;">Security Warning</div>
                <div style="font-size:13px;line-height:1.5;color:#7f1d1d;">
                  Never share this verification code with anyone. TOLKFLOW support will never ask you for your password or OTP code. If you did not initiate this request, you can safely ignore this message.
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#64748b;">
              &copy; ${year} TOLKFLOW Global Communication Platform &bull; Automated Security Notification
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

async function sendVerificationEmail({ to, fullName, otpCode, expiresMinutes = 5, customTransport }) {
  const fromAddress =
    process.env.EMAIL_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'TOLKFLOW Security <no-reply@tolkflow.io>';

  const { subject, text, html } = buildVerificationEmailTemplate({
    fullName,
    otpCode,
    expiresMinutes,
  });

  // 1. Programmatic test transport (used strictly by automated integration tests)
  if (customTransport && typeof customTransport.sendMail === 'function') {
    const info = await customTransport.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    return { provider: 'custom-transport', messageId: info?.messageId || `msg_${Date.now()}` };
  }

  // 2. Resend API
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
        text,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message || `Resend delivery failed (${response.status})`);
    }
    return { provider: 'resend', messageId: payload?.id || `resend_${Date.now()}` };
  }

  // 3. SendGrid API
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.trim()) {
    const emailMatch = fromAddress.match(/<([^>]+)>/);
    const fromEmail = emailMatch ? emailMatch[1] : fromAddress;
    const fromName = emailMatch ? fromAddress.replace(/<[^>]+>/, '').trim() : 'TOLKFLOW Security';

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to, name: fullName || to }] }],
        from: { email: fromEmail, name: fromName || 'TOLKFLOW Security' },
        subject,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`SendGrid delivery failed (${response.status}): ${errText}`);
    }
    return { provider: 'sendgrid', messageId: response.headers.get('x-message-id') || `sg_${Date.now()}` };
  }

  // 4. Standard SMTP via Nodemailer
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_HOST.trim() &&
    process.env.SMTP_USER &&
    process.env.SMTP_USER.trim() &&
    process.env.SMTP_PASS &&
    process.env.SMTP_PASS.trim()
  ) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASS.trim(),
      },
    });
    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
    });
    return { provider: 'smtp', messageId: info?.messageId || `smtp_${Date.now()}` };
  }

  const err = new Error(
    'Real email delivery is not configured. Set RESEND_API_KEY, SENDGRID_API_KEY, or SMTP_HOST/SMTP_USER/SMTP_PASS environment variables.'
  );
  err.code = 'EMAIL_SERVICE_UNCONFIGURED';
  throw err;
}

module.exports = {
  buildVerificationEmailTemplate,
  sendVerificationEmail,
  getEmailDeliveryStatus,
};
