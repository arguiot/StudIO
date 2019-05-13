class StudIOPlugin {
	constructor(type) {
		this.type = type
	}
	get Type() {
		return this.type
	}
	get EditorView() {
		return window.view
	}
	get state() {
		return window.view.state
	}
	setState(state) {
		window.view.setState(state)
	}
}

export default StudIOPlugin
