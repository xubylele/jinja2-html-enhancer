import React from 'react';

interface Variable {
  name: string;
  isDefined: boolean;
}

interface VariablePanelProps {
  usedVariables: string[];
  setVariables: string[];
}

const VariablePanel: React.FC<VariablePanelProps> = ({ usedVariables, setVariables }) => {
  const variables = usedVariables.map((name) => ({
    name,
    isDefined: setVariables.includes(name),
  }));

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Jinja2 Variables</h1>
      <table className="table-fixed w-full">
        <thead>
          <tr>
            <th className="px-4 py-2">Variable</th>
            <th className="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {variables.map((v) => (
            <tr key={v.name}>
              <td className="border px-4 py-2">{v.name}</td>
              <td
                className={`border px-4 py-2 ${v.isDefined ? 'text-green-500' : 'text-red-500'
                  }`}
              >
                {v.isDefined ? 'Defined' : 'Undefined'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VariablePanel;
