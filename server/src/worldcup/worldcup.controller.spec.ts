import { Test, TestingModule } from '@nestjs/testing';
import { WorldcupController } from './worldcup.controller';
import { WorldcupService } from './worldcup.service';

describe('WorldcupController', () => {
  let controller: WorldcupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorldcupController],
      providers: [WorldcupService],
    }).compile();

    controller = module.get<WorldcupController>(WorldcupController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
