import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '@guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@guards/optional-jwt-auth.guard';
import { CurrentUser } from '@decorators/current-user.decorator';
import { User } from '@entities/User';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * 리뷰 목록을 조회합니다.
   * 페이지네이션, 정렬, 검색, 필터링을 지원합니다.
   */
  @Get('search')
  @UseGuards(OptionalJwtAuthGuard)
  async searchReviews(
    @Paginate() query: PaginateQuery,
    @CurrentUser() user?: User,
  ) {
    return this.reviewService.searchReviews(query, user?.id);
  }

  /**
   * 리뷰 상세 정보를 조회합니다.
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user?: User,
  ) {
    return this.reviewService.findById(id, user?.id);
  }

  /**
   * 새로운 리뷰를 작성합니다.
   */
  @Post('book/:bookId')
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewService.createReview(user.id, bookId, createReviewDto);
  }

  /**
   * 리뷰를 수정합니다.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewService.updateReview(id, user.id, updateReviewDto);
  }

  /**
   * 리뷰를 삭제합니다.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteReview(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.reviewService.deleteReview(id, user.id);
  }

  /**
   * 리뷰에 달린 댓글 목록을 조회합니다.
   * 현재 사용자의 댓글이 있다면 최상단에 표시됩니다.
   */
  @Get(':id/comments')
  @UseGuards(OptionalJwtAuthGuard)
  async getComments(
    @Param('id', ParseIntPipe) reviewId: number,
    @Paginate() query: PaginateQuery,
    @CurrentUser() user?: User,
  ) {
    return this.reviewService.getComments(reviewId, query, user?.id);
  }

  /**
   * 리뷰에 새로운 댓글을 작성합니다.
   */
  @Post(':id/comment')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('id', ParseIntPipe) reviewId: number,
    @Body() createCommentDto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewService.createComment(
      reviewId,
      user.id,
      createCommentDto,
    );
  }

  /**
   * 댓글을 수정합니다.
   */
  @Patch(':reviewId/comment/:commentId')
  @UseGuards(JwtAuthGuard)
  async updateComment(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() updateCommentDto: UpdateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.reviewService.updateComment(
      reviewId,
      commentId,
      user.id,
      updateCommentDto,
    );
  }

  /**
   * 댓글을 삭제합니다.
   */
  @Delete(':reviewId/comment/:commentId')
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: User,
  ) {
    return this.reviewService.deleteComment(reviewId, commentId, user.id);
  }

  /**
   * 리뷰 좋아요를 토글합니다.
   */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async toggleReviewLike(
    @Param('id', ParseIntPipe) reviewId: number,
    @CurrentUser() user: User,
  ) {
    return this.reviewService.toggleReviewLike(reviewId, user.id);
  }

  /**
   * 댓글 좋아요를 토글합니다.
   */
  @Post(':reviewId/comment/:commentId/like')
  @UseGuards(JwtAuthGuard)
  async toggleCommentLike(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: User,
  ) {
    return this.reviewService.toggleCommentLike(reviewId, commentId, user.id);
  }
}
