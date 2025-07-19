export const xubySelectionTheme = {
  textMateRules: [
    {
      scope: 'keyword.control.jinja2',
      settings: { foreground: '#d43790', fontStyle: 'bold' }
    },
    {
      scope: 'entity.filter.jinja2',
      settings: { foreground: '#4b1e3d', fontStyle: 'italic' }
    },
    {
      scope: 'variable.interpolation.jinja2',
      settings: { foreground: '#f6ea5d' }
    },
    {
      scope: 'punctuation.definition.tag.jinja2, punctuation.definition.interpolation.jinja2',
      settings: { foreground: '#443b40' }
    },
    {
      scope: 'punctuation.section.group.begin.jinja2, punctuation.section.group.end.jinja2',
      settings: { foreground: '#ec8fd0' }
    }
  ]
};