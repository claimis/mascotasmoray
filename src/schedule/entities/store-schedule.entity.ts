import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('store_schedule')
export class StoreSchedule {
  /** 0 = domingo ... 6 = sábado (igual que Date.getDay) */
  @PrimaryColumn({ type: 'smallint' })
  weekday: number;

  @Column({ name: 'is_open', default: false })
  isOpen: boolean;

  @Column({ type: 'varchar', length: 5, nullable: true })
  open1: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  close1: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  open2: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  close2: string | null;
}
