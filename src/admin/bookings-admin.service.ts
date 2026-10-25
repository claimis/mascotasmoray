import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Order } from '../orders/entities/order.entity';

interface BookingInput {
  name?: string;
  dateInit?: string;
  orderId?: number;
}

const ORDER_SELECT = {
  id: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  total: true,
  deliveryMethod: true,
  status: true,
};

@Injectable()
export class BookingsAdminService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  findAll() {
    return this.bookingsRepository.find({
      relations: { order: true },
      select: {
        id: true,
        name: true,
        dateInit: true,
        order: ORDER_SELECT,
      },
      order: { id: 'ASC' },
    });
  }

  create(data: BookingInput) {
    const booking = this.bookingsRepository.create({
      name: data.name,
      dateInit: data.dateInit ? new Date(data.dateInit) : null,
      order: data.orderId ? ({ id: data.orderId } as Order) : null,
    });
    return this.bookingsRepository.save(booking);
  }

  async update(id: number, data: BookingInput) {
    await this.bookingsRepository.save({
      id,
      name: data.name,
      dateInit: data.dateInit ? new Date(data.dateInit) : null,
      order: data.orderId ? ({ id: data.orderId } as Order) : null,
    });
    return this.bookingsRepository.findOne({
      where: { id },
      relations: { order: true },
    });
  }

  remove(id: number) {
    return this.bookingsRepository.delete(id);
  }
}
