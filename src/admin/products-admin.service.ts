import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../products/entities/supplier.entity';
import { ProductDetail } from '../products/entities/product-detail.entity';

@Injectable()
export class ProductsAdminService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  findAll() {
    return this.productsRepository.find({
      relations: { supplier: true, productDetail: true },
      select: {
        id: true,
        name: true,
        price: true,
        updateDate: true,
        supplier: { id: true, name: true },
        productDetail: { id: true, title: true },
      },
      order: { id: 'ASC' },
    });
  }

  create(data: {
    name: string;
    price: number;
    supplierId?: number;
    productDetailId?: number;
  }) {
    const product = this.productsRepository.create({
      name: data.name,
      price: data.price,
      updateDate: new Date(),
      supplier: data.supplierId ? ({ id: data.supplierId } as Supplier) : null,
      productDetail: data.productDetailId
        ? ({ id: data.productDetailId } as ProductDetail)
        : null,
    });
    return this.productsRepository.save(product);
  }

  async update(
    id: number,
    data: {
      name?: string;
      price?: number;
      supplierId?: number;
      productDetailId?: number;
    },
  ) {
    await this.productsRepository.save({
      id,
      name: data.name,
      price: data.price,
      updateDate: new Date(),
      supplier: data.supplierId ? ({ id: data.supplierId } as Supplier) : null,
      productDetail: data.productDetailId
        ? ({ id: data.productDetailId } as ProductDetail)
        : null,
    });
    return this.productsRepository.findOne({
      where: { id },
      relations: { supplier: true, productDetail: true },
    });
  }

  remove(id: number) {
    return this.productsRepository.delete(id);
  }
}
