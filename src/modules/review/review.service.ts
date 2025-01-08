import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Review } from '@entities/Review';
import { Comment } from '@entities/Comment';
import { Book } from '@entities/Book';
import { UserReviewLike } from '@entities/UserReviewLike';
import { UserCommentLike } from '@entities/UserCommentLike';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(UserReviewLike)
    private readonly userReviewLikeRepository: Repository<UserReviewLike>,
    @InjectRepository(UserCommentLike)
    private readonly userCommentLikeRepository: Repository<UserCommentLike>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 리뷰 목록을 조회합니다.
   */
  async searchReviews(query: PaginateQuery) {
    return paginate(query, this.reviewRepository, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
      searchableColumns: ['title', 'content'],
      defaultSortBy: [['createdAt', 'DESC']],
      relations: [
        'user',
        'book',
        'book.authorBooks',
        'book.authorBooks.author',
      ],
      filterableColumns: {
        title: [FilterOperator.ILIKE],
        content: [FilterOperator.ILIKE],
      },
      maxLimit: 100,
    });
  }

  /**
   * 새로운 리뷰를 작성합니다.
   */
  async createReview(
    userId: number,
    bookId: number,
    createReviewDto: CreateReviewDto,
  ) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    // 이미 리뷰를 작성했는지 확인
    const existingReview = await this.reviewRepository.findOne({
      where: { userId, bookId },
    });

    if (existingReview) {
      throw new BadRequestException('이미 리뷰를 작성했습니다.');
    }

    const review = this.reviewRepository.create({
      ...createReviewDto,
      userId,
      bookId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.reviewRepository.save(review);

    return review;
  }

  /**
   * ID로 리뷰를 찾습니다.
   */
  async findById(id: number) {
    const review = await this.reviewRepository.findOne({
      where: { id },
      relations: [
        'user',
        'book',
        'book.authorBooks',
        'book.authorBooks.author',
      ],
    });

    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    return review;
  }

  /**
   * 리뷰를 수정합니다.
   */
  async updateReview(
    id: number,
    userId: number,
    updateReviewDto: UpdateReviewDto,
  ) {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    if (review.userId !== userId) {
      throw new UnauthorizedException('리뷰를 수정할 권한이 없습니다.');
    }

    await this.reviewRepository.update(id, {
      ...updateReviewDto,
      updatedAt: new Date(),
    });

    return this.findById(id);
  }

  /**
   * 리뷰를 삭제합니다.
   */
  async deleteReview(id: number, userId: number) {
    const review = await this.reviewRepository.findOne({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    if (review.userId !== userId) {
      throw new UnauthorizedException('리뷰를 삭제할 권한이 없습니다.');
    }

    await this.reviewRepository.softDelete(id);

    return { message: '리뷰가 삭제되었습니다.' };
  }

  /**
   * 리뷰에 달린 댓글 목록을 조회합니다.
   */
  async getComments(reviewId: number, query: PaginateQuery) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    return paginate(query, this.commentRepository, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
      defaultSortBy: [['createdAt', 'ASC']],
      where: { reviewId },
      relations: ['user'],
    });
  }

  /**
   * 리뷰에 새로운 댓글을 작성합니다.
   */
  async createComment(
    reviewId: number,
    userId: number,
    createCommentDto: CreateCommentDto,
  ) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    const comment = this.commentRepository.create({
      ...createCommentDto,
      userId,
      reviewId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.commentRepository.save(comment);
  }

  /**
   * 댓글을 수정합니다.
   */
  async updateComment(
    reviewId: number,
    commentId: number,
    userId: number,
    updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, reviewId },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.userId !== userId) {
      throw new UnauthorizedException('댓글을 수정할 권한이 없습니다.');
    }

    await this.commentRepository.update(commentId, {
      ...updateCommentDto,
      updatedAt: new Date(),
    });

    return this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });
  }

  /**
   * 댓글을 삭제합니다.
   */
  async deleteComment(reviewId: number, commentId: number, userId: number) {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, reviewId },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.userId !== userId) {
      throw new UnauthorizedException('댓글을 삭제할 권한이 없습니다.');
    }

    await this.commentRepository.softDelete(commentId);

    return { message: '댓글이 삭제되었습니다.' };
  }

  /**
   * 리뷰 좋아요를 토글합니다.
   */
  async toggleReviewLike(reviewId: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const review = await queryRunner.manager.findOne(Review, {
        where: { id: reviewId },
      });

      if (!review) {
        throw new NotFoundException('리뷰를 찾을 수 없습니다.');
      }

      const existingLike = await queryRunner.manager.findOne(UserReviewLike, {
        where: { userId, reviewId },
      });

      if (existingLike) {
        await queryRunner.manager.remove(UserReviewLike, existingLike);
        await queryRunner.commitTransaction();
        return { liked: false };
      } else {
        await queryRunner.manager.save(UserReviewLike, {
          userId,
          reviewId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await queryRunner.commitTransaction();
        return { liked: true };
      }
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 댓글 좋아요를 토글합니다.
   */
  async toggleCommentLike(reviewId: number, commentId: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const comment = await queryRunner.manager.findOne(Comment, {
        where: { id: commentId, reviewId },
      });

      if (!comment) {
        throw new NotFoundException('댓글을 찾을 수 없습니다.');
      }

      const existingLike = await queryRunner.manager.findOne(UserCommentLike, {
        where: { userId, commentId },
      });

      if (existingLike) {
        await queryRunner.manager.remove(UserCommentLike, existingLike);
        await queryRunner.commitTransaction();
        return { liked: false };
      } else {
        await queryRunner.manager.save(UserCommentLike, {
          userId,
          commentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await queryRunner.commitTransaction();
        return { liked: true };
      }
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
