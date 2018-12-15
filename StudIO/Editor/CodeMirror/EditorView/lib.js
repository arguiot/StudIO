class editor {
    constructor(ext, value) {
        if (ext == null && value == null) {
            document.addEventListener("DOMContentLoaded", () => {
                                      // Do something...
                                      })
        } else {
            const mode = CodeMirror.findModeByExtension(ext)
            
            const script = document.createElement('script');
            script.onload = () => {
                this.cm = CodeMirror(document.body, {
                                     value: value,
                                     mode: mode.mode,
                                     theme: "monokai",
                                     keymap: "sublime",
                                     smartIndent: true,
                                     indentUnit: 4,
                                     lineNumbers: true,
                                     autoCloseBrackets: true,
                                     autoCloseTags: true
                                     });
            };
            script.src = `mode/${mode.mode}/${mode.mode}.js`;
            
            document.head.appendChild(script);
        }
    }
    clear() {
        document.body.innerHTML = ""
    }
}
var e = new editor(null, null)
