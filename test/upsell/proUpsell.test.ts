import * as vscode from 'vscode';
import { maybePromptProUpsell } from '../../src/upsell/proUpsell';

const PRO_EXTENSION_ID = 'Xubylele.jinja2-html-enhancer-pro';
const FIRST_USE_KEY = 'jinja2.firstActivation';
const PROMPTED_KEY = 'jinja2.free.proUpsellPrompted';
const TRIAL_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function createContext(initial: Record<string, unknown> = {}) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    globalState: {
      get: jest.fn((key: string) => store.get(key)),
      update: jest.fn((key: string, value: unknown) => {
        store.set(key, value);
        return Promise.resolve();
      }),
    },
    _store: store,
  } as any;
}

describe('maybePromptProUpsell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when the Pro extension is already installed', async () => {
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue({ id: PRO_EXTENSION_ID });
    const context = createContext({ [FIRST_USE_KEY]: 0 });

    await maybePromptProUpsell(context);

    expect(vscode.extensions.getExtension).toHaveBeenCalledWith(PRO_EXTENSION_ID);
    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    expect(context.globalState.update).not.toHaveBeenCalled();
  });

  it('does nothing when the user has already been prompted', async () => {
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);
    const context = createContext({ [PROMPTED_KEY]: true, [FIRST_USE_KEY]: 0 });

    await maybePromptProUpsell(context);

    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it('does nothing when there is no first-activation timestamp yet', async () => {
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);
    const context = createContext();

    await maybePromptProUpsell(context);

    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
    expect(context.globalState.update).not.toHaveBeenCalled();
  });

  it('does nothing when still inside the 30-day trial window', async () => {
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);
    const context = createContext({ [FIRST_USE_KEY]: Date.now() - 1000 });

    await maybePromptProUpsell(context);

    expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
  });

  it('shows the prompt after 30 days and runs the install command on "Install Pro"', async () => {
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Install Pro');
    const context = createContext({ [FIRST_USE_KEY]: Date.now() - TRIAL_PERIOD_MS - 1000 });

    await maybePromptProUpsell(context);

    expect(context.globalState.update).toHaveBeenCalledWith(PROMPTED_KEY, true);
    expect(vscode.window.showInformationMessage).toHaveBeenCalledTimes(1);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.extensions.installExtension',
      PRO_EXTENSION_ID,
    );
    expect(vscode.env.openExternal).not.toHaveBeenCalled();
  });

  it('opens the landing page on "Learn More"', async () => {
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Learn More');
    const context = createContext({ [FIRST_USE_KEY]: Date.now() - TRIAL_PERIOD_MS - 1000 });

    await maybePromptProUpsell(context);

    expect(vscode.env.openExternal).toHaveBeenCalledTimes(1);
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('takes no action when the user dismisses the prompt', async () => {
    (vscode.extensions.getExtension as jest.Mock).mockReturnValue(undefined);
    (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('Don\'t show again');
    const context = createContext({ [FIRST_USE_KEY]: Date.now() - TRIAL_PERIOD_MS - 1000 });

    await maybePromptProUpsell(context);

    expect(context.globalState.update).toHaveBeenCalledWith(PROMPTED_KEY, true);
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    expect(vscode.env.openExternal).not.toHaveBeenCalled();
  });
});
