import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator'

export class RegisterDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password!: string

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name!: string
}

export class LoginDto {
  @IsEmail()
  email!: string

  @IsString()
  @MinLength(1)
  password!: string
}

export class RefreshDto {
  @IsString()
  refreshToken!: string
}
