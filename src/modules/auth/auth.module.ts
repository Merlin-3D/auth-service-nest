import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from 'src/common/constants/token.constants';
import { RedisModule } from 'src/infrastructure/redis/redis.module';

@Module({
  controllers: [AuthController],
  imports: [
    UsersModule,
    RedisModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.accessSecret,
      signOptions: { expiresIn: jwtConstants.accessExpiresInSeconds },
    }),
  ],
})
export class AuthModule {}
