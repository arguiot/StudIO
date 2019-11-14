"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var state_1 = require("../codemirror.next/state/");
var view_1 = require("../codemirror.next/view/");
var keymap_1 = require("../codemirror.next/keymap/");
var history_1 = require("../codemirror.next/history/");
var gutter_1 = require("../codemirror.next/gutter/");
var commands_1 = require("../codemirror.next/commands/");
var index_js_1 = require("../codemirror.next/legacy-modes/src/index.js");
var matchbrackets_1 = require("../codemirror.next/matchbrackets/");
var lang_javascript_1 = require("../codemirror.next/lang-javascript");
var special_chars_1 = require("../codemirror.next/special-chars/");
var multiple_selections_1 = require("../codemirror.next/multiple-selections/");
var index_js_2 = require("../codemirror.next/doc/src/index.js");
exports.default = {
    EditorState: state_1.EditorState,
    EditorView: view_1.EditorView,
    EditorSelection: state_1.EditorSelection,
    keymap: keymap_1.keymap,
    history: history_1.history,
    redo: history_1.redo,
    redoSelection: history_1.redoSelection,
    undo: history_1.undo,
    undoSelection: history_1.undoSelection,
    lineNumbers: gutter_1.lineNumbers,
    baseKeymap: commands_1.baseKeymap,
    indentSelection: commands_1.indentSelection,
    legacyMode: index_js_1.legacyMode,
    matchBrackets: matchbrackets_1.matchBrackets,
    javascript: lang_javascript_1.default,
    specialChars: special_chars_1.specialChars,
    multipleSelections: multiple_selections_1.multipleSelections,
    text: index_js_2.Text
};
