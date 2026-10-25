import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'customer_email' })
  customerEmail: string;

  @Column({ name: 'customer_phone', nullable: true })
  customerPhone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ name: 'delivery_method', default: 'shipping' })
  deliveryMethod: string;

  @Column({ name: 'shipping_cost', type: 'numeric', precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ name: 'pickup_date', type: 'date', nullable: true })
  pickupDate: string | null;

  @Column({ default: 'pendiente' })
  status: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  total: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
