import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get('mine')
  findMine(@Req() req: any) {
    return this.favoritesService.findMine(req.user.id);
  }

  @Post()
  add(@Req() req: any, @Body() body: { productId: number }) {
    return this.favoritesService.add(req.user.id, body.productId);
  }

  @Delete(':productId')
  remove(@Req() req: any, @Param('productId') productId: string) {
    return this.favoritesService.remove(req.user.id, +productId);
  }
}
