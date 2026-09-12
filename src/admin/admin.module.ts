import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../products/entities/supplier.entity';
import { ProductDetail } from '../products/entities/product-detail.entity';
import { User } from '../users/entities/user.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { AdminSlipState } from './entities/admin-slip-state.entity';
import { PromoActive } from './entities/promo-active.entity';
import { ProductsAdminController } from './products-admin.controller';
import { ProductsAdminService } from './products-admin.service';
import { UsersAdminController } from './users-admin.controller';
import { UsersAdminService } from './users-admin.service';
import { BookingsAdminController } from './bookings-admin.controller';
import { BookingsAdminService } from './bookings-admin.service';
import { SlipStatesAdminController } from './slip-states-admin.controller';
import { SlipStatesAdminService } from './slip-states-admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      Supplier,
      ProductDetail,
      User,
      Booking,
      AdminSlipState,
      PromoActive,
    ]),
  ],
  controllers: [
    ProductsAdminController,
    UsersAdminController,
    BookingsAdminController,
    SlipStatesAdminController,
  ],
  providers: [
    ProductsAdminService,
    UsersAdminService,
    BookingsAdminService,
    SlipStatesAdminService,
  ],
})
export class AdminModule {}
