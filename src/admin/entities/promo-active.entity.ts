import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('promo_active')
export class PromoActive {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'slip_group', nullable: true })
  slipGroup: number | null;
}
