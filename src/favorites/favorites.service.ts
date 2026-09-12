import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from './entities/favorite.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoritesRepository: Repository<Favorite>,
  ) {}

  async findMine(userId: number) {
    const favorites = await this.favoritesRepository.find({
      where: { user: { id: userId } },
      relations: { product: { productDetail: true } },
      order: { createdAt: 'DESC' },
    });

    return favorites.map((fav) => ({
      id: fav.product.id,
      name: fav.product.name,
      price: Number(fav.product.price),
      image: fav.product.productDetail?.image
        ? `data:image/png;base64,${fav.product.productDetail.image}`
        : null,
    }));
  }

  async add(userId: number, productId: number) {
    const existing = await this.favoritesRepository.findOne({
      where: { user: { id: userId }, product: { id: productId } },
    });
    if (existing) return existing;

    return this.favoritesRepository.save(
      this.favoritesRepository.create({
        user: { id: userId } as User,
        product: { id: productId } as Product,
      }),
    );
  }

  remove(userId: number, productId: number) {
    return this.favoritesRepository.delete({
      user: { id: userId } as User,
      product: { id: productId } as Product,
    });
  }
}
