"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
exports.default = {
    EditorState: src_1.EditorState,
    EditorView: src_2.EditorView,
    EditorSelection: src_1.EditorSelection,
    keymap: keymap_1.keymap,
    history: history_1.history,
    redo: history_1.redo,
    redoSelection: history_1.redoSelection,
    undo: history_1.undo,
    undoSelection: history_1.undoSelection,
    lineNumbers: index_1.lineNumbers,
    baseKeymap: commands_1.baseKeymap,
    indentSelection: commands_1.indentSelection,
    legacyMode: index_2.legacyMode,
    matchBrackets: matchbrackets_1.matchBrackets,
    javascript: javascript_1.default,
    specialChars: special_chars_1.specialChars,
    multipleSelections: multiple_selections_1.multipleSelections
};
