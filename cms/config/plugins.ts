import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
];

const deniedTypes = [
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        httpOnly: true,
      },
    },
  },
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', '127.0.0.1'),
        port: env.int('SMTP_PORT', 1025),
        secure: env.bool('SMTP_SECURE', false), // true pour le port 465
        requireTLS: env.bool('SMTP_REQUIRE_TLS', false), // true pour le port 587 en production
        ...(env('SMTP_USERNAME') ? { auth: { user: env('SMTP_USERNAME'), pass: env('SMTP_PASSWORD') } } : {}),
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      },
      settings: {
        defaultFrom: env('SMTP_FROM', 'Monétique Tunisie <no-reply@monetiquetunisie.com>'),
        defaultReplyTo: env('SMTP_REPLY_TO', 'contact@monetiquetunisie.com'),
      },
    },
  },
  upload: {
    config: {
      sizeLimit: 20 * 1024 * 1024, // 20 Mo par fichier
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes,
      },
    },
  },
});

export default config;
