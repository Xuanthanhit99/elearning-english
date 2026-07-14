import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CommunityClubRole } from '@prisma/client';

export class TransferClubOwnershipDto {
  @IsString()
  @IsNotEmpty()
  newOwnerUserId!: string;
}

export class InviteClubMemberDto {
  @IsString()
  @IsNotEmpty()
  inviteeUserId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class RequestJoinClubDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class UpdateClubMemberRoleDto {
  @IsEnum(CommunityClubRole)
  role!: CommunityClubRole;
}
