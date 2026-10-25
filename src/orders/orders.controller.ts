import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly jwtService: JwtService,
  ) {}

  private getUserIdFromRequest(req: any): number | undefined {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return undefined;
    try {
      const payload = this.jwtService.verify(authHeader.slice(7));
      return payload.sub;
    } catch {
      return undefined;
    }
  }

  @Post()
  checkout(
    @Req() req: any,
    @Body()
    body: {
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      address?: string;
      deliveryMethod?: 'pickup' | 'shipping';
      pickupDate?: string;
      items: { productId: number; quantity: number }[];
    },
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.ordersService.checkout({ ...body, userId });
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Req() req: any) {
    return this.ordersService.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine/products')
  findMyPurchasedProducts(@Req() req: any) {
    return this.ordersService.findPurchasedProductIds(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reschedule')
  reschedule(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { pickupDate: string },
  ) {
    return this.ordersService.reschedule(id, req.user.id, body.pickupDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }
}
