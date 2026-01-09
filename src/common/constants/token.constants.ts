import { SetMetadata } from '@nestjs/common';

export const jwtConstants = {
  secret: 'EmNctohgsskPBFvnbi0yle9JQhYenSAbHQ7pz8IiAG8',
};
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
