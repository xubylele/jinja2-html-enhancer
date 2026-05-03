import {
  registerOriginProvider,
  unregisterOriginProvider,
  hasOriginProviders,
  collectOrigins,
  _resetOriginProviders,
} from '../../src/api/originProviderRegistry';

describe('originProviderRegistry', () => {
  beforeEach(() => {
    _resetOriginProviders();
  });

  it('starts empty', () => {
    expect(hasOriginProviders()).toBe(false);
  });

  it('registers a provider and reports it', () => {
    registerOriginProvider({ id: 'a', provider: () => ({}) });
    expect(hasOriginProviders()).toBe(true);
  });

  it('ignores invalid registrations', () => {
    // @ts-expect-error testing runtime guards
    registerOriginProvider(null);
    // @ts-expect-error
    registerOriginProvider({ id: 'a' });
    // @ts-expect-error
    registerOriginProvider({ provider: () => ({}) });
    expect(hasOriginProviders()).toBe(false);
  });

  it('unregisters by id', () => {
    registerOriginProvider({ id: 'a', provider: () => ({}) });
    unregisterOriginProvider({ id: 'a' });
    expect(hasOriginProviders()).toBe(false);
  });

  it('unregister tolerates unknown id and bad input', () => {
    unregisterOriginProvider({ id: 'never-registered' });
    // @ts-expect-error
    unregisterOriginProvider(null);
    expect(hasOriginProviders()).toBe(false);
  });

  it('collectOrigins returns {} when no providers', async () => {
    expect(await collectOrigins('file:///t.html', ['x'])).toEqual({});
  });

  it('collectOrigins returns {} when names empty', async () => {
    registerOriginProvider({ id: 'a', provider: () => ({ x: { label: 'L' } }) });
    expect(await collectOrigins('file:///t.html', [])).toEqual({});
  });

  it('collects synchronous provider results', async () => {
    registerOriginProvider({
      id: 'a',
      provider: ({ names }) =>
        Object.fromEntries(names.map((n) => [n, { label: `from-${n}` }])),
    });
    expect(await collectOrigins('file:///t.html', ['user', 'items'])).toEqual({
      user: { label: 'from-user' },
      items: { label: 'from-items' },
    });
  });

  it('awaits async provider results', async () => {
    registerOriginProvider({
      id: 'a',
      provider: async () => ({ user: { label: 'inherited' } }),
    });
    expect(await collectOrigins('file:///t.html', ['user'])).toEqual({
      user: { label: 'inherited' },
    });
  });

  it('merges multiple providers; later overrides earlier on key collision', async () => {
    registerOriginProvider({ id: 'a', provider: () => ({ user: { label: 'A' }, items: { label: 'A' } }) });
    registerOriginProvider({ id: 'b', provider: () => ({ user: { label: 'B' } }) });
    expect(await collectOrigins('file:///t.html', ['user', 'items'])).toEqual({
      user: { label: 'B' },
      items: { label: 'A' },
    });
  });

  it('drops origins missing a label', async () => {
    registerOriginProvider({
      id: 'a',
      provider: () => ({
        good: { label: 'ok' },
        // @ts-expect-error testing runtime filter
        bad: { uri: 'x' },
      }),
    });
    expect(await collectOrigins('file:///t.html', ['good', 'bad'])).toEqual({
      good: { label: 'ok' },
    });
  });

  it('catches provider exceptions', async () => {
    registerOriginProvider({
      id: 'throwing',
      provider: () => {
        throw new Error('boom');
      },
    });
    registerOriginProvider({
      id: 'ok',
      provider: () => ({ x: { label: 'L' } }),
    });
    expect(await collectOrigins('file:///t.html', ['x'])).toEqual({
      x: { label: 'L' },
    });
  });

  it('passes uri and names through to providers', async () => {
    const seen: any[] = [];
    registerOriginProvider({
      id: 'spy',
      provider: (req) => {
        seen.push(req);
        return {};
      },
    });
    await collectOrigins('file:///path/to/t.html', ['a', 'b']);
    expect(seen).toEqual([{ uri: 'file:///path/to/t.html', names: ['a', 'b'] }]);
  });
});
