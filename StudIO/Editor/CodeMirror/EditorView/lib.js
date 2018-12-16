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
			const script = document.createElement('script');
			script.onload = () => {
				this.cm = CodeMirror(document.body, {
					value: value,
					mode: mode.mode,
					theme: "monokai",
					keymap: "sublime",
					smartIndent: true,
					indentUnit: 4,
					lineNumbers: true,
					autoCloseBrackets: true,
					autoCloseTags: true
				});
			};
			script.src = `mode/${mode.mode}/${mode.mode}.js`;

			document.head.appendChild(script);
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
			const str = window.atob(file)
			this.cm.setValue(str)
		}
	}
	save() {
		return this.cm.getValue()
	}
}
var ed = new editor(null, null)
