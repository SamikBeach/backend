import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@entities/User';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@decorators/public.decorator';

/**
 * 선택적 JWT 인증 가드
 *
 * 이 가드는 일반적인 JWT 인증 가드와 달리 토큰이 없어도 요청을 허용합니다.
 * 주로 다음과 같은 상황에서 사용됩니다:
 * 1. 비로그인/로그인 사용자 모두 접근 가능한 API
 * 2. 로그인한 사용자에게는 추가 정보를 제공하는 API
 * (예: 게시물 목록에서 사용자의 좋아요 여부 표시)
 *
 * 동작 방식:
 * 1. 요청에 토큰이 없는 경우: 요청을 그대로 진행
 * 2. 요청에 유효한 토큰이 있는 경우: 사용자 정보를 request.user에 추가
 * 3. 요청에 유효하지 않은 토큰이 있는 경우: 토큰을 무시하고 요청을 진행
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
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
   * @returns true - 항상 요청을 허용
   *
   * 처리 과정:
   * 1. @Public() 데코레이터가 있는지 확인
   * 2. Authorization 헤더에서 Bearer 토큰 추출
   * 3. 토큰이 있다면 검증 후 사용자 정보 조회
   * 4. 검증된 사용자 정보를 request.user에 저장
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

    // 토큰이 없어도 계속 진행
    if (!token) {
      return true;
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

      // 유저가 있고 인증된 경우에만 request.user에 추가
      if (user && user.verified) {
        request.user = user;
      }

      return true;
    } catch (error) {
      // 토큰이 유효하지 않아도 계속 진행
      return true;
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
