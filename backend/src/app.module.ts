import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProvidersModule } from './providers/providers.module';
import { AgentsModule } from './agents/agents.module';
import { DockerModule } from './docker/docker.module';
import { PhonesModule } from './phones/phones.module';
import { NumbersModule } from './numbers/numbers.module';
import { TrunksModule } from './trunks/trunks.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: (process.env.DB_TYPE as 'sqlite') || 'sqlite',
        database: process.env.DB_DATABASE || '/app/data/data.db',
        synchronize: true,
        autoLoadEntities: true,
      }),
    }),
    AuthModule,
    UsersModule,
    ProvidersModule,
    AgentsModule,
    DockerModule,
    PhonesModule,
    NumbersModule,
    TrunksModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
