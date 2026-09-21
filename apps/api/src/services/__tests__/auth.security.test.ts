import { describe, it, expect } from 'vitest';
import {
  assertJwtSecretIsSafe,
  DEV_FALLBACK_SECRET,
  MIN_JWT_SECRET_LENGTH,
} from '../auth.service';

const STRONG_SECRET = 'a'.repeat(MIN_JWT_SECRET_LENGTH);

describe('assertJwtSecretIsSafe', () => {
  it('não bloqueia dev/teste, mesmo sem JWT_SECRET', () => {
    expect(() => assertJwtSecretIsSafe(undefined, 'development')).not.toThrow();
    expect(() => assertJwtSecretIsSafe(undefined, 'test')).not.toThrow();
    expect(() => assertJwtSecretIsSafe(DEV_FALLBACK_SECRET, 'development')).not.toThrow();
  });

  it('aborta em produção quando JWT_SECRET não está definido', () => {
    expect(() => assertJwtSecretIsSafe(undefined, 'production')).toThrowError(/JWT_SECRET é obrigatório/i);
    expect(() => assertJwtSecretIsSafe('', 'production')).toThrowError(/JWT_SECRET é obrigatório/i);
    expect(() => assertJwtSecretIsSafe('   ', 'production')).toThrowError(/JWT_SECRET é obrigatório/i);
  });

  it('aborta em produção com o segredo padrão de desenvolvimento (é público)', () => {
    expect(() => assertJwtSecretIsSafe(DEV_FALLBACK_SECRET, 'production')).toThrowError(/valor padrão/i);
  });

  it('aborta em produção com segredo curto demais', () => {
    expect(() => assertJwtSecretIsSafe('curto', 'production')).toThrowError(/mínimo exigido/i);
    expect(() =>
      assertJwtSecretIsSafe('b'.repeat(MIN_JWT_SECRET_LENGTH - 1), 'production')
    ).toThrowError(/mínimo exigido/i);
  });

  it('aceita em produção um segredo forte', () => {
    expect(() => assertJwtSecretIsSafe(STRONG_SECRET, 'production')).not.toThrow();
    expect(() => assertJwtSecretIsSafe(`  ${STRONG_SECRET}  `, 'production')).not.toThrow();
  });
});
