import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../auth/admin-jwt.guard';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly service: ScheduleService) {}

  @Get()
  getSchedule() {
    return this.service.getPublic();
  }
}

@UseGuards(AdminJwtGuard)
@Controller('admin/schedule')
export class ScheduleAdminController {
  constructor(private readonly service: ScheduleService) {}

  @Put('weekly')
  saveWeekly(@Body() body: { days: any[] }) {
    return this.service.saveWeekly(body.days);
  }

  @Post('exceptions')
  saveException(@Body() body: any) {
    return this.service.saveException(body);
  }

  @Post('range')
  saveRange(@Body() body: any) {
    return this.service.saveRange(body);
  }

  @Delete('range/:rangeId')
  removeRange(@Param('rangeId') rangeId: string) {
    return this.service.removeRange(rangeId);
  }

  @Delete('exceptions/:date')
  removeException(@Param('date') date: string) {
    return this.service.removeException(date);
  }
}
