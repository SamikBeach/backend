import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Book } from '@entities/Book';
import { Author } from '@entities/Author';
import { addKoreanSearchCondition } from '@utils/search';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
  ) {}

  async search(keyword: string) {
    const [books, authors] = await Promise.all([
      this.bookRepository
        .createQueryBuilder('book')
        .leftJoinAndSelect('book.authorBooks', 'authorBooks')
        .leftJoinAndSelect('authorBooks.author', 'author')
        .leftJoinAndSelect('book.bookOriginalWorks', 'bookOriginalWorks')
        .leftJoinAndSelect('bookOriginalWorks.originalWork', 'originalWork')
        .leftJoinAndSelect(
          'originalWork.bookOriginalWorks',
          'originalWorkBooks',
        )
        .leftJoinAndSelect('originalWorkBooks.book', 'relatedBook')
        .where(
          new Brackets((qb) => {
            addKoreanSearchCondition(qb, 'book.title', keyword, 'book');
          }),
        )
        .take(3)
        .getMany(),

      this.authorRepository
        .createQueryBuilder('author')
        .leftJoinAndSelect('author.authorBooks', 'authorBooks')
        .leftJoinAndSelect('authorBooks.book', 'book')
        .leftJoinAndSelect('book.bookOriginalWorks', 'bookOriginalWorks')
        .leftJoinAndSelect('bookOriginalWorks.originalWork', 'originalWork')
        .leftJoinAndSelect(
          'originalWork.bookOriginalWorks',
          'originalWorkBooks',
        )
        .leftJoinAndSelect('originalWorkBooks.book', 'relatedBook')
        .where(
          new Brackets((qb) => {
            addKoreanSearchCondition(
              qb,
              'author.nameInKor',
              keyword,
              'authorKor',
            );
            addKoreanSearchCondition(qb, 'author.name', keyword, 'authorEng');
          }),
        )
        .take(3)
        .getMany(),
    ]);

    const booksWithCount = books.map((book) => {
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

    const authorsWithCount = authors.map((author) => {
      const bookCount = author.authorBooks.length;

      return {
        ...author,
        bookCount,
      };
    });

    return {
      books: booksWithCount,
      authors: authorsWithCount,
    };
  }
}
