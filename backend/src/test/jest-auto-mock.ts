import { Test } from '@nestjs/testing';

const originalCreateTestingModule = Test.createTestingModule.bind(Test);

Test.createTestingModule = ((metadata, options) => {
  const builder = originalCreateTestingModule(metadata, options);
  builder.useMocker(() => ({}));
  return builder;
}) as typeof Test.createTestingModule;
