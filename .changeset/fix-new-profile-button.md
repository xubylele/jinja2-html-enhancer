---
"jinja2-html-enhancer": patch
---

Fixed: creating context profiles in the template preview panel.

- The "+ New Profile" button now opens an inline name input (VS Code webviews block `window.prompt`, which is why the button looked dead).
- Profile saves now resolve their config-target from the template's own URI instead of `activeTextEditor` — clicking inside the webview steals focus from the editor, so the previous code was writing to a target the URI-scoped reader couldn't see, and any failure was swallowed silently. Errors now surface as a VS Code error toast.
