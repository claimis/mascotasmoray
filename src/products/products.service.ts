import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findAll() {
    const products = await this.productsRepository.find({
      relations: { productDetail: true, supplier: true },
      order: { id: 'ASC' },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      title: product.productDetail?.title ?? null,
      description: product.productDetail?.description ?? null,
      image: product.productDetail?.image
        ? `data:image/png;base64,${product.productDetail.image}`
        : null,
      supplier: product.supplier?.name ?? null,
    }));
  }
}
