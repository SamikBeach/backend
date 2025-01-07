import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/user.dto';
import { User } from '@entities/User';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@Controller('user')
@UseGuards(JwtAuthGuard)
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
   * 사용자 정보를 수정합니다.
   * 닉네임이나 비밀번호를 변경할 수 있습니다.
   */
  @Put('me')
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // 비밀번호 변경 시 현재 비밀번호 확인
    if (updateUserDto.password && !updateUserDto.currentPassword) {
      throw new UnauthorizedException('현재 비밀번호를 입력해주세요.');
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
