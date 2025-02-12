import { IsString, MinLength, Matches, IsOptional } from 'class-validator';

// 닉네임 변경 DTO
export class UpdateNicknameDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[가-힣a-zA-Z0-9]{2,10}$/, {
    message: '닉네임은 2-10자의 한글, 영문, 숫자만 가능합니다.',
  })
  nickname: string;
}

// 비밀번호 변경 DTO
export class UpdatePasswordDto {
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        '비밀번호는 최소 8자, 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.',
    },
  )
  newPassword: string;

  @IsString()
  currentPassword: string;
}

// 통합 수정 DTO
export class UpdateUserDto {
  @IsString()
  @IsOptional()
  nickname?: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class BlockedUserDto {
  id: number;
  nickname: string;
  imageUrl?: string;
}
