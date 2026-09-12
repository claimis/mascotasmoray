import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';

interface CheckoutInput {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address?: string;
  items: { productId: number; quantity: number }[];
  userId?: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async checkout(data: CheckoutInput) {
    if (!data.items?.length) {
      throw new BadRequestException('El carrito está vacío.');
    }

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
        address: data.address,
        status: 'pendiente',
        total,
        items,
      });

      return manager.save(order);
    });
  }

  async pay(id: number) {
    const order = await this.ordersRepository.findOneBy({ id });
    if (!order) throw new NotFoundException('Pedido no encontrado.');
    if (order.status !== 'pendiente') {
      throw new BadRequestException(`Este pedido ya está en estado "${order.status}".`);
    }

    // Pago simulado: no hay pasarela de pago real conectada todavía.
    // No se mueve dinero de verdad.
    order.status = 'pagado';
    return this.ordersRepository.save(order);
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

  findAll() {
    return this.ordersRepository.find({
      relations: { items: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: number, status: string) {
    await this.ordersRepository.update(id, { status });
    return this.findOne(id);
  }

  remove(id: number) {
    return this.ordersRepository.delete(id);
  }
}
