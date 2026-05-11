export type PresetKey = 'user' | 'list' | 'paginated' | 'form';

export const PREVIEW_PRESETS: Record<PresetKey, Record<string, unknown>> = {
  user: {
    user: {
      id: 1,
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      avatar: 'https://example.com/avatar.png',
    },
  },
  list: {
    items: [
      { id: 1, title: 'First item', body: 'Body for first item' },
      { id: 2, title: 'Second item', body: 'Body for second item' },
      { id: 3, title: 'Third item', body: 'Body for third item' },
    ],
  },
  paginated: {
    items: [
      { id: 1, title: 'Row 1' },
      { id: 2, title: 'Row 2' },
    ],
    page: 1,
    total_pages: 5,
    has_next: true,
    has_prev: false,
  },
  form: {
    values: { email: '', remember: false },
    errors: {},
    csrf_token: 'demo-csrf-token',
  },
};
