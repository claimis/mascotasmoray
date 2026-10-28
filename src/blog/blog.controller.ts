import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AdminJwtGuard } from '../auth/admin-jwt.guard';
import { BlogService } from './blog.service';

interface PostBody {
  title: string;
  content: string;
  coverImage?: string | null;
  tags?: string[];
}

@Controller('blog')
export class BlogController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  findAll(@Query('q') q?: string, @Query('tag') tag?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.blog.findAll({ q, tag, from, to });
  }

  @Get('tags')
  findTags() {
    return this.blog.findTags();
  }

  // Las imágenes no cambian nunca (cada subida crea una nueva), así que se pueden guardar en caché.
  @Get('images/:id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('Cross-Origin-Resource-Policy', 'cross-origin')
  async image(@Param('id', ParseIntPipe) id: number) {
    const { mime, buffer } = await this.blog.getImage(id);
    return new StreamableFile(buffer, { type: mime, disposition: 'inline' });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.blog.findOne(id);
  }
}

@UseGuards(AdminJwtGuard)
@Controller('admin/blog')
export class BlogAdminController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  findAll() {
    return this.blog.findAll();
  }

  @Post('images')
  uploadImage(@Body() body: { data: string }) {
    return this.blog.saveImage(body?.data);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.blog.findOne(id);
  }

  @Post()
  create(@Body() body: PostBody) {
    return this.blog.create(body);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: PostBody) {
    return this.blog.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.blog.remove(id);
  }
}
