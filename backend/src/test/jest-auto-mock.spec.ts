import { Test } from '@nestjs/testing';

class AutoMockDependency {
  value = 'dependency';
}

class AutoMockConsumer {
  constructor(readonly dependency: AutoMockDependency) {}
}

describe('jest auto mock infrastructure', () => {
  it('preserves createTestingModule -> compile -> get contract', async () => {
    const module = await Test.createTestingModule({
      providers: [AutoMockConsumer],
    }).compile();

    expect(module).toBeDefined();
    expect(typeof module.get).toBe('function');
    expect(module.get(AutoMockConsumer)).toBeInstanceOf(AutoMockConsumer);
  });
});
