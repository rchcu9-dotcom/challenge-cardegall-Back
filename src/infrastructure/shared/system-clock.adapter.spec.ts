import { SystemClock } from './system-clock.adapter';

describe('SystemClock', () => {
  it('now() retourne une Date proche de l’heure actuelle', () => {
    const clock = new SystemClock();
    const before = Date.now();

    const result = clock.now();

    const after = Date.now();
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
    expect(result.getTime()).toBeLessThanOrEqual(after);
  });
});
