import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PREVIEW_PRESETS, PresetKey } from './presets';

export interface ProfileSet {
  default: string;
  profiles: Record<string, Record<string, unknown>>;
}

export interface PreviewParams {
  view: 'preview';
  translations: Record<string, any>;
  templateKey: string;
  wildcardKey: string;
  profileSet: ProfileSet;
  activeProfile: string;
  currentContext: Record<string, unknown>;
  html: string;
  missingVariables: string[];
  usedVariables: string[];
}

interface Props {
  params: PreviewParams;
}

const PRESET_KEYS: PresetKey[] = ['user', 'list', 'paginated', 'form'];

function t(translations: Record<string, any>, key: string): string {
  const parts = key.split('.');
  let cur: any = translations;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in cur) { cur = cur[p]; }
    else { return key; }
  }
  return typeof cur === 'string' ? cur : key;
}

function post(command: string, payload: Record<string, unknown> = {}) {
  if (window.vscode) { window.vscode.postMessage({ command, ...payload }); }
}

const TemplatePreviewApp: React.FC<Props> = ({ params }) => {
  const tr = (k: string) => t(params.translations, k);
  const profileSet: ProfileSet = params.profileSet ?? { default: '', profiles: {} };

  const [activeProfile, setActiveProfile] = useState(params.activeProfile);
  const [editorText, setEditorText] = useState(() =>
    JSON.stringify(params.currentContext, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const [contextCollapsed, setContextCollapsed] = useState(false);
  const [liveHtml, setLiveHtml] = useState(params.html);
  const [liveMissing, setLiveMissing] = useState(params.missingVariables);
  const [liveUsed, setLiveUsed] = useState(params.usedVariables);
  const lastParamsKey = useRef('');
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
  }, [params]);

  // Listen for incremental render updates pushed by the extension.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.type !== 'preview-result') { return; }
      setLiveHtml(data.html);
      setLiveMissing(data.missingVariables ?? []);
      setLiveUsed(data.usedVariables ?? []);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const parsedContext = useMemo<Record<string, unknown> | null>(() => {
    try {
      const v = JSON.parse(editorText);
      if (v && typeof v === 'object' && !Array.isArray(v)) { return v; }
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
      if (v && typeof v === 'object' && !Array.isArray(v)) { parsed = v; }
      setParseError(null);
    } catch (e) {
      setParseError(tr('preview.invalidJson'));
    }
    if (debounceRef.current) { clearTimeout(debounceRef.current); }
    if (parsed) {
      const ctx = parsed;
      debounceRef.current = setTimeout(() => {
        post('preview-context', { context: ctx });
      }, 200);
    }
  };

  const onSave = () => {
    if (!parsedContext) { return; }
    const name = activeProfile || promptName();
    if (!name) { return; }
    post('save-profile', { name, context: parsedContext });
  };

  const onSaveAs = () => {
    if (!parsedContext) { return; }
    const name = promptName();
    if (!name) { return; }
    post('save-profile', { name, context: parsedContext });
  };

  const onDelete = (name: string) => {
    post('delete-profile', { name });
  };

  const onSetDefault = (name: string) => {
    post('set-default', { name });
  };

  const onSelectProfile = (name: string) => {
    setActiveProfile(name);
    post('set-active', { name });
  };

  const onApplyPreset = (key: PresetKey) => {
    const merged = { ...(parsedContext ?? {}), ...PREVIEW_PRESETS[key] };
    setEditorText(JSON.stringify(merged, null, 2));
    setParseError(null);
    post('preview-context', { context: merged });
  };

  const onAddMissing = (name: string) => {
    post('add-missing-var', { name });
  };

  const profileNames = Object.keys(profileSet.profiles);
  const scopeLabel =
    params.templateKey === params.wildcardKey
      ? tr('preview.wildcardScope')
      : params.templateKey;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
      {/* Sidebar */}
      <aside className="w-56 border-r border-gray-200 dark:border-gray-800 p-3 flex flex-col gap-3 overflow-y-auto">
        <header>
          <h2 className="text-xs uppercase tracking-wide text-gray-500">
            {tr('preview.profilesHeader')}
          </h2>
          <p className="text-[11px] text-gray-400 mt-1 truncate" title={params.templateKey}>
            {tr('preview.templateKeyLabel')}: {scopeLabel}
          </p>
        </header>

        <ul className="flex flex-col gap-1">
          {profileNames.length === 0 && (
            <li className="text-xs text-gray-400">{tr('preview.noProfilesFound')}</li>
          )}
          {profileNames.map(name => {
            const isActive = name === activeProfile;
            const isDefault = name === profileSet.default;
            return (
              <li
                key={name}
                className={`group rounded px-2 py-1.5 text-sm cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
                onClick={() => onSelectProfile(name)}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{name}</span>
                  {isDefault && (
                    <span
                      className={`text-[10px] uppercase ${
                        isActive ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {tr('preview.defaultBadge')}
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
                        {tr('preview.setDefault')}
                      </button>
                    )}
                    <button
                      className="underline opacity-90 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(name);
                      }}
                    >
                      {tr('preview.deleteProfile')}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <button
          onClick={onSaveAs}
          className="mt-auto rounded bg-gray-200 dark:bg-gray-800 px-2 py-1.5 text-xs hover:bg-gray-300 dark:hover:bg-gray-700"
        >
          + {tr('preview.newProfile')}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setContextCollapsed((v) => !v)}
            title={contextCollapsed ? tr('preview.expandContext') : tr('preview.collapseContext')}
            aria-expanded={!contextCollapsed}
            className="rounded bg-gray-200 dark:bg-gray-800 px-2 py-1 text-xs hover:bg-gray-300 dark:hover:bg-gray-700"
          >
            {contextCollapsed ? '▸' : '▾'}
          </button>
          <h2 className="text-sm font-semibold">{tr('preview.contextHeader')}</h2>
          <div className="ml-auto flex items-center gap-2">
            <select
              className="bg-gray-100 dark:bg-gray-800 text-xs rounded px-2 py-1 border border-gray-300 dark:border-gray-700"
              defaultValue=""
              disabled={contextCollapsed}
              onChange={(e) => {
                const v = e.target.value as PresetKey | '';
                if (v) { onApplyPreset(v); }
                e.currentTarget.value = '';
              }}
            >
              <option value="">{tr('preview.applyPreset')}…</option>
              {PRESET_KEYS.map((k) => (
                <option key={k} value={k}>
                  {tr(`preview.presets.${k}`)}
                </option>
              ))}
            </select>
            <button
              disabled={!parsedContext || contextCollapsed}
              onClick={onSave}
              className="rounded bg-blue-600 text-white text-xs px-3 py-1 disabled:opacity-50"
            >
              {tr('preview.saveProfile')}
            </button>
          </div>
        </div>

        <div
          className={`flex-1 grid gap-3 overflow-hidden ${
            contextCollapsed ? 'grid-cols-1' : 'grid-cols-2'
          }`}
        >
          {!contextCollapsed && (
          <div className="flex flex-col gap-2 overflow-hidden">
            <textarea
              spellCheck={false}
              value={editorText}
              placeholder={tr('preview.contextPlaceholder')}
              onChange={(e) => onEditorChange(e.target.value)}
              className="flex-1 font-mono text-xs p-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 resize-none"
            />
            {parseError && (
              <p className="text-xs text-red-500">{parseError}</p>
            )}

            <section>
              <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                {tr('preview.missingHeader')}
              </h3>
              {liveMissing.length === 0 ? (
                <p className="text-xs text-green-600">{tr('preview.missingEmpty')}</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {liveMissing.map((name) => (
                    <li key={name}>
                      <button
                        title={tr('preview.addMissingVar')}
                        onClick={() => onAddMissing(name)}
                        className="text-xs px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600"
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
            <h3 className="text-xs uppercase tracking-wide text-gray-500">
              {tr('preview.previewHeader')}
            </h3>
            <div
              className="flex-1 rounded border border-blue-500 bg-white text-gray-900 overflow-auto p-4"
              dangerouslySetInnerHTML={{ __html: liveHtml }}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

function promptName(): string | null {
  const name = window.prompt('Profile name');
  return name && name.trim() ? name.trim() : null;
}

export default TemplatePreviewApp;
