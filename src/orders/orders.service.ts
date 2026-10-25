import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { ScheduleService } from '../schedule/schedule.service';

interface CheckoutInput {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address?: string;
  deliveryMethod?: 'pickup' | 'shipping';
  pickupDate?: string;
  items: { productId: number; quantity: number }[];
  userId?: number;
}

export const SHIPPING_COST = 20;
export const SHIPPING_ENABLED: boolean = false;
export const ORDER_STATUSES = ['pendiente', 'reprogramado', 'entregado', 'cancelado'];
const RESCHEDULABLE_STATUSES = ['pendiente', 'reprogramado'];

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly scheduleService: ScheduleService,
  ) {}

  async checkout(data: CheckoutInput) {
    if (!data.items?.length) {
      throw new BadRequestException('El carrito está vacío.');
    }

    if (!data.customerPhone?.trim()) {
      throw new BadRequestException('Indica un teléfono de contacto.');
    }

    const deliveryMethod = data.deliveryMethod === 'shipping' ? 'shipping' : 'pickup';
    if (deliveryMethod === 'shipping' && !SHIPPING_ENABLED) {
      throw new BadRequestException('El envío a domicilio estará disponible próximamente.');
    }
    if (deliveryMethod === 'shipping' && !data.address?.trim()) {
      throw new BadRequestException('Indica la dirección de envío.');
    }
    if (deliveryMethod === 'pickup') {
      const dateError = await this.scheduleService.validatePickupDate(data.pickupDate);
      if (dateError) throw new BadRequestException(dateError);
    }
    const shippingCost = deliveryMethod === 'shipping' ? SHIPPING_COST : 0;

    return this.ordersRepository.manager.transaction(async (manager) => {
      let total = 0;
      const items: OrderItem[] = [];

      for (const line of data.items) {
        const product = await manager.findOne(Product, { where: { id: line.productId } });
        if (!product) {
          throw new BadRequestException(`El producto ${line.productId} ya no existe.`);
        }
        if (product.stock < line.quantity) {
          throw new BadRequestException(
            `No queda stock suficiente de "${product.name}" (quedan ${product.stock}).`,
          );
        }

        product.stock -= line.quantity;
        await manager.save(product);

        const unitPrice = Number(product.price);
        total += unitPrice * line.quantity;

        const item = this.orderItemsRepository.create({
          product,
          productName: product.name,
          quantity: line.quantity,
          unitPrice,
        });
        items.push(item);
      }

      const order = this.ordersRepository.create({
        user: data.userId ? ({ id: data.userId } as User) : null,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        address: deliveryMethod === 'shipping' ? data.address : null,
        deliveryMethod,
        shippingCost,
        pickupDate: deliveryMethod === 'pickup' ? data.pickupDate : null,
        status: 'pendiente',
        total: total + shippingCost,
        items,
      });

      const savedOrder = await manager.save(order);

      if (deliveryMethod === 'pickup') {
        await manager.save(
          manager.create(Booking, {
            name: data.customerName,
            dateInit: new Date(`${data.pickupDate}T12:00:00`),
            order: savedOrder,
          }),
        );
      }

      return savedOrder;
    });
  }

  findOne(id: number) {
    return this.ordersRepository.findOne({ where: { id }, relations: { items: true } });
  }

  findByUser(userId: number) {
    return this.ordersRepository.find({
      where: { user: { id: userId } },
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Productos que el cliente ya ha pedido alguna vez (sin contar pedidos cancelados).
  async findPurchasedProductIds(userId: number): Promise<number[]> {
    const rows = await this.orderItemsRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'o')
      .where('o.user_id = :userId', { userId })
      .andWhere('o.status <> :cancelled', { cancelled: 'cancelado' })
      .andWhere('item.product_id IS NOT NULL')
      .select('DISTINCT item.product_id', 'productId')
      .getRawMany<{ productId: number }>();
    return rows.map((row) => Number(row.productId));
  }

  async reschedule(orderId: number, userId: number, pickupDate: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { user: true },
    });
    if (!order || order.user?.id !== userId) {
      throw new NotFoundException('No hemos encontrado ese pedido.');
    }
    if (order.deliveryMethod !== 'pickup') {
      throw new BadRequestException('Solo se puede reprogramar un pedido de recogida en tienda.');
    }
    if (!RESCHEDULABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException('Este pedido ya no se puede reprogramar.');
    }
    if (order.pickupDate === pickupDate) {
      throw new BadRequestException('Elige una fecha distinta a la actual.');
    }
    const dateError = await this.scheduleService.validatePickupDate(pickupDate);
    if (dateError) throw new BadRequestException(dateError);

    await this.ordersRepository.manager.transaction(async (manager) => {
      await manager.update(Order, orderId, { pickupDate, status: 'reprogramado' });
      await manager
        .createQueryBuilder()
        .update(Booking)
        .set({ dateInit: new Date(`${pickupDate}T12:00:00`) })
        .where('order_id = :orderId', { orderId })
        .execute();
    });

    return this.findOne(orderId);
  }

  findAll() {
    return this.ordersRepository.find({
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: number, status: string) {
    if (!ORDER_STATUSES.includes(status)) {
      throw new BadRequestException('Estado no válido.');
    }
    await this.ordersRepository.update(id, { status });
    return this.findOne(id);
  }

  remove(id: number) {
    return this.ordersRepository.delete(id);
  }
}
