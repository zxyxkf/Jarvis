import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    })
  }

  async validate(payload: { sub: string }) {
    // Lazy-load Prisma to avoid tsx DI issues in Passport strategies
    const { PrismaService } = await import('@/infrastructure/database/prisma.service')
    const prisma = new PrismaService()
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) throw new UnauthorizedException()
    return { id: user.id, email: user.email, role: user.role }
  }
}
