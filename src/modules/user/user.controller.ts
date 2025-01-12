import {
  Controller,
  Get,
  Delete,
  Body,
  UseGuards,
  UnauthorizedException,
  Patch,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/user.dto';
import { User } from '@entities/User';
import { CurrentUser } from '@decorators/current-user.decorator';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { Response } from 'express';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 현재 로그인한 사용자의 정보를 조회합니다.
   */
  @Get('me')
  async getMyProfile(@CurrentUser() user: User) {
    return this.userService.findById(user.id);
  }

  /**
   * 사용자의 닉네임이나 비밀번호를 변경합니다.
   */
  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // 닉네임과 비밀번호 동시 변경 방지
    if (updateUserDto.nickname && updateUserDto.newPassword) {
      throw new BadRequestException(
        '닉네임과 비밀번호는 동시에 변경할 수 없습니다.',
      );
    }

    // 닉네임 변경 시 닉네임 필드 확인
    if (!updateUserDto.nickname && updateUserDto.nickname !== undefined) {
      throw new BadRequestException('닉네임을 입력해주세요.');
    }

    // 비밀번호 변경 시 현재 비밀번호 확인
    if (updateUserDto.newPassword && !updateUserDto.currentPassword) {
      throw new UnauthorizedException('현재 비밀번호를 입력해주세요.');
    }

    // 비밀번호 변경 시 새 비밀번호 확인
    if (!updateUserDto.newPassword && updateUserDto.currentPassword) {
      throw new BadRequestException('새 비밀번호를 입력해주세요.');
    }

    return this.userService.updateUser(user.id, updateUserDto);
  }

  /**
   * 회원 탈퇴를 처리합니다.
   */
  @Delete('me')
  async deleteMyAccount(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.userService.deleteUser(user.id);

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
   * 사용자를 검색합니다.
   *
   * @param query PaginateQuery - nestjs-paginate의 쿼리 파라미터
   * @example
   * 1. 기본 페이지네이션:
   * GET /user/search?page=1&limit=10
   *
   * 2. 정렬:
   * GET /user/search?sortBy=createdAt:DESC
   *
   * 3. 통합 검색 (이메일, 닉네임):
   * GET /user/search?search=test
   *
   * 4. 필터링:
   * GET /user/search?filter.email=$ilike:test@
   * GET /user/search?filter.nickname=$ilike:test
   * GET /user/search?filter.verified=true
   *
   * 5. 복합 쿼리:
   * GET /user/search?page=1&limit=10&search=test&sortBy=createdAt:DESC&filter.verified=true
   */
  @Get('search')
  async search(@Paginate() query: PaginateQuery) {
    return this.userService.search(query);
  }

  /**
   * 사용자가 좋아하는 책 목록을 조회합니다.
   * @param user 현재 로그인한 사용자
   * @param query 페이지네이션 쿼리
   */
  @Get('me/books')
  async getMyLikedBooks(
    @CurrentUser() user: User,
    @Paginate() query: PaginateQuery,
  ) {
    return this.userService.getLikedBooks(user.id, query);
  }

  /**
   * 사용자가 좋아하는 저자 목록을 조회합니다.
   * @param user 현재 로그인한 사용자
   * @param query 페이지네이션 쿼리
   */
  @Get('me/authors')
  async getLikedAuthors(
    @CurrentUser() user: User,
    @Paginate() query: PaginateQuery,
  ) {
    return this.userService.getLikedAuthors(user.id, query);
  }

  /**
   * 사용자가 작성한 리뷰 목록을 조회합니다.
   * @param user 현재 로그인한 사용자
   * @param query 페이지네이션 쿼리
   */
  @Get('me/reviews')
  async getReviews(
    @CurrentUser() user: User,
    @Paginate() query: PaginateQuery,
  ) {
    return this.userService.getReviews(user.id, query);
  }
}
