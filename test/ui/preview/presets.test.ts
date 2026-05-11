import { PREVIEW_PRESETS } from '../../../src/ui/components/preview/presets';

describe('PREVIEW_PRESETS', () => {
  it('exposes the four documented presets', () => {
    expect(Object.keys(PREVIEW_PRESETS).sort()).toEqual([
      'form',
      'list',
      'paginated',
      'user',
    ]);
  });

  it('user preset includes id/name/email/avatar', () => {
    expect(PREVIEW_PRESETS.user.user).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      email: expect.any(String),
      avatar: expect.any(String),
    });
  });

  it('list preset has an items array', () => {
    expect(Array.isArray((PREVIEW_PRESETS.list as any).items)).toBe(true);
    expect((PREVIEW_PRESETS.list as any).items.length).toBeGreaterThan(0);
  });

  it('paginated preset has paging metadata', () => {
    expect(PREVIEW_PRESETS.paginated).toMatchObject({
      page: expect.any(Number),
      total_pages: expect.any(Number),
      has_next: expect.any(Boolean),
      has_prev: expect.any(Boolean),
    });
  });

  it('form preset has values/errors/csrf_token', () => {
    expect(PREVIEW_PRESETS.form).toMatchObject({
      values: expect.any(Object),
      errors: expect.any(Object),
      csrf_token: expect.any(String),
    });
  });
});
