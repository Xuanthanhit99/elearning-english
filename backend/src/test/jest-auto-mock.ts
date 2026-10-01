import { jest } from '@jest/globals';
import { TestingModuleBuilder } from '@nestjs/testing';

const originalCompile = TestingModuleBuilder.prototype.compile;

jest
  .spyOn(TestingModuleBuilder.prototype, 'compile')
  .mockImplementation(async function (this: TestingModuleBuilder, ...args) {
    this.useMocker(() => ({}));
    return await originalCompile.apply(this, args);
  });
