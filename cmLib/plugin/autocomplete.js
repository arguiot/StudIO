import StudIOPlugin from "./plugin.js"

class StudIOAutocomplete extends StudIOPlugin {
	get cursorIndex() {
		return window.view.state.selection.ranges[0].anchor
	}
	get viewContent() {
		return window.view.state.doc.toString()
	}
	get suggestion() {
		return "STUDIOAUTOCOMPLETE"
	}
	getSuggestions() {
		return []
	}

	getLastToken() {
		if (window.view.state.doc.toString() == "") return ""
		const index = window.view.state.selection.ranges[0].anchor
		const content = window.view.state.doc.toString()

		let out = ""
		for (let i = 1; true; i++) {
			const newI = index - i

			if (newI == 0) break
			if (newI < 0) {
				newI = content.length - 1
			}
			const letter = content[newI]

			if (/[^\w\d\s]/g.test(letter) == true) break
			if (typeof letter != "undefined") {
				out += letter
			}
		}
		return [out.split("").reverse().join("").trim(), newI]
	}

	getSmartKeys() {
		return ["{", "}", this.suggestion, this.suggestion, this.suggestion]
	}

	getContent(lastToken, lastI) {
		const content = window.view.state.doc.toString()

		return content.slice(0, lastI) + content.slice(lastI + lastToken.length, content.length)
	}
}

export default StudIOAutocomplete
