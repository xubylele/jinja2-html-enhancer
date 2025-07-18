module.exports = {
  content: ["./src/**/*.{ts,js,tsx,jsx,html}"],
  safelist: [
    "bg-gray-100", "dark:bg-gray-900", "text-gray-800", "dark:text-gray-200",
    "bg-gray-200", "dark:bg-gray-800", "text-center", "text-left",
    "font-sans", "text-sm", "text-xl", "font-bold",
    "table", "table-auto", "table-fixed", "border", "border-b", "px-4", "py-2",
    "text-green-500", "text-red-500",
    "flex", "flex-col", "justify-between", "items-center", "w-full", "min-w-full", "min-h-screen",
    "overflow-x-auto", "shadow", "rounded", "h-full", "mt-auto"
  ],
  darkMode: "class",
  theme: {
    extend: {}
  },
  plugins: []
};
