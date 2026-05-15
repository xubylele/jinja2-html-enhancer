export const darkHighContrast = {
  textMateRules: [
    {
      scope: "keyword.control.jinja2",
      settings: { foreground: "#FF0000", fontStyle: "bold" },
    },
    {
      scope: "entity.filter.jinja2",
      settings: { foreground: "#00FFFF", fontStyle: "italic" },
    },
    {
      scope: "variable.interpolation.jinja2",
      settings: { foreground: "#FFFF00" },
    },
    {
      scope: "punctuation.definition.tag.jinja2, punctuation.definition.interpolation.jinja2",
      settings: { foreground: "#00FF00" },
    },
    {
      scope: "punctuation.section.group.begin.jinja2, punctuation.section.group.end.jinja2",
      settings: { foreground: "#FF00FF" },
    },
    {
      scope: "comment.block.jinja2",
      settings: { foreground: "#7EC862", fontStyle: "italic" },
    },
  ],
};
