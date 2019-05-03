import levenshtein from "./levenshtein.js"

class Completion {
	constructor(value = "") {
		this.tokenize(value).then(tokens => {
			this.set = new Set(tokens)
		})
	}
	tokenize(str) {
		return new Promise(function(resolve, reject) {
			resolve(str.replace(/[^\w\d\s]/g, "")
				.replace(/\s{2,}/g, " ")
				.split(" "))
		});
	}
	async appendToSet(content) {
		this.tokenize(content).then(tokens => {
			tokens.forEach(token => {
				this.set.add(token)
			})
		})
	}
	getSuggestions(currentWord, content = null) {
		if (content != null) {
			this.appendToSet(content)
		}
		let firsts = {
			a: [],
			b: []
		}
		this.set.forEach(token => {
			const score = levenshtein(currentWord, token)
			if (firsts.a == [] || firsts.a[1] <= score) {
				firsts.a = [token, score]
			} else if (firsts.b == [] || firsts.b[1] <= score) {
				firsts.b = [token, score]
			}
		})

		return [currentWord, firsts.a[0], firsts.b[0]]
	}
}

export default Completion
