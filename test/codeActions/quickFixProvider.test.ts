import * as vscode from 'vscode';
import { QuickFixProvider } from '../../src/codeActions/quickFixProvider';

jest.mock('../../src/translations', () => ({
  __esModule: true,
  default: {
    __: (key: string, params?: { variable?: string }) =>
      params?.variable ? `${key}:${params.variable}` : key,
  },
}));

describe('QuickFixProvider', () => {
  it('returns code actions only for jinja diagnostics', () => {
    const provider = new QuickFixProvider();
    const diagnostics = [
      { code: 'JHE0001', message: "Variable 'user' is not set" },
      { code: 'OTHER', message: "Variable 'ignored' is not set" },
    ] as any[];

    const actions = provider.provideCodeActions({} as any, {} as any, { diagnostics } as any) || [];

    expect(actions).toHaveLength(1);
    expect(actions[0].kind).toBe(vscode.CodeActionKind.QuickFix);
    expect(actions[0].command?.command).toBe('extension.saveVariable');
  });

  it('builds fallback quick-fix when variable cannot be parsed', () => {
    const provider = new QuickFixProvider();
    const diagnostics = [{ code: 'JHE0001', message: 'Malformed diagnostic' }] as any[];

    const actions = provider.provideCodeActions({} as any, {} as any, { diagnostics } as any) || [];

    expect(actions).toHaveLength(1);
    expect(actions[0].title).toContain('unknown');
    expect(actions[0].command).toBeUndefined();
  });
});
