import {
  Controller,
  Post,
  Body,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  EmailVerificationDto,
  LoginDto,
  VerifyEmailDto,
} from './dto/create-user.dto';
import { Response } from 'express';
import { User } from '@entities/User';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('email/verify/send')
  async sendVerificationEmail(
    @Body() emailVerificationDto: EmailVerificationDto,
  ) {
    return this.authService.sendVerificationEmail(emailVerificationDto.email);
  }

  @Post('email/verify')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
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

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken };
  }

  @Post('google')
  async googleLogin(
    @Body() googleAuthDto: { code: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.googleLogin(googleAuthDto.code);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken };
  }
}
