import { SetMetadata } from '@nestjs/common';

export const jwtConstants = {
  accessSecret: 'ACCESS_TOKEN_SECRET_CHANGE_ME',
  refreshSecret: 'REFRESH_TOKEN_SECRET_CHANGE_ME',
  accessExpiresInSeconds: 15 * 60,
  refreshExpiresInSeconds: 7 * 24 * 60 * 60,
};

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
