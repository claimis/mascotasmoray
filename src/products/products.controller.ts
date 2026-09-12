import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('productos')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('categorias')
  findCategories() {
    return this.productsService.findCategories();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productsService.findOne(id);
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }
}
