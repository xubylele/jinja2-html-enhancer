import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import { createRequire } from "module";
import * as path from "path";
import I18n from "../translations";

const execAsync = promisify(exec);

export interface ResolvedPrettier {
  prettier: { format: (text: string, options: any) => Promise<string> };
  pluginPath: string;
}

export class PrettierResolver {
  private static didShowPrompt = false;
  private static promptTimeout: ReturnType<typeof setTimeout> | null = null;

  /**
   * Try to resolve `prettier` and `prettier-plugin-jinja-template` from the
   * workspace root's node_modules. Returns null if either is missing.
   */
  static async resolve(): Promise<ResolvedPrettier | null> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) return null;

    try {
      const workspaceRequire = createRequire(path.join(workspaceRoot, ".prettier-resolve.js"));

      const prettier = workspaceRequire("prettier");
      const pluginPath = workspaceRequire.resolve("prettier-plugin-jinja-template");

      return { prettier, pluginPath };
    } catch {
      // Not found — prompt once per session (reset after 5 min)
      if (!this.didShowPrompt) {
        this.didShowPrompt = true;
        this.showInstallPrompt();
      }
      return null;
    }
  }

  /**
   * Auto-install prettier + prettier-plugin-jinja-template via npm.
   */
  static async install(): Promise<boolean> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) return false;

    const installing = vscode.window.setStatusBarMessage(I18n.__("formatting.installing"), 10_000);

    try {
      await execAsync("npm install --save-dev prettier prettier-plugin-jinja-template", {
        cwd: workspaceRoot,
        timeout: 60_000,
      });
      installing.dispose();
      vscode.window.showInformationMessage(I18n.__("formatting.installed"));
      return true;
    } catch (err) {
      installing.dispose();
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(I18n.__("formatting.installFailed", { error: msg }));
      vscode.window.showInformationMessage(I18n.__("formatting.notFound"));
      return false;
    }
  }

  // ── private ──────────────────────────────────────────────────────────

  private static getWorkspaceRoot(): string | null {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) return null;
    return folders[0].uri.fsPath;
  }

  private static async showInstallPrompt(): Promise<void> {
    const installAction = I18n.__("formatting.installAction");
    const learnMore = I18n.__("formatting.learnMore");
    const dontShowAgain = I18n.__("formatting.dontShowAgain");

    const selection = await vscode.window.showInformationMessage(
      I18n.__("formatting.promptInstall"),
      installAction,
      learnMore,
      dontShowAgain
    );

    if (selection === installAction) {
      await this.install();
    } else if (selection === learnMore) {
      vscode.env.openExternal(
        vscode.Uri.parse("https://github.com/davidodenwald/prettier-plugin-jinja-template")
      );
    } else if (selection === dontShowAgain) {
      await vscode.workspace
        .getConfiguration("jinja2-html-enhancer")
        .update("formatting.enabled", false, vscode.ConfigurationTarget.Global);
    }

    // Reset the flag after 5 min so the prompt can show again across saves
    if (this.promptTimeout) clearTimeout(this.promptTimeout);
    this.promptTimeout = setTimeout(() => {
      this.didShowPrompt = false;
    }, 300_000);
  }
}
