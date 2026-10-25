import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('store_exception')
export class StoreException {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date', unique: true })
  date: string;

  @Column({ default: true })
  closed: boolean;

  @Column({ type: 'varchar', length: 5, nullable: true })
  open1: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  close1: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  open2: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  close2: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'range_id', type: 'varchar', length: 36, nullable: true })
  rangeId: string | null;

  @Column({ name: 'show_now', default: false })
  showNow: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
