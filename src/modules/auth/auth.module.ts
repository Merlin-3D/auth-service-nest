import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/common/constants/token.constants';

@Module({
  controllers: [AuthController],
  imports: [
    UsersModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.accessSecret,
      signOptions: { expiresIn: Number(jwtConstants.accessExpiresIn) },
    }),
  ],
})
export class AuthModule {}
