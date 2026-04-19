import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JiraTokenGuard } from './common/guards/jira-token.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validate + transform all incoming request bodies
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Consistent JSON error shape for all exceptions
  app.useGlobalFilters(new AllExceptionsFilter());

  // Require X-Jira-Token on every request except /health
  app.useGlobalGuards(new JiraTokenGuard());

  // CORS — allow the JiraPilot Vercel frontend + local dev
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = (process.env.ALLOWED_ORIGIN ?? '*').split(',').map(s => s.trim());
      if (!origin || allowed.includes('*') || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Jira-Token', 'X-Jira-Email', 'X-OpenRouter-Key', 'X-Model'],
    credentials: false,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`MCP server running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
