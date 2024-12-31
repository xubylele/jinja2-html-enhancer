

export function extractVariableName(diagnosticMessage: string): string | null {
  const match = diagnosticMessage.match(/'([^']+)'/);
  return match ? match[1] : null;
}
