class StudIOPlugin {
	constructor(type) {
		this.sCallbacks = []
		this.type = type
		this.init()
	}
	init() {

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
	onStateChange(f) {
		this.sCallbacks.push(f)
	}
	setState(state) {
		window.view.setState(state)
		this.sCallbacks.forEach(f => {
			try {
				f(state)
			} catch(error) {
				console.log(error)
			}
		})
	}
}

export default StudIOPlugin
