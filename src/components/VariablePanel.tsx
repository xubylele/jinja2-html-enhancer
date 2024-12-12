import * as React from 'react';

interface Variable {
  name: string;
  isDefined: boolean;
}

interface VariablePanelProps {
  variables: Variable[];
}

export const VariablePanel: React.FC<VariablePanelProps> = ({ variables }) => {
  const definedVariables = variables.filter(v => v.isDefined);
  const undefinedVariables = variables.filter(v => !v.isDefined);

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Jinja2 Variables</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-green-700">Defined Variables</h2>
        {definedVariables.length > 0 ? (
          <ul className="space-y-2">
            {definedVariables.map((variable) => (
              <li key={variable.name} className="flex items-center">
                <span className="w-4 h-4 mr-2 rounded-full bg-green-500"></span>
                <span className="text-green-800">{variable.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 italic">No defined variables found.</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3 text-red-700">Undefined Variables</h2>
        {undefinedVariables.length > 0 ? (
          <ul className="space-y-2">
            {undefinedVariables.map((variable) => (
              <li key={variable.name} className="flex items-center">
                <span className="w-4 h-4 mr-2 rounded-full bg-red-500"></span>
                <span className="text-red-800">{variable.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 italic">No undefined variables found.</p>
        )}
      </div>
    </div>
  );
};
