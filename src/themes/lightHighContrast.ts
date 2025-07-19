export const lightHighContrast = {
  textMateRules: [
    {
      scope: 'keyword.control.jinja2',
      settings: { foreground: '#000080', fontStyle: 'bold' }
    },
    {
      scope: 'entity.filter.jinja2',
      settings: { foreground: '#005FAF', fontStyle: 'italic' }
    },
    {
      scope: 'variable.interpolation.jinja2',
      settings: { foreground: '#AF8700' }
    },
    {
      scope: 'punctuation.definition.tag.jinja2, punctuation.definition.interpolation.jinja2',
      settings: { foreground: '#008700' }
    },
    {
      scope: 'punctuation.section.group.begin.jinja2, punctuation.section.group.end.jinja2',
      settings: { foreground: '#AF005F' }
    }
  ]
};