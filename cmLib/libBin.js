"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var src_1 = require("../codemirror.next/state/src");
var src_2 = require("../codemirror.next/view/src/");
var keymap_1 = require("../codemirror.next/keymap/src/keymap");
var history_1 = require("../codemirror.next/history/src/history");
var index_1 = require("../codemirror.next/gutter/src/index");
var commands_1 = require("../codemirror.next/commands/src/commands");
var index_2 = require("../codemirror.next/legacy-modes/src/index");
var matchbrackets_1 = require("../codemirror.next/matchbrackets/src/matchbrackets");
var javascript_1 = require("../codemirror.next/legacy-modes/src/javascript");
var special_chars_1 = require("../codemirror.next/special-chars/src/special-chars");
var multiple_selections_1 = require("../codemirror.next/multiple-selections/src/multiple-selections");
exports.default = {
    EditorState: src_1.EditorState,
    EditorView: src_2.EditorView,
    EditorSelection: src_1.EditorSelection,
    keymap: keymap_1.keymap,
    history: history_1.history,
    redo: history_1.redo,
    redoSelection: history_1.redoSelection,
    undo: history_1.undo,
    undoSelection: history_1.undoSelection,
    lineNumbers: index_1.lineNumbers,
    baseKeymap: commands_1.baseKeymap,
    indentSelection: commands_1.indentSelection,
    legacyMode: index_2.legacyMode,
    matchBrackets: matchbrackets_1.matchBrackets,
    javascript: javascript_1.default,
    specialChars: special_chars_1.specialChars,
    multipleSelections: multiple_selections_1.multipleSelections
};
//
// class editor {
// 	cm = EditorState.create({
// 		doc: value, extensions: [
// 			lineNumbers(),
// 			history(),
// 			specialChars(),
// 			multipleSelections(),
// 			mode,
// 			matchBrackets(),
// 			keymap({
// 				"Mod-z": undo,
// 				"Mod-Shift-z": redo,
// 				"Mod-u": view => undoSelection(view) || true,
// 				[isMac ? "Mod-Shift-u" : "Alt-u"]: redoSelection,
// 				"Ctrl-y": isMac ? undefined : redo,
// 				"Shift-Tab": indentSelection
// 			}),
// 			keymap(baseKeymap),
// 		]
// 	})
//
//     constructor(ext, value): void {
//         if (ext == null && value == null) {
//             document.addEventListener("DOMContentLoaded", () => {
//                 // Do something...
//             })
//         } else {
//             // let mode = CodeMirror.findModeByExtension(ext)
//             // if (typeof mode == "undefined" || typeof mode.mode == "undefined") {
//             //     mode = CodeMirror.findModeByExtension("md") // Using markdown for undefined var
//             // }
//             // this.mode = mode
//             this.settings()
//
//             const script = document.createElement('script');
//             script.onload = () => {
// 				let mode = legacyMode({ mode: javascript({ indentUnit: 2 }, {}) as any })
//
//                 let isMac = /Mac/.test(navigator.platform)
//
//                 let view = (window as any).view = new EditorView({ (this as editor).cm })
//                 document.querySelector("#editor").appendChild(view.dom)
//
//                 // after settings
//                 this.fontSize(EditorSettings.fontSize)
//             };
//             script.src = `mode/${mode.mode}/${mode.mode}.js`;
//
//             document.head.appendChild(script);
//         }
//     }
//     settings(): void {
//         this.lineWrapping = EditorSettings.lineWrapping == true // boolean convert
//         this.theme = EditorSettings.theme
//         if (typeof this.theme == "undefined") {
//             this.theme = "monokai"
//         }
//         this.loadTheme(this.theme)
//     }
//     loadTheme(theme): void {
//         const link = document.createElement("link")
//         link.setAttribute("rel", "stylesheet")
//         link.setAttribute("href", `theme/${theme}.css`)
//         document.head.appendChild(link);
//         if (typeof this.cm != "undefined") {
//             this.cm.setOption("theme", theme)
//         }
//     }
//     fontSize(v): void {
//         if (v > 0) {
//             document.querySelector(".codemirror").style["font-size"] = `${v}px`
//         }
//     }
//
//     clear(): void {
//         document.body.innerHTML = ""
//     }
//     load(file): void {
//         if (typeof this.cm == "undefined") {
//             setTimeout(() => {
//                 this.load(file)
//             }, 16) // Waiting 16ms (~ 1 frame) before rendering for letting WKWebView parse and process everything. Otherwise, we do it again and again.
//         } else {
//             const str = atobUTF8(file)
//             this.cm.setValue(str)
//         }
//     }
//     save(): string {
//         return btoaUTF8(this.cm.getValue())
//     }
//     getLangName(): string {
//         return this.mode.name
//     }
//
//     insertSnippet(snippet): void {
//         const str = atobUTF8(snippet)
//         this.cm.replaceSelection(str)
//     }
// }
// var ed = new editor(null, null)
//
// var EditorSettings = {}
