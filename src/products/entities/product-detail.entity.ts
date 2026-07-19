import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('product_detail')
export class ProductDetail {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  image: string;
}
