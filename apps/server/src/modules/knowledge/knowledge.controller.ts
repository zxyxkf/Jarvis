import {
  Controller, Get, Post, Patch, Delete, Inject,
  Body, Param, Query, Req, UploadedFile, UseInterceptors, UseGuards,
  Res,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import type { Request } from 'express'
import type { Response } from 'express'
import { KnowledgeService } from './services/knowledge.service'
import { DocumentService } from './services/document.service'
import { SearchService } from './services/search.service'
import { ProductService } from './services/product.service'
import { PlatformIntegrationService } from './services/platform-integration.service'
import { AuditService } from './services/audit.service'
import { CreateKnowledgeBaseDto, UpdateKnowledgeBaseDto } from './dto/knowledge-base.dto'
import {
  BatchProductIdsDto,
  BatchUpdateProductStatusDto,
  CreatePlatformConnectionDto,
  CreateFAQDto,
  CreateProductDto,
  CreateSkuDto,
  LinkProductAssetDto,
  SyncMissingDto,
  UpdatePlatformConnectionDto,
  UpdateProductDto,
  UpdateSkuDto,
} from './dto/product.dto'

interface JwtRequest extends Request {
  user: { id: string; email: string; role: string }
}

@Controller('knowledge')
@UseGuards(AuthGuard('jwt'))
export class KnowledgeController {
  constructor(
    @Inject(KnowledgeService) private readonly knowledgeService: KnowledgeService,
    @Inject(DocumentService) private readonly documentService: DocumentService,
    @Inject(SearchService) private readonly searchService: SearchService,
    @Inject(ProductService) private readonly productService: ProductService,
    @Inject(PlatformIntegrationService) private readonly platformIntegrationService: PlatformIntegrationService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  @Post('bases')
  createBase(@Req() req: JwtRequest, @Body() dto: CreateKnowledgeBaseDto) {
    return this.knowledgeService.create(req.user.id, dto)
  }

  @Get('bases')
  findAllBases(@Req() req: JwtRequest) {
    return this.knowledgeService.findAll(req.user.id)
  }

  @Get('bases/:id')
  findBase(@Req() req: JwtRequest, @Param('id') id: string) {
    return this.knowledgeService.findById(req.user.id, id)
  }

  @Patch('bases/:id')
  updateBase(@Req() req: JwtRequest, @Param('id') id: string, @Body() dto: UpdateKnowledgeBaseDto) {
    return this.knowledgeService.update(req.user.id, id, dto)
  }

  @Delete('bases/:id')
  deleteBase(@Req() req: JwtRequest, @Param('id') id: string) {
    return this.knowledgeService.delete(req.user.id, id)
  }

  @Post('bases/:baseId/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentService.upload(req.user.id, baseId, file)
  }

  @Get('documents/:id/status')
  getDocumentStatus(@Req() req: JwtRequest, @Param('id') id: string) {
    return this.documentService.getStatus(req.user.id, id)
  }

  @Get('bases/:baseId/documents')
  listDocuments(@Req() req: JwtRequest, @Param('baseId') baseId: string) {
    return this.documentService.findByKnowledgeBase(req.user.id, baseId)
  }

  @Delete('documents/:id')
  deleteDocument(@Req() req: JwtRequest, @Param('id') id: string) {
    return this.documentService.delete(req.user.id, id)
  }

  @Post('bases/:baseId/search')
  search(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @Query('query') query: string,
    @Query('mode') mode: 'vector' | 'hybrid' = 'hybrid',
  ) {
    void req
    if (mode === 'vector') {
      return this.searchService.vectorSearch(query, { knowledgeBaseId: baseId })
    }
    return this.searchService.hybridSearch(query, { knowledgeBaseId: baseId })
  }

  @Get('bases/:baseId/products')
  listProducts(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT',
    @Query('source') source?: 'MANUAL' | 'EXCEL' | 'API',
    @Query('deleted') deleted?: 'none' | 'only' | 'with',
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.productService.listProducts(req.user.id, baseId, {
      q,
      category,
      status,
      source,
      deleted,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    })
  }

  @Post('bases/:baseId/products')
  createProduct(@Req() req: JwtRequest, @Param('baseId') baseId: string, @Body() dto: CreateProductDto) {
    return this.productService.createProduct(req.user.id, baseId, dto)
  }

  @Patch('bases/:baseId/products/batch-status')
  batchUpdateProductStatus(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @Body() dto: BatchUpdateProductStatusDto,
  ) {
    return this.productService.batchUpdateProductStatus(req.user.id, baseId, dto.productIds, dto.status)
  }

  @Get('products/import-template')
  downloadImportTemplate(@Res() res: Response) {
    const template = this.productService.getImportTemplate()
    res.setHeader('Content-Type', template.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${template.fileName}"`)
    return res.send(template.content)
  }

  @Get('products/:productId')
  getProduct(@Req() req: JwtRequest, @Param('productId') productId: string) {
    return this.productService.getProduct(req.user.id, productId)
  }

  @Patch('products/:productId')
  updateProduct(@Req() req: JwtRequest, @Param('productId') productId: string, @Body() dto: UpdateProductDto) {
    return this.productService.updateProduct(req.user.id, productId, dto)
  }

  @Delete('bases/:baseId/products/batch')
  batchDeleteProducts(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @Body() dto: BatchProductIdsDto,
  ) {
    return this.productService.batchDeleteProducts(req.user.id, baseId, dto.productIds)
  }

  @Patch('bases/:baseId/products/batch-restore')
  batchRestoreProducts(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @Body() dto: BatchProductIdsDto,
  ) {
    return this.productService.batchRestoreProducts(req.user.id, baseId, dto.productIds)
  }

  @Delete('products/:productId')
  deleteProduct(@Req() req: JwtRequest, @Param('productId') productId: string) {
    return this.productService.deleteProduct(req.user.id, productId)
  }

  @Post('products/:productId/skus')
  createSku(@Req() req: JwtRequest, @Param('productId') productId: string, @Body() dto: CreateSkuDto) {
    return this.productService.createSku(req.user.id, productId, dto)
  }

  @Patch('skus/:skuId')
  updateSku(@Req() req: JwtRequest, @Param('skuId') skuId: string, @Body() dto: UpdateSkuDto) {
    return this.productService.updateSku(req.user.id, skuId, dto)
  }

  @Delete('skus/:skuId')
  deleteSku(@Req() req: JwtRequest, @Param('skuId') skuId: string) {
    return this.productService.deleteSku(req.user.id, skuId)
  }

  @Get('bases/:baseId/assets')
  listAssets(@Req() req: JwtRequest, @Param('baseId') baseId: string) {
    return this.productService.listAssets(req.user.id, baseId)
  }

  @Post('bases/:baseId/assets')
  @UseInterceptors(FileInterceptor('file'))
  uploadAsset(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productService.uploadAsset(req.user.id, baseId, file)
  }

  @Delete('assets/:assetId')
  deleteAsset(@Req() req: JwtRequest, @Param('assetId') assetId: string) {
    return this.productService.deleteAsset(req.user.id, assetId)
  }

  @Post('products/:productId/assets')
  linkAsset(@Req() req: JwtRequest, @Param('productId') productId: string, @Body() dto: LinkProductAssetDto) {
    return this.productService.linkAsset(req.user.id, productId, dto)
  }

  @Delete('products/:productId/assets/:assetId')
  unlinkAsset(@Req() req: JwtRequest, @Param('productId') productId: string, @Param('assetId') assetId: string) {
    return this.productService.unlinkAsset(req.user.id, productId, assetId)
  }

  @Post('products/:productId/faqs')
  createFAQ(@Req() req: JwtRequest, @Param('productId') productId: string, @Body() dto: CreateFAQDto) {
    return this.productService.createFAQ(req.user.id, productId, dto)
  }

  @Delete('faqs/:faqId')
  deleteFAQ(@Req() req: JwtRequest, @Param('faqId') faqId: string) {
    return this.productService.deleteFAQ(req.user.id, faqId)
  }

  @Post('bases/:baseId/products/import')
  @UseInterceptors(FileInterceptor('file'))
  importProducts(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productService.importProducts(req.user.id, baseId, file)
  }

  @Post('bases/:baseId/products/import-preview')
  @UseInterceptors(FileInterceptor('file'))
  previewImportProducts(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.productService.previewImportProducts(req.user.id, baseId, file)
  }

  @Get('bases/:baseId/imports')
  listImportJobs(@Req() req: JwtRequest, @Param('baseId') baseId: string) {
    return this.productService.listImportJobs(req.user.id, baseId)
  }

  @Get('bases/:baseId/audit-logs')
  listAuditLogs(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @Query('action') action?: string,
    @Query('q') q?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditService.listKnowledgeBaseLogs(req.user.id, baseId, {
      action,
      q,
      startDate,
      endDate,
      limit: limit ? Number(limit) : undefined,
    })
  }

  @Get('bases/:baseId/integrations/connections')
  listPlatformConnections(@Req() req: JwtRequest, @Param('baseId') baseId: string) {
    return this.platformIntegrationService.listConnections(req.user.id, baseId)
  }

  @Post('bases/:baseId/integrations/connections')
  createPlatformConnection(
    @Req() req: JwtRequest,
    @Param('baseId') baseId: string,
    @Body() dto: CreatePlatformConnectionDto,
  ) {
    return this.platformIntegrationService.createConnection(req.user.id, baseId, dto)
  }

  @Patch('integrations/connections/:connectionId')
  updatePlatformConnection(
    @Req() req: JwtRequest,
    @Param('connectionId') connectionId: string,
    @Body() dto: UpdatePlatformConnectionDto,
  ) {
    return this.platformIntegrationService.updateConnection(req.user.id, connectionId, dto)
  }

  @Delete('integrations/connections/:connectionId')
  deletePlatformConnection(@Req() req: JwtRequest, @Param('connectionId') connectionId: string) {
    return this.platformIntegrationService.deleteConnection(req.user.id, connectionId)
  }

  @Get('bases/:baseId/integrations/sync-jobs')
  listPlatformSyncJobs(@Req() req: JwtRequest, @Param('baseId') baseId: string) {
    return this.platformIntegrationService.listSyncJobs(req.user.id, baseId)
  }

  @Post('integrations/connections/:connectionId/fetch-preview')
  async fetchConnectionPreview(@Req() req: JwtRequest, @Param('connectionId') connectionId: string) {
    const items = await this.platformIntegrationService.fetchConnectionItems(req.user.id, connectionId)
    const result = await this.productService.syncPreview({ items })
    return { ...result, fetchedCount: items.length, requesterId: req.user.id }
  }

  @Post('bases/:baseId/integrations/sync-preview')
  async syncPreviewForBase(@Req() req: JwtRequest, @Param('baseId') baseId: string, @Body() dto: SyncMissingDto) {
    const result = await this.productService.syncPreview(dto, baseId)
    const job = await this.platformIntegrationService.createPreviewJob(req.user.id, baseId, dto.items ?? [], result.items)
    return { ...result, job }
  }

  @Post('integrations/sync-preview')
  syncPreview(@Body() dto: SyncMissingDto) {
    return this.productService.syncPreview(dto)
  }

  @Post('bases/:baseId/integrations/sync-missing')
  async syncMissing(@Req() req: JwtRequest, @Param('baseId') baseId: string, @Body() dto: SyncMissingDto) {
    const result = await this.productService.syncMissing(req.user.id, baseId, dto)
    const job = await this.platformIntegrationService.createSyncJob(req.user.id, baseId, dto.items ?? [], result)
    return { ...result, job }
  }
}
