import { Test, TestingModule } from '@nestjs/testing';
import { GrammarController } from './grammar.controller';
import { GrammarService } from './grammar.service';

describe('GrammarController', () => {
  let controller: GrammarController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GrammarController],
      providers: [{ provide: GrammarService, useValue: {} }],
    }).compile();

    controller = module.get<GrammarController>(GrammarController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
