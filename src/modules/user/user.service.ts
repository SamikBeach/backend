import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@entities/User';
import { UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

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

    // 닉네임 중복 확인
    if (updateUserDto.nickname) {
      const existingNickname = await this.userRepository.findOne({
        where: { nickname: updateUserDto.nickname },
      });

      if (existingNickname && existingNickname.id !== userId) {
        throw new UnauthorizedException('이미 사용 중인 닉네임입니다.');
      }
    }

    // 비밀번호 변경 처리
    if (updateUserDto.password) {
      const isPasswordValid = await bcrypt.compare(
        updateUserDto.currentPassword,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('현재 비밀번호가 일치하지 않습니다.');
      }

      updateUserDto.password = await bcrypt.hash(
        updateUserDto.password,
        Number(this.configService.get('HASH_ROUNDS')),
      );
    }

    // 업데이트할 필드 준비
    const updateData: Partial<User> = {
      ...(updateUserDto.nickname && { nickname: updateUserDto.nickname }),
      ...(updateUserDto.password && { password: updateUserDto.password }),
      updatedAt: new Date(),
    };

    await this.userRepository.update(userId, updateData);

    return this.findById(userId);
  }

  /**
   * 사용자 계정을 삭제합니다.
   */
  async deleteUser(userId: number): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    await this.userRepository.softDelete(userId);

    return { message: '회원 탈퇴가 완료되었습니다.' };
  }
}
