import {EditorState, EditorView, EditorSelection, keymap, history, redo, redoSelection, undo, undoSelection, lineNumbers, baseKeymap, indentSelection, legacyMode, matchBrackets, javascript, specialChars, multipleSelections} from "./libBin.js"
class editor {
	constructor(ext, value) {
		if (ext == null && value == null) {
			document.addEventListener("DOMContentLoaded", () => {
				// Do something...
			})
		} else {
			let mode = CodeMirror.findModeByExtension(ext)
			if (typeof mode == "undefined" || typeof mode.mode == "undefined") {
				mode = CodeMirror.findModeByExtension("md") // Using markdown for undefined var
			}
            this.mode = mode
			this.settings()

			const script = document.createElement('script');
			script.onload = () => {
				let mode = legacyMode({ mode: javascript({ indentUnit: 2 }, {}) })

                let isMac = /Mac/.test(navigator.platform)

				this.cm = EditorState.create({
					doc: value, extensions: [
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
				let view = window.view = new EditorView({ state: this.cm })
                document.querySelector("#editor").appendChild(view.dom)

				// after settings
				this.fontSize(EditorSettings.fontSize)
			};
			script.src = `mode/${mode.mode}/${mode.mode}.js`;

			document.head.appendChild(script);
		}
	}
	settings() {
		this.lineWrapping = EditorSettings.lineWrapping == true // boolean convert
		this.theme = EditorSettings.theme
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
			this.cm.setOption("theme", theme)
		}
	}
	fontSize(v) {
		if (v > 0) {
			document.querySelector(".codemirror").style["font-size"] = `${v}px`
		}
	}

	clear() {
		document.body.innerHTML = ""
	}
	load(file) {
		if (typeof this.cm == "undefined") {
			setTimeout(() => {
				this.load(file)
			}, 16) // Waiting 16ms (~ 1 frame) before rendering for letting WKWebView parse and process everything. Otherwise, we do it again and again.
		} else {
			const str = atobUTF8(file)
			this.cm.setValue(str)
		}
	}
	save() {
		return btoaUTF8(this.cm.getValue())
	}
    getLangName() {
        return this.mode.name
    }

    insertSnippet(snippet) {
        const str = atobUTF8(snippet)
        this.cm.replaceSelection(str)
    }
}
var ed = new editor(null, null)

var EditorSettings = {}
