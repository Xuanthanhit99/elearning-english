import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PUBLISH_MODES = [
  'SAVE_AS_DRAFT',
  'REQUIRE_ADMIN_REVIEW',
  'PUBLISH_AFTER_APPROVAL',
];

export class CreateDocumentGenerationDto {
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(200) englishTitle?: string;
  @IsString() @MinLength(3) @MaxLength(500) topic!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsString() @MaxLength(100) category!: string;
  @IsIn(LEVELS) level!: string;
  @IsOptional() @IsArray() @ArrayMinSize(0) skills?: string[];
  @IsOptional() @IsString() @MaxLength(200) targetAudience?: string;
  @IsOptional() @IsString() @MaxLength(20) explanationLanguage?: string = 'vi';

  @IsInt() @Min(1) @Max(30) lessonCount!: number;
  @IsInt() @Min(1) @Max(50) vocabularyPerLesson!: number;
  @IsOptional() @IsInt() @Min(1) estimatedPageCount?: number;

  @IsOptional() @IsBoolean() includeIpa?: boolean = true;
  @IsOptional() @IsBoolean() includeTranslation?: boolean = true;
  @IsOptional() @IsBoolean() includeDialogues?: boolean = true;
  @IsOptional() @IsBoolean() includeGrammar?: boolean = true;
  @IsOptional() @IsBoolean() includeExercises?: boolean = true;
  @IsOptional() @IsBoolean() includeAnswerKey?: boolean = true;
  @IsOptional() @IsBoolean() includeFinalTest?: boolean = true;
  @IsOptional() @IsBoolean() includeStudyPlan?: boolean = false;

  @IsOptional() @IsBoolean() allowDownload?: boolean = true;
  @IsOptional() @IsBoolean() featured?: boolean = false;

  @IsIn(PUBLISH_MODES) publishMode!:
    | 'SAVE_AS_DRAFT'
    | 'REQUIRE_ADMIN_REVIEW'
    | 'PUBLISH_AFTER_APPROVAL';
}
