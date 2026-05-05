// Public contribution API for sister extensions (e.g., Jinja2 Enhance Pro)
// to inject "where does this variable come from?" metadata into the
// Variable Panel without forking it.
//
// Usage from another extension:
//
//   const callback: VariableOriginProvider = ({ uri, names }) => {
//     // resolve origins for `names` in the template at `uri` ...
//     return { user: { label: 'Inherited from base.html', uri: '...', line: 4 } };
//   };
//   await vscode.commands.executeCommand(
//     'jinja2-html-enhancer.registerOriginProvider',
//     { id: 'pro-inherited', provider: callback },
//   );
//
// Names without an origin in the returned record are simply skipped — the
// panel falls back to the existing Defined/Undefined state for them.

export interface VariableOrigin {
  /** Short label rendered in the Origin column (e.g., `Inherited from base.html`). */
  label: string;
  /** Optional URI string of the origin file, used for future click-to-navigate. */
  uri?: string;
  /** Optional zero-based line of the origin within `uri`. */
  line?: number;
}

export interface VariableOriginRequest {
  /** URI string (`vscode.Uri.toString()`) of the template currently displayed. */
  uri: string;
  /** Used variable names from the active analysis pass. */
  names: string[];
}

export type VariableOriginProvider = (
  request: VariableOriginRequest,
) =>
  | Promise<Record<string, VariableOrigin>>
  | Record<string, VariableOrigin>;

export interface VariableOriginRegistration {
  /** Stable ID for the provider — required for unregistration. */
  id: string;
  provider: VariableOriginProvider;
}
