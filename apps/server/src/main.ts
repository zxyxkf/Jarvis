import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api/v1')
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })

  const port = process.env.PORT || 3000
  await app.listen(port)
  console.log(`[Jarvis Server] Running on http://localhost:${port}`)
  console.log(`[Jarvis Server] API: http://localhost:${port}/api/v1`)
}

bootstrap()
