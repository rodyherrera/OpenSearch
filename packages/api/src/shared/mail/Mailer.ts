import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '@/shared/config';
import { logger } from '@/core/utils/Logger';

let transporter: Transporter | null = null;

const getTransport = (): Transporter | null => {
    if(!config.mail.smtpHost) return null;
    if(transporter) return transporter;
    transporter = nodemailer.createTransport({
        host: config.mail.smtpHost,
        port: config.mail.smtpPort,
        secure: config.mail.smtpSecure,
        auth: config.mail.smtpUser ? { user: config.mail.smtpUser, pass: config.mail.smtpPass } : undefined
    });
    return transporter;
};

const send = async (to: string, subject: string, text: string, html: string): Promise<void> => {
    const transport = getTransport();
    if(!transport){
        logger.info(`mail (not sent, SMTP unset) -> ${to}: ${subject} | ${text}`, { scope: 'mail' });
        return;
    }
    try{
        await transport.sendMail({ from: config.mail.from, to, subject, text, html });
        logger.info(`mail sent -> ${to}: ${subject}`, { scope: 'mail' });
    }catch(error){
        logger.error('mail send failed', error as Error, { scope: 'mail' });
    }
};

export const sendPasswordReset = async (to: string, link: string): Promise<void> => {
    const subject = 'Reset your Crawlm password';
    const text = `Reset your password using this link (valid for 1 hour): ${link}`;
    const html = `<p>Reset your Crawlm password using the link below (valid for 1 hour):</p>`
        + `<p><a href="${link}">${link}</a></p>`
        + `<p>If you didn't request this, you can safely ignore this email.</p>`;
    await send(to, subject, text, html);
};
