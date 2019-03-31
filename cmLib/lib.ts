import {EditorState, EditorSelection} from "../codemirror.next/state/src"
import {EditorView} from "../codemirror.next/view/src/"
import {keymap} from "../codemirror.next/keymap/src/keymap"
import {history, redo, redoSelection, undo, undoSelection} from "../codemirror.next/history/src/history"
import {lineNumbers} from "../codemirror.next/gutter/src/index"
import {baseKeymap, indentSelection} from "../codemirror.next/commands/src/commands"
import {legacyMode} from "../codemirror.next/legacy-modes/src/index"
import {matchBrackets} from "../codemirror.next/matchbrackets/src/matchbrackets"
import javascript from "../codemirror.next/legacy-modes/src/javascript"
import {specialChars} from "../codemirror.next/special-chars/src/special-chars"
import {multipleSelections} from "../codemirror.next/multiple-selections/src/multiple-selections"

let mode = legacyMode({mode: javascript({indentUnit: 2}, {}) as any})

let isMac = /Mac/.test(navigator.platform)
let state = EditorState.create({doc: `"use strict";
const {readFile} = require("fs");

readFile("package.json", "utf8", (err, data) => {
  console.log(data);
});`, extensions: [
  lineNumbers(),
  history(),
  specialChars(),
  multipleSelections(),
  mode,
  matchBrackets(),
  keymap({
    "Mod-z": undo,
    "Mod-Shift-z": redo,
    "Mod-u": view => undoSelection(view) || true,
    [isMac ? "Mod-Shift-u" : "Alt-u"]: redoSelection,
    "Ctrl-y": isMac ? undefined : redo,
    "Shift-Tab": indentSelection
  }),
  keymap(baseKeymap),
]})

let view = (window as any).view = new EditorView({state})
document.querySelector("#editor").appendChild(view.dom)
