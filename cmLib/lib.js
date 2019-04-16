import libCM from "./libBin.js"

const EditorState = libCM.EditorState
const EditorView = libCM.EditorView
const EditorSelection = libCM.EditorSelection
const keymap = libCM.keymap
const history = libCM.history
const redo = libCM.redo
const redoSelection = libCM.redoSelection
const undo = libCM.undo
const undoSelection = libCM.undoSelection
const lineNumbers = libCM.lineNumbers
const baseKeymap = libCM.baseKeymap
const indentSelection = libCM.indentSelection
const legacyMode = libCM.legacyMode
const matchBrackets = libCM.matchBrackets
const specialChars = libCM.specialChars
const multipleSelections = libCM.multipleSelections
const text = libCM.text

class editor {
	constructor(ext, value, settings = {}) {
		this.EditorSettings = settings
		if (ext == null && value == null) {
			document.addEventListener("DOMContentLoaded", () => {
				// Do something...
			})
		} else {
			let mode = CodeMirror.findModeByExtension(ext)
			if (typeof mode == "undefined" || typeof mode.mode == "undefined") {
				mode = CodeMirror.findModeByExtension("md") // Using markdown for undefined var
			}
			this.settings()

			const script = document.createElement('script');
			script.onload = () => {
				var m = null
				try {
					m = ExportedMode({ indentUnit: 2 })
				} catch {
					m = ExportedMode({ indentUnit: 2 }, {})
				}

				let mode = legacyMode({
					mode: m
				})
				this.mode = mode

				let isMac = /Mac/.test(navigator.platform)

				this.cm = EditorState.create({
					doc: value,
					extensions: [
						lineNumbers(),
						history(),
						specialChars(),
						multipleSelections(),
						mode,
						matchBrackets(),
						keymap({
							"Mod-z": undo,
							"Mod-Shift-z": redo,
							"Mod-u": view => undoSelection(view) || true,
							[isMac ? "Mod-Shift-u" : "Alt-u"]: redoSelection,
							"Ctrl-y": isMac ? undefined : redo,
							"Shift-Tab": indentSelection
						}),
						keymap(baseKeymap),
					]
				})
				let view = window.view = new EditorView({
					state: this.cm
				})
				document.querySelector("#editor").appendChild(view.dom)
			};
			script.src = `mode/${mode.mode}/${mode.mode}.js`;

			document.head.appendChild(script);

			// after settings
			// this.fontSize(EditorSettings.fontSize)
		}
	}
	settings() {
		try {
			this.lineWrapping = this.EditorSettings.lineWrapping == true // boolean convert
			this.theme = this.EditorSettings.theme
		} catch (e) {
			console.warn(e)
		}
		if (typeof this.theme == "undefined") {
			this.theme = "monokai"
		}
		this.loadTheme(this.theme)
	}
	loadTheme(theme) {
		const link = document.createElement("link")
		link.setAttribute("rel", "stylesheet")
		link.setAttribute("href", `theme/${theme}.css`)
		document.head.appendChild(link);
		if (typeof this.cm != "undefined") {
			// this.cm.setOption("theme", theme)
		}
	}
	fontSize(v) {
		if (v > 0) {
			document.querySelector(".codemirror").style["font-size"] = `${v}px`
		}
	}

	clear() {
		document.body.innerHTML = "<div id=editor></div>"
	}
	load(file) {
		if (typeof this.cm == "undefined") {
			setTimeout(() => {
				this.load(file)
			}, 16) // Waiting 16ms (~ 1 frame) before rendering for letting WKWebView parse and process everything. Otherwise, we do it again and again.
		} else {
			const str = atobUTF8(file)

			const doc = text.of(str, "\n")
			window.view.state.doc = doc
			window.view.setState(window.view.state)
		}
	}
	save() {
		return btoaUTF8(window.view.state.doc.text.join("\n"))
	}
	getLangName() {
		return this.mode.name
	}

	insertSnippet(snippet) {
		const str = atobUTF8(snippet)
		this.cm.replaceSelection(str)
	}
}
export default {
	editor: editor,
	Text: text
}
