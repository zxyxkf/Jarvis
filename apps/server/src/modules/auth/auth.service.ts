import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '@/infrastructure/database/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) throw new ConflictException('邮箱已注册')

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
    })
    return this.generateTokens(user.id)
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) throw new UnauthorizedException('邮箱或密码错误')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('邮箱或密码错误')

    return this.generateTokens(user.id)
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      }) as { sub: string }
      return this.generateTokens(payload.sub)
    } catch {
      throw new UnauthorizedException('Token 已过期，请重新登录')
    }
  }

  private generateTokens(userId: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
    )
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      },
    )
    return { accessToken, refreshToken }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true },
    })
    if (!user) throw new UnauthorizedException('用户不存在')
    return user
  }

  async updateProfile(userId: string, data: { name?: string; avatarUrl?: string; currentPassword?: string; newPassword?: string }) {
    const updateData: Record<string, unknown> = {}
    if (data.name) updateData['name'] = data.name
    if (data.avatarUrl !== undefined) updateData['avatarUrl'] = data.avatarUrl

    if (data.currentPassword && data.newPassword) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } })
      if (!user) throw new UnauthorizedException('用户不存在')
      const valid = await bcrypt.compare(data.currentPassword, user.passwordHash)
      if (!valid) throw new UnauthorizedException('当前密码错误')
      updateData['passwordHash'] = await bcrypt.hash(data.newPassword, 12)
    }

    if (Object.keys(updateData).length === 0) return this.getProfile(userId)

    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, email: true, name: true, avatarUrl: true, role: true, createdAt: true },
    })
  }
}
