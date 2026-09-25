import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  environment: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'SmartPOS',
  url: process.env.APP_URL || 'http://localhost:3001',
  sentryDsn: process.env.SENTRY_DSN || '',
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL || '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'super-secret-key-change-in-production',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'super-refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
    issuer: process.env.JWT_ISSUER || 'smartpos',
  },
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAME_SITE || 'lax') as 'lax' | 'strict' | 'none',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE || '604800000', 10),
  },
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760', 10),
    allowedMimeTypes: (
      process.env.UPLOAD_ALLOWED_MIMES ||
      'image/jpeg,image/png,image/webp,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ).split(','),
    dest: process.env.UPLOAD_DEST || './uploads',
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
  },
}));