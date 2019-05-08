import StudIOPlugin from "./plugin.js"

class StudIOAutocomplete extends StudIOPlugin {
	get cursorIndex() {
		return window.view.state.selection.ranges[0].anchor
	}
	get viewContent() {
		return window.view.state.doc.toString()
	}
	getSuggestions() {
		return []
	}

	getLastToken() {
		const index = this.cursorIndex
		const content = this.viewContent

		let out = ""
		for (let i = 0; true; i++) {
			const newI = index - i

			if (newI == 0) break
			if (newI < 0) {
				newI = content.length - 1
			}
			const letter = content[newI]

			if (letter == " ") break
			if (letter == "\n") break
			if (typeof letter != "undefined") {
				out += letter
			}
		}
		return out.split("").reverse().join("")
	}
}

export default StudIOAutocomplete
