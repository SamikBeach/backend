import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/User';
import { CreateUserDto, VerifyEmailDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import {
  TokenPayload,
  AuthTokens,
  EmailVerification,
} from './types/auth.types';

// 구글 로그인을 위한 User 타입 확장
interface UserWithGoogle extends User {
  googleId?: string;
}

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  // 이메일 인증 코드 저장소
  private readonly verificationCodes: Map<string, EmailVerification> =
    new Map();

  // 상수 정의
  private readonly VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10분
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly ACCESS_TOKEN_EXPIRY = '1h';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );
  }

  /**
   * 이메일/비밀번호로 사용자 검증
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('존재하지 않는 이메일입니다.');
    }

    if (!user.verified) {
      throw new UnauthorizedException('이메일 인증이 필요합니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    const { password: _, ...result } = user;
    return result;
  }

  /**
   * JWT 토큰 생성
   */
  private generateTokens(user: User): AuthTokens {
    const payload: TokenPayload = { email: user.email, sub: user.id };
    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
      }),
      refreshToken: this.jwtService.sign(payload, {
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
      }),
    };
  }

  /**
   * 일반 로그인
   */
  async login(user: User): Promise<AuthTokens> {
    return this.generateTokens(user);
  }

  /**
   * 구글 로그인
   */
  async googleLogin(code: string): Promise<AuthTokens> {
    // 구글 토큰 검증
    const { tokens } = await this.googleClient.getToken(code);
    const ticket = await this.googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('구글 인증에 실패했습니다.');
    }

    // 사용자 조회 또는 생성
    let user = (await this.userRepository.findOne({
      where: { email: payload.email },
    })) as UserWithGoogle;

    if (user && !user.googleId) {
      throw new UnauthorizedException(
        '이미 이메일/비밀번호로 가입된 계정입니다.',
      );
    }

    if (!user) {
      user = await this.userRepository.save({
        email: payload.email,
        nickname: payload.name,
        googleId: payload.sub,
        verified: true,
      } as Partial<UserWithGoogle>);
    }

    return this.generateTokens(user);
  }

  /**
   * 이메일 인증 코드 생성 및 발송
   */
  async sendVerificationEmail(email: string): Promise<{ message: string }> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY);

    this.verificationCodes.set(email, { code, expires });

    try {
      await this.mailerService.sendMail({
        to: email,
        from: this.configService.get<string>('MAIL_USER'),
        subject: '[삼익비치] 이메일 인증 안내',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; line-height: 1.6; color: #333333; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">삼익비치 이메일 인증 안내</h1>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 30px; margin-bottom: 30px;">
              <p style="font-size: 16px; margin: 0 0 20px 0;">안녕하세요.<br/>삼익비치 서비스를 이용해 주셔서 감사합니다.</p>
              <p style="font-size: 16px; margin: 0 0 15px 0;">아래의 인증번호를 입력해 주세요.</p>
              <div style="background: #ffffff; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                <h2 style="font-size: 32px; font-weight: 700; color: #4A90E2; margin: 0; letter-spacing: 4px;">${code}</h2>
              </div>
              <p style="font-size: 14px; color: #666666; margin: 0;">본 인증번호는 발급 시점으로부터 10분간 유효합니다.</p>
            </div>
          </div>
        `,
      });

      return { message: '인증 코드가 전송되었습니다.' };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('이메일 전송에 실패했습니다.');
    }
  }

  /**
   * 이메일 인증 코드 검증
   */
  async verifyEmail(
    verifyEmailDto: VerifyEmailDto,
  ): Promise<{ verified: boolean }> {
    const verification = this.verificationCodes.get(verifyEmailDto.email);

    if (!verification || verification.code !== verifyEmailDto.code) {
      throw new UnauthorizedException('잘못된 인증 코드입니다.');
    }

    if (verification.expires < new Date()) {
      throw new UnauthorizedException('만료된 인증 코드입니다.');
    }

    this.verificationCodes.delete(verifyEmailDto.email);
    return { verified: true };
  }

  /**
   * 회원가입
   */
  async register(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'password'>> {
    // 이메일 중복 확인
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('이미 존재하는 이메일입니다.');
    }

    // 이메일 인증 확인
    const verification = await this.verifyEmail({
      email: createUserDto.email,
      code: createUserDto.verificationCode,
    });

    if (!verification.verified) {
      throw new UnauthorizedException('이메일 인증이 필요합니다.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.userRepository.save({
      email: createUserDto.email,
      nickname: createUserDto.name,
      password: hashedPassword,
      verified: true,
    } as Partial<User>);

    const { password: _, ...result } = user;
    return result;
  }
}
