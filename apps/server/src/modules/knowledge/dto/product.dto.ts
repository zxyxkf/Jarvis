import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator'

export enum ProductStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

export enum StockStatusDto {
  IN_STOCK = 'IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  UNKNOWN = 'UNKNOWN',
}

export class CreateProductDto {
  @IsString()
  @MaxLength(200)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string

  @IsString()
  @MaxLength(100)
  series!: string

  @IsOptional()
  @IsString()
  sellingPoints?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsEnum(ProductStatusDto)
  status?: ProductStatusDto
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  series?: string

  @IsOptional()
  @IsString()
  sellingPoints?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsEnum(ProductStatusDto)
  status?: ProductStatusDto
}

export class BatchUpdateProductStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  productIds!: string[]

  @IsEnum(ProductStatusDto)
  status!: ProductStatusDto
}

export class BatchProductIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  productIds!: string[]
}

export class CreateSkuDto {
  @IsString()
  @MaxLength(100)
  skuCode!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  color?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  size?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  spec?: string

  @IsOptional()
  @IsNumber()
  price?: number

  @IsOptional()
  @IsEnum(StockStatusDto)
  stockStatus?: StockStatusDto

  @IsOptional()
  @IsString()
  platformLink?: string

  @IsOptional()
  @IsString()
  externalProductId?: string

  @IsOptional()
  @IsString()
  externalSkuId?: string
}

export class UpdateSkuDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  skuCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  color?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  size?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  spec?: string

  @IsOptional()
  @IsNumber()
  price?: number

  @IsOptional()
  @IsEnum(StockStatusDto)
  stockStatus?: StockStatusDto

  @IsOptional()
  @IsString()
  platformLink?: string

  @IsOptional()
  @IsString()
  externalProductId?: string

  @IsOptional()
  @IsString()
  externalSkuId?: string
}

export class LinkProductAssetDto {
  @IsString()
  assetId!: string

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean

  @IsOptional()
  @IsNumber()
  sortOrder?: number
}

export class CreateFAQDto {
  @IsString()
  question!: string

  @IsString()
  answer!: string

  @IsOptional()
  @IsNumber()
  sortOrder?: number
}

export class SyncMissingDto {
  items!: Array<{
    platform: string
    shop?: string
    externalProductId: string
    externalSkuId?: string
    name: string
    skuCode: string
    category?: string
    brand?: string
    price?: number
    stockStatus?: StockStatusDto
    platformLink?: string
  }>
}

export enum PlatformConnectionStatusDto {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export class CreatePlatformConnectionDto {
  @IsString()
  @MaxLength(50)
  platform!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shop?: string

  @IsString()
  @MaxLength(100)
  name!: string

  @IsOptional()
  config?: Record<string, unknown>

  @IsOptional()
  @IsEnum(PlatformConnectionStatusDto)
  status?: PlatformConnectionStatusDto
}

export class UpdatePlatformConnectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shop?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  config?: Record<string, unknown>

  @IsOptional()
  @IsEnum(PlatformConnectionStatusDto)
  status?: PlatformConnectionStatusDto
}
