export const lightDefaultTheme = {
  textMateRules: [
    {
      scope: 'keyword.control.jinja2',
      settings: { foreground: '#0050B3', fontStyle: 'bold' } // dark blue
    },
    {
      scope: 'entity.filter.jinja2',
      settings: { foreground: '#008080', fontStyle: 'italic' } // teal
    },
    {
      scope: 'variable.interpolation.jinja2',
      settings: { foreground: '#B8860B' } // dark goldenrod
    },
    {
      scope: 'punctuation.definition.tag.jinja2, punctuation.definition.interpolation.jinja2',
      settings: { foreground: '#228B22' } // forest green
    },
    {
      scope: 'punctuation.section.group.begin.jinja2, punctuation.section.group.end.jinja2',
      settings: { foreground: '#8B008B' } // dark magenta
    }
  ]
};