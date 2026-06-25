import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }))

  app.setGlobalPrefix('api/v1')
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })

  const port = process.env.PORT || 3000
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`[Jarvis Server] Running on http://localhost:${port}`)
  // eslint-disable-next-line no-console
  console.log(`[Jarvis Server] API: http://localhost:${port}/api/v1`)
}

bootstrap()
