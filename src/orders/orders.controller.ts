import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
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
      items: { productId: number; quantity: number }[];
    },
  ) {
    const userId = this.getUserIdFromRequest(req);
    return this.ordersService.checkout({ ...body, userId });
  }

  @Post(':id/pay')
  pay(@Param('id') id: string) {
    return this.ordersService.pay(+id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  findMine(@Req() req: any) {
    return this.ordersService.findByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(+id);
  }
}
