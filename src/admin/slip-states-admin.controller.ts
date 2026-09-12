import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../auth/admin-jwt.guard';
import { SlipStatesAdminService } from './slip-states-admin.service';

@UseGuards(AdminJwtGuard)
@Controller('admin/slip-states')
export class SlipStatesAdminController {
  constructor(private readonly service: SlipStatesAdminService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  getActive() {
    return this.service.getActive();
  }

  @Post('active')
  setActive(@Body() body: { slipGroup: number | null }) {
    return this.service.setActive(body.slipGroup);
  }

  @Post('group')
  createGroup(@Body() body: { images: string[] }) {
    return this.service.createGroup(body.images ?? []);
  }

  @Post('group/:slipGroup')
  addToGroup(
    @Param('slipGroup') slipGroup: string,
    @Body() body: { images: string[] },
  ) {
    return this.service.addToGroup(+slipGroup, body.images ?? []);
  }

  @Delete(':id')
  removeImage(@Param('id') id: string) {
    return this.service.removeImage(+id);
  }

  @Delete('group/:slipGroup')
  removeGroup(@Param('slipGroup') slipGroup: string) {
    return this.service.removeGroup(+slipGroup);
  }
}
