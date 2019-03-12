import cleanup from "rollup-plugin-cleanup";
import pkg from "./package.json";

export default {
  input: "src/osc-stream.js",
  directory: "dist",
  output: [
    {
      file: pkg.module,
      format: "es"
    },
    {
      file: pkg.main,
      format: "cjs"
    }
  ],
  plugins: [
    cleanup()
  ]
};