import nodemailer from 'nodemailer';
import { env } from '../config/env';

type SupportNotificationInput = {
  ticketId: number;
  userName: string;
  userEmail: string;
  category: string;
  subject: string;
  message: string;
  appVersion?: string | null;
  platform?: string | null;
  deviceModel?: string | null;
  osVersion?: string | null;
  attachmentBase64?: string | null;
  attachmentMimeType?: string | null;
  attachmentFileName?: string | null;
  createdAt: Date;
};

function getMailConfig() {
  if (
    !env.SMTP_HOST ||
    !env.SMTP_PORT ||
    !env.SMTP_USER ||
    !env.SMTP_PASS ||
    !env.SUPPORT_EMAIL
  ) {
    return null;
  }

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM ?? env.SMTP_USER,
    supportEmail: env.SUPPORT_EMAIL,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildTextContent(data: SupportNotificationInput) {
  const hasAttachment = Boolean(data.attachmentBase64);

  return [
    `Novo chamado de suporte - Ticket #${data.ticketId}`,
    '',
    `Usuário: ${data.userName}`,
    `E-mail do usuário: ${data.userEmail}`,
    `Categoria: ${data.category}`,
    `Assunto: ${data.subject}`,
    `Criado em: ${data.createdAt.toISOString()}`,
    '',
    'Mensagem:',
    data.message,
    '',
    'Informações técnicas:',
    `- App version: ${data.appVersion ?? 'Não informado'}`,
    `- Plataforma: ${data.platform ?? 'Não informado'}`,
    `- Modelo do dispositivo: ${data.deviceModel ?? 'Não informado'}`,
    `- Versão do SO: ${data.osVersion ?? 'Não informado'}`,
    `- Anexo de imagem: ${
      hasAttachment
        ? `${data.attachmentFileName ?? 'arquivo-imagem'} (${data.attachmentMimeType ?? 'tipo não informado'})`
        : 'Não enviado'
    }`,
  ].join('\n');
}

function buildHtmlContent(data: SupportNotificationInput) {
  const hasAttachment = Boolean(data.attachmentBase64);

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 8px;">Novo chamado de suporte</h2>
      <p style="margin-top: 0;"><strong>Ticket #${data.ticketId}</strong></p>

      <div style="margin: 16px 0;">
        <p><strong>Usuário:</strong> ${escapeHtml(data.userName)}</p>
        <p><strong>E-mail do usuário:</strong> ${escapeHtml(data.userEmail)}</p>
        <p><strong>Categoria:</strong> ${escapeHtml(data.category)}</p>
        <p><strong>Assunto:</strong> ${escapeHtml(data.subject)}</p>
        <p><strong>Criado em:</strong> ${data.createdAt.toISOString()}</p>
      </div>

      <div style="margin: 16px 0;">
        <h3 style="margin-bottom: 8px;">Mensagem</h3>
        <div style="padding: 12px; border-radius: 8px; background: #F3F4F6; white-space: pre-wrap;">
          ${escapeHtml(data.message)}
        </div>
      </div>

      <div style="margin: 16px 0;">
        <h3 style="margin-bottom: 8px;">Informações técnicas</h3>
        <ul>
          <li><strong>App version:</strong> ${escapeHtml(data.appVersion ?? 'Não informado')}</li>
          <li><strong>Plataforma:</strong> ${escapeHtml(data.platform ?? 'Não informado')}</li>
          <li><strong>Modelo do dispositivo:</strong> ${escapeHtml(data.deviceModel ?? 'Não informado')}</li>
          <li><strong>Versão do SO:</strong> ${escapeHtml(data.osVersion ?? 'Não informado')}</li>
          <li><strong>Anexo de imagem:</strong> ${
            hasAttachment
              ? escapeHtml(
                  `${data.attachmentFileName ?? 'arquivo-imagem'} (${data.attachmentMimeType ?? 'tipo não informado'})`
                )
              : 'Não enviado'
          }</li>
        </ul>
      </div>
    </div>
  `;
}

class SupportNotificationService {
  private createTransporter(
    config: NonNullable<ReturnType<typeof getMailConfig>>
  ) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  async sendNewTicketNotification(data: SupportNotificationInput) {
    const mailConfig = getMailConfig();

    if (!mailConfig) {
      console.warn(
        '[supportNotificationService] SMTP/SUPPORT_EMAIL não configurados. E-mail não enviado.'
      );

      return {
        sent: false,
        skipped: true,
        reason: 'mail_not_configured',
      };
    }

    const transporter = this.createTransporter(mailConfig);

    await transporter.verify();

    const attachments = data.attachmentBase64
      ? [
          {
            filename:
              data.attachmentFileName || `support-ticket-${data.ticketId}.jpg`,
            content: data.attachmentBase64,
            encoding: 'base64' as const,
            contentType: data.attachmentMimeType || 'image/jpeg',
          },
        ]
      : [];

    await transporter.sendMail({
      from: mailConfig.from,
      to: mailConfig.supportEmail,
      replyTo: data.userEmail,
      subject: `[${env.APP_NAME}][Suporte] #${data.ticketId} - ${data.subject}`,
      text: buildTextContent(data),
      html: buildHtmlContent(data),
      attachments,
    });

    return {
      sent: true,
      skipped: false,
    };
  }
}

export default new SupportNotificationService();
