import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#102033",
        muted: "#64748b",
        line: "#dbe3ef",
        paper: "#f7fafc",
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          500: "#0891b2",
          600: "#0e7490",
          700: "#155e75",
        },
        accent: {
          500: "#f97316",
          600: "#ea580c",
        },
      },
      boxShadow: {
        soft: "0 18px 50px rgba(16, 32, 51, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
