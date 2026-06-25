import { IsString, IsOptional, MaxLength } from 'class-validator'

export class CreateKnowledgeBaseDto {
  // @abstract-candidate: DTO pattern
  // Seen: 1/3 (CreateKnowledgeBaseDto)
  @IsString()
  @MaxLength(100)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string
}

export class UpdateKnowledgeBaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string
}
