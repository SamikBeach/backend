import { IsString, MinLength, Matches, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @Matches(/^[가-힣a-zA-Z0-9]{2,10}$/, {
    message: '닉네임은 2-10자의 한글, 영문, 숫자만 가능합니다.',
  })
  nickname?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        '비밀번호는 최소 8자, 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.',
    },
  )
  password?: string;

  @IsOptional()
  @IsString()
  currentPassword?: string;
}
