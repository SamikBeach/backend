import {
  Controller,
  Get,
  Delete,
  Body,
  UseGuards,
  Patch,
  BadRequestException,
  Res,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import { User } from '@entities/User';
import { CurrentUser } from '@decorators/current-user.decorator';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { Response } from 'express';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 현재 로그인한 사용자의 정보를 조회합니다.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyProfile(@CurrentUser() user: User) {
    return this.userService.findById(user.id);
  }

  /**
   * 사용자의 닉네임을 변경합니다.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // 닉네임 필드 확인
    if (!updateUserDto.nickname && updateUserDto.nickname !== undefined) {
      throw new BadRequestException('닉네임을 입력해주세요.');
    }

    return this.userService.updateUser(user.id, updateUserDto);
  }

  /**
   * 회원 탈퇴를 처리합니다.
   */
  @UseGuards(JwtAuthGuard)
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
   * ID로 사용자의 기본 정보를 조회합니다.
   * @param id 사용자 ID
   */
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findById(id);
  }

  /**
   * 특정 사용자가 좋아하는 책 목록을 조회합니다.
   * @param id 사용자 ID
   * @param query 페이지네이션 쿼리
   */
  @Get(':id/books')
  async getUserLikedBooks(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ) {
    return this.userService.getLikedBooks(id, query);
  }

  /**
   * 특정 사용자가 좋아하는 저자 목록을 조회합니다.
   * @param id 사용자 ID
   * @param query 페이지네이션 쿼리
   */
  @Get(':id/authors')
  async getUserLikedAuthors(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ) {
    return this.userService.getLikedAuthors(id, query);
  }

  /**
   * 특정 사용자가 작성한 리뷰 목록을 조회합니다.
   * @param id 사용자 ID
   * @param query 페이지네이션 쿼리
   */
  @Get(':id/reviews')
  async getUserReviews(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ) {
    return this.userService.getReviews(id, query);
  }

  /**
   * 현재 로그인한 사용자가 좋아하는 책 목록을 조회합니다.
   * @param user 현재 로그인한 사용자
   * @param query 페이지네이션 쿼리
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/books')
  async getMyLikedBooks(
    @CurrentUser() user: User,
    @Paginate() query: PaginateQuery,
  ) {
    return this.userService.getLikedBooks(user.id, query);
  }

  /**
   * 현재 로그인한 사용자가 좋아하는 저자 목록을 조회합니다.
   * @param user 현재 로그인한 사용자
   * @param query 페이지네이션 쿼리
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/authors')
  async getMyLikedAuthors(
    @CurrentUser() user: User,
    @Paginate() query: PaginateQuery,
  ) {
    return this.userService.getLikedAuthors(user.id, query);
  }

  /**
   * 현재 로그인한 사용자가 작성한 리뷰 목록을 조회합니다.
   * @param user 현재 로그인한 사용자
   * @param query 페이지네이션 쿼리
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/reviews')
  async getMyReviews(
    @CurrentUser() user: User,
    @Paginate() query: PaginateQuery,
  ) {
    return this.userService.getReviews(user.id, query);
  }

  /**
   * 비밀번호를 변경합니다.
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/password')
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(user.id, changePasswordDto);
  }
}
