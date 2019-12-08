var e = new StudIO.editor()

var EditorSettings = {}

function StudIO_loadFile(content, ext, settings) {
	e = new StudIO.editor(ext, content, settings)
}

function StudIO_loadImg(content, ext, settings) {
	document.body.innerHTML = `<img src="data:image/jpg;base64,${content}">`
	document.querySelector("img").style.width = "100vw"
	document.querySelector("img").style.height = "100vh"
	document.querySelector("img").style["object-fit"] = "contain"
}
