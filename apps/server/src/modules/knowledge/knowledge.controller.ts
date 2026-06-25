import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'
import { KnowledgeService } from './services/knowledge.service'
import { DocumentService } from './services/document.service'
import { SearchService } from './services/search.service'
import { CreateKnowledgeBaseDto, UpdateKnowledgeBaseDto } from './dto/knowledge-base.dto'

// Placeholder user extraction
function getUserId(req: Request): string {
  // TODO: Extract from JWT token in Phase 2
  return (req.headers['x-user-id'] as string) || 'dev-user'
}

@Controller('knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly documentService: DocumentService,
    private readonly searchService: SearchService,
  ) {}

  // === Knowledge Bases ===

  @Post('bases')
  createBase(@Req() req: Request, @Body() dto: CreateKnowledgeBaseDto) {
    return this.knowledgeService.create(getUserId(req), dto)
  }

  @Get('bases')
  findAllBases(@Req() req: Request) {
    return this.knowledgeService.findAll(getUserId(req))
  }

  @Get('bases/:id')
  findBase(@Req() req: Request, @Param('id') id: string) {
    return this.knowledgeService.findById(getUserId(req), id)
  }

  @Patch('bases/:id')
  updateBase(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeBaseDto,
  ) {
    return this.knowledgeService.update(getUserId(req), id, dto)
  }

  @Delete('bases/:id')
  deleteBase(@Req() req: Request, @Param('id') id: string) {
    return this.knowledgeService.delete(getUserId(req), id)
  }

  // === Documents ===

  @Post('bases/:baseId/documents')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @Req() req: Request,
    @Param('baseId') baseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentService.upload(getUserId(req), baseId, file)
  }

  @Get('documents/:id/status')
  getDocumentStatus(@Param('id') id: string) {
    return this.documentService.getStatus(id)
  }

  @Get('bases/:baseId/documents')
  listDocuments(@Req() req: Request, @Param('baseId') baseId: string) {
    return this.documentService.findByKnowledgeBase(getUserId(req), baseId)
  }

  @Delete('documents/:id')
  deleteDocument(@Req() req: Request, @Param('id') id: string) {
    return this.documentService.delete(getUserId(req), id)
  }

  // === Search ===

  @Post('bases/:baseId/search')
  search(
    @Param('baseId') baseId: string,
    @Query('query') query: string,
    @Query('mode') mode: 'vector' | 'hybrid' = 'hybrid',
  ) {
    if (mode === 'vector') {
      return this.searchService.vectorSearch(query, { knowledgeBaseId: baseId })
    }
    return this.searchService.hybridSearch(query, { knowledgeBaseId: baseId })
  }
}
