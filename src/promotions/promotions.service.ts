import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminSlipState } from '../admin/entities/admin-slip-state.entity';
import { PromoActive } from '../admin/entities/promo-active.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(AdminSlipState)
    private readonly repository: Repository<AdminSlipState>,
    @InjectRepository(PromoActive)
    private readonly promoActiveRepository: Repository<PromoActive>,
  ) {}

  async findActive() {
    const active = await this.promoActiveRepository.findOneBy({ id: 1 });
    if (active?.slipGroup == null) return { slipGroup: null, images: [] };

    const rows = await this.repository.find({
      where: { slipGroup: active.slipGroup },
      order: { id: 'ASC' },
    });

    return {
      slipGroup: active.slipGroup,
      images: rows.map((row) => `data:image/png;base64,${row.image}`),
    };
  }
}
