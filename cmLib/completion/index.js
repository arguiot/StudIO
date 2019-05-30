class Completion {
	constructor(value) {
		value = typeof value == "undefined" ? "" : value
		this.tokenize(value).then(function(tokens) {
			this.set = new Set(tokens)
		}.bind(this))
	}
	tokenize(str) {
		return new Promise(function(resolve, reject) {
			resolve(str.replace(/[^\w\d\s]/g, " ")
				.replace(/\s{2,}/g, " ")
				.split("\n")
				.join(" ")
				.split(" "))
		});
	}
	appendToSet(content) {
		this.tokenize(content).then(function(tokens) {
			tokens.forEach(function(token) {
				this.set.add(token)
			}.bind(this))
		}.bind(this))
	}
	getSuggestions(currentWord, content) {
		if (typeof content != "undefined") {
			this.appendToSet(content)
		}
		let firsts = {
			a: [],
			b: []
		}
		this.set.forEach(function(token) {
			// const score = levenshtein(currentWord, token)
			const score = token.indexOf(currentWord) != -1 ? 1 : -1
			if (firsts.a.length == 0 || firsts.a[1] >= score) {
				firsts.a = [token, score]
			} else if (firsts.b.length == 0 || firsts.b[1] >= score) {
				firsts.b = [token, score]
			}
		}.bind(this))

		return [currentWord, firsts.a[0], firsts.b[0]]
	}

	getLastToken() {
		const index = window.view.state.selection.ranges[0].anchor
		const content = window.view.state.doc.toString()

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

export default Completion
