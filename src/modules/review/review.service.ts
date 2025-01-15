import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
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
  async searchReviews(query: PaginateQuery, userId?: number) {
    const reviews = await paginate(query, this.reviewRepository, {
      sortableColumns: ['id', 'likeCount', 'createdAt', 'updatedAt'],
      searchableColumns: ['title', 'content'],
      defaultSortBy: [['id', 'DESC']],
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

    if (userId) {
      const userLikes = await this.userReviewLikeRepository.find({
        where: {
          userId,
          reviewId: In(reviews.data.map((review) => review.id)),
        },
      });

      const likedReviewIds = new Set(userLikes.map((like) => like.reviewId));

      reviews.data = reviews.data.map((review) => ({
        ...review,
        isLiked: likedReviewIds.has(review.id),
      }));
    }

    return reviews;
  }

  /**
   * 새로운 리뷰를 작성합니다.
   */
  async createReview(
    userId: number,
    bookId: number,
    createReviewDto: CreateReviewDto,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const book = await queryRunner.manager.findOne(Book, {
        where: { id: bookId },
        relations: ['authorBooks', 'authorBooks.author'],
      });

      if (!book) {
        throw new NotFoundException('책을 찾을 수 없습니다.');
      }

      // 이미 리뷰를 작성했는지 확인
      const existingReview = await queryRunner.manager.findOne(Review, {
        where: { userId, bookId },
      });

      if (existingReview) {
        throw new BadRequestException('이미 리뷰를 작성했습니다.');
      }

      const review = this.reviewRepository.create({
        ...createReviewDto,
        userId,
        bookId,
      });

      await queryRunner.manager.save(review);

      // 책의 reviewCount 증가
      await queryRunner.manager.increment(
        Book,
        { id: bookId },
        'reviewCount',
        1,
      );

      // 저자들의 reviewCount 증가
      for (const authorBook of book.authorBooks) {
        await queryRunner.manager.increment(
          'Author',
          { id: authorBook.author.id },
          'reviewCount',
          1,
        );
      }

      await queryRunner.commitTransaction();
      return review;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * ID로 리뷰를 찾습니다.
   */
  async findById(id: number, userId?: number) {
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

    if (userId) {
      const userLike = await this.userReviewLikeRepository.findOne({
        where: { userId, reviewId: id },
      });

      return {
        ...review,
        isLiked: !!userLike,
      };
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
    });

    return this.findById(id, userId);
  }

  /**
   * 리뷰를 삭제합니다.
   */
  async deleteReview(id: number, userId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const review = await queryRunner.manager.findOne(Review, {
        where: { id },
        relations: ['book', 'book.authorBooks', 'book.authorBooks.author'],
      });

      if (!review) {
        throw new NotFoundException('리뷰를 찾을 수 없습니다.');
      }

      if (review.userId !== userId) {
        throw new UnauthorizedException('리뷰를 삭제할 권한이 없습니다.');
      }

      await queryRunner.manager.softDelete(Review, id);

      // 책의 reviewCount 감소
      await queryRunner.manager.decrement(
        Book,
        { id: review.book.id },
        'reviewCount',
        1,
      );

      // 저자들의 reviewCount 감소
      for (const authorBook of review.book.authorBooks) {
        await queryRunner.manager.decrement(
          'Author',
          { id: authorBook.author.id },
          'reviewCount',
          1,
        );
      }

      await queryRunner.commitTransaction();
      return { message: '리뷰가 삭제되었습니다.' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 리뷰에 달린 댓글 목록을 조회합니다.
   * 현재 사용자의 댓글이 있다면 최신순으로 최상단에 표시됩니다.
   */
  async getComments(
    reviewId: number,
    query: PaginateQuery,
    currentUserId?: number,
  ) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('리뷰를 찾을 수 없습니다.');
    }

    const baseQuery = this.commentRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.reviewId = :reviewId', { reviewId });

    if (currentUserId) {
      baseQuery
        .addSelect(
          `CASE WHEN comment.userId = :currentUserId THEN 1 ELSE 0 END`,
          'isCurrentUser',
        )
        .setParameter('currentUserId', currentUserId)
        .orderBy('isCurrentUser', 'DESC')
        .addOrderBy('comment.createdAt', 'DESC');
    } else {
      baseQuery.orderBy('comment.createdAt', 'ASC');
    }

    return paginate(query, baseQuery, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
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

      const comment = this.commentRepository.create({
        ...createCommentDto,
        userId,
        reviewId,
      });

      // commentCount 증가
      await queryRunner.manager.increment(
        Review,
        { id: reviewId },
        'commentCount',
        1,
      );

      await queryRunner.commitTransaction();
      return this.commentRepository.save(comment);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
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
        // likeCount 감소
        await queryRunner.manager.decrement(
          Review,
          { id: reviewId },
          'likeCount',
          1,
        );
        await queryRunner.commitTransaction();
        return { liked: false };
      } else {
        await queryRunner.manager.save(UserReviewLike, {
          userId,
          reviewId,
        });
        // likeCount 증가
        await queryRunner.manager.increment(
          Review,
          { id: reviewId },
          'likeCount',
          1,
        );
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
        // likeCount 감소
        await queryRunner.manager.decrement(
          Comment,
          { id: commentId },
          'likeCount',
          1,
        );
        await queryRunner.commitTransaction();
        return { liked: false };
      } else {
        await queryRunner.manager.save(UserCommentLike, {
          userId,
          commentId,
        });
        // likeCount 증가
        await queryRunner.manager.increment(
          Comment,
          { id: commentId },
          'likeCount',
          1,
        );
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
