export const lightDefaultTheme = {
  textMateRules: [
    {
      scope: "keyword.control.jinja2",
      settings: { foreground: "#0050B3", fontStyle: "bold" },
    },
    {
      scope: "entity.filter.jinja2",
      settings: { foreground: "#008080", fontStyle: "italic" },
    },
    {
      scope: "variable.interpolation.jinja2",
      settings: { foreground: "#B8860B" },
    },
    {
      scope: "punctuation.definition.tag.jinja2, punctuation.definition.interpolation.jinja2",
      settings: { foreground: "#228B22" },
    },
    {
      scope: "punctuation.section.group.begin.jinja2, punctuation.section.group.end.jinja2",
      settings: { foreground: "#8B008B" },
    },
    {
      scope: "comment.block.jinja2",
      settings: { foreground: "#4A7C3F", fontStyle: "italic" },
    },
  ],
};
