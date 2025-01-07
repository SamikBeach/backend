import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  UnauthorizedException,
  Patch,
  BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/user.dto';
import { User } from '@entities/User';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 현재 로그인한 사용자의 정보를 조회합니다.
   */
  @Get('me')
  async getMyProfile(@CurrentUser() user: User) {
    return this.userService.findById(user.id);
  }

  /**
   * 사용자의 닉네임이나 비밀번호를 변경합니다.
   */
  @Patch('me')
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // 닉네임과 비밀번호 동시 변경 방지
    if (updateUserDto.nickname && updateUserDto.newPassword) {
      throw new BadRequestException(
        '닉네임과 비밀번호는 동시에 변경할 수 없습니다.',
      );
    }

    // 닉네임 변경 시 닉네임 필드 확인
    if (!updateUserDto.nickname && updateUserDto.nickname !== undefined) {
      throw new BadRequestException('닉네임을 입력해주세요.');
    }

    // 비밀번호 변경 시 현재 비밀번호 확인
    if (updateUserDto.newPassword && !updateUserDto.currentPassword) {
      throw new UnauthorizedException('현재 비밀번호를 입력해주세요.');
    }

    // 비밀번호 변경 시 새 비밀번호 확인
    if (!updateUserDto.newPassword && updateUserDto.currentPassword) {
      throw new BadRequestException('새 비밀번호를 입력해주세요.');
    }

    return this.userService.updateUser(user.id, updateUserDto);
  }

  /**
   * 회원 탈퇴를 처리합니다.
   */
  @Delete('me')
  async deleteMyAccount(@CurrentUser() user: User) {
    return this.userService.deleteUser(user.id);
  }
}
