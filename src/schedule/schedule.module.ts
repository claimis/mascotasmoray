import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StoreSchedule } from './entities/store-schedule.entity';
import { StoreException } from './entities/store-exception.entity';
import { ScheduleController, ScheduleAdminController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [TypeOrmModule.forFeature([StoreSchedule, StoreException]), PassportModule],
  controllers: [ScheduleController, ScheduleAdminController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
