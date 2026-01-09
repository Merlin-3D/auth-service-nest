import { SetMetadata } from '@nestjs/common';

// TODO: déplace ces valeurs dans des variables d'environnement (.env)
export const jwtConstants = {
  accessSecret: 'ACCESS_TOKEN_SECRET_CHANGE_ME',
  refreshSecret: 'REFRESH_TOKEN_SECRET_CHANGE_ME',
  accessExpiresIn: '15m',
  refreshExpiresIn: '7d',
};

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
