import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  Matches,
} from 'class-validator';

// 1단계: 이메일 유효성 검사
export class CheckEmailDto {
  @IsEmail()
  email: string;
}

// 2단계: 회원정보 입력 및 이메일 인증코드 발송
export class InitiateRegistrationDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        '비밀번호는 최소 8자, 대문자, 소문자, 숫자, 특수문자를 포함해야 합니다.',
    },
  )
  password: string;

  @IsString()
  @MinLength(2)
  @Matches(/^[가-힣a-zA-Z0-9]{2,10}$/, {
    message: '닉네임은 2-10자의 한글, 영문, 숫자만 가능합니다.',
  })
  nickname: string;
}

// 3단계: 이메일 인증코드 확인 및 회원가입 완료
export class CompleteRegistrationDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  verificationCode: string;
}

// 기존 DTO들 유지
export class EmailVerificationDto {
  @IsEmail()
  email: string;
}

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
