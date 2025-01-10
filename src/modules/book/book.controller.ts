import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BookService } from './book.service';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { CurrentUser } from '@decorators/current-user.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { User } from '@entities/User';
import { OptionalJwtAuthGuard } from '@guards/optional-jwt-auth.guard';

@Controller('book')
export class BookController {
  constructor(private readonly bookService: BookService) {}
  /**
   * 책 목록을 조회하고 검색합니다.
   * 페이지네이션, 정렬, 검색, 필터링을 지원합니다.
   */
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
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
  async getBookDetail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: User,
  ) {
    return this.bookService.findById(id, user?.id);
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
  @Get(':id/related')
  async getRelatedBooks(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ) {
    return this.bookService.getRelatedBooks(id, query);
  }

  /**
   * 특정 책의 리뷰 목록을 조회합니다.
   * 페이지네이션을 지원합니다.
   */
  @Get(':id/reviews')
  async getBookReviews(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ) {
    return this.bookService.getBookReviews(id, query);
  }
}
