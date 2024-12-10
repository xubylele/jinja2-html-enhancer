export function extractVariables(text: string): { usedVariables: string[], setVariables: string[] } {
  const usedVariableRegex = /\{\{\s*(\w+)\s*\}\}/g;
  const setVariableRegex = /\{%\s*set\s+(\w+)\s*=/g;

  const usedMatches = text.matchAll(usedVariableRegex);
  const setMatches = text.matchAll(setVariableRegex);

  const usedVariables = [...new Set([...usedMatches].map(match => match[1]))];
  const setVariables = [...new Set([...setMatches].map(match => match[1]))];

  return { usedVariables, setVariables };
}
