import {
  Controller,
  Get,
  Param,
  Post,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { BookService } from './book.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { CurrentUser } from '@decorators/current-user.decorator';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { User } from '@entities/User';

@ApiTags('Books')
@Controller('books')
export class BookController {
  constructor(private readonly bookService: BookService) {}

  @Get(':id')
  @ApiOperation({ summary: '책 상세 정보 조회' })
  @ApiResponse({
    status: 200,
    description: '책 상세 정보를 반환합니다.',
  })
  async getBookDetail(@Param('id', ParseIntPipe) id: number) {
    return this.bookService.findById(id);
  }

  @Get()
  @ApiOperation({ summary: '책 목록 조회 및 검색' })
  @ApiResponse({
    status: 200,
    description: '책 목록을 반환합니다.',
  })
  async searchBooks(@Paginate() query: PaginateQuery) {
    return this.bookService.search(query);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '책 좋아요 토글' })
  @ApiResponse({
    status: 200,
    description: '책 좋아요 상태를 토글합니다.',
  })
  async toggleLike(
    @Param('id', ParseIntPipe) bookId: number,
    @CurrentUser() user: User,
  ) {
    return this.bookService.toggleLike(user.id, bookId);
  }

  @Get(':id/related')
  @ApiOperation({ summary: '연관된 책 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '같은 저자의 다른 책들을 반환합니다.',
  })
  async getRelatedBooks(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ) {
    return this.bookService.getRelatedBooks(id, query);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: '책 리뷰 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '책의 리뷰 목록을 반환합니다.',
  })
  async getBookReviews(
    @Param('id', ParseIntPipe) id: number,
    @Paginate() query: PaginateQuery,
  ) {
    return this.bookService.getBookReviews(id, query);
  }
}
