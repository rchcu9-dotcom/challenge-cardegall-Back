import 'reflect-metadata';
import { RequireAdmin, REQUIRE_ADMIN_KEY } from './require-admin.decorator';

describe('RequireAdmin decorator', () => {
  it('REQUIRE_ADMIN_KEY est la chaîne "requireAdmin"', () => {
    expect(REQUIRE_ADMIN_KEY).toBe('requireAdmin');
  });

  it('pose REQUIRE_ADMIN_KEY = true en métadonnée sur la méthode décorée', () => {
    class TestController {
      @RequireAdmin()
      protectedMethod() {}
    }

    const meta = Reflect.getMetadata(REQUIRE_ADMIN_KEY, TestController.prototype.protectedMethod);
    expect(meta).toBe(true);
  });

  it("ne pose pas la métadonnée sur les méthodes non décorées", () => {
    class TestController {
      unprotectedMethod() {}
    }

    const meta = Reflect.getMetadata(REQUIRE_ADMIN_KEY, TestController.prototype.unprotectedMethod);
    expect(meta).toBeUndefined();
  });

  it('retourne un décorateur utilisable à la fois comme MethodDecorator et ClassDecorator', () => {
    const decorator = RequireAdmin();
    expect(typeof decorator).toBe('function');
  });

  it('peut être appliqué à plusieurs méthodes différentes indépendamment', () => {
    class TestController {
      @RequireAdmin()
      methodA() {}

      methodB() {}

      @RequireAdmin()
      methodC() {}
    }

    expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, TestController.prototype.methodA)).toBe(true);
    expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, TestController.prototype.methodB)).toBeUndefined();
    expect(Reflect.getMetadata(REQUIRE_ADMIN_KEY, TestController.prototype.methodC)).toBe(true);
  });
});
