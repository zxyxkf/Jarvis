import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request } from 'express'
import { AuthService } from './auth.service'
import { RegisterDto, LoginDto, RefreshDto } from './dto/auth.dto'

interface JwtRequest extends Request {
  user: { id: string; email: string; role: string }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.name)
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password)
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshToken(dto.refreshToken)
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: JwtRequest) {
    return this.authService.getProfile(req.user.id)
  }
}
