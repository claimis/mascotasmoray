import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('blog_post')
export class BlogPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', default: '' })
  excerpt: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'cover_image', type: 'varchar', length: 255, nullable: true })
  coverImage: string | null;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  // Texto en minúsculas y sin tildes (título + etiquetas + contenido) para buscar rápido.
  @Column({ name: 'search_text', type: 'text', default: '', select: false })
  searchText: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
