import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class BookingsAdminService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  findAll() {
    return this.bookingsRepository.find({
      relations: { product: true },
      select: {
        id: true,
        name: true,
        dateInit: true,
        product: { id: true, name: true },
      },
      order: { id: 'ASC' },
    });
  }

  create(data: { name?: string; dateInit?: string; productId?: number }) {
    const booking = this.bookingsRepository.create({
      name: data.name,
      dateInit: data.dateInit ? new Date(data.dateInit) : null,
      product: data.productId ? ({ id: data.productId } as Product) : null,
    });
    return this.bookingsRepository.save(booking);
  }

  async update(
    id: number,
    data: { name?: string; dateInit?: string; productId?: number },
  ) {
    await this.bookingsRepository.save({
      id,
      name: data.name,
      dateInit: data.dateInit ? new Date(data.dateInit) : null,
      product: data.productId ? ({ id: data.productId } as Product) : null,
    });
    return this.bookingsRepository.findOne({
      where: { id },
      relations: { product: true },
    });
  }

  remove(id: number) {
    return this.bookingsRepository.delete(id);
  }
}
