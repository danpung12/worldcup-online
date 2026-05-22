import { Test, TestingModule } from '@nestjs/testing';
import { WorldcupService } from './worldcup.service';

describe('WorldcupService', () => {
  let service: WorldcupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorldcupService],
    }).compile();

    service = module.get<WorldcupService>(WorldcupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
