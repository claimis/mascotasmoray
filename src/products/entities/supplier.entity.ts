import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('supplier')
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ name: 'contact_info', nullable: true })
  contactInfo: string;
}
