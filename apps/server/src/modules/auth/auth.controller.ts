import { Controller, Post, Body, Get, Patch, UseGuards, Req, Res, Param, Query, UploadedFile, UseInterceptors, BadRequestException, Inject } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'
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
  login(@Body() body: { account: string; password: string }) {
    if (!body.account || !body.password) throw new BadRequestException('Missing fields')
    return this.authService.login(body.account, body.password)
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
  updateProfile(@Req() req: JwtRequest, @Body() body: { name?: string; email?: string; avatarUrl?: string; currentPassword?: string; newPassword?: string }) {
    return this.authService.updateProfile(req.user.id, body)
  }

  @Post('avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@Req() req: JwtRequest, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded')
    return this.authService.uploadAvatar(req.user.id, file)
  }

  @Get('avatar/:userId')
  async serveAvatar(@Param('userId') userId: string, @Query('key') key: string, @Res() res: Response) {
    return this.authService.serveAvatar(userId, key, res)
  }
}
