import { EditorState, EditorSelection } from "../codemirror.next/state/src"
import { EditorView } from "../codemirror.next/view/src/"
import { keymap } from "../codemirror.next/keymap/src/keymap"
import { history, redo, redoSelection, undo, undoSelection } from "../codemirror.next/history/src/history"
import { lineNumbers } from "../codemirror.next/gutter/src/index"
import { baseKeymap, indentSelection } from "../codemirror.next/commands/src/commands"
import { legacyMode } from "../codemirror.next/legacy-modes/src/index"
import { matchBrackets } from "../codemirror.next/matchbrackets/src/matchbrackets"
import javascript from "../codemirror.next/legacy-modes/src/javascript"
import { specialChars } from "../codemirror.next/special-chars/src/special-chars"
import { multipleSelections } from "../codemirror.next/multiple-selections/src/multiple-selections"

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
	multipleSelections: multipleSelections
}
