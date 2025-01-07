import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@entities/User';
import { UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { FilterOperator, PaginateQuery, paginate } from 'nestjs-paginate';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * ID로 사용자를 찾습니다.
   */
  async findById(id: number): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'email', 'nickname', 'verified', 'createdAt', 'updatedAt'],
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
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
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
        updatedAt: new Date(),
      });
    }

    // 비밀번호 변경
    if (updateUserDto.newPassword) {
      const isPasswordValid = await bcrypt.compare(
        updateUserDto.currentPassword,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
      }

      const hashedPassword = await bcrypt.hash(
        updateUserDto.newPassword,
        Number(this.configService.get('HASH_ROUNDS')),
      );

      await this.userRepository.update(userId, {
        password: hashedPassword,
        updatedAt: new Date(),
      });
    }

    return this.findById(userId);
  }

  /**
   * 사용자 계정을 삭제합니다.
   */
  async deleteUser(
    userId: number,
  ): Promise<{ message: string; action: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    await this.userRepository.softDelete(userId);

    return {
      message: '회원 탈퇴가 완료되었습니다.',
      action: 'CLEAR_AUTH', // 클라이언트에서 액세스 토큰을 삭제하도록 알림
    };
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
      sortableColumns: ['id', 'email', 'nickname', 'createdAt', 'updatedAt'],
      searchableColumns: ['email', 'nickname'],
      defaultSortBy: [['createdAt', 'DESC']],
      select: ['id', 'email', 'nickname', 'verified', 'createdAt', 'updatedAt'],
      filterableColumns: {
        email: [FilterOperator.ILIKE],
        nickname: [FilterOperator.ILIKE],
        verified: [FilterOperator.EQ],
      },
      maxLimit: 100,
    });
  }
}
