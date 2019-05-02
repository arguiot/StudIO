var ed = new StudIO.editor()

var EditorSettings = {}

const d = new Catch(err => {
	// Do something when there is an error
	const name = err.errObj.message || err.err
	const {
		src,
		line,
		column,
		time,
		userAgent
	} = err
	const json = {
		err: name,
		src: src,
		line: line,
		column: column,
		time: time,
		userAgent: userAgent
	};
	(async () => {
		const rawResponse = await fetch('https://errors.studiocode.app/', {
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				name: name,
				"JSON": json
			})
		});
		const content = await rawResponse.json();
	})();
})
