import { Test } from '@nestjs/testing';

const originalCreateTestingModule = Test.createTestingModule.bind(Test);

jest.spyOn(Test, 'createTestingModule').mockImplementation((metadata, options) => {
  const builder = originalCreateTestingModule(metadata, options);
  return builder.useMocker(() => ({}));
});
