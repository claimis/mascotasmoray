import { Controller, Get } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('productos')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }
}
