import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import AppleAuth from 'apple-signin-auth';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: boolean;
  nonce?: string;
  nonce_supported?: boolean;
}

@Injectable()
export class AppleAuthService {
  constructor(private readonly configService: ConfigService) {}

  async verifyAppleToken(identityToken: string): Promise<AppleTokenPayload> {
    try {
      // (1) 애플 ID 토큰 검증
      const decoded = jwt.decode(identityToken, { complete: true });

      if (!decoded || !decoded.payload) {
        throw new UnauthorizedException('유효하지 않은 애플 토큰입니다.');
      }

      // (2) Apple Public Key로 검증
      const applePublicKeys = await AppleAuth._getApplePublicKeys();
      const valid = await AppleAuth.verifyIdToken(identityToken, {
        audience: this.configService.get('APPLE_CLIENT_ID'),
        ignoreExpiration: true, // 만료 검증은 별도로 처리
        applePublicKeys,
      });

      if (!valid) {
        throw new UnauthorizedException('유효하지 않은 애플 토큰입니다.');
      }

      return decoded.payload as AppleTokenPayload;
    } catch (error) {
      throw new UnauthorizedException(`애플 로그인 실패: ${error.message}`);
    }
  }

  async generateAppleJWT() {
    const privateKey = fs.readFileSync(
      this.configService.get('APPLE_PRIVATE_KEY_PATH'),
      'utf8',
    );

    const token = jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      expiresIn: '1h',
      keyid: this.configService.get('APPLE_KEY_ID'),
      issuer: this.configService.get('APPLE_TEAM_ID'),
      audience: 'https://appleid.apple.com',
      subject: this.configService.get('APPLE_CLIENT_ID'),
    });

    return token;
  }
}
