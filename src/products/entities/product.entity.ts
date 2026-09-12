import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { ProductDetail } from './product-detail.entity';
import { Category } from './category.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @Column({ name: 'update_date' })
  updateDate: Date;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: false })
  featured: boolean;

  @Column({ name: 'animal_type', nullable: true })
  animalType: string;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => ProductDetail, { nullable: true })
  @JoinColumn({ name: 'product_detail_id' })
  productDetail: ProductDetail;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
