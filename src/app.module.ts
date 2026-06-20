import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AuthModule } from './infrastructure/auth/auth.module';
import { EquipeModule } from './infrastructure/http/equipe/equipe.module';
import { FinaleModule } from './infrastructure/http/finale/finale.module';
import { AdminGuard } from './infrastructure/http/shared/admin.guard';
import { TourModule } from './infrastructure/http/tour/tour.module';
import { UsersModule } from './infrastructure/http/users/users.module';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    HealthModule,
    EquipeModule,
    TourModule,
    UsersModule,
    FinaleModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: AdminGuard }],
})
export class AppModule {}
