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
import {
  CompleteRegistrationDto,
  InitiateRegistrationDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { TokenPayload, AuthResponse } from './types/auth.types';

// 구글 로그인을 위한 User 타입 확장

@Injectable()
export class AuthService {
  // 이메일 인증 코드 저장소
  private readonly verificationCodes: Map<
    string,
    {
      code: string;
      expires: Date;
      type: 'signup' | 'password-reset';
      userData?: any;
    }
  > = new Map();

  // 상수 정의
  private readonly VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10분
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly ACCESS_TOKEN_EXPIRY = '1h';
  private readonly PASSWORD_RESET_TOKEN_EXPIRY = 30 * 60 * 1000; // 30분

  // 비밀번호 리셋 토큰 저장소
  private readonly passwordResetTokens: Map<
    string,
    { token: string; expires: Date }
  > = new Map();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 이메일/비밀번호로 사용자 검증
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        nickname: true,
        imageUrl: true,
        verified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('존재하지 않는 이메일입니다.');
    }

    if (!user.verified) {
      throw new UnauthorizedException('이메일 인증이 필요합니다.');
    }

    if (!user.password) {
      throw new UnauthorizedException('비밀번호가 설정되지 않은 계정입니다.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('비밀번호가 일치하지 않습니다.');
    }

    return user;
  }

  /**
   * 액세스 토큰 생성
   */
  private generateAccessToken(user: User): string {
    const payload: TokenPayload = { email: user.email, sub: user.id };
    return this.jwtService.sign(payload, {
      secret: this.configService.get('ACCESS_TOKEN_SECRET'),
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  /**
   * 리프레시 토큰 생성
   */
  generateRefreshToken(user: User): string {
    const payload: TokenPayload = { email: user.email, sub: user.id };
    return this.jwtService.sign(payload, {
      secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });
  }

  /**
   * 일반 로그인
   */
  async login(user: User): Promise<AuthResponse> {
    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        imageUrl: user.imageUrl,
      },
    };
  }

  /**
   * 구글 로그인
   */
  async googleLogin(
    code: string,
    clientType: 'ios' | 'web' = 'web',
  ): Promise<AuthResponse> {
    try {
      let ticket;
      if (clientType === 'ios') {
        // iOS의 경우 이미 idToken을 받았으므로 바로 검증
        const client = new OAuth2Client(
          this.configService.get('GOOGLE_IOS_CLIENT_ID'),
        );
        ticket = await client.verifyIdToken({
          idToken: code, // iOS에서는 code가 idToken
          audience: this.configService.get('GOOGLE_IOS_CLIENT_ID'),
        });
      } else {
        // 웹의 경우 기존 로직 유지
        const googleClient = new OAuth2Client(
          this.configService.get('GOOGLE_CLIENT_ID'),
          this.configService.get('GOOGLE_CLIENT_SECRET'),
          'postmessage',
        );
        const { tokens } = await googleClient.getToken(code);
        ticket = await googleClient.verifyIdToken({
          idToken: tokens.id_token,
          audience: this.configService.get('GOOGLE_CLIENT_ID'),
        });
      }

      const payload = ticket.getPayload();
      if (!payload?.email) {
        throw new UnauthorizedException('구글 인증에 실패했습니다.');
      }

      // 사용자 조회
      let user = await this.userRepository.findOne({
        where: { email: payload.email },
        select: {
          id: true,
          email: true,
          password: true,
          nickname: true,
          imageUrl: true,
          verified: true,
        },
      });

      // 이미 가입된 회원이고 구글 계정으로 가입한 경우
      if (user && user.password === null) {
        return {
          accessToken: this.generateAccessToken(user),
          refreshToken: this.generateRefreshToken(user),
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            imageUrl: user.imageUrl,
          },
        };
      }

      // 이미 가입된 회원이지만 이메일/비밀번호로 가입한 경우
      if (user && user.password !== null) {
        throw new UnauthorizedException(
          '이미 이메일/비밀번호로 가입된 계정입니다.',
        );
      }

      // 가입되지 않은 회원인 경우 회원가입 후 로그인
      if (!user) {
        user = await this.userRepository.save({
          email: payload.email,
          nickname: payload.name || payload.email.split('@')[0],
          password: null,
          verified: true,
        } as Partial<User>);

        const savedUser = await this.userRepository.findOne({
          where: { id: user.id },
          select: {
            id: true,
            email: true,
            nickname: true,
            imageUrl: true,
            verified: true,
          },
        });

        if (!savedUser) {
          throw new InternalServerErrorException('회원가입에 실패했습니다.');
        }

        user = savedUser;
      }

      return {
        accessToken: this.generateAccessToken(user),
        refreshToken: this.generateRefreshToken(user),
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          imageUrl: user.imageUrl,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('유효하지 않은 구글 인증 코드입니다.');
    }
  }

  /**
   * 이메일 인증 코드 생성 및 발송
   */
  async sendVerificationEmail(email: string): Promise<{ message: string }> {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY);

    this.verificationCodes.set(email, {
      code,
      expires,
      type: 'signup',
    });

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

    // 인증 코드 삭제
    this.verificationCodes.delete(verifyEmailDto.email);

    // 사용자의 verified 상태를 true로 업데이트
    await this.userRepository.update(
      { email: verifyEmailDto.email },
      { verified: true },
    );

    return { verified: true };
  }

  /**
   * 1단계: 이메일 중복 및 유효성 검사
   */
  async checkEmail(email: string): Promise<{ available: boolean }> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('이미 사용 중인 이메일입니다.');
    }

    return { available: true };
  }

  /**
   * 2단계: 회원정보 입력 및 인증메일 발송
   */
  async initiateRegistration(
    initiateRegistrationDto: InitiateRegistrationDto,
  ): Promise<{ message: string }> {
    // 이메일 중복 확인
    const existingEmail = await this.userRepository.findOne({
      where: { email: initiateRegistrationDto.email },
    });

    if (existingEmail) {
      throw new UnauthorizedException('이미 가입된 이메일입니다.');
    }

    // 닉네임 중복 확인
    const existingNickname = await this.userRepository.findOne({
      where: { nickname: initiateRegistrationDto.nickname },
    });

    if (existingNickname) {
      throw new UnauthorizedException('이미 사용 중인 닉네임입니다.');
    }

    // 임시 사용자 정보 저장 (Map 또는 Redis 사용 권장)
    const tempUserData = {
      email: initiateRegistrationDto.email,
      password: await bcrypt.hash(
        initiateRegistrationDto.password,
        Number(this.configService.get('HASH_ROUNDS')),
      ),
      nickname: initiateRegistrationDto.nickname,
    };

    // 이메일 인증 코드 발송
    await this.sendVerificationEmail(initiateRegistrationDto.email);

    // 임시 저장소에 사용자 정보 저장
    this.verificationCodes.set(initiateRegistrationDto.email, {
      ...this.verificationCodes.get(initiateRegistrationDto.email),
      userData: tempUserData,
    });

    return { message: '인증 코드가 이메일로 전송되었습니다.' };
  }

  /**
   * 3단계: 이메일 인증, 회원가입 완료 및 로그인 처리
   */
  async completeRegistration(
    completeRegistrationDto: CompleteRegistrationDto,
  ): Promise<{
    user: Omit<User, 'password'>;
    accessToken: string;
    refreshToken: string;
  }> {
    const verification = this.verificationCodes.get(
      completeRegistrationDto.email,
    );

    if (
      !verification ||
      verification.code !== completeRegistrationDto.verificationCode
    ) {
      throw new UnauthorizedException('잘못된 인증 코드입니다.');
    }

    if (verification.expires < new Date()) {
      throw new UnauthorizedException('만료된 인증 코드입니다.');
    }

    const userData = verification.userData;
    if (!userData) {
      throw new UnauthorizedException(
        '회원가입 정보가 없습니다. 처음부터 다시 시도해주세요.',
      );
    }

    // 이미 가입된 이메일 체크
    const existingUser = await this.userRepository.findOne({
      where: { email: completeRegistrationDto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException('이미 가입된 이메일입니다.');
    }

    // 트랜잭션 시작
    const queryRunner =
      this.userRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 사용자 생성
      const user = await queryRunner.manager.save(User, {
        ...userData,
        verified: true,
      });

      const result = await queryRunner.manager.findOne(User, {
        where: { id: user.id },
        select: [
          'id',
          'email',
          'nickname',
          'imageUrl',
          'verified',
          'createdAt',
          'updatedAt',
        ],
      });

      // 토큰 생성
      const tokens = {
        accessToken: this.generateAccessToken(result),
        refreshToken: this.generateRefreshToken(result),
      };

      await queryRunner.commitTransaction();

      // 트랜잭션이 성공적으로 완료된 후에 인증 정보 삭제
      this.verificationCodes.delete(completeRegistrationDto.email);

      return {
        user: result,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('회원가입에 실패했습니다.');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 리프레시 토큰을 검증하고 새로운 토큰을 발급합니다.
   */
  async refreshTokens(refreshToken: string): Promise<AuthResponse> {
    try {
      // 리프레시 토큰 검증
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('REFRESH_TOKEN_SECRET'),
      });

      // 사용자 조회
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          nickname: true,
          verified: true,
          imageUrl: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      if (!user.verified) {
        throw new UnauthorizedException('이메일 인증이 필요합니다.');
      }

      // 새로운 토큰 발급
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          imageUrl: user.imageUrl,
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }
  }

  /**
   * 로그아웃 처리
   * 클라이언트에서 액세스 토큰을 삭제하도록 action을 전달합니다.
   */
  async logout(): Promise<{ message: string; action: string }> {
    return {
      message: '로그아웃되었습니다.',
      action: 'CLEAR_AUTH',
    };
  }

  /**
   * 비밀번호 재설정을 위한 이메일 인증 코드 발송
   */
  async sendPasswordResetCode(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('존재하지 않는 이메일입니다.');
    }

    if (user.password === null) {
      throw new UnauthorizedException(
        '구글 로그인으로 가입된 계정입니다. 구글 로그인을 이용해주세요.',
      );
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expires = new Date(Date.now() + this.VERIFICATION_CODE_EXPIRY);

    // 인증 코드 저장
    this.verificationCodes.set(email, {
      code,
      expires,
      type: 'password-reset',
    });

    try {
      await this.mailerService.sendMail({
        to: email,
        from: this.configService.get<string>('MAIL_USER'),
        subject: '[삼익비치] 비밀번호 재설정 인증코드 안내',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; font-family: 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; line-height: 1.6; color: #333333; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">비밀번호 재설정 인증코드 안내</h1>
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

      return { message: '인증 코드가 이메일로 전송되었습니다.' };
    } catch (error) {
      throw new InternalServerErrorException('이메일 전송에 실패했습니다.');
    }
  }

  /**
   * 비밀번호 재설정을 위한 인증 코드 검증
   */
  async verifyPasswordResetCode(
    email: string,
    code: string,
  ): Promise<{ verified: boolean }> {
    const verification = this.verificationCodes.get(email);

    if (!verification || verification.code !== code) {
      throw new UnauthorizedException('잘못된 인증 코드입니다.');
    }

    if (verification.expires < new Date()) {
      this.verificationCodes.delete(email);
      throw new UnauthorizedException('만료된 인증 코드입니다.');
    }

    if (verification.type !== 'password-reset') {
      throw new UnauthorizedException('잘못된 인증 코드입니다.');
    }

    return { verified: true };
  }

  /**
   * 새로운 비밀번호로 재설정
   */
  async resetPassword(
    email: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(
      newPassword,
      Number(this.configService.get('HASH_ROUNDS')),
    );

    // 비밀번호 업데이트
    await this.userRepository.update({ email }, { password: hashedPassword });

    // 인증 코드 삭제
    this.verificationCodes.delete(email);

    return { message: '비밀번호가 성공적으로 변경되었습니다.' };
  }
}
