const term = new Terminal();
term.open(document.getElementById('terminal'));
term.writeln("This is \x1B[1;3;31mStudIO\x1B[0m's integrated SSH client")
term.onKey(data => {
    window.webkit.messageHandlers.sshData.postMessage(data)
})