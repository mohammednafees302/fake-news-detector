import nodemailer from 'nodemailer';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const transporter = config.emailProvider === 'nodemailer' ? nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: config.gmailUser,
        pass: config.gmailPass,
    },
}) : null;

function buildOtpHtml({ otp, email }) {
    return `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
            <h2>VerifyNews password reset</h2>
            <p>A password reset code was requested for <strong>${email}</strong>.</p>
            <p>Use this one-time code to continue:</p>
            <div style="font-size:32px;font-weight:700;letter-spacing:6px;margin:24px 0;color:#4f46e5">${otp}</div>
            <p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p>
        </div>
    `;
}

async function sendWithResend({ to, subject, html }) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: config.emailFrom,
            to,
            subject,
            html,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Resend delivery failed with status ${response.status}: ${body}`);
    }
}

async function sendWithNodemailer({ to, subject, html }) {
    if (!transporter) throw new Error('Nodemailer transporter not configured');
    await transporter.sendMail({
        from: config.emailFrom || config.gmailUser,
        to,
        subject,
        html,
    });
}

export async function sendPasswordResetOtp({ email, otp }) {
    const subject = 'Your VerifyNews password reset code';
    const html = buildOtpHtml({ otp, email });
    await sendEmail({ to: email, subject, html });
}

export async function sendUserOtp({ email, otp }) {
    const subject = 'Your VerifyNews verification code';
    const html = buildOtpHtml({ otp, email }); // Using same template for now
    await sendEmail({ to: email, subject, html });
}

async function sendEmail({ to, subject, html }) {
    if (config.emailProvider === 'console') {
        logger.info('otp_email_console_fallback', { email: to, subject });
        console.log(`--- EMAIL CONSOLE ---\nTo: ${to}\nSubject: ${subject}\nHTML: ${html}\n-------------------`);
        return;
    }

    if (config.emailProvider === 'resend') {
        await sendWithResend({ to, subject, html });
        logger.info('otp_email_sent', { provider: 'resend', email: to });
        return;
    }

    if (config.emailProvider === 'nodemailer') {
        await sendWithNodemailer({ to, subject, html });
        logger.info('otp_email_sent', { provider: 'nodemailer', email: to });
        return;
    }

    throw new Error(`Unsupported EMAIL_PROVIDER: ${config.emailProvider}`);
}
