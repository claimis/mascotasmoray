import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AdminJwtGuard } from '../auth/admin-jwt.guard';
import { ProductsAdminService } from './products-admin.service';

@UseGuards(AdminJwtGuard)
@Controller('admin/products')
export class ProductsAdminController {
  constructor(private readonly service: ProductsAdminService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('suppliers')
  findSuppliers() {
    return this.service.findSuppliers();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.service.update(+id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
