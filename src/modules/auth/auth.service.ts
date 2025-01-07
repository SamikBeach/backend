import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/User';
import { CreateUserDto, LoginDto, VerifyEmailDto } from './dto/create-user.dto';
import * as nodemailer from 'nodemailer';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
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

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: '이메일 인증 코드',
      text: `인증 코드: ${code}`,
      html: `
        <h1>이메일 인증 코드</h1>
        <p>아래의 인증 코드를 입력해주세요:</p>
        <h2 style="color: #4A90E2;">${code}</h2>
        <p>이 코드는 10분 후에 만료됩니다.</p>
      `,
    });

    return { message: '인증 코드가 전송되었습니다.' };
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
