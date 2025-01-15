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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import { User } from '@entities/User';
import { CurrentUser } from '@decorators/current-user.decorator';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { Response } from 'express';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { FileInterceptor } from '@nestjs/platform-express';

import { ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 현재 로그인한 사용자의 정보를 조회합니다.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    return this.userService.findById(user.id);
  }

  /**
   * 사용자의 닉네임을 변경합니다.
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
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
  @Delete('me')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @Get('me/books')
  @UseGuards(JwtAuthGuard)
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
  @Get('me/authors')
  @UseGuards(JwtAuthGuard)
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
  @Get('me/reviews')
  @UseGuards(JwtAuthGuard)
  async getMyReviews(
    @CurrentUser() user: User,
    @Paginate() query: PaginateQuery,
  ) {
    return this.userService.getReviews(user.id, query);
  }

  /**
   * 비밀번호를 변경합니다.
   */
  @Post('me/password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: User,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.userService.changePassword(user.id, changePasswordDto);
  }

  /**
   * 내 최근 검색 목록을 조회합니다.
   * @param user 현재 로그인한 사용자
   */
  @Get('me/search')
  @UseGuards(JwtAuthGuard)
  async getRecentSearches(@CurrentUser() user: User) {
    return this.userService.getRecentSearches(user.id);
  }

  /**
   * 검색 기록을 저장합니다.
   * @param user 현재 로그인한 사용자
   * @param bookId 책 ID
   * @param authorId 작가 ID
   */
  @Post('me/save-search')
  @UseGuards(JwtAuthGuard)
  async saveSearch(
    @CurrentUser() user: User,
    @Body('bookId') bookId?: number,
    @Body('authorId') authorId?: number,
  ) {
    if (!bookId && !authorId) {
      throw new BadRequestException('책 ID나 작가 ID 중 하나는 필수입니다.');
    }
    await this.userService.saveSearch(user.id, bookId, authorId);

    return { message: '검색 기록이 저장되었습니다.' };
  }

  /**
   * 검색 기록을 삭제합니다.
   */
  @Delete('me/search/:id')
  @UseGuards(JwtAuthGuard)
  async deleteSearch(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) searchId: number,
  ) {
    await this.userService.deleteSearch(user.id, searchId);
    return { message: '검색 기록이 삭제되었습니다.' };
  }

  /**
   * 프로필 이미지를 업로드합니다.
   */
  @Post('me/profile-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadProfileImage(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('이미지 파일을 업로드해주세요.');
    }

    // 이미지 파일 형식 검증
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('이미지 파일만 업로드 가능합니다.');
    }

    return this.userService.uploadProfileImage(user.id, file);
  }

  /**
   * 프로필 이미지를 삭제합니다.
   */
  @Delete('me/profile-image')
  @UseGuards(JwtAuthGuard)
  async deleteProfileImage(@CurrentUser() user: User) {
    return this.userService.deleteProfileImage(user.id);
  }
}
