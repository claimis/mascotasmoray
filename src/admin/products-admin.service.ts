import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { Supplier } from '../products/entities/supplier.entity';
import { ProductDetail } from '../products/entities/product-detail.entity';
import { Category } from '../products/entities/category.entity';

interface ProductDetailInput {
  title?: string;
  description?: string;
  image?: string;
}

interface ProductInput {
  name?: string;
  price?: number;
  stock?: number;
  supplierId?: number;
  categoryId?: number;
  animalType?: string;
  barcode?: string | null;
  featured?: boolean;
  title?: string;
  description?: string;
  image?: string;
}

// Los EAN/UPC son numéricos, pero el TPV también usa códigos internos con letras (p. ej. "LDUKI0000000053").
function cleanBarcode(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const code = String(raw).replace(/\s+/g, '');
  if (!code) return null;
  if (code.length > 40 || !/^[A-Za-z0-9._\-/]+$/.test(code)) {
    throw new BadRequestException(
      'El código de barras solo puede tener letras, números y . _ - / (máximo 40 caracteres).',
    );
  }
  return code;
}

@Injectable()
export class ProductsAdminService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductDetail)
    private readonly productDetailRepository: Repository<ProductDetail>,
    @InjectRepository(Supplier)
    private readonly suppliersRepository: Repository<Supplier>,
  ) {}

  findSuppliers() {
    return this.suppliersRepository.find({
      select: { id: true, name: true },
      order: { name: 'ASC' },
    });
  }

  findAll() {
    return this.productsRepository.find({
      relations: { supplier: true, productDetail: true, category: true },
      select: {
        id: true,
        name: true,
        price: true,
        updateDate: true,
        stock: true,
        featured: true,
        animalType: true,
        barcode: true,
        supplier: { id: true, name: true },
        productDetail: { id: true, title: true },
        category: { id: true, nameCategory: true },
      },
      order: { id: 'ASC' },
    });
  }

  findOne(id: number) {
    return this.productsRepository.findOne({
      where: { id },
      relations: { supplier: true, productDetail: true, category: true },
    });
  }

  private async upsertProductDetail(
    existingId: number | null | undefined,
    data: ProductDetailInput,
  ): Promise<ProductDetail | null> {
    const cleanImage = data.image?.includes(',')
      ? data.image.split(',')[1]
      : data.image;

    if (existingId) {
      const changes = {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(cleanImage && { image: cleanImage }),
      };
      if (Object.keys(changes).length > 0) {
        await this.productDetailRepository.update(existingId, changes);
      }
      return { id: existingId } as ProductDetail;
    }

    if (!data.title && !data.description && !cleanImage) return null;

    return this.productDetailRepository.save(
      this.productDetailRepository.create({
        title: data.title,
        description: data.description,
        image: cleanImage,
      }),
    );
  }

  async create(data: ProductInput) {
    const productDetail = await this.upsertProductDetail(null, data);
    const product = this.productsRepository.create({
      name: data.name,
      price: data.price,
      stock: data.stock ?? 0,
      featured: data.featured ?? false,
      animalType: data.animalType || null,
      barcode: cleanBarcode(data.barcode),
      updateDate: new Date(),
      supplier: data.supplierId ? ({ id: data.supplierId } as Supplier) : null,
      category: data.categoryId ? ({ id: data.categoryId } as Category) : null,
      productDetail,
    });
    return this.productsRepository.save(product);
  }

  async update(id: number, data: ProductInput) {
    // Se valida antes de tocar nada: un código inválido no debe dejar el detalle a medias.
    const barcode =
      data.barcode === undefined ? undefined : cleanBarcode(data.barcode);
    const existing = await this.productsRepository.findOne({
      where: { id },
      relations: { productDetail: true },
    });
    const productDetail = await this.upsertProductDetail(
      existing?.productDetail?.id ?? null,
      data,
    );

    await this.productsRepository.save({
      id,
      name: data.name,
      price: data.price,
      stock: data.stock,
      featured: data.featured,
      animalType: data.animalType || null,
      barcode,
      updateDate: new Date(),
      supplier: data.supplierId ? ({ id: data.supplierId } as Supplier) : null,
      category: data.categoryId ? ({ id: data.categoryId } as Category) : null,
      productDetail,
    });
    return this.productsRepository.findOne({
      where: { id },
      relations: { supplier: true, productDetail: true, category: true },
    });
  }

  remove(id: number) {
    return this.productsRepository.delete(id);
  }
}
