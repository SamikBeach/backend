import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@entities/User';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@decorators/public.decorator';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private reflector: Reflector,
  ) {}

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

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
