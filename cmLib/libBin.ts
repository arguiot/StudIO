import { EditorState, EditorSelection } from "../codemirror.next/state/src"
import { EditorView } from "../codemirror.next/view/src/"
import { keymap } from "../codemirror.next/keymap/src/keymap"
import { history, redo, redoSelection, undo, undoSelection } from "../codemirror.next/history/src/history"
import { lineNumbers } from "../codemirror.next/gutter/src/index"
import { baseKeymap, indentSelection } from "../codemirror.next/commands/src/commands"
import { legacyMode } from "../codemirror.next/legacy-modes/src/index"
import { matchBrackets } from "../codemirror.next/matchbrackets/src/matchbrackets"
import javascript from "../codemirror.next/legacy-modes/src/javascript"
import { specialChars } from "../codemirror.next/special-chars/src/special-chars"
import { multipleSelections } from "../codemirror.next/multiple-selections/src/multiple-selections"

export default {
	EditorState: EditorState,
	EditorView: EditorView,
	EditorSelection: EditorSelection,
	keymap: keymap,
	history: history,
	redo: redo,
	redoSelection: redoSelection,
	undo: undo,
	undoSelection: undoSelection,
	lineNumbers: lineNumbers,
	baseKeymap: baseKeymap,
	indentSelection: indentSelection,
	legacyMode: legacyMode,
	matchBrackets: matchBrackets,
	javascript: javascript,
	specialChars: specialChars,
	multipleSelections: multipleSelections
}

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
