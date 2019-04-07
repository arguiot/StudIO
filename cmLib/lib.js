"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _a;
var src_1 = require("../codemirror.next/state/src");
var src_2 = require("../codemirror.next/view/src/");
var keymap_1 = require("../codemirror.next/keymap/src/keymap");
var history_1 = require("../codemirror.next/history/src/history");
var index_1 = require("../codemirror.next/gutter/src/index");
var commands_1 = require("../codemirror.next/commands/src/commands");
var index_2 = require("../codemirror.next/legacy-modes/src/index");
var matchbrackets_1 = require("../codemirror.next/matchbrackets/src/matchbrackets");
var javascript_1 = require("../codemirror.next/legacy-modes/src/javascript");
var special_chars_1 = require("../codemirror.next/special-chars/src/special-chars");
var multiple_selections_1 = require("../codemirror.next/multiple-selections/src/multiple-selections");
var mode = index_2.legacyMode({ mode: javascript_1.default({ indentUnit: 2 }, {}) });
var isMac = /Mac/.test(navigator.platform);
var state = src_1.EditorState.create({ doc: "\"use strict\";\nconst {readFile} = require(\"fs\");\n\nreadFile(\"package.json\", \"utf8\", (err, data) => {\n  console.log(data);\n});", extensions: [
        index_1.lineNumbers(),
        history_1.history(),
        special_chars_1.specialChars(),
        multiple_selections_1.multipleSelections(),
        mode,
        matchbrackets_1.matchBrackets(),
        keymap_1.keymap((_a = {
                "Mod-z": history_1.undo,
                "Mod-Shift-z": history_1.redo,
                "Mod-u": function (view) { return history_1.undoSelection(view) || true; }
            },
            _a[isMac ? "Mod-Shift-u" : "Alt-u"] = history_1.redoSelection,
            _a["Ctrl-y"] = isMac ? undefined : history_1.redo,
            _a["Shift-Tab"] = commands_1.indentSelection,
            _a)),
        keymap_1.keymap(commands_1.baseKeymap),
    ] });
var view = window.view = new src_2.EditorView({ state: state });
document.querySelector("#editor").appendChild(view.dom);
