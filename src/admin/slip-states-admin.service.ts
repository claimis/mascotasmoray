import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminSlipState } from './entities/admin-slip-state.entity';
import { PromoActive } from './entities/promo-active.entity';

function cleanBase64(image: string) {
  return image.includes(',') ? image.split(',')[1] : image;
}

@Injectable()
export class SlipStatesAdminService {
  constructor(
    @InjectRepository(AdminSlipState)
    private readonly repository: Repository<AdminSlipState>,
    @InjectRepository(PromoActive)
    private readonly promoActiveRepository: Repository<PromoActive>,
  ) {}

  findAll() {
    return this.repository.find({ order: { slipGroup: 'ASC', id: 'ASC' } });
  }

  async createGroup(images: string[]) {
    const { max } = await this.repository
      .createQueryBuilder('s')
      .select('MAX(s.slip_group)', 'max')
      .getRawOne();
    const nextGroup = (max ?? 0) + 1;

    const rows = images.map((image) =>
      this.repository.create({ image: cleanBase64(image), slipGroup: nextGroup }),
    );
    return this.repository.save(rows);
  }

  addToGroup(slipGroup: number, images: string[]) {
    const rows = images.map((image) =>
      this.repository.create({ image: cleanBase64(image), slipGroup }),
    );
    return this.repository.save(rows);
  }

  removeImage(id: number) {
    return this.repository.delete(id);
  }

  async removeGroup(slipGroup: number) {
    const result = await this.repository.delete({ slipGroup });
    const active = await this.getActive();
    if (active.slipGroup === slipGroup) {
      await this.setActive(null);
    }
    return result;
  }

  async getActive(): Promise<{ slipGroup: number | null }> {
    const row = await this.promoActiveRepository.findOneBy({ id: 1 });
    return { slipGroup: row?.slipGroup ?? null };
  }

  async setActive(slipGroup: number | null) {
    await this.promoActiveRepository.save({ id: 1, slipGroup });
    return this.getActive();
  }
}
