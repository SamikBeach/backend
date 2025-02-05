import {
  Controller,
  Post,
  Body,
  Res,
  UnauthorizedException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  EmailVerificationDto,
  LoginDto,
  VerifyEmailDto,
  CheckEmailDto,
  InitiateRegistrationDto,
  CompleteRegistrationDto,
} from './dto/auth.dto';
import { Response, Request } from 'express';
import { User } from '@entities/User';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { AuthResponse } from './types/auth.types';

/**
 * 인증 관련 컨트롤러
 * 회원가입, 로그인, 이메일 인증 등의 기능을 처리합니다.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 이메일 인증 코드 발송 API
   * @param emailVerificationDto 이메일 정보를 담은 DTO
   * @returns 인증 코드 발송 결과
   */
  @Post('email/verify/send')
  async sendVerificationEmail(
    @Body() emailVerificationDto: EmailVerificationDto,
  ) {
    return this.authService.sendVerificationEmail(emailVerificationDto.email);
  }

  /**
   * 이메일 인증 코드 확인 API
   * @param verifyEmailDto 이메일과 인증 코드를 담은 DTO
   * @returns 인증 결과
   */
  @Post('email/verify')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  /**
   * 이메일 중복 확인 API
   * @param checkEmailDto 이메일 정보를 담은 DTO
   * @returns 이메일 사용 가능 여부
   */
  @Post('register/check-email')
  async checkEmail(@Body() checkEmailDto: CheckEmailDto) {
    return this.authService.checkEmail(checkEmailDto.email);
  }

  /**
   * 회원가입 초기화 API
   * 회원 정보를 임시 저장하고 인증 메일을 발송합니다.
   * @param initiateRegistrationDto 회원가입 정보를 담은 DTO
   * @returns 회원가입 초기화 결과
   */
  @Post('register/initiate')
  async initiateRegistration(
    @Body() initiateRegistrationDto: InitiateRegistrationDto,
  ) {
    return this.authService.initiateRegistration(initiateRegistrationDto);
  }

  /**
   * 회원가입 완료 API
   * 이메일 인증 후 회원가입을 완료합니다.
   * @param completeRegistrationDto 이메일과 인증코드를 담은 DTO
   * @returns 회원가입 완료 결과와 인증 토큰
   */
  @Post('register/complete')
  async completeRegistration(
    @Body() completeRegistrationDto: CompleteRegistrationDto,
  ) {
    return this.authService.completeRegistration(completeRegistrationDto);
  }

  /**
   * 이메일 로그인 API
   * @param loginDto 로그인 정보를 담은 DTO
   * @param res Express Response 객체
   * @returns 액세스 토큰과 리프레시 토큰
   * @throws UnauthorizedException 인증 실패시
   */
  @Post('login/email')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const userWithoutPassword = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!userWithoutPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 비밀번호 필드를 포함한 완전한 User 객체 생성
    const user: User = {
      ...userWithoutPassword,
      password: '', // 비밀번호는 이미 검증되었으므로 빈 문자열로 설정
    };

    const response = await this.authService.login(user);

    // 리프레시 토큰을 HTTP Only 쿠키로 설정
    res.cookie('refreshToken', this.authService.generateRefreshToken(user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    return response;
  }

  /**
   * 구글 로그인 API
   * @param googleAuthDto 구글 인증 코드를 담은 DTO
   * @param res Express Response 객체
   * @returns 액세스 토큰
   */
  @Post('login/google')
  async googleLogin(
    @Body() googleAuthDto: { code: string; clientType?: 'ios' | 'web' },
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const response = await this.authService.googleLogin(
      googleAuthDto.code,
      googleAuthDto.clientType || 'web',
    );
    const refreshToken = this.authService.generateRefreshToken({
      id: response.user.id,
      email: response.user.email,
      nickname: response.user.nickname,
    } as User);

    // 리프레시 토큰을 HTTP Only 쿠키로 설정
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    return response;
  }

  /**
   * 리프레시 토큰으로 새로운 액세스 토큰을 발급합니다.
   * 리프레시 토큰은 쿠키 또는 요청 바디에서 추출합니다.
   */
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ): Promise<AuthResponse> {
    // 쿠키 또는 요청 바디에서 리프레시 토큰 추출
    const refreshToken = body.refreshToken || req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 없습니다.');
    }

    const result = await this.authService.refreshTokens(refreshToken);

    // 웹 클라이언트인 경우에만 쿠키 설정
    if (!body.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    return result;
  }

  /**
   * 로그아웃 API
   * 리프레시 토큰 쿠키를 제거하고 클라이언트에서 액세스 토큰을 삭제하도록 합니다.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Res({ passthrough: true }) res: Response) {
    const result = await this.authService.logout();

    // 리프레시 토큰 쿠키 제거
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return result;
  }

  /**
   * 비밀번호 재설정을 위한 인증 코드 발송 API
   * @summary 비밀번호 재설정을 위한 인증 코드를 이메일로 발송합니다.
   * @param email 사용자 이메일
   * @returns 인증 코드 발송 결과 메시지
   */
  @Post('password/send-code')
  async sendPasswordResetCode(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    return this.authService.sendPasswordResetCode(email);
  }

  /**
   * 비밀번호 재설정 인증 코드 검증 API
   * @summary 비밀번호 재설정 인증 코드의 유효성을 검증합니다.
   * @param email 사용자 이메일
   * @param code 인증 코드
   * @returns 인증 코드 검증 결과
   */
  @Post('password/verify-code')
  async verifyPasswordResetCode(
    @Body('email') email: string,
    @Body('code') code: string,
  ): Promise<{ verified: boolean }> {
    return this.authService.verifyPasswordResetCode(email, code);
  }

  /**
   * 비밀번호 재설정 API
   * @summary 인증 코드 검증 후 새로운 비밀번호로 재설정합니다.
   * @param email 사용자 이메일
   * @param code 인증 코드
   * @param newPassword 새로운 비밀번호
   * @returns 비밀번호 재설정 결과 메시지
   */
  @Post('password/reset')
  async resetPassword(
    @Body('email') email: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(email, newPassword);
  }
}
