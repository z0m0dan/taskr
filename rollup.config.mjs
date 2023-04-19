import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { terser } from "rollup-plugin-terser";
import sveltePreprocess from "svelte-preprocess";
import typescript from "@rollup/plugin-typescript";
import path from "path";
import fs from "fs";
import scss from "rollup-plugin-scss";

const production = !process.env.ROLLUP_WATCH;

export default fs
  .readdirSync(path.join(__dirname, "webviews", "pages"))
  .map((input) => {
    const name = input.split(".")[0];
    return {
      input: "./webviews/pages/" + input,
      output: {
        sourcemap: true,
        format: "iife",
        name: "app",
        file: "out/compiled/" + name + ".js",
      },
      plugins: [
        svelte({
          preprocess: sveltePreprocess({
            sourceMap: !production,
            postcss: {
              plugins: [require("autoprefixer")()],
            },
          })
        }),
        scss(),
        resolve({
          browser: true,
          dedupe: ["svelte"],
        }),
        commonjs(),
        typescript({
          compilerOptions: {
            module: "esnext",
            lib: ["es6", "dom"],
            target: "es5",
            sourceMap: true,
            moduleResolution: "node",
          },
        }),

        // In dev mode, call `npm run start` once
        // the bundle has been generated
        // !production && serve(),

        // Watch the `public` directory and refresh the
        // browser on changes when not in production
        // !production && livereload("public"),

        // If we're building for production (npm run build
        // instead of npm run dev), minify
        production && terser(),
      ],
      watch: {
        clearScreen: false,
      },
    };
  });
