import { jest } from '@jest/globals';
import { TestingModuleBuilder } from '@nestjs/testing';

const originalCompile = TestingModuleBuilder.prototype.compile;

jest
  .spyOn(TestingModuleBuilder.prototype, 'compile')
  .mockImplementation(function (this: TestingModuleBuilder, ...args) {
    this.useMocker(() => ({}));
    return originalCompile.apply(this, args);
  });
