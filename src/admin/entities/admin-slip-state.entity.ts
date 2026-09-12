import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('admin_slip_state')
export class AdminSlipState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  image: string;

  @Column({ name: 'slip_group' })
  slipGroup: number;
}
