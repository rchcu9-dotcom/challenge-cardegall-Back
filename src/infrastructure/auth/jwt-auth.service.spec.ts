import { JwtService } from '@nestjs/jwt';
import { JwtAuthService } from './jwt-auth.service';

describe('JwtAuthService', () => {
  let jwtService: JwtService;
  let service: JwtAuthService;

  beforeEach(() => {
    jwtService = new JwtService({ secret: 'test-secret' });
    service = new JwtAuthService(jwtService);
  });

  it('retourne le payload pour un token JWT valide', async () => {
    const token = await jwtService.signAsync({ uid: 'google-123', provider: 'google' });
    const result = await service.validateToken(token);
    expect(result).toMatchObject({ uid: 'google-123', provider: 'google' });
  });

  it('retourne null pour un token invalide', async () => {
    const result = await service.validateToken('token-invalide');
    expect(result).toBeNull();
  });

  it('retourne null pour une chaîne vide', async () => {
    const result = await service.validateToken('');
    expect(result).toBeNull();
  });

  it('retourne null pour un token signé avec un autre secret', async () => {
    const otherJwt = new JwtService({ secret: 'autre-secret' });
    const token = await otherJwt.signAsync({ uid: 'google-123', provider: 'google' });
    const result = await service.validateToken(token);
    expect(result).toBeNull();
  });
});
