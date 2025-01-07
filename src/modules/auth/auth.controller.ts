import {
  Controller,
  Post,
  Body,
  Res,
  UnauthorizedException,
  Req,
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
  ) {
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

    const tokens = await this.authService.login(user);

    // 리프레시 토큰을 HTTP Only 쿠키로 설정
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  /**
   * 구글 로그인 API
   * @param googleAuthDto 구글 인증 코드를 담은 DTO
   * @param res Express Response 객체
   * @returns 액세스 토큰
   */
  @Post('login/google')
  async googleLogin(
    @Body() googleAuthDto: { code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.googleLogin(googleAuthDto.code);

    // 리프레시 토큰을 HTTP Only 쿠키로 설정
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });

    return { accessToken: tokens.accessToken };
  }

  /**
   * 리프레시 토큰으로 새로운 액세스 토큰을 발급합니다.
   * 리프레시 토큰은 쿠키에서 추출합니다.
   */
  @Post('refresh')
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 없습니다.');
    }

    // 새로운 액세스 토큰만 발급
    const { accessToken } = await this.authService.refreshTokens(refreshToken);

    return { accessToken };
  }
}
