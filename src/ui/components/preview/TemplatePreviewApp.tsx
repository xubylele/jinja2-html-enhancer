import React, { useEffect, useMemo, useRef, useState } from "react";
import { PREVIEW_PRESETS, PresetKey } from "./presets";

export interface ProfileSet {
  default: string;
  profiles: Record<string, Record<string, unknown>>;
}

export interface PreviewParams {
  view: "preview";
  translations: Record<string, any>;
  templateKey: string;
  wildcardKey: string;
  profileSet: ProfileSet;
  activeProfile: string;
  currentContext: Record<string, unknown>;
  html: string;
  missingVariables: string[];
  usedVariables: string[];
  injectedCss?: string;
}

interface Props {
  params: PreviewParams;
}

const PRESET_KEYS: PresetKey[] = ["user", "list", "paginated", "form"];

function t(translations: Record<string, any>, key: string): string {
  const parts = key.split(".");
  let cur: any = translations;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      return key;
    }
  }
  return typeof cur === "string" ? cur : key;
}

function post(command: string, payload: Record<string, unknown> = {}) {
  if (window.vscode) {
    window.vscode.postMessage({ command, ...payload });
    return;
  }
  console.error("[jinja2-preview] window.vscode is undefined — cannot send", command);
  const banner = document.createElement("div");
  banner.style.cssText =
    "position:fixed;top:0;left:0;right:0;background:#b91c1c;color:white;padding:8px;font:12px monospace;z-index:9999";
  banner.textContent = `[jinja2-preview] window.vscode missing — cannot send '${command}'. Reload the webview.`;
  document.body.appendChild(banner);
}

const TemplatePreviewApp: React.FC<Props> = ({ params }) => {
  const tr = (k: string) => t(params.translations, k);
  const rawProfileSet = params.profileSet as Partial<ProfileSet> | undefined | null;
  const profileSet: ProfileSet = {
    default: typeof rawProfileSet?.default === "string" ? rawProfileSet.default : "",
    profiles:
      rawProfileSet?.profiles && typeof rawProfileSet.profiles === "object"
        ? rawProfileSet.profiles
        : {},
  };

  const [activeProfile, setActiveProfile] = useState(params.activeProfile);
  const [editorText, setEditorText] = useState(() =>
    JSON.stringify(params.currentContext, null, 2)
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [contextCollapsed, setContextCollapsed] = useState(false);
  const [newProfileName, setNewProfileName] = useState<string | null>(null);
  const [liveHtml, setLiveHtml] = useState(params.html);
  const [liveMissing, setLiveMissing] = useState(params.missingVariables);
  const [liveUsed, setLiveUsed] = useState(params.usedVariables);
  const [liveInjectedCss, setLiveInjectedCss] = useState(params.injectedCss ?? "");
  const lastParamsKey = useRef("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When params arrive from the extension (new render), resync editor + active profile.
  useEffect(() => {
    const key = `${params.activeProfile}::${JSON.stringify(params.currentContext)}`;
    if (key !== lastParamsKey.current) {
      lastParamsKey.current = key;
      setActiveProfile(params.activeProfile);
      setEditorText(JSON.stringify(params.currentContext, null, 2));
      setParseError(null);
    }
    setLiveHtml(params.html);
    setLiveMissing(params.missingVariables);
    setLiveUsed(params.usedVariables);
    setLiveInjectedCss(params.injectedCss ?? "");
  }, [params]);

  // Listen for incremental render updates pushed by the extension.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== "preview-result") {
        return;
      }
      setLiveHtml(data.html);
      setLiveMissing(data.missingVariables ?? []);
      setLiveUsed(data.usedVariables ?? []);
      if (data.injectedCss !== undefined) setLiveInjectedCss(data.injectedCss);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const parsedContext = useMemo<Record<string, unknown> | null>(() => {
    try {
      const v = JSON.parse(editorText);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return v;
      }
      return null;
    } catch {
      return null;
    }
  }, [editorText]);

  const onEditorChange = (next: string) => {
    setEditorText(next);
    let parsed: Record<string, unknown> | null = null;
    try {
      const v = JSON.parse(next);
      if (v && typeof v === "object" && !Array.isArray(v)) {
        parsed = v;
      }
      setParseError(null);
    } catch (e) {
      setParseError(tr("preview.invalidJson"));
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (parsed) {
      const ctx = parsed;
      debounceRef.current = setTimeout(() => {
        post("preview-context", { context: ctx });
      }, 200);
    }
  };

  const onSave = () => {
    if (!parsedContext) {
      return;
    }
    if (activeProfile) {
      post("save-profile", { name: activeProfile, context: parsedContext });
      return;
    }
    setNewProfileName("");
  };

  const onSaveAs = () => {
    if (!parsedContext) {
      return;
    }
    setNewProfileName("");
  };

  const confirmNewProfile = () => {
    const name = (newProfileName ?? "").trim();
    if (!name || !parsedContext) {
      return;
    }
    post("save-profile", { name, context: parsedContext });
    setNewProfileName(null);
  };

  const cancelNewProfile = () => {
    setNewProfileName(null);
  };

  const onDelete = (name: string) => {
    post("delete-profile", { name });
  };

  const onSetDefault = (name: string) => {
    post("set-default", { name });
  };

  const onSelectProfile = (name: string) => {
    setActiveProfile(name);
    post("set-active", { name });
  };

  const onApplyPreset = (key: PresetKey) => {
    const merged = { ...(parsedContext ?? {}), ...PREVIEW_PRESETS[key] };
    setEditorText(JSON.stringify(merged, null, 2));
    setParseError(null);
    post("preview-context", { context: merged });
  };

  const onAddMissing = (name: string) => {
    post("add-missing-var", { name });
  };

  const profileNames = Object.keys(profileSet.profiles);
  const scopeLabel =
    params.templateKey === params.wildcardKey ? tr("preview.wildcardScope") : params.templateKey;

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-800 dark:bg-gray-900 dark:text-gray-200">
      {/* Sidebar */}
      <aside className="flex w-56 flex-col gap-3 overflow-y-auto border-r border-gray-200 p-3 dark:border-gray-800">
        <header>
          <h2 className="text-xs tracking-wide text-gray-500 uppercase">
            {tr("preview.profilesHeader")}
          </h2>
          <p className="mt-1 truncate text-[11px] text-gray-400" title={params.templateKey}>
            {tr("preview.templateKeyLabel")}: {scopeLabel}
          </p>
        </header>

        <ul className="flex flex-col gap-1">
          {profileNames.length === 0 && (
            <li className="text-xs text-gray-400">{tr("preview.noProfilesFound")}</li>
          )}
          {profileNames.map((name) => {
            const isActive = name === activeProfile;
            const isDefault = name === profileSet.default;
            return (
              <li
                key={name}
                className={`group cursor-pointer rounded px-2 py-1.5 text-sm ${
                  isActive ? "bg-blue-600 text-white" : "hover:bg-gray-200 dark:hover:bg-gray-800"
                }`}
                onClick={() => onSelectProfile(name)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{name}</span>
                  {isDefault && (
                    <span
                      className={`text-[10px] uppercase ${
                        isActive ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {tr("preview.defaultBadge")}
                    </span>
                  )}
                </div>
                {isActive && (
                  <div className="mt-1 flex gap-2 text-[11px]">
                    {!isDefault && (
                      <button
                        className="underline opacity-90 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetDefault(name);
                        }}
                      >
                        {tr("preview.setDefault")}
                      </button>
                    )}
                    <button
                      className="underline opacity-90 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(name);
                      }}
                    >
                      {tr("preview.deleteProfile")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {newProfileName === null ? (
          <button
            onClick={onSaveAs}
            disabled={!parsedContext}
            className="mt-auto rounded bg-gray-200 px-2 py-1.5 text-xs hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            + {tr("preview.newProfile")}
          </button>
        ) : (
          <div className="mt-auto flex flex-col gap-1.5">
            <input
              autoFocus
              type="text"
              value={newProfileName}
              placeholder={tr("preview.newProfilePrompt")}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmNewProfile();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelNewProfile();
                }
              }}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-950"
            />
            <div className="flex gap-1.5">
              <button
                onClick={confirmNewProfile}
                disabled={!newProfileName.trim()}
                className="flex-1 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {tr("preview.saveProfile")}
              </button>
              <button
                onClick={cancelNewProfile}
                aria-label="Cancel"
                className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setContextCollapsed((v) => !v)}
            title={contextCollapsed ? tr("preview.expandContext") : tr("preview.collapseContext")}
            aria-expanded={!contextCollapsed}
            className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {contextCollapsed ? "▸" : "▾"}
          </button>
          <h2 className="text-sm font-semibold">{tr("preview.contextHeader")}</h2>
          <div className="ml-auto flex items-center gap-2">
            <select
              className="rounded border border-gray-300 bg-gray-100 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
              defaultValue=""
              disabled={contextCollapsed}
              onChange={(e) => {
                const v = e.target.value as PresetKey | "";
                if (v) {
                  onApplyPreset(v);
                }
                e.currentTarget.value = "";
              }}
            >
              <option value="">{tr("preview.applyPreset")}…</option>
              {PRESET_KEYS.map((k) => (
                <option key={k} value={k}>
                  {tr(`preview.presets.${k}`)}
                </option>
              ))}
            </select>
            <button
              disabled={!parsedContext || contextCollapsed}
              onClick={onSave}
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-50"
            >
              {tr("preview.saveProfile")}
            </button>
          </div>
        </div>

        <div
          className={`grid flex-1 gap-3 overflow-hidden ${
            contextCollapsed ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {!contextCollapsed && (
            <div className="flex flex-col gap-2 overflow-hidden">
              <textarea
                spellCheck={false}
                value={editorText}
                placeholder={tr("preview.contextPlaceholder")}
                onChange={(e) => onEditorChange(e.target.value)}
                className="flex-1 resize-none rounded border border-gray-300 bg-white p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-950"
              />
              {parseError && <p className="text-xs text-red-500">{parseError}</p>}

              <section>
                <h3 className="mb-1 text-xs tracking-wide text-gray-500 uppercase">
                  {tr("preview.missingHeader")}
                </h3>
                {liveMissing.length === 0 ? (
                  <p className="text-xs text-green-600">{tr("preview.missingEmpty")}</p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {liveMissing.map((name) => (
                      <li key={name}>
                        <button
                          title={tr("preview.addMissingVar")}
                          onClick={() => onAddMissing(name)}
                          className="rounded bg-red-500 px-2 py-0.5 text-xs text-white hover:bg-red-600"
                        >
                          {name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}

          <div className="flex flex-col gap-2 overflow-hidden">
            <h3 className="text-xs tracking-wide text-gray-500 uppercase">
              {tr("preview.previewHeader")}
            </h3>
            <div
              className="flex-1 overflow-auto rounded border border-blue-500 bg-white p-4 text-gray-900"
              dangerouslySetInnerHTML={{ __html: liveInjectedCss + liveHtml }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default TemplatePreviewApp;
