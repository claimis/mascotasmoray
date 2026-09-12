import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSlipState } from '../admin/entities/admin-slip-state.entity';
import { PromoActive } from '../admin/entities/promo-active.entity';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [TypeOrmModule.forFeature([AdminSlipState, PromoActive])],
  controllers: [PromotionsController],
  providers: [PromotionsService],
})
export class PromotionsModule {}
