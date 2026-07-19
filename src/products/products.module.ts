import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';
import { ProductDetail } from './entities/product-detail.entity';
import { Supplier } from './entities/supplier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductDetail, Supplier])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
