import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlogPost } from './entities/blog-post.entity';
import { BlogImage } from './entities/blog-image.entity';

interface PostInput {
  title?: string;
  content?: string;
  coverImage?: string | null;
  tags?: string[];
}

export interface BlogFilters {
  q?: string;
  tag?: string;
  from?: string;
  to?: string;
}

const MAX_IMAGE_BASE64_LENGTH = 7_000_000;
const IMAGE_DATA_URL = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/;
const LIST_COLUMNS = ['p.id', 'p.title', 'p.excerpt', 'p.coverImage', 'p.tags', 'p.createdAt', 'p.updatedAt'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 30;

// Minúsculas y sin tildes: "Cómo" y "como" se buscan igual.
function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function cleanTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of raw) {
    const tag = String(item ?? '').replace(/[,#]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!tag) continue;
    if (tag.length > MAX_TAG_LENGTH) {
      throw new BadRequestException(`La etiqueta "${tag.slice(0, 12)}..." es demasiado larga (máximo ${MAX_TAG_LENGTH} caracteres).`);
    }
    if (seen.has(normalize(tag))) continue;
    seen.add(normalize(tag));
    tags.push(tag);
  }
  if (tags.length > MAX_TAGS) throw new BadRequestException(`Como máximo ${MAX_TAGS} etiquetas por entrada.`);
  return tags;
}

function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|div|blockquote)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function makeExcerpt(html: string) {
  const text = htmlToText(html);
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}...` : text;
}

@Injectable()
export class BlogService {
  constructor(
    @InjectRepository(BlogPost) private readonly posts: Repository<BlogPost>,
    @InjectRepository(BlogImage) private readonly images: Repository<BlogImage>,
  ) {}

  async findAll(filters: BlogFilters = {}) {
    const qb = this.posts.createQueryBuilder('p').select(LIST_COLUMNS).orderBy('p.createdAt', 'DESC');

    const words = normalize(filters.q ?? '').split(' ').filter(Boolean).slice(0, 8);
    words.forEach((word, i) => {
      const escaped = word.replace(/[\\%_]/g, (c) => `\\${c}`);
      qb.andWhere(`p.searchText LIKE :w${i}`, { [`w${i}`]: `%${escaped}%` });
    });

    const tag = normalize(filters.tag ?? '');
    if (tag) qb.andWhere(':tag = ANY(p.tags)', { tag: filters.tag!.trim().toLowerCase() });

    if (filters.from && DATE_RE.test(filters.from)) qb.andWhere('p.createdAt >= :from', { from: filters.from });
    if (filters.to && DATE_RE.test(filters.to)) {
      const next = new Date(`${filters.to}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      qb.andWhere('p.createdAt < :toNext', { toNext: next.toISOString().slice(0, 10) });
    }
    return qb.getMany();
  }

  // Etiquetas usadas, de la más a la menos frecuente.
  async findTags() {
    const rows: { tag: string; count: string }[] = await this.posts.query(
      'SELECT tag, COUNT(*) AS count FROM blog_post, unnest(tags) AS tag GROUP BY tag ORDER BY COUNT(*) DESC, tag',
    );
    return rows.map((r) => ({ tag: r.tag, count: Number(r.count) }));
  }

  async findOne(id: number) {
    const post = await this.posts.findOne({ where: { id } });
    if (!post) throw new NotFoundException('No hemos encontrado esa entrada.');
    return post;
  }

  private clean(data: PostInput) {
    const title = (data.title ?? '').trim();
    const content = (data.content ?? '').trim();
    if (!title) throw new BadRequestException('Escribe un título para la entrada.');
    if (title.length > 200) {
      throw new BadRequestException('El título es demasiado largo (máximo 200 caracteres).');
    }
    if (!htmlToText(content) && !/<img\s/i.test(content)) {
      throw new BadRequestException('La entrada no tiene contenido.');
    }
    const cover = data.coverImage?.trim() || null;
    if (cover && !/^\/blog\/images\/\d+$/.test(cover)) {
      throw new BadRequestException('La imagen de portada no es válida.');
    }
    const tags = cleanTags(data.tags);
    const searchText = normalize(`${title} ${tags.join(' ')} ${htmlToText(content)}`);
    return { title, content, excerpt: makeExcerpt(content), coverImage: cover, tags, searchText };
  }

  create(data: PostInput) {
    return this.posts.save(this.posts.create(this.clean(data)));
  }

  async update(id: number, data: PostInput) {
    await this.findOne(id);
    await this.posts.save({ id, ...this.clean(data) });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.posts.delete(id);
    return { ok: true };
  }

  async saveImage(dataUrl: string) {
    const match = IMAGE_DATA_URL.exec(dataUrl ?? '');
    if (!match) throw new BadRequestException('Solo se admiten imágenes PNG, JPG, WebP o GIF.');
    if (match[2].length > MAX_IMAGE_BASE64_LENGTH) {
      throw new BadRequestException('La imagen pesa demasiado (máximo unos 5 MB).');
    }
    const saved = await this.images.save(this.images.create({ mime: match[1], data: match[2] }));
    return { id: saved.id, url: `/blog/images/${saved.id}` };
  }

  async getImage(id: number) {
    const image = await this.images.findOne({ where: { id } });
    if (!image) throw new NotFoundException('Imagen no encontrada.');
    return { mime: image.mime, buffer: Buffer.from(image.data, 'base64') };
  }
}
