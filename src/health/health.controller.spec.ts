import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import type { HealthPayload } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: jest.Mocked<HealthService>;

  const mockPayload: HealthPayload = {
    status: 'ok',
    timestamp: '2026-06-12T12:00:00.000Z',
    uptime: 42.5,
    version: '0.0.1',
    environment: 'test',
  };

  beforeEach(async () => {
    const mockHealthService: jest.Mocked<Pick<HealthService, 'check'>> = {
      check: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService) as jest.Mocked<HealthService>;
  });

  describe('check()', () => {
    it('delegates to healthService.check() with no arguments', () => {
      healthService.check.mockReturnValue(mockPayload);

      controller.check();

      expect(healthService.check).toHaveBeenCalledTimes(1);
      expect(healthService.check).toHaveBeenCalledWith();
    });

    it('returns exactly what healthService.check() returns', () => {
      healthService.check.mockReturnValue(mockPayload);

      const result = controller.check();

      expect(result).toBe(mockPayload);
    });
  });
});
