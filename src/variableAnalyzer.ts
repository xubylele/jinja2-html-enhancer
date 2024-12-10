export function extractVariables(text: string): { usedVariables: string[], setVariables: string[] } {
  const usedVariableRegex = /\{\{\s*(\w+(?:\.\w+)*)\s*\}\}/g;
  const setVariableRegex = /\{%\s*set\s+(\w+)\s*=/g;
  const forLoopRegex = /\{%\s*for\s+(\w+)\s+in\s+/g;

  const usedMatches = text.matchAll(usedVariableRegex);
  const setMatches = text.matchAll(setVariableRegex);
  const forLoopMatches = text.matchAll(forLoopRegex);

  const usedVariables = [...new Set([...usedMatches].map(match => match[1].split('.')[0]))];
  const setVariables = [
    ...new Set([
      ...[...setMatches].map(match => match[1]),
      ...[...forLoopMatches].map(match => match[1])
    ])
  ];

  return { usedVariables, setVariables };
}

export function analyzeNestedStructures(text: string): string[] {
  const structureStack: string[] = [];
  const definedVariables: string[] = [];
  const regex = /\{%\s*(for|if|set)\s+(\w+)|\{%\s*end(for|if)/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[1]) {
      if (match[1] === 'for' || match[1] === 'set') {
        definedVariables.push(match[2]);
      }
      structureStack.push(match[1]);
    } else {
      structureStack.pop();
    }
  }

  return definedVariables;
}
