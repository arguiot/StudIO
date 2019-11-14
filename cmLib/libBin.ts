import { EditorState, EditorSelection } from "../codemirror.next/state/"
import { EditorView } from "../codemirror.next/view/"
import { keymap } from "../codemirror.next/keymap/"
import { history, redo, redoSelection, undo, undoSelection } from "../codemirror.next/history/"
import { lineNumbers } from "../codemirror.next/gutter/"
import { baseKeymap, indentSelection } from "../codemirror.next/commands/"
import { legacyMode } from "../codemirror.next/legacy-modes/src/index.js"
import { matchBrackets } from "../codemirror.next/matchbrackets/"
import javascript from "../codemirror.next/lang-javascript"
import { specialChars } from "../codemirror.next/special-chars/"
import { multipleSelections } from "../codemirror.next/multiple-selections/"
import { Text } from "../codemirror.next/doc/src/index.js"
export default {
	EditorState: EditorState,
	EditorView: EditorView,
	EditorSelection: EditorSelection,
	keymap: keymap,
	history: history,
	redo: redo,
	redoSelection: redoSelection,
	undo: undo,
	undoSelection: undoSelection,
	lineNumbers: lineNumbers,
	baseKeymap: baseKeymap,
	indentSelection: indentSelection,
	legacyMode: legacyMode,
	matchBrackets: matchBrackets,
	javascript: javascript,
	specialChars: specialChars,
	multipleSelections: multipleSelections,
	text: Text
}
