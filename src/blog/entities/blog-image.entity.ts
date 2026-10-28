import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('blog_image')
export class BlogImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  mime: string;

  @Column({ type: 'text' })
  data: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
