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

window.onerror = (msg, url, line, column, error) => {
  const message = {
    message: msg,
    url: url,
    line: line,
    column: column,
    error: JSON.stringify(error)
  }

  if (window.webkit) {
    window.webkit.messageHandlers.error.postMessage(message);
  } else {
    console.log("Error:", message);
  }
};
