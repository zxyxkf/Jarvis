import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Req, UploadedFile, UseInterceptors, UseGuards,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { AuthGuard } from '@nestjs/passport'
import type { Request } from 'express'
import { KnowledgeService } from './services/knowledge.service'
import { DocumentService } from './services/document.service'
import { SearchService } from './services/search.service'
import { CreateKnowledgeBaseDto, UpdateKnowledgeBaseDto } from './dto/knowledge-base.dto'

interface JwtRequest extends Request {
  user: { id: string; email: string; role: string }
}

@Controller('knowledge')
@UseGuards(AuthGuard('jwt'))
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly documentService: DocumentService,
    private readonly searchService: SearchService,
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
  getDocumentStatus(@Param('id') id: string) {
    return this.documentService.getStatus(id)
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
