import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CarePetDto } from './dto/care-pet.dto';
import { UpsertPetDto } from './dto/upsert-pet.dto';

const PET_REWARD = {
  xp: 30,
  coins: 12,
  food: 1,
};

const PET_TYPES = [
  { id: 'cat', name: 'Miu' },
  { id: 'dog', name: 'Bun' },
  { id: 'panda', name: 'Po' },
  { id: 'fox', name: 'Foxie' },
  { id: 'penguin', name: 'Pip' },
  { id: 'rabbit', name: 'Bibi' },
];

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  private clamp(value: number) {
    return Math.min(100, Math.max(0, value));
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private isSameDay(left?: Date | null, right = new Date()) {
    if (!left) return false;
    return this.startOfDay(left).getTime() === this.startOfDay(right).getTime();
  }

  private isYesterday(left?: Date | null, right = new Date()) {
    if (!left) return false;
    const yesterday = this.startOfDay(right);
    yesterday.setDate(yesterday.getDate() - 1);
    return this.startOfDay(left).getTime() === yesterday.getTime();
  }

  private getRandomPet() {
    return PET_TYPES[Math.floor(Math.random() * PET_TYPES.length)];
  }

  private getChooseDeadline() {
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 7);
    return deadline;
  }

  private getDaysLeft(deadline?: Date | null) {
    if (!deadline) return 0;
    const diff = deadline.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  }

  private async finalizeRandomPetIfExpired(pet: any) {
    if (pet.isChosen || !pet.chooseDeadline || pet.chooseDeadline > new Date()) {
      return pet;
    }

    const randomPet = this.getRandomPet();

    return this.prisma.petProfile.update({
      where: { userId: pet.userId },
      data: {
        petType: randomPet.id,
        petName: randomPet.name,
        isChosen: true,
        selectedAt: new Date(),
        randomAssigned: true,
      },
    });
  }

  private decoratePet(pet: any, rewardCount = 0) {
    return {
      ...pet,
      rewardCount,
      level: Math.floor(pet.xp / 100) + 1,
      xpToNextLevel: pet.xp % 100,
      mustChoosePet: !pet.isChosen,
      selectionLocked: pet.isChosen,
      daysLeftToChoose: this.getDaysLeft(pet.chooseDeadline),
    };
  }

  private async getOrCreatePet(userId: string) {
    const existing = await this.prisma.petProfile.findUnique({ where: { userId } });
    if (existing) return this.finalizeRandomPetIfExpired(existing);

    return this.prisma.petProfile.create({
      data: {
        userId,
        petType: 'pending',
        petName: 'Chưa chọn',
        chooseDeadline: this.getChooseDeadline(),
      },
    });
  }

  async getMyPet(userId: string) {
    const pet = await this.getOrCreatePet(userId);
    const rewardCount = await this.prisma.petReward.count({ where: { userId } });

    return this.decoratePet(pet, rewardCount);
  }

  async upsertMyPet(userId: string, dto: UpsertPetDto) {
    const pet = await this.getOrCreatePet(userId);
    const petName = dto.petName.trim();

    if (pet.isChosen && pet.petType !== dto.petType) {
      throw new BadRequestException(
        pet.randomAssigned
          ? 'Bạn đã quá hạn 7 ngày nên hệ thống đã chọn ngẫu nhiên thú cưng cho bạn.'
          : 'Bạn chỉ được chọn một loại thú cưng. Loại thú đã chọn không thể đổi.',
      );
    }

    const updatedPet = await this.prisma.petProfile.update({
      where: { userId },
      data: pet.isChosen
        ? { petName }
        : {
            petType: dto.petType,
            petName,
            isChosen: true,
            selectedAt: new Date(),
            randomAssigned: false,
          },
    });

    return this.decoratePet(updatedPet);
  }

  async careForPet(userId: string, dto: CarePetDto) {
    const pet = await this.getOrCreatePet(userId);
    if (!pet.isChosen) {
      throw new BadRequestException('Bạn cần chọn thú cưng trước khi chăm sóc.');
    }

    if (dto.action === 'feed') {
      if (pet.food <= 0) throw new BadRequestException('Bạn chưa có food để cho ăn');
      return this.decoratePet(
        await this.prisma.petProfile.update({
          where: { userId },
          data: {
            food: pet.food - 1,
            hunger: this.clamp(pet.hunger + 25),
            hp: this.clamp(pet.hp + 5),
            happiness: this.clamp(pet.happiness + 4),
          },
        }),
      );
    }

    if (dto.action === 'play') {
      if (pet.energy < 10) throw new BadRequestException('Thú cưng cần nghỉ ngơi trước khi chơi');
      return this.decoratePet(
        await this.prisma.petProfile.update({
          where: { userId },
          data: {
            energy: this.clamp(pet.energy - 10),
            happiness: this.clamp(pet.happiness + 18),
            xp: pet.xp + 2,
          },
        }),
      );
    }

    if (dto.action === 'clean') {
      if (pet.coins < 2) throw new BadRequestException('Bạn cần ít nhất 2 coin để vệ sinh');
      return this.decoratePet(
        await this.prisma.petProfile.update({
          where: { userId },
          data: {
            coins: pet.coins - 2,
            hp: this.clamp(pet.hp + 12),
            happiness: this.clamp(pet.happiness + 8),
          },
        }),
      );
    }

    return this.decoratePet(
      await this.prisma.petProfile.update({
        where: { userId },
        data: {
          energy: this.clamp(pet.energy + 25),
          hp: this.clamp(pet.hp + 10),
        },
      }),
    );
  }

  async rewardLesson(userId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Không tìm thấy bài học');

    const pet = await this.getOrCreatePet(userId);
    const alreadyRewarded = await this.prisma.petReward.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    if (alreadyRewarded) {
      return {
        alreadyRewarded: true,
        reward: alreadyRewarded,
        pet: this.decoratePet(pet),
      };
    }

    const now = new Date();
    const nextStreak = this.isSameDay(pet.lastStudyDate, now)
      ? pet.streak
      : this.isYesterday(pet.lastStudyDate, now)
        ? pet.streak + 1
        : 1;

    const result = await this.prisma.$transaction(async (tx) => {
      const reward = await tx.petReward.create({
        data: {
          userId,
          lessonId,
          ...PET_REWARD,
        },
      });

      const updatedPet = await tx.petProfile.update({
        where: { userId },
        data: {
          xp: pet.xp + PET_REWARD.xp,
          coins: pet.coins + PET_REWARD.coins,
          food: pet.food + PET_REWARD.food,
          hp: this.clamp(pet.hp + 4),
          energy: this.clamp(pet.energy - 8),
          happiness: this.clamp(pet.happiness + 6),
          hunger: this.clamp(pet.hunger - 5),
          streak: nextStreak,
          bestStreak: Math.max(pet.bestStreak, nextStreak),
          completedLessons: pet.completedLessons + 1,
          lastStudyDate: now,
        },
      });

      return { reward, pet: updatedPet };
    });

    return {
      alreadyRewarded: false,
      reward: result.reward,
      pet: this.decoratePet(result.pet),
    };
  }
}
