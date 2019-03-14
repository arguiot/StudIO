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
				this.cm = CodeMirror(document.body, {
					value: value,
					mode: mode.mode,
					theme: this.theme,
					keymap: "sublime",
					smartIndent: true,
					indentUnit: 4,
					lineNumbers: true,
                    lineWrapping: this.lineWrapping,
					autoCloseBrackets: true,
					autoCloseTags: true,
                    foldGutter: true,
                    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
				});

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
			document.querySelector(".CodeMirror").style["font-size"] = `${v}px`
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
