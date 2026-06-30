import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        aria: "#2d5a3d",
        kava: "#8c2b2b",
        simjati: "#5b3d8a",
        sheva: "#b8922a",
      },
    },
  },
  plugins: [],
};

export default config;
