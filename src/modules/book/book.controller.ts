import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  ParseIntPipe,
  Query,
  DefaultValuePipe,
  ParseBoolPipe,
  UseInterceptors,
} from '@nestjs/common';
import { BookService } from './book.service';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { CurrentUser } from '@decorators/current-user.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { User } from '@entities/User';
import { OptionalJwtAuthGuard } from '@guards/optional-jwt-auth.guard';
import { CacheKeyInterceptor } from '@common/interceptors/cache-key.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';

@Controller('book')
export class BookController {
  constructor(private readonly bookService: BookService) {}
  /**
   * 책 목록을 조회하고 검색합니다.
   * 페이지네이션, 정렬, 검색, 필터링을 지원합니다.
   */
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(CacheKeyInterceptor)
  @CacheTTL(30) // 30초
  async searchBooks(
    @Paginate() query: PaginateQuery,
    @CurrentUser() user?: User,
  ) {
    return this.bookService.searchBooks(query, user?.id);
  }

  /**
   * 책 상세 정보를 조회합니다.
   * 저자 정보도 함께 반환됩니다.
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(3600) // 1시간
  async getBookDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: User,
    @Query(
      'includeOtherTranslations',
      new DefaultValuePipe(false),
      ParseBoolPipe,
    )
    includeOtherTranslations?: boolean,
  ) {
    return this.bookService.findById(id, user?.id, includeOtherTranslations);
  }

  /**
   * 책 좋아요를 추가하거나 취소합니다.
   * 인증이 필요한 작업입니다.
   */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(
    @Param('id', ParseIntPipe) bookId: number,
    @CurrentUser() user: User,
  ) {
    return this.bookService.toggleLike(user.id, bookId);
  }

  /**
   * 같은 저자가 쓴 다른 책들의 목록을 반환합니다.
   * 페이지네이션을 지원합니다.
   */
  @Get(':id/related/search')
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(3600) // 1시간
  async searchRelatedBooks(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ) {
    return this.bookService.searchRelatedBooks(id, query);
  }

  /**
   * 같은 저자가 쓴 모든 다른 책들의 목록을 반환합니다.
   * 페이지네이션 없이 전체 목록을 반환합니다.
   */
  @Get(':id/related')
  // @UseInterceptors(CacheKeyInterceptor)
  // @CacheTTL(3600) // 1시간
  async getAllRelatedBooks(@Param('id', ParseIntPipe) id: number) {
    return this.bookService.getAllRelatedBooks(id);
  }

  /**
   * 특정 책의 리뷰 목록을 조회합니다.
   * 페이지네이션을 지원합니다.
   */
  @Get(':id/reviews')
  @UseGuards(OptionalJwtAuthGuard)
  async getBookReviews(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
    @CurrentUser() user?: User,
    @Query(
      'includeOtherTranslations',
      new DefaultValuePipe(false),
      ParseBoolPipe,
    )
    includeOtherTranslations?: boolean,
  ) {
    return this.bookService.getBookReviews(
      id,
      query,
      user?.id,
      includeOtherTranslations,
    );
  }
}
