const term = new Terminal();
term.open(document.getElementById('terminal'));
term.writeln("This is \x1B[1;3;31mStudIO\x1B[0m's integrated SSH client")
term.onKey(e => {
    const printable = !e.domEvent.altKey && !e.domEvent.altGraphKey && !e.domEvent.ctrlKey && !e.domEvent.metaKey;

    if (e.domEvent.keyCode === 13) {
        term.write('\r\n$ ')
    } else if (e.domEvent.keyCode === 8) {
        // Do not delete the prompt
        if (term._core.buffer.x > 2) {
            term.write('\b \b');
        }
    } else if (printable) {
        term.write(e.key);
        window.webkit.messageHandlers.sshData.postMessage(e.key)
    }
})