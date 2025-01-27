import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not } from 'typeorm';
import { Book } from '@entities/Book';
import { UserBookLike } from '@entities/UserBookLike';
import { Review } from '@entities/Review';
import { UserReviewLike } from '@entities/UserReviewLike';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';

@Injectable()
export class BookService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(UserBookLike)
    private readonly userBookLikeRepository: Repository<UserBookLike>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(UserReviewLike)
    private readonly userReviewLikeRepository: Repository<UserReviewLike>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * ID로 책을 찾습니다.
   */
  async findById(id: number, userId?: number) {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: [
        'authorBooks.author',
        'bookOriginalWorks.originalWork',
        'bookOriginalWorks.originalWork.bookOriginalWorks.book',
      ],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    // 자신을 포함한 모든 번역서 개수를 계산합니다
    const totalTranslationCount = new Set(
      book.bookOriginalWorks.flatMap((bow) =>
        bow.originalWork.bookOriginalWorks.map((obow) => obow.book.id),
      ),
    ).size;

    const response = {
      ...book,
      totalTranslationCount,
    };

    if (userId) {
      const userLike = await this.userBookLikeRepository.findOne({
        where: { userId, bookId: id },
      });

      return {
        ...response,
        isLiked: !!userLike,
      };
    }

    return response;
  }

  /**
   * 책을 검색하고 페이지네이션된 결과를 반환합니다.
   */
  async searchBooks(query: PaginateQuery, userId?: number) {
    const books = await paginate(query, this.bookRepository, {
      sortableColumns: [
        'id',
        'title',
        'publisher',
        'publicationDate',
        'likeCount',
        'reviewCount',
      ],
      searchableColumns: [
        'title',
        'authorBooks.author.name',
        'publisher',
        'isbn',
        'isbn13',
      ],
      defaultSortBy: [['id', 'DESC']],
      relations: [
        'authorBooks.author',
        'bookOriginalWorks.originalWork.bookOriginalWorks.book',
      ],
      filterableColumns: {
        title: [FilterOperator.ILIKE],
        publisher: [FilterOperator.ILIKE],
        isbn: [FilterOperator.EQ],
        isbn13: [FilterOperator.EQ],
        'authorBooks.author.id': [FilterOperator.EQ],
        genre_id: [FilterOperator.EQ],
      },
      ...(query.filter?.authorId && {
        where: {
          authorBooks: {
            authorId: Number(query.filter.authorId),
          },
        },
      }),
      maxLimit: 100,
    });

    // 각 책에 대해 전체 번역서 개수 추가
    books.data = books.data.map((book) => {
      const totalTranslationCount = new Set(
        book.bookOriginalWorks.flatMap((bow) =>
          bow.originalWork.bookOriginalWorks.map((obow) => obow.book.id),
        ),
      ).size;

      return {
        ...book,
        totalTranslationCount,
      };
    });

    if (userId) {
      const userLikes = await this.userBookLikeRepository.find({
        where: {
          userId,
          bookId: In(books.data.map((book) => book.id)),
        },
      });

      const likedBookIds = new Set(userLikes.map((like) => like.bookId));

      books.data = books.data.map((book) => ({
        ...book,
        isLiked: likedBookIds.has(book.id),
      }));
    }

    return books;
  }
  /**
   * 책 좋아요를 토글합니다.
   */
  async toggleLike(userId: number, bookId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const book = await queryRunner.manager.findOne(Book, {
        where: { id: bookId },
      });

      if (!book) {
        throw new NotFoundException('책을 찾을 수 없습니다.');
      }

      const existingLike = await queryRunner.manager.findOne(UserBookLike, {
        where: { userId, bookId },
      });

      if (existingLike) {
        await queryRunner.manager.remove(UserBookLike, existingLike);
        // likeCount 감소
        await queryRunner.manager.decrement(
          Book,
          { id: bookId },
          'likeCount',
          1,
        );
        await queryRunner.commitTransaction();
        return { liked: false };
      } else {
        await queryRunner.manager.save(UserBookLike, {
          userId,
          bookId,
        });
        // likeCount 증가
        await queryRunner.manager.increment(
          Book,
          { id: bookId },
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
   * 연관된 책 목록(같은 원전의 다른 번역서들)을 조회합니다.
   */
  async searchRelatedBooks(bookId: number, query: PaginateQuery) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['bookOriginalWorks.originalWork'],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    const originalWorkIds = book.bookOriginalWorks.map(
      (bow) => bow.originalWork.id,
    );

    // 원전이 없는 경우 빈 결과 반환
    if (originalWorkIds.length === 0) {
      return {
        data: [],
        meta: {
          itemsPerPage: query.limit || 10,
          totalItems: 0,
          currentPage: query.page || 1,
          totalPages: 0,
        },
      };
    }

    // 서브쿼리를 사용하여 같은 원전을 하나라도 공유하는 책들을 찾습니다
    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .innerJoinAndSelect('book.bookOriginalWorks', 'bow')
      .innerJoinAndSelect('bow.originalWork', 'originalWork')
      .innerJoinAndSelect('book.authorBooks', 'ab')
      .innerJoinAndSelect('ab.author', 'author')
      .where((qb) => {
        const subQuery = qb
          .subQuery()
          .select('DISTINCT bow2.book_id')
          .from('book_original_work', 'bow2')
          .where('bow2.original_work_id IN (:...originalWorkIds)', {
            originalWorkIds,
          })
          .getQuery();
        return 'book.id IN ' + subQuery;
      })
      .andWhere('book.id != :bookId', { bookId });

    const paginatedBooks = await paginate(query, queryBuilder, {
      sortableColumns: [
        'id',
        'title',
        'publicationDate',
        'likeCount',
        'reviewCount',
      ],
      defaultSortBy: [['publicationDate', 'DESC']],
      maxLimit: 20,
    });

    // 각 책에 대해 전체 번역서 개수 추가
    paginatedBooks.data = await Promise.all(
      paginatedBooks.data.map(async (book) => {
        const bookWithRelations = await this.bookRepository.findOne({
          where: { id: book.id },
          relations: [
            'bookOriginalWorks.originalWork',
            'bookOriginalWorks.originalWork.bookOriginalWorks.book',
          ],
        });

        const totalTranslationCount = new Set(
          bookWithRelations.bookOriginalWorks.flatMap((bow) =>
            bow.originalWork.bookOriginalWorks.map((obow) => obow.book.id),
          ),
        ).size;

        return {
          ...book,
          totalTranslationCount,
        };
      }),
    );

    return paginatedBooks;
  }

  /**
   * 연관된 모든 책 목록(같은 원전의 다른 번역서들)을 조회합니다.
   * 페이지네이션 없이 전체 목록을 반환합니다.
   */
  async getAllRelatedBooks(bookId: number) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['bookOriginalWorks.originalWork'],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    const originalWorkIds = book.bookOriginalWorks.map(
      (bow) => bow.originalWork.id,
    );

    // 원전이 없는 경우 빈 배열 반환
    if (originalWorkIds.length === 0) {
      return [];
    }

    const relatedBooks = await this.bookRepository.find({
      where: {
        id: Not(bookId),
        bookOriginalWorks: {
          originalWork: {
            id: In(originalWorkIds),
          },
        },
      },
      relations: [
        'authorBooks.author',
        'bookOriginalWorks.originalWork',
        'bookOriginalWorks.originalWork.bookOriginalWorks.book',
      ],
    });

    // 각 책에 대해 전체 번역서 개수 추가
    return relatedBooks.map((book) => {
      const totalTranslationCount = new Set(
        book.bookOriginalWorks.flatMap((bow) =>
          bow.originalWork.bookOriginalWorks.map((obow) => obow.book.id),
        ),
      ).size;

      return {
        ...book,
        totalTranslationCount,
      };
    });
  }

  /**
   * 책의 리뷰 목록을 조회합니다.
   */
  async getBookReviews(bookId: number, query: PaginateQuery, userId?: number) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    const reviews = await paginate(query, this.reviewRepository, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      where: { bookId },
      relations: ['user', 'book'],
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
}
