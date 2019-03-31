import typescript from "rollup-plugin-typescript2"
import commonjs from "rollup-plugin-commonjs"
import nodeResolve from "rollup-plugin-node-resolve"

export default {
  input: "./lib.ts",
  output: {
    format: "umd",
    file: "../StudIO/Editor/CodeMirror/EditorView/libCM.js",
    sourcemap: true
  },
  plugins: [
    nodeResolve(),
    typescript({
      check: true,
      tsconfigOverride: {
        compilerOptions: {lib: ["es5", "es6", "dom"], sourceMap: true, target: "es5", strict: false},
        include: null
      }
    }),
    commonjs()
  ]
}
