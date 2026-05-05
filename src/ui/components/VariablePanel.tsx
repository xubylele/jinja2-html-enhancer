import React from 'react';

interface VariableOrigin {
  label: string;
  uri?: string;
  line?: number;
}

interface VariablePanelProps {
  usedVariables: string[];
  setVariables: string[];
  origins?: Record<string, VariableOrigin>;
}

type Status = 'defined' | 'inherited' | 'undefined';

const STATUS_LABEL: Record<Status, string> = {
  defined: 'Defined',
  inherited: 'Inherited',
  undefined: 'Undefined',
};

const STATUS_COLOR: Record<Status, string> = {
  defined: 'text-green-500',
  inherited: 'text-blue-500',
  undefined: 'text-red-500',
};

const VariablePanel: React.FC<VariablePanelProps> = ({
  usedVariables,
  setVariables,
  origins = {},
}) => {
  const variables = usedVariables.map((name) => {
    const origin = origins[name];
    let status: Status;
    if (setVariables.includes(name)) {
      status = 'defined';
    } else if (origin) {
      status = 'inherited';
    } else {
      status = 'undefined';
    }
    return { name, status, origin };
  });

  const showOriginColumn = Object.keys(origins).length > 0;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Jinja2 Variables</h1>
      <table className="table-fixed w-full">
        <thead>
          <tr>
            <th className="px-4 py-2">Variable</th>
            <th className="px-4 py-2">Status</th>
            {showOriginColumn && <th className="px-4 py-2">Origin</th>}
          </tr>
        </thead>
        <tbody>
          {variables.map((v) => (
            <tr key={v.name}>
              <td className="border px-4 py-2">{v.name}</td>
              <td className={`border px-4 py-2 ${STATUS_COLOR[v.status]}`}>
                {STATUS_LABEL[v.status]}
              </td>
              {showOriginColumn && (
                <td className="border px-4 py-2 text-gray-600 dark:text-gray-300">
                  {v.origin?.label ?? '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VariablePanel;
