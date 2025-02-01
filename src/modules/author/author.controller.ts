import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthorService } from './author.service';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { CurrentUser } from '@decorators/current-user.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { User } from '@entities/User';
import { OptionalJwtAuthGuard } from '@guards/optional-jwt-auth.guard';

@Controller('author')
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  /**
   * 모든 저자 목록을 가져옵니다.
   * 이름 오름차순으로 정렬됩니다.
   */
  @Get()
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(3600) // 1시간
  async getAllAuthors() {
    return this.authorService.getAllAuthors();
  }

  /**
   * 저자 목록을 조회하고 검색합니다.
   * 페이지네이션, 정렬, 검색, 필터링을 지원합니다.
   */
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(1800) // 30분
  async searchAuthors(
    @Paginate() query: PaginateQuery,
    @CurrentUser() user?: User,
  ) {
    return this.authorService.searchAuthors(query, user?.id);
  }

  /**
   * 저자 상세 정보를 조회합니다.
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(3600) // 1시간
  async getAuthorDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: User,
  ) {
    return this.authorService.findById(id, user?.id);
  }

  /**
   * 저자 좋아요를 추가하거나 취소합니다.
   * 인증이 필요한 작업입니다.
   */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(
    @Param('id', ParseIntPipe) authorId: number,
    @CurrentUser() user: User,
  ) {
    return this.authorService.toggleLike(user.id, authorId);
  }

  /**
   * 저자가 쓴 모든 책 목록을 조회합니다.
   */
  @Get(':id/books')
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(3600) // 1시간
  async getAllAuthorBooks(@Param('id', ParseIntPipe) id: number) {
    return this.authorService.getAllAuthorBooks(id);
  }

  /**
   * 저자의 리뷰 목록을 조회합니다.
   * 페이지네이션을 지원합니다.
   */
  @Get(':id/reviews')
  @UseGuards(OptionalJwtAuthGuard)
  async getAuthorReviews(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
    @CurrentUser() user?: User,
  ) {
    return this.authorService.getAuthorReviews(id, query, user?.id);
  }
}
