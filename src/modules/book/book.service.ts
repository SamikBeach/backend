import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not } from 'typeorm';
import { Book } from '@entities/Book';
import { UserBookLike } from '@entities/UserBookLike';
import { Review } from '@entities/Review';
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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * ID로 책을 찾습니다.
   */
  async findById(id: number, userId?: number) {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: ['authorBooks.author'],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    if (userId) {
      const userLike = await this.userBookLikeRepository.findOne({
        where: { userId, bookId: id },
      });

      return {
        ...book,
        isLiked: !!userLike,
      };
    }

    return book;
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
      searchableColumns: ['title', 'publisher', 'isbn', 'isbn13'],
      defaultSortBy: [['id', 'DESC']],
      relations: ['authorBooks', 'authorBooks.author'],
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
   * 연관된 책 목록(같은 저자의 다른 책들)을 조회합니다.
   */
  async searchRelatedBooks(bookId: number, query: PaginateQuery) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['authorBooks', 'authorBooks.author'],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    const authorIds = book.authorBooks.map((ab) => ab.author.id);

    // 저자가 없는 경우 빈 결과 반환
    if (authorIds.length === 0) {
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

    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .innerJoinAndSelect('book.authorBooks', 'ab')
      .innerJoinAndSelect('ab.author', 'author')
      .where('author.id IN (:...authorIds)', { authorIds })
      .andWhere('book.id != :bookId', { bookId });

    return paginate(query, queryBuilder, {
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
  }

  /**
   * 연관된 모든 책 목록(같은 저자의 다른 책들)을 조회합니다.
   * 페이지네이션 없이 전체 목록을 반환합니다.
   */
  async getAllRelatedBooks(bookId: number) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
      relations: ['authorBooks', 'authorBooks.author'],
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    const authorIds = book.authorBooks.map((ab) => ab.author.id);

    // 저자가 없는 경우 빈 배열 반환
    if (authorIds.length === 0) {
      return [];
    }

    return this.bookRepository.find({
      where: {
        id: Not(bookId),
        authorBooks: {
          author: {
            id: In(authorIds),
          },
        },
      },
      relations: ['authorBooks', 'authorBooks.author'],
    });
  }

  /**
   * 책의 리뷰 목록을 조회합니다.
   */
  async getBookReviews(bookId: number, query: PaginateQuery) {
    const book = await this.bookRepository.findOne({
      where: { id: bookId },
    });

    if (!book) {
      throw new NotFoundException('책을 찾을 수 없습니다.');
    }

    return paginate(query, this.reviewRepository, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      where: { bookId },
      relations: ['user', 'book'],
    });
  }
}
