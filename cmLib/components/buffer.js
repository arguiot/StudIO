class BufferCenter {
	constructor() {
		this.buffers = []
	}
	get default() {
		const exportGlobal = (name, object) => {
			if (typeof(global) !== "undefined") {
				// Node.js
				global[name] = object;
			} else if (typeof(window) !== "undefined") {
				// JS with GUI (usually browser)
				window[name] = object;
			} else {
				throw new Error("Unkown run-time environment. Currently only browsers and Node.js are supported.");
			}
		};

		if (typeof Buffer_Shared_Instance == "undefined") {
			exportGlobal("Buffer_Shared_Instance", new BufferCenter())
		}
		return Buffer_Shared_Instance
	}
	addTask() {
		this.buffers.push([...arguments])
	}
	execute(ctx) {
		this.buffers.forEach(task => {
			let args = task.slice().splice(1, 2);
			ctx[task[0]](...args)
		})
		this.buffers = []
	}
}

export default new BufferCenter()
