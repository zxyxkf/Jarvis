import { Controller, Post, Body, Get, Patch, UseGuards, Req, BadRequestException, Inject } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import type { Request } from 'express'
import { AuthService } from './auth.service'

interface JwtRequest extends Request { user: { id: string; email: string; role: string } }

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: { email: string; password: string; name: string }) {
    if (!body.email || !body.password || !body.name) throw new BadRequestException('Missing fields')
    return this.authService.register(body.email, body.password, body.name)
  }
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    if (!body.email || !body.password) throw new BadRequestException('Missing fields')
    return this.authService.login(body.email, body.password)
  }
  @Post('refresh')
  refresh(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) throw new BadRequestException('Missing refreshToken')
    return this.authService.refreshToken(body.refreshToken)
  }
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: JwtRequest) { return this.authService.getProfile(req.user.id) }

  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(@Req() req: JwtRequest, @Body() body: { name?: string; avatarUrl?: string; currentPassword?: string; newPassword?: string }) {
    return this.authService.updateProfile(req.user.id, body)
  }
}
