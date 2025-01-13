import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@entities/User';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@decorators/public.decorator';
import { TOKEN_ERROR } from '@constants/error-codes';

/**
 * JWT 인증 가드
 *
 * 이 가드는 보호된 라우트에 대한 접근을 제어합니다.
 * 모든 요청에 대해 유효한 JWT 토큰을 요구합니다.
 *
 * 주요 기능:
 * 1. 모든 요청에 대해 Authorization 헤더의 Bearer 토큰을 검증
 * 2. 토큰이 없거나 유효하지 않은 경우 401 Unauthorized 응답
 * 3. 토큰이 유효한 경우 사용자 정보를 request.user에 추가
 *
 * 사용 예시:
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile() { ... }
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private reflector: Reflector,
  ) {}

  /**
   * 요청의 인증 상태를 확인하고 처리합니다.
   *
   * @param context 실행 컨텍스트 (요청 정보 포함)
   * @returns 인증 성공 시 true, 실패 시 UnauthorizedException 발생
   *
   * 처리 과정:
   * 1. @Public() 데코레이터 확인 (공개 라우트는 인증 건너뜀)
   * 2. Authorization 헤더에서 Bearer 토큰 추출
   * 3. 토큰 검증 및 사용자 정보 조회
   * 4. 검증된 사용자 정보를 request.user에 저장
   *
   * 예외 처리:
   * - 토큰 없음: UnauthorizedException
   * - 토큰 만료: UnauthorizedException
   * - 유효하지 않은 토큰: UnauthorizedException
   * - 사용자 없음: UnauthorizedException
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    // 프론트엔드와 약속된 에러 코드: No-Token
    // 토큰이 없는 경우 'No-Token' 에러 코드를 반환하여 프론트엔드에서 토큰 재발급 요청하도록 함
    if (!token) {
      throw new UnauthorizedException({
        error: TOKEN_ERROR.NO_TOKEN,
        message: '토큰이 없습니다.',
        statusCode: 401,
      });
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('ACCESS_TOKEN_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        select: [
          'id',
          'email',
          'nickname',
          'verified',
          'createdAt',
          'updatedAt',
        ],
      });

      if (!user) {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }

      if (!user.verified) {
        throw new UnauthorizedException('이메일 인증이 필요합니다.');
      }

      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException({
        message: '유효하지 않은 토큰입니다.',
        error: 'Invalid Token',
        statusCode: 401,
      });
    }
  }

  /**
   * Authorization 헤더에서 Bearer 토큰을 추출합니다.
   *
   * @param request HTTP 요청 객체
   * @returns Bearer 토큰 또는 undefined
   *
   * 예시:
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   * => eyJhbGciOiJIUzI1NiIs...
   */
  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
