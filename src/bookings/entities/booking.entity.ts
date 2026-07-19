import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('booking')
export class Booking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'date_init', nullable: true })
  dateInit: Date;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'products_id' })
  product: Product;
}
