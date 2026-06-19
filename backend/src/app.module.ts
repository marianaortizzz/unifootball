import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { loggerOptions } from './logging/logger.options';
import { MetricsModule } from './metrics/metrics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MatchesModule } from './matches/matches.module';
import { NotifyModule } from './notify/notify.module';
import { StatsModule } from './stats/stats.module';
import { TournamentsModule } from './tournaments/tournaments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(loggerOptions),
    MetricsModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true, // solo para desarrollo
        // SSL solo para proveedores cloud (Supabase). En local se desactiva
        // con DB_SSL=false para no romper la conexión a un Postgres sin TLS.
        ssl:
          config.get<string>('DB_SSL') === 'false'
            ? false
            : { rejectUnauthorized: false },
      }),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    AuthModule,
    TournamentsModule,
    MatchesModule,
    StatsModule,
    NotifyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
