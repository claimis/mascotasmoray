import { Controller, Get } from '@nestjs/common';
import { PromotionsService } from './promotions.service';

@Controller('promociones')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  @Get('active')
  findActive() {
    return this.service.findActive();
  }
}
