import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import VariablePanel from './components/VariablePanel';

declare const params: {
  translations: Record<string, string>;
  usedVariables: string[];
  setVariables: string[];
};

declare global {
  interface Window {
    vscode: any;
  }
}

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setIsDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkMode) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
      <header className="py-4 bg-gray-200 dark:bg-gray-800 shadow">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <h1 className="text-xl font-bold">Jinja2 Enhanced</h1>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-6">
        <VariablePanel
          usedVariables={params.usedVariables}
          setVariables={params.setVariables}
        />
      </main>
      <footer className="py-4 bg-gray-200 dark:bg-gray-800 text-center mt-auto">
        <p className="text-sm">Base64 Studio &copy; 2024</p>
      </footer>
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}
