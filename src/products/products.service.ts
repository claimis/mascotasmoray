import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  private toDto(product: Product) {
    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      title: product.productDetail?.title ?? null,
      description: product.productDetail?.description ?? null,
      image: product.productDetail?.image
        ? `data:image/png;base64,${product.productDetail.image}`
        : null,
      supplier: product.supplier?.name ?? null,
      stock: product.stock,
      featured: product.featured,
      animalType: product.animalType,
      category: product.category?.nameCategory ?? null,
      categoryId: product.category?.id ?? null,
    };
  }

  async findAll() {
    const products = await this.productsRepository.find({
      relations: { productDetail: true, supplier: true, category: true },
      order: { id: 'ASC' },
    });

    return products.map((product) => this.toDto(product));
  }

  async findOne(id: number) {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: { productDetail: true, supplier: true, category: true },
    });
    return product ? this.toDto(product) : null;
  }

  findCategories() {
    return this.categoriesRepository.find({ order: { nameCategory: 'ASC' } });
  }
}
