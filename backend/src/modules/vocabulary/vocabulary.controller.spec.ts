import { Test, TestingModule } from '@nestjs/testing';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';
import { AchievementsService } from '../achievements/achievements.service';

describe('VocabularyController', () => {
  let controller: VocabularyController;

  const vocabularyServiceMock = { getTopics: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VocabularyController],
      providers: [
        {
          provide: VocabularyService,
          useValue: vocabularyServiceMock,
        },
        {
          provide: AchievementsService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<VocabularyController>(VocabularyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getTopics delegates to VocabularyService.getTopics', () => {
    vocabularyServiceMock.getTopics.mockReturnValue([{ id: 'topic-1' }]);

    const result = controller.getTopics();

    expect(vocabularyServiceMock.getTopics).toHaveBeenCalled();
    expect(result).toEqual([{ id: 'topic-1' }]);
  });
});
