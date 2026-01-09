import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { jwtConstants } from 'src/common/constants/token.constants';
import { randomUUID } from 'crypto';
import { Role } from 'src/common/decorators/roles.decorator';

interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: Role;
  jti: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, pass: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.usersService.findOne(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(pass, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, refreshToken } = await this.generateTokenPair(user);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: jwtConstants.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.usersService.findOne(payload.email);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // NOTE: la vraie rotation se fera avec la blacklist/Redis (à implémenter plus tard)
    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokenPair(user);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  private async generateTokenPair(user: {
    id: string;
    email: string;
    fullName: string;
    role?: Role;
  }): Promise<{ accessToken: string; refreshToken: string }> {
    const basePayload: Omit<JwtPayload, 'jti' | 'type'> = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role ?? 'USER',
    };

    const accessPayload: JwtPayload = {
      ...basePayload,
      jti: randomUUID(),
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      ...basePayload,
      jti: randomUUID(),
      type: 'refresh',
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: jwtConstants.accessSecret,
      expiresIn: jwtConstants.accessExpiresIn,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: jwtConstants.refreshSecret,
      expiresIn: jwtConstants.refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }
}
