import * as vscode from 'vscode';
import {
  WILDCARD_TEMPLATE_KEY,
  buildLegacyCustomVarsContext,
  getContextProfiles,
  resolveProfilesForTemplate,
  setContextProfiles,
} from '../../src/config/configService';

const setupConfigMock = (data: Record<string, any>) => {
  const update = jest.fn();
  const get = jest.fn((key: string, fallback?: any) => data[key] ?? fallback);
  (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
    get,
    update,
  });
  return { update, get };
};

describe('contextProfiles helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the per-file profile set when present', () => {
    setupConfigMock({
      contextProfiles: {
        '/tmp/index.html': {
          default: 'demo',
          profiles: { demo: { user: { name: 'A' } } },
        },
      },
    });
    const { key, set } = resolveProfilesForTemplate('/tmp/index.html');
    expect(key).toBe('/tmp/index.html');
    expect(set.default).toBe('demo');
    expect(set.profiles.demo).toEqual({ user: { name: 'A' } });
  });

  it('falls back to wildcard "*" entry when per-file is missing', () => {
    setupConfigMock({
      contextProfiles: {
        [WILDCARD_TEMPLATE_KEY]: {
          default: 'shared',
          profiles: { shared: { tenant: 'acme' } },
        },
      },
    });
    const { key, set } = resolveProfilesForTemplate('/tmp/other.html');
    expect(key).toBe(WILDCARD_TEMPLATE_KEY);
    expect(set.profiles.shared).toEqual({ tenant: 'acme' });
  });

  it('returns an empty profile set when neither file nor wildcard match', () => {
    setupConfigMock({ contextProfiles: {} });
    const { set } = resolveProfilesForTemplate('/tmp/unknown.html');
    expect(set.profiles).toEqual({});
  });

  it('writes context profiles using workspace-folder target when editor in workspace', async () => {
    const { update } = setupConfigMock({});
    (vscode.workspace.getWorkspaceFolder as jest.Mock).mockReturnValue({
      uri: vscode.Uri.file('/tmp'),
    });
    const editor = { document: { uri: vscode.Uri.file('/tmp/x.html') } } as any;
    await setContextProfiles(editor, { a: { default: 'd', profiles: {} } });
    expect(update).toHaveBeenCalledWith(
      'contextProfiles',
      { a: { default: 'd', profiles: {} } },
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
  });

  it('writes globally when no editor is provided', async () => {
    const { update } = setupConfigMock({});
    await setContextProfiles(undefined, {});
    expect(update).toHaveBeenCalledWith(
      'contextProfiles',
      {},
      vscode.ConfigurationTarget.Global,
    );
  });

  it('getContextProfiles returns empty object when unset', () => {
    setupConfigMock({});
    expect(getContextProfiles()).toEqual({});
  });

  it('builds legacy customVariables context as empty-string keys', () => {
    setupConfigMock({
      customVariables: { '/tmp/x.html': ['title', 'user'] },
    });
    const ctx = buildLegacyCustomVarsContext('/tmp/x.html');
    expect(ctx).toEqual({ title: '', user: '' });
  });
});
