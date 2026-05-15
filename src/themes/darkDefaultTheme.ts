export const darkDefaultTheme = {
  textMateRules: [
    {
      scope: "keyword.control.jinja2",
      settings: { foreground: "#FF4D4D", fontStyle: "bold" },
    },
    {
      scope: "entity.filter.jinja2",
      settings: { foreground: "#00E5FF", fontStyle: "italic" },
    },
    {
      scope: "variable.interpolation.jinja2",
      settings: { foreground: "#FFD700" },
    },
    {
      scope: "punctuation.definition.tag.jinja2, punctuation.definition.interpolation.jinja2",
      settings: { foreground: "#8AFF80" },
    },
    {
      scope: "punctuation.section.group.begin.jinja2, punctuation.section.group.end.jinja2",
      settings: { foreground: "#FF66FF" },
    },
    {
      scope: "comment.block.jinja2",
      settings: { foreground: "#6A9955", fontStyle: "italic" },
    },
  ],
};
