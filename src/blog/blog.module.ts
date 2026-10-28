import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { BlogPost } from './entities/blog-post.entity';
import { BlogImage } from './entities/blog-image.entity';
import { BlogController, BlogAdminController } from './blog.controller';
import { BlogService } from './blog.service';

@Module({
  imports: [TypeOrmModule.forFeature([BlogPost, BlogImage]), PassportModule],
  controllers: [BlogController, BlogAdminController],
  providers: [BlogService],
})
export class BlogModule {}
