import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@entities/User';
import { UpdateUserDto, ChangePasswordDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';
import { UserBookLike } from '@entities/UserBookLike';
import { UserAuthorLike } from '@entities/UserAuthorLike';
import { Review } from '@entities/Review';
import { UserSearch } from '@entities/UserSearch';
import { FileService } from '../file/file.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserBookLike)
    private readonly userBookLikeRepository: Repository<UserBookLike>,
    @InjectRepository(UserAuthorLike)
    private readonly userAuthorLikeRepository: Repository<UserAuthorLike>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly configService: ConfigService,
    @InjectRepository(UserSearch)
    private readonly userSearchRepository: Repository<UserSearch>,
    private readonly fileService: FileService,
  ) {}

  /**
   * ID로 사용자를 찾습니다.
   */
  async findById(
    id: number,
  ): Promise<Pick<User, 'id' | 'email' | 'nickname' | 'imageUrl'>> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'nickname', 'imageUrl'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return user;
  }

  /**
   * 사용자 정보를 수정합니다.
   */
  async updateUser(
    userId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<Pick<User, 'id' | 'email' | 'nickname' | 'imageUrl'>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'nickname', 'imageUrl'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 닉네임 변경
    if (updateUserDto.nickname) {
      const existingNickname = await this.userRepository.findOne({
        where: { nickname: updateUserDto.nickname },
      });

      if (existingNickname && existingNickname.id !== userId) {
        throw new ConflictException('이미 사용 중인 닉네임입니다.');
      }

      await this.userRepository.update(userId, {
        nickname: updateUserDto.nickname,
      });
    }

    return this.findById(userId);
  }

  /**
   * 사용자 계정을 삭제합니다.
   */
  async deleteUser(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    await this.userRepository.softDelete(userId);
  }

  /**
   * 사용자를 검색하고 페이지네이션된 결과를 반환합니다.
   *
   * @param query PaginateQuery - 검색, 필터링, 정렬, 페이지네이션 옵션
   * @returns {
   *   data: User[] - 페이지네이션된 사용자 목록
   *   meta: {
   *     itemsPerPage: number - 페이지당 항목 수
   *     totalItems: number - 전체 항목 수
   *     currentPage: number - 현재 페이지
   *     totalPages: number - 전체 페이지 수
   *     sortBy: [string, string][] - 정렬 기준
   *     searchBy: string[] - 검색 대상 필드
   *     search: string - 검색어
   *     filter: object - 적용된 필터
   *   }
   *   links: {
   *     first: string - 첫 페이지 URL
   *     previous: string - 이전 페이지 URL
   *     current: string - 현재 페이지 URL
   *     next: string - 다음 페이지 URL
   *     last: string - 마지막 페이지 URL
   *   }
   * }
   *
   * @description
   * 1. 검색 가능한 필드: email, nickname
   * 2. 정렬 가능한 필드: id, email, nickname, createdAt, updatedAt
   * 3. 필터링 가능한 필드:
   *    - email (ILIKE): 이메일 부분 일치
   *    - nickname (ILIKE): 닉네임 부분 일치
   *    - verified (EQ): 인증 상태 일치
   * 4. 기본 정렬: createdAt DESC
   * 5. 최대 조회 개수: 100개
   */
  async search(query: PaginateQuery) {
    return await paginate(query, this.userRepository, {
      sortableColumns: ['id', 'email', 'nickname', 'imageUrl'],
      searchableColumns: ['email', 'nickname'],
      defaultSortBy: [['createdAt', 'DESC']],
      select: ['id', 'email', 'nickname', 'imageUrl'],
      filterableColumns: {
        email: [FilterOperator.ILIKE],
        nickname: [FilterOperator.ILIKE],
        verified: [FilterOperator.EQ],
      },
      maxLimit: 100,
    });
  }

  /**
   * 사용자가 좋아하는 책 목록을 조회합니다.
   */
  async getLikedBooks(userId: number, query: PaginateQuery) {
    const likes = await paginate(query, this.userBookLikeRepository, {
      sortableColumns: ['id'],
      defaultSortBy: [['id', 'DESC']],
      relations: [
        'book',
        'book.authorBooks.author',
        'book.bookOriginalWorks.originalWork.bookOriginalWorks.book',
      ],
      where: { userId },
    });

    likes.data = likes.data.map((like) => {
      const totalTranslationCount = new Set(
        like.book.bookOriginalWorks.flatMap((bow) =>
          bow.originalWork.bookOriginalWorks.map((obow) => obow.book.id),
        ),
      ).size;

      return {
        ...like,
        book: {
          ...like.book,
          totalTranslationCount,
        },
      };
    });

    return likes;
  }

  /**
   * 사용자가 좋아하는 저자 목록을 조회합니다.
   */
  async getLikedAuthors(userId: number, query: PaginateQuery) {
    const likes = await paginate(query, this.userAuthorLikeRepository, {
      sortableColumns: ['id'],
      defaultSortBy: [['id', 'DESC']],
      relations: ['author', 'author.authorBooks'],
      where: { userId },
    });

    likes.data = likes.data.map((like) => {
      const bookCount = like.author.authorBooks.length;

      return {
        ...like,
        author: {
          ...like.author,
          bookCount,
        },
      };
    });

    return likes;
  }

  /**
   * 사용자가 작성한 리뷰 목록을 조회합니다.
   */
  async getReviews(userId: number, query: PaginateQuery) {
    return paginate(query, this.reviewRepository, {
      sortableColumns: ['id', 'createdAt', 'updatedAt'],
      defaultSortBy: [['createdAt', 'DESC']],
      relations: [
        'book',
        'book.authorBooks',
        'book.authorBooks.author',
        'user',
      ],
      where: { userId },
    });
  }

  /**
   * 비밀번호를 변경합니다.
   */
  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (!user.password) {
      throw new UnauthorizedException('비밀번호가 설정되지 않은 계정입니다.');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
    }

    const hashedPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      Number(this.configService.get('HASH_ROUNDS')),
    );

    await this.userRepository.update(userId, {
      password: hashedPassword,
    });

    return { message: '비밀번호가 변경되었습니다.' };
  }

  async getRecentSearches(userId: number) {
    const searches = await this.userSearchRepository.find({
      where: { userId },
      relations: [
        'book',
        'author',
        'book.authorBooks.author',
        'book.bookOriginalWorks.originalWork.bookOriginalWorks.book',
        'author.authorBooks',
        'author.authorBooks.book',
        'author.authorBooks.book.bookOriginalWorks.originalWork.bookOriginalWorks.book',
      ],
      order: { createdAt: 'DESC' },
      take: 6,
    });

    return searches.map((search) => {
      if (search.book) {
        const totalTranslationCount = new Set(
          search.book.bookOriginalWorks.flatMap((bow) =>
            bow.originalWork.bookOriginalWorks.map((obow) => obow.book.id),
          ),
        ).size;

        return {
          ...search,
          book: {
            ...search.book,
            totalTranslationCount,
          },
        };
      }

      if (search.author) {
        const bookCount = search.author.authorBooks.length;
        const translationsCount = new Set(
          search.author.authorBooks.flatMap((ab) =>
            ab.book.bookOriginalWorks.flatMap((bow) =>
              bow.originalWork.bookOriginalWorks.map((obow) => obow.book.id),
            ),
          ),
        ).size;

        return {
          ...search,
          author: {
            ...search.author,
            bookCount,
            translationsCount,
          },
        };
      }

      return search;
    });
  }

  async saveSearch(userId: number, bookId?: number, authorId?: number) {
    // 이미 존재하는 검색 기록 삭제
    if (bookId) {
      await this.userSearchRepository.delete({
        userId,
        bookId,
      });
    }
    if (authorId) {
      await this.userSearchRepository.delete({
        userId,
        authorId,
      });
    }

    // 새로운 검색 기록 저장
    const search = this.userSearchRepository.create({
      userId,
      bookId: bookId || null,
      authorId: authorId || null,
    });

    await this.userSearchRepository.save(search);
  }

  async deleteSearch(userId: number, searchId: number) {
    const search = await this.userSearchRepository.findOne({
      where: { id: searchId, userId },
    });

    if (!search) {
      throw new NotFoundException('검색 기록을 찾을 수 없습니다.');
    }

    await this.userSearchRepository.remove(search);
  }

  /**
   * 프로필 이미지를 업로드합니다.
   */
  async uploadProfileImage(
    userId: number,
    file: Express.Multer.File,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'imageUrl'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 기존 이미지가 있다면 삭제
    if (user.imageUrl) {
      await this.fileService.deleteFile(user.imageUrl);
    }

    // 새 이미지 업로드
    const imageUrl = await this.fileService.uploadProfileImage(file, userId);

    // 이미지 URL 업데이트
    user.imageUrl = imageUrl;
    await this.userRepository.save(user);

    return user;
  }

  /**
   * 프로필 이미지를 삭제합니다.
   */
  async deleteProfileImage(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'imageUrl'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (!user.imageUrl) {
      throw new BadRequestException('프로필 이미지가 없습니다.');
    }

    // 파일 삭제
    await this.fileService.deleteFile(user.imageUrl);

    // DB에서 이미지 URL 제거
    user.imageUrl = null;
    await this.userRepository.save(user);

    return user;
  }
}
