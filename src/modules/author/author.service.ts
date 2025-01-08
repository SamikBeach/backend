import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Author } from '@entities/Author';
import { UserAuthorLike } from '@entities/UserAuthorLike';
import { Book } from '@entities/Book';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';

@Injectable()
export class AuthorService {
  constructor(
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(UserAuthorLike)
    private readonly userAuthorLikeRepository: Repository<UserAuthorLike>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * ID로 저자를 찾습니다.
   */
  async findById(id: number) {
    const author = await this.authorRepository.findOne({
      where: { id },
      relations: ['authorBooks.book'],
    });

    if (!author) {
      throw new NotFoundException('저자를 찾을 수 없습니다.');
    }

    return author;
  }

  /**
   * 저자를 검색하고 페이지네이션된 결과를 반환합니다.
   */
  async search(query: PaginateQuery) {
    return paginate(query, this.authorRepository, {
      sortableColumns: [
        'id',
        'name',
        'nameInKor',
        'bornDate',
        'diedDate',
        'likeCount',
        'reviewCount',
      ],
      searchableColumns: ['name', 'nameInKor'],
      defaultSortBy: [['id', 'DESC']],
      filterableColumns: {
        name: [FilterOperator.ILIKE],
        nameInKor: [FilterOperator.ILIKE],
      },
      maxLimit: 100,
    });
  }

  /**
   * 저자 좋아요를 토글합니다.
   */
  async toggleLike(userId: number, authorId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const author = await queryRunner.manager.findOne(Author, {
        where: { id: authorId },
      });

      if (!author) {
        throw new NotFoundException('저자를 찾을 수 없습니다.');
      }

      const existingLike = await queryRunner.manager.findOne(UserAuthorLike, {
        where: { userId, authorId },
      });

      if (existingLike) {
        await queryRunner.manager.remove(UserAuthorLike, existingLike);
        await queryRunner.commitTransaction();
        return { liked: false };
      } else {
        await queryRunner.manager.save(UserAuthorLike, {
          userId,
          authorId,
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
   * 저자가 쓴 책 목록을 조회합니다.
   */
  async getAuthorBooks(authorId: number, query: PaginateQuery) {
    const author = await this.authorRepository.findOne({
      where: { id: authorId },
    });

    if (!author) {
      throw new NotFoundException('저자를 찾을 수 없습니다.');
    }

    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .innerJoinAndSelect('book.authorBooks', 'ab')
      .innerJoinAndSelect('ab.author', 'author')
      .where('author.id = :authorId', { authorId });

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
}
