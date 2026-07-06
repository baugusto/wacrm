import path from "node:path";

const config = {
  plugins: {
    "@tailwindcss/postcss": {
      base: path.resolve(process.cwd(), "src"),
    },
  },
};

export default config;
