import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(() => {
    service = new HealthService();
  });

  describe('check()', () => {
    it('returns status "ok"', () => {
      const result = service.check();

      expect(result.status).toBe('ok');
    });

    it('returns a valid ISO timestamp', () => {
      const result = service.check();

      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });

    it('returns a non-negative numeric uptime', () => {
      const result = service.check();

      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('returns version and environment as strings', () => {
      const result = service.check();

      expect(typeof result.version).toBe('string');
      expect(typeof result.environment).toBe('string');
    });

    it('defaults environment to "development" when NODE_ENV is unset', () => {
      const previous = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const result = service.check();

      expect(result.environment).toBe('development');

      if (previous === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previous;
      }
    });
  });
});
