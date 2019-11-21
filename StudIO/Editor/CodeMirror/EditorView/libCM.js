(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = global || self, global.StudIO = factory());
}(this, function () { 'use strict';

    let extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u180b-\u180d\u18a9\u200c\u200d]/;
    try {
        extendingChars = new RegExp("\\p{Grapheme_Extend}", "u");
    }
    catch (_) { }
    /// Test whether a given code unit (as in, the thing that `charCodeAt`
    /// returns) extends the character before it.
    function isExtendingChar(code) {
        return code >= 768 && (code >= 0xdc00 && code < 0xe000 || extendingChars.test(String.fromCharCode(code)));
    }
    const nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
    let wordChar;
    try {
        wordChar = new RegExp("[\\p{Alphabetic}_]", "u");
    }
    catch (_) { }
    // FIXME this doesn't work for astral chars yet (need different calling convention)
    function isWordCharBasic(ch) {
        if (wordChar)
            return wordChar.test(ch);
        return /\w/.test(ch) || ch > "\x80" &&
            (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch));
    }
    /// Test whether the given character is a word character.
    function isWordChar(ch, wordChars) {
        if (!wordChars)
            return isWordCharBasic(ch);
        if (wordChars.source.indexOf("\\w") > -1 && isWordCharBasic(ch))
            return true;
        return wordChars.test(ch);
    }
    /// This is used to group characters into three categories—word
    /// characters, whitespace, and anything else. It is used, by default,
    /// to do things like selecting by word.
    var CharType;
    (function (CharType) {
        CharType[CharType["Word"] = 0] = "Word";
        CharType[CharType["Space"] = 1] = "Space";
        CharType[CharType["Other"] = 2] = "Other";
    })(CharType || (CharType = {}));
    /// Determine the character type for a given character.
    function charType(ch, wordChars) {
        // FIXME make this configurable in a better way
        return /\s/.test(ch) ? CharType.Space : isWordChar(ch, wordChars) ? CharType.Word : CharType.Other;
    }

    /// Count the column position at the given offset into the string,
    /// taking extending characters and tab size into account.
    function countColumn(string, n, tabSize) {
        for (let i = 0; i < string.length; i++) {
            let code = string.charCodeAt(i);
            if (code == 9)
                n += tabSize - (n % tabSize);
            else if (code < 768 || !isExtendingChar(code))
                n++;
        }
        return n;
    }
    /// Find the offset that corresponds to the given column position in a
    /// string, taking extending characters and tab size into account.
    function findColumn(string, n, col, tabSize) {
        for (let i = 0; i < string.length; i++) {
            let code = string.charCodeAt(i);
            if (isExtendingChar(code))
                continue;
            if (n >= col)
                return { offset: i, leftOver: 0 };
            n += code == 9 ? tabSize - (n % tabSize) : 1;
        }
        return { offset: string.length, leftOver: col - n };
    }

    /// The document tree type.
    class Text {
        /// @internal
        constructor() { }
        /// Get the line description around the given position.
        lineAt(pos) {
            if (pos < 0 || pos > this.length)
                throw new RangeError(`Invalid position ${pos} in document of length ${this.length}`);
            for (let i = 0; i < lineCache.length; i += 2) {
                if (lineCache[i] != this)
                    continue;
                let line = lineCache[i + 1];
                if (line.start <= pos && line.end >= pos)
                    return line;
            }
            return cacheLine(this, this.lineInner(pos, false, 1, 0).finish(this));
        }
        /// Get the description for the given (1-based) line number.
        line(n) {
            if (n < 1 || n > this.lines)
                throw new RangeError(`Invalid line number ${n} in ${this.lines}-line document`);
            for (let i = 0; i < lineCache.length; i += 2) {
                if (lineCache[i] != this)
                    continue;
                let line = lineCache[i + 1];
                if (line.number == n)
                    return line;
            }
            return cacheLine(this, this.lineInner(n, true, 1, 0).finish(this));
        }
        /// Replace a range of the text with the given lines. `text` should
        /// have a length of at least one.
        replace(from, to, text) {
            if (text.length == 0)
                throw new RangeError("An inserted range must have at least one line");
            return this.replaceInner(from, to, text, textLength(text));
        }
        /// Retrieve the lines between the given points.
        sliceLines(from, to = this.length) {
            return this.sliceTo(from, to, [""]);
        }
        /// Retrieve the text between the given points.
        slice(from, to, lineSeparator = "\n") {
            return this.sliceLines(from, to).join(lineSeparator);
        }
        /// Test whether this text is equal to another instance.
        eq(other) { return this == other || eqContent(this, other); }
        /// Iterate over the text. When `dir` is `-1`, iteration happens
        /// from end to start. This will return lines and the breaks between
        /// them as separate strings, and for long lines, might split lines
        /// themselves into multiple chunks as well.
        iter(dir = 1) { return new RawTextCursor(this, dir); }
        /// Iterate over a range of the text. When `from` > `to`, the
        /// iterator will run in reverse.
        iterRange(from, to = this.length) { return new PartialTextCursor(this, from, to); }
        /// Iterate over lines in the text, starting at position (_not_ line
        /// number) `from`. An iterator returned by this combines all text
        /// on a line into a single string (which may be expensive for very
        /// long lines), and skips line breaks (its
        /// [`lineBreak`](#text.TextIterator.lineBreak) property is always
        /// false).
        iterLines(from = 0) { return new LineCursor(this, from); }
        /// Flattens the document into a single string, using `"\n"` as line
        /// separator.
        toString() { return this.slice(0, this.length); }
        /// Create a `Text` instance for the given array of lines.
        static of(text) {
            if (text.length == 0)
                throw new RangeError("A document must have at least one line");
            let length = textLength(text);
            return length < 1024 /* MaxLeaf */ ? new TextLeaf(text, length) : TextNode.from(TextLeaf.split(text, []), length);
        }
    }
    let lineCache = [], lineCachePos = -2, lineCacheSize = 12;
    function cacheLine(text, line) {
        lineCachePos = (lineCachePos + 2) % lineCacheSize;
        lineCache[lineCachePos] = text;
        lineCache[lineCachePos + 1] = line;
        return line;
    }
    // Leaves store an array of strings. There are always line breaks
    // between these strings (though not between adjacent leaves). These
    // are limited in length, so that bigger documents are constructed as
    // a tree structure. Long lines will be broken into a number of
    // single-line leaves.
    class TextLeaf extends Text {
        constructor(text, length = textLength(text)) {
            super();
            this.text = text;
            this.length = length;
        }
        get lines() { return this.text.length; }
        get children() { return null; }
        replaceInner(from, to, text, length) {
            return Text.of(appendText(this.text, appendText(text, sliceText(this.text, 0, from)), to));
        }
        sliceTo(from, to = this.length, target) {
            return appendText(this.text, target, from, to);
        }
        lineInner(target, isLine, line, offset) {
            for (let i = 0;; i++) {
                let string = this.text[i], end = offset + string.length;
                if ((isLine ? line : end) >= target)
                    return new Line(offset, end, line, string);
                offset = end + 1;
                line++;
            }
        }
        decomposeStart(to, target) {
            target.push(new TextLeaf(sliceText(this.text, 0, to), to));
        }
        decomposeEnd(from, target) {
            target.push(new TextLeaf(sliceText(this.text, from), this.length - from));
        }
        lastLineLength() { return this.text[this.text.length - 1].length; }
        firstLineLength() { return this.text[0].length; }
        static split(text, target) {
            let part = [], length = -1;
            for (let line of text) {
                for (;;) {
                    let newLength = length + line.length + 1;
                    if (newLength < 512 /* BaseLeaf */) {
                        length = newLength;
                        part.push(line);
                        break;
                    }
                    let cut = 512 /* BaseLeaf */ - length - 1, after = line.charCodeAt(cut);
                    if (after >= 0xdc00 && after < 0xe000)
                        cut++;
                    part.push(line.slice(0, cut));
                    target.push(new TextLeaf(part, 512 /* BaseLeaf */));
                    line = line.slice(cut);
                    length = -1;
                    part = [];
                }
            }
            if (length != -1)
                target.push(new TextLeaf(part, length));
            return target;
        }
    }
    // Nodes provide the tree structure of the `Text` type. They store a
    // number of other nodes or leaves, taking care to balance itself on
    // changes.
    class TextNode extends Text {
        constructor(children, length) {
            super();
            this.children = children;
            this.length = length;
            this.lines = 1;
            for (let child of children)
                this.lines += child.lines - 1;
        }
        replaceInner(from, to, text, length) {
            let lengthDiff = length - (to - from), newLength = this.length + lengthDiff;
            if (newLength <= 512 /* BaseLeaf */)
                return new TextLeaf(appendText(this.sliceLines(to), appendText(text, this.sliceTo(0, from, [""]))), newLength);
            let children;
            for (let i = 0, pos = 0; i < this.children.length; i++) {
                let child = this.children[i], end = pos + child.length;
                if (from >= pos && to <= end &&
                    (lengthDiff > 0
                        ? child.length + lengthDiff < Math.max(newLength >> (3 /* BranchShift */ - 1), 1024 /* MaxLeaf */)
                        : child.length + lengthDiff > newLength >> (3 /* BranchShift */ + 1))) {
                    // Fast path: if the change only affects one child and the
                    // child's size remains in the acceptable range, only update
                    // that child
                    children = this.children.slice();
                    children[i] = child.replace(from - pos, to - pos, text);
                    return new TextNode(children, newLength);
                }
                else if (end >= from) {
                    // Otherwise, we must build up a new array of children
                    if (children == null)
                        children = this.children.slice(0, i);
                    if (pos < from) {
                        if (end == from)
                            children.push(child);
                        else
                            child.decomposeStart(from - pos, children);
                    }
                    if (pos <= from && end >= from)
                        TextLeaf.split(text, children);
                    if (pos >= to)
                        children.push(child);
                    else if (end > to)
                        child.decomposeEnd(to - pos, children);
                }
                pos = end;
            }
            return children ? TextNode.from(children, newLength) : this;
        }
        sliceTo(from, to, target) {
            let pos = 0;
            for (let child of this.children) {
                let end = pos + child.length;
                if (to > pos && from < end)
                    child.sliceTo(Math.max(0, from - pos), Math.min(child.length, to - pos), target);
                pos = end;
            }
            return target;
        }
        lineInner(target, isLine, line, offset) {
            for (let i = 0;; i++) {
                let child = this.children[i], end = offset + child.length, endLine = line + child.lines - 1;
                if ((isLine ? endLine : end) >= target) {
                    let inner = child.lineInner(target, isLine, line, offset), add;
                    if (inner.start == offset && (add = this.lineLengthTo(i))) {
                        inner.start -= add;
                        inner.content = null;
                    }
                    if (inner.end == end && (add = this.lineLengthFrom(i + 1))) {
                        inner.end += add;
                        inner.content = null;
                    }
                    return inner;
                }
                offset = end;
                line = endLine;
            }
        }
        decomposeStart(to, target) {
            for (let i = 0, pos = 0;; i++) {
                let child = this.children[i], end = pos + child.length;
                if (end <= to) {
                    target.push(child);
                }
                else {
                    if (pos < to)
                        child.decomposeStart(to - pos, target);
                    break;
                }
                pos = end;
            }
        }
        decomposeEnd(from, target) {
            let pos = 0;
            for (let child of this.children) {
                let end = pos + child.length;
                if (pos >= from)
                    target.push(child);
                else if (end > from && pos < from)
                    child.decomposeEnd(from - pos, target);
                pos = end;
            }
        }
        lineLengthTo(to) {
            let length = 0;
            for (let i = to - 1; i >= 0; i--) {
                let child = this.children[i];
                if (child.lines > 1)
                    return length + child.lastLineLength();
                length += child.length;
            }
            return length;
        }
        lastLineLength() { return this.lineLengthTo(this.children.length); }
        lineLengthFrom(from) {
            let length = 0;
            for (let i = from; i < this.children.length; i++) {
                let child = this.children[i];
                if (child.lines > 1)
                    return length + child.firstLineLength();
                length += child.length;
            }
            return length;
        }
        firstLineLength() { return this.lineLengthFrom(0); }
        static from(children, length) {
            if (length < 1024 /* MaxLeaf */) {
                let text = [""];
                for (let child of children)
                    child.sliceTo(0, child.length, text);
                return new TextLeaf(text, length);
            }
            let chunkLength = Math.max(512 /* BaseLeaf */, length >> 3 /* BranchShift */), maxLength = chunkLength << 1, minLength = chunkLength >> 1;
            let chunked = [], currentLength = 0, currentChunk = [];
            function add(child) {
                let childLength = child.length, last;
                if (childLength > maxLength && child instanceof TextNode) {
                    for (let node of child.children)
                        add(node);
                }
                else if (childLength > minLength && (currentLength > minLength || currentLength == 0)) {
                    flush();
                    chunked.push(child);
                }
                else if (child instanceof TextLeaf && currentLength > 0 &&
                    (last = currentChunk[currentChunk.length - 1]) instanceof TextLeaf &&
                    child.length + last.length <= 512 /* BaseLeaf */) {
                    currentLength += childLength;
                    currentChunk[currentChunk.length - 1] = new TextLeaf(appendText(child.text, last.text.slice()), child.length + last.length);
                }
                else {
                    if (currentLength + childLength > chunkLength)
                        flush();
                    currentLength += childLength;
                    currentChunk.push(child);
                }
            }
            function flush() {
                if (currentLength == 0)
                    return;
                chunked.push(currentChunk.length == 1 ? currentChunk[0] : TextNode.from(currentChunk, currentLength));
                currentLength = 0;
                currentChunk.length = 0;
            }
            for (let child of children)
                add(child);
            flush();
            return chunked.length == 1 ? chunked[0] : new TextNode(chunked, length);
        }
    }
    Text.empty = Text.of([""]);
    function textLength(text) {
        let length = -1;
        for (let line of text)
            length += line.length + 1;
        return length;
    }
    function appendText(text, target, from = 0, to = 1e9) {
        for (let pos = 0, i = 0, first = true; i < text.length && pos <= to; i++) {
            let line = text[i], end = pos + line.length;
            if (end >= from) {
                if (end > to)
                    line = line.slice(0, to - pos);
                if (pos < from)
                    line = line.slice(from - pos);
                if (first) {
                    target[target.length - 1] += line;
                    first = false;
                }
                else
                    target.push(line);
            }
            pos = end + 1;
        }
        return target;
    }
    function sliceText(text, from, to) {
        return appendText(text, [""], from, to);
    }
    function eqContent(a, b) {
        if (a.length != b.length || a.lines != b.lines)
            return false;
        let iterA = new RawTextCursor(a), iterB = new RawTextCursor(b);
        for (let offA = 0, offB = 0;;) {
            if (iterA.lineBreak != iterB.lineBreak || iterA.done != iterB.done) {
                return false;
            }
            else if (iterA.done) {
                return true;
            }
            else if (iterA.lineBreak) {
                iterA.next();
                iterB.next();
                offA = offB = 0;
            }
            else {
                let strA = iterA.value.slice(offA), strB = iterB.value.slice(offB);
                if (strA.length == strB.length) {
                    if (strA != strB)
                        return false;
                    iterA.next();
                    iterB.next();
                    offA = offB = 0;
                }
                else if (strA.length > strB.length) {
                    if (strA.slice(0, strB.length) != strB)
                        return false;
                    offA += strB.length;
                    iterB.next();
                    offB = 0;
                }
                else {
                    if (strB.slice(0, strA.length) != strA)
                        return false;
                    offB += strA.length;
                    iterA.next();
                    offA = 0;
                }
            }
        }
    }
    class RawTextCursor {
        // @internal
        constructor(text, dir = 1) {
            this.dir = dir;
            this.done = false;
            this.lineBreak = false;
            this.value = "";
            this.nodes = [text];
            this.offsets = [dir > 0 ? 0 : text instanceof TextLeaf ? text.text.length : text.children.length];
        }
        next(skip = 0) {
            for (;;) {
                let last = this.nodes.length - 1;
                if (last < 0) {
                    this.done = true;
                    this.value = "";
                    this.lineBreak = false;
                    return this;
                }
                let top = this.nodes[last];
                let offset = this.offsets[last];
                if (top instanceof TextLeaf) {
                    // Internal offset with lineBreak == false means we have to
                    // count the line break at this position
                    if (offset != (this.dir > 0 ? 0 : top.text.length) && !this.lineBreak) {
                        this.lineBreak = true;
                        if (skip == 0) {
                            this.value = "\n";
                            return this;
                        }
                        skip--;
                        continue;
                    }
                    // Otherwise, move to the next string
                    let next = top.text[offset - (this.dir < 0 ? 1 : 0)];
                    this.offsets[last] = (offset += this.dir);
                    if (offset == (this.dir > 0 ? top.text.length : 0)) {
                        this.nodes.pop();
                        this.offsets.pop();
                    }
                    this.lineBreak = false;
                    if (next.length > skip) {
                        this.value = skip == 0 ? next : this.dir > 0 ? next.slice(skip) : next.slice(0, next.length - skip);
                        return this;
                    }
                    skip -= next.length;
                }
                else if (offset == (this.dir > 0 ? top.children.length : 0)) {
                    this.nodes.pop();
                    this.offsets.pop();
                }
                else {
                    let next = top.children[this.dir > 0 ? offset : offset - 1], len = next.length;
                    this.offsets[last] = offset + this.dir;
                    if (skip > len) {
                        skip -= len;
                    }
                    else {
                        this.nodes.push(next);
                        this.offsets.push(this.dir > 0 ? 0 : next instanceof TextLeaf ? next.text.length : next.children.length);
                    }
                }
            }
        }
    }
    class PartialTextCursor {
        constructor(text, start, end) {
            this.value = "";
            this.cursor = new RawTextCursor(text, start > end ? -1 : 1);
            if (start > end) {
                this.skip = text.length - start;
                this.limit = start - end;
            }
            else {
                this.skip = start;
                this.limit = end - start;
            }
        }
        next() {
            if (this.limit <= 0) {
                this.limit = -1;
            }
            else {
                let { value, lineBreak } = this.cursor.next(this.skip);
                this.skip = 0;
                this.value = value;
                let len = lineBreak ? 1 : value.length;
                if (len > this.limit)
                    this.value = this.cursor.dir > 0 ? value.slice(0, this.limit) : value.slice(len - this.limit);
                this.limit -= this.value.length;
            }
            return this;
        }
        get lineBreak() { return this.cursor.lineBreak; }
        get done() { return this.limit < 0; }
    }
    class LineCursor {
        constructor(text, from = 0) {
            this.value = "";
            this.done = false;
            this.cursor = text.iter();
            this.skip = from;
        }
        next() {
            if (this.cursor.done) {
                this.done = true;
                this.value = "";
                return this;
            }
            for (this.value = "";;) {
                let { value, lineBreak, done } = this.cursor.next(this.skip);
                this.skip = 0;
                if (done || lineBreak)
                    return this;
                this.value += value;
            }
        }
        get lineBreak() { return false; }
    }
    // FIXME rename start/end to from/to for consistency with other types?
    /// This type describes a line in the document. It is created
    /// on-demand when lines are [queried](#text.Text.lineAt).
    class Line {
        /// @internal
        constructor(
        /// The position of the start of the line.
        start, 
        /// The position at the end of the line (_before_ the line break,
        /// if this isn't the last line).
        end, 
        /// This line's line number (1-based).
        number, 
        /// @internal
        content) {
            this.start = start;
            this.end = end;
            this.number = number;
            this.content = content;
        }
        /// The length of the line (not including any line break after it).
        get length() { return this.end - this.start; }
        /// Retrieve a part of the content of this line. This is a method,
        /// rather than, say, a string property, to avoid concatenating long
        /// lines whenever they are accessed. Try to write your code, if it
        /// is going to be doing a lot of line-reading, to read only the
        /// parts it needs.
        slice(from = 0, to = this.length) {
            if (typeof this.content == "string")
                return to == from + 1 ? this.content.charAt(from) : this.content.slice(from, to);
            if (from == to)
                return "";
            let result = this.content.slice(from, to);
            if (from == 0 && to == this.length)
                this.content = result;
            return result;
        }
        /// @internal
        finish(text) {
            if (this.content == null)
                this.content = new LineContent(text, this.start);
            return this;
        }
    }
    class LineContent {
        constructor(doc, start) {
            this.doc = doc;
            this.start = start;
            this.cursor = null;
            this.strings = null;
        }
        // FIXME quadratic complexity (somewhat) when iterating long lines in small pieces
        slice(from, to) {
            if (!this.cursor) {
                this.cursor = this.doc.iter();
                this.strings = [this.cursor.next(this.start).value];
            }
            for (let result = "", pos = 0, i = 0;; i++) {
                if (i == this.strings.length)
                    this.strings.push(this.cursor.next().value);
                let string = this.strings[i], end = pos + string.length;
                if (end <= from)
                    continue;
                result += string.slice(Math.max(0, from - pos), Math.min(string.length, to - pos));
                if (end >= to)
                    return result;
                pos += string.length;
            }
        }
    }

    class BehaviorData {
        constructor(combine, isStatic, id) {
            this.combine = combine;
            this.id = id;
            this.static = isStatic;
            this.empty = combine(none);
        }
        static get(behavior) {
            let value = behavior._data;
            if (!value)
                throw new RangeError("Not a behavior");
            return value;
        }
    }
    /// All extensions are associated with an extension group. This is
    /// used to distinguish extensions meant for different types of hosts
    /// (such as the editor view and state).
    class ExtensionGroup {
        /// Create a new group. Client code probably doesn't need to do
        /// this. `getStore` retrieves the id-to-value map from a context
        /// object.
        constructor(getStore) {
            this.getStore = getStore;
            this.nextStorageID = 0;
            /// Mark an extension with a precedence below the default
            /// precedence, which will cause default-precedence extensions to
            /// override it even if they are specified later in the extension
            /// ordering.
            this.fallback = setPrec(-1 /* Fallback */);
            /// Mark an extension with normal precedence.
            this.normal = setPrec(0 /* Default */);
            /// Mark an extension with a precedence above the default precedence.
            this.extend = setPrec(1 /* Extend */);
            /// Mark an extension with a precedence above the default and
            /// `extend` precedences.
            this.override = setPrec(2 /* Override */);
        }
        behavior(options = {}) {
            let behavior = (value) => new ExtensionValue(0 /* Behavior */, behavior, { static: value }, this);
            behavior._data = new BehaviorData(options.combine || (array => array), !!options.static, this.storageID());
            return behavior;
        }
        /// Create an extension that adds a dynamically computed value for a
        /// given behavior. Dynamic behavior should usually just read and
        /// possibly transform a field from the context.
        dynamic(behavior, read) {
            if (BehaviorData.get(behavior).static)
                throw new Error("Can't create a dynamic source for a static behavior");
            return new ExtensionValue(0 /* Behavior */, behavior, { dynamic: read }, this);
        }
        /// Define a unique extension. When resolving extensions, all
        /// instances of a given unique extension are merged before their
        /// content extensions are retrieved. The `instantiate` function
        /// will be called with all the specs (configuration values) passed
        /// to the instances of the unique extension, and should resolve
        /// them to a more concrete extension value (or raise an error if
        /// they conflict).
        unique(instantiate, defaultSpec) {
            const type = new UniqueExtensionType(instantiate);
            return (spec = defaultSpec) => {
                if (spec === undefined)
                    throw new RangeError("This extension has no default spec");
                return new ExtensionValue(2 /* Unique */, type, spec, this);
            };
        }
        /// Resolve an array of extensions by expanding all extensions until
        /// only behaviors are left, and then collecting the behaviors into
        /// arrays of values, preserving precedence ordering throughout.
        resolve(extensions) {
            return this.resolveInner(extensions);
        }
        /// @internal
        resolveInner(extensions, replace = none) {
            let pending = flatten(extensions, 0 /* Default */, replace);
            // This does a crude topological ordering to resolve behaviors
            // top-to-bottom in the dependency ordering. If there are no
            // cyclic dependencies, we can always find a behavior in the top
            // `pending` array that isn't a dependency of any unresolved
            // behavior, and thus find and order all its specs in order to
            // resolve them.
            for (let resolved = [];;) {
                let top = findTopUnique(pending, this);
                if (!top)
                    break; // Only behaviors left
                // Prematurely evaluated a behavior type because of missing
                // sub-behavior information -- start over, in the assumption
                // that newly gathered information will make the next attempt
                // more successful.
                if (resolved.indexOf(top) > -1)
                    return this.resolve(extensions);
                top.resolve(pending, replace);
                resolved.push(top);
            }
            // Collect the behavior values.
            let foreign = [];
            let readBehavior = Object.create(null);
            for (let ext of pending) {
                if (ext.type != this) {
                    // Collect extensions of the wrong type into configuration.foreign
                    foreign.push(ext);
                    continue;
                }
                let behavior = BehaviorData.get(ext.id);
                if (Object.prototype.hasOwnProperty.call(readBehavior, behavior.id))
                    continue; // Already collected
                let values = [];
                for (let e of pending)
                    if (e.id == ext.id)
                        e.collect(values);
                let dynamic = [], parts = [];
                values.forEach(ext => {
                    if (ext.value.dynamic) {
                        dynamic.push({ read: ext.value.dynamic, index: parts.length });
                        parts.push(null);
                    }
                    else {
                        parts.push(ext.value.static);
                    }
                });
                if (dynamic.length == 0) {
                    let value = behavior.combine(parts);
                    readBehavior[behavior.id] = () => value;
                }
                else {
                    let cached, cachedValue;
                    readBehavior[behavior.id] = (context) => {
                        let values = this.getStore(context), found = values[behavior.id];
                        if (found !== undefined || Object.prototype.hasOwnProperty.call(values, behavior.id))
                            return found;
                        let array = parts.slice(), changed = false;
                        for (let { read, index } of dynamic) {
                            let newValue = array[index] = read(context);
                            if (!cached || cached[index] != newValue)
                                changed = true;
                        }
                        cached = array;
                        return values[behavior.id] = changed ? cachedValue = behavior.combine(array) : cachedValue;
                    };
                }
            }
            return new Configuration(this, extensions, replace, readBehavior, foreign);
        }
        /// Define an extension name. Names can be used to tag extensions.
        /// This method returns a function that can be used to create named
        /// extensions, which can be used in a configuration as normal, but
        /// allow [replacement](#extension.Configuration.replaceExtensions)
        /// with another extension at some point in the future.
        defineName() {
            let name = (extension) => new ExtensionValue(3 /* Name */, name, extension, this);
            return name;
        }
        /// Allocate a unique storage number for use in field storage. Not
        /// something client code is likely to need.
        storageID() { return ++this.nextStorageID; }
    }
    function setPrec(prec) {
        return (extension) => extension instanceof ExtensionValue
            ? new ExtensionValue(extension.kind, extension.id, extension.value, extension.type, prec)
            : new ExtensionValue(1 /* Array */, null, extension, null, prec);
    }
    /// And extension is a value that describes a way in which something
    /// is to be extended. It can be produced by instantiating a behavior,
    /// calling unique extension function, or grouping extensions with
    /// `Extension.all`.
    class ExtensionValue {
        /// @internal
        constructor(
        /// @internal
        kind, 
        /// @internal
        id, 
        /// Holds the field for behaviors, the spec for unique extensions,
        /// and the array of extensions for multi extensions. @internal
        value, 
        /// @internal
        type, 
        /// @internal
        prec = -2 /* None */) {
            this.kind = kind;
            this.id = id;
            this.value = value;
            this.type = type;
            this.prec = prec;
        }
        // Insert this extension in an array of extensions so that it
        // appears after any already-present extensions with the same or
        // lower precedence, but before any extensions with higher
        // precedence.
        collect(array) {
            let i = 0;
            while (i < array.length && array[i].prec >= this.prec)
                i++;
            array.splice(i, 0, this);
        }
    }
    function flatten(extension, prec, replace, target = []) {
        if (Array.isArray(extension)) {
            for (let ext of extension)
                flatten(ext, prec, replace, target);
        }
        else {
            let value = extension;
            if (value.kind == 3 /* Name */) {
                let inner = value.value;
                for (let r of replace)
                    if (r.id == value.id)
                        inner = r.value;
                flatten(inner, value.prec == -2 /* None */ ? prec : value.prec, replace, target);
            }
            else if (value.kind == 1 /* Array */) {
                for (let ext of value.value)
                    flatten(ext, value.prec == -2 /* None */ ? prec : value.prec, replace, target);
            }
            else {
                target.push(value.prec != -2 /* None */ ? value : new ExtensionValue(value.kind, value.id, value.value, value.type, prec));
            }
        }
        return target;
    }
    class UniqueExtensionType {
        constructor(instantiate) {
            this.instantiate = instantiate;
            this.knownSubs = [];
        }
        hasSub(type) {
            for (let known of this.knownSubs)
                if (known == type || known.hasSub(type))
                    return true;
            return false;
        }
        resolve(extensions, replace) {
            // Replace all instances of this type in extneions with the
            // sub-extensions that instantiating produces.
            let ours = [];
            for (let ext of extensions)
                if (ext.id == this)
                    ext.collect(ours);
            let first = true;
            for (let i = 0; i < extensions.length; i++) {
                let ext = extensions[i];
                if (ext.id != this)
                    continue;
                let sub = first ? this.subs(ours.map(s => s.value), ext.prec, replace) : none;
                extensions.splice(i, 1, ...sub);
                first = false;
                i += sub.length - 1;
            }
        }
        subs(specs, prec, replace) {
            let subs = flatten(this.instantiate(specs), prec, replace);
            for (let sub of subs)
                if (sub.kind == 2 /* Unique */ && this.knownSubs.indexOf(sub.id) == -1)
                    this.knownSubs.push(sub.id);
            return subs;
        }
    }
    const none = [];
    /// A configuration describes the fields and behaviors that exist in a
    /// given set of extensions. It is created with
    /// [`ExtensionGroup.resolve`](#extension.ExtensionGroup.resolve).
    class Configuration {
        /// @internal
        constructor(type, extensions, replaced, readBehavior, 
        /// Any extensions that weren't an instance of the target
        /// extension group when resolving.
        foreign = []) {
            this.type = type;
            this.extensions = extensions;
            this.replaced = replaced;
            this.readBehavior = readBehavior;
            this.foreign = foreign;
        }
        /// Retrieve the value of a given behavior. When the behavior is
        /// [static](#extension.ExtensionGroup.behavior), the `context`
        /// argument can be omitted.
        getBehavior(behavior, context) {
            let data = BehaviorData.get(behavior);
            if (!context && !data.static)
                throw new RangeError("Need a context to retrieve non-static behavior");
            let f = this.readBehavior[data.id];
            return f ? f(context) : data.empty;
        }
        /// Replace one or more extensions with new ones, producing a new
        /// configuration.
        replaceExtensions(replace) {
            let repl = replace;
            for (let r of repl)
                if (r.kind != 3 /* Name */)
                    throw new RangeError("Extension replacements must be named extension values");
            return this.type.resolveInner(this.extensions, this.replaced.filter(p => !repl.some(r => r.id == p.id)).concat(repl));
        }
    }
    // Find the extension type that must be resolved next, meaning it is
    // not a (transitive) sub-extension of any other extensions that are
    // still in extenders.
    function findTopUnique(extensions, type) {
        let foundUnique = false;
        for (let ext of extensions)
            if (ext.kind == 2 /* Unique */ && ext.type == type) {
                foundUnique = true;
                if (!extensions.some(e => e.kind == 2 /* Unique */ && e.id.hasSub(ext.id)))
                    return ext.id;
            }
        if (foundUnique)
            throw new RangeError("Sub-extension cycle in unique extensions");
        return null;
    }
    /// Utility function for combining behaviors to fill in a config
    /// object from an array of provided configs. Will, by default, error
    /// when a field gets two values that aren't ===-equal, but you can
    /// provide combine functions per field to do something else.
    function combineConfig(configs, defaults, // Should hold only the optional properties of Config, but I haven't managed to express that
    combine = {}) {
        let result = {};
        for (let config of configs)
            for (let key of Object.keys(config)) {
                let value = config[key], current = result[key];
                if (current === undefined)
                    result[key] = value;
                else if (current === value || value === undefined) ; // No conflict
                else if (Object.hasOwnProperty.call(combine, key))
                    result[key] = combine[key](current, value);
                else
                    throw new Error("Config merge conflict for field " + key);
            }
        for (let key in defaults)
            if (result[key] === undefined)
                result[key] = defaults[key];
        return result;
    }
    /// Defaults the fields in a configuration object to values given in
    /// `defaults` if they are not already present.
    function fillConfig(config, defaults) {
        let result = {};
        for (let key in config)
            result[key] = config[key];
        for (let key in defaults)
            if (result[key] === undefined)
                result[key] = defaults[key];
        return result;
    }

    var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function unwrapExports (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x.default : x;
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var tree = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    /// The default maximum length of a `TreeBuffer` node.
    exports.DefaultBufferLength = 1024;
    var Iteration = /** @class */ (function () {
        function Iteration(enter, leave) {
            this.enter = enter;
            this.leave = leave;
            this.result = undefined;
        }
        Object.defineProperty(Iteration.prototype, "done", {
            get: function () { return this.result !== undefined; },
            enumerable: true,
            configurable: true
        });
        Iteration.prototype.doEnter = function (type, start, end) {
            var value = this.enter(type, start, end);
            if (value === undefined)
                return true;
            if (value !== false)
                this.result = value;
            return false;
        };
        return Iteration;
    }());
    var nextPropID = 0;
    /// Each [node type](#tree.NodeType) can have metadata associated with
    /// it in props. Instances of this class represent prop names.
    var NodeProp = /** @class */ (function () {
        /// Create a new node prop type. You can optionally pass a
        /// `deserialize` function.
        function NodeProp(_a) {
            var deserialize = (_a === void 0 ? {} : _a).deserialize;
            this.id = nextPropID++;
            this.deserialize = deserialize || (function () {
                throw new Error("This node type doesn't define a deserialize function");
            });
        }
        /// Create a string-valued node prop whose deserialize function is
        /// the identity function.
        NodeProp.string = function () { return new NodeProp({ deserialize: function (str) { return str; } }); };
        /// Creates a boolean-valued node prop whose deserialize function
        /// returns true for any input.
        NodeProp.flag = function () { return new NodeProp({ deserialize: function () { return true; } }); };
        /// Store a value for this prop in the given object. This can be
        /// useful when building up a prop object to pass to the
        /// [`NodeType`](#tree.NodeType) constructor. Returns its first
        /// argument.
        NodeProp.prototype.set = function (propObj, value) {
            propObj[this.id] = value;
            return propObj;
        };
        /// This is meant to be used with
        /// [`NodeGroup.extend`](#tree.NodeGroup.extend) or
        /// [`Parser.withProps`](#lezer.Parser.withProps) to compute prop
        /// values for each node type in the group. Takes a [match
        /// object](#tree.NodeType.match) or function that returns undefined
        /// if the node type doesn't get this prop, and the prop's value if
        /// it does.
        NodeProp.prototype.add = function (match) {
            return new NodePropSource(this, typeof match == "function" ? match : NodeType.match(match));
        };
        /// The special node type that the parser uses to represent parse
        /// errors has this flag set. (You shouldn't use it for custom nodes
        /// that represent erroneous content.)
        NodeProp.error = NodeProp.flag();
        /// Nodes that were produced by skipped expressions (such as
        /// comments) have this prop set to true.
        NodeProp.skipped = NodeProp.flag();
        /// Prop that is used to describe a rule's delimiters. For example,
        /// a parenthesized expression node would set this to the string `"(
        /// )"` (the open and close strings separated by a space). This is
        /// added by the parser generator's `@detectDelim` feature, but you
        /// can also manually add them.
        NodeProp.delim = NodeProp.string();
        /// Indicates that this node indicates a top level document.
        NodeProp.top = NodeProp.flag();
        /// A prop that indicates whether a node represents a repeated
        /// expression. Abstractions like [`Subtree`](#tree.Subtree) hide
        /// such nodes, so you usually won't see them, but if you directly
        /// rummage through a tree's children, you'll find repeat nodes that
        /// wrap repeated content into balanced trees.
        NodeProp.repeated = NodeProp.flag();
        return NodeProp;
    }());
    exports.NodeProp = NodeProp;
    /// Type returned by [`NodeProp.add`](#tree.NodeProp.add). Describes
    /// the way a prop should be added to each node type in a node group.
    var NodePropSource = /** @class */ (function () {
        /// @internal
        function NodePropSource(
        /// @internal
        prop, 
        /// @internal
        f) {
            this.prop = prop;
            this.f = f;
        }
        return NodePropSource;
    }());
    exports.NodePropSource = NodePropSource;
    /// Each node in a syntax tree has a node type associated with it.
    var NodeType = /** @class */ (function () {
        /// @internal
        function NodeType(
        /// The name of the node type. Not necessarily unique, but if the
        /// grammar was written properly, different node types with the
        /// same name within a node group should play the same semantic
        /// role.
        name, 
        /// @internal
        props, 
        /// The id of this node in its group. Corresponds to the term ids
        /// used in the parser.
        id) {
            this.name = name;
            this.props = props;
            this.id = id;
        }
        /// Retrieves a node prop for this type. Will return `undefined` if
        /// the prop isn't present on this node.
        NodeType.prototype.prop = function (prop) { return this.props[prop.id]; };
        /// Create a function from node types to arbitrary values by
        /// specifying an object whose property names are node names. Often
        /// useful with [`NodeProp.add`](#tree.NodeProp.add). You can put
        /// multiple node names, separated by spaces, in a single property
        /// name to map multiple node names to a single value.
        NodeType.match = function (map) {
            var direct = Object.create(null);
            for (var prop in map)
                for (var _i = 0, _a = prop.split(" "); _i < _a.length; _i++) {
                    var name = _a[_i];
                    direct[name] = map[prop];
                }
            return function (node) { return direct[node.name]; };
        };
        /// An empty dummy node type to use when no actual type is available.
        NodeType.none = new NodeType("", Object.create(null), 0);
        return NodeType;
    }());
    exports.NodeType = NodeType;
    /// A node group holds a collection of node types. It is used to
    /// compactly represent trees by storing their type ids, rather than a
    /// full pointer to the type object, in a number array. Each parser
    /// [has](#lezer.Parser.group) a node group, and [tree
    /// buffers](#tree.TreeBuffer) can only store collections of nodes
    /// from the same group. A group can have a maximum of 2**16 (65536)
    /// node types in it, so that the ids fit into 16-bit typed array
    /// slots.
    var NodeGroup = /** @class */ (function () {
        /// Create a group with the given types. The `id` property of each
        /// type should correspond to its position within the array.
        function NodeGroup(
        /// The node types in this group, by id.
        types) {
            this.types = types;
            for (var i = 0; i < types.length; i++)
                if (types[i].id != i)
                    throw new RangeError("Node type ids should correspond to array positions when creating a node group");
        }
        /// Create a copy of this group with some node properties added. The
        /// arguments to this method should be created with
        /// [`NodeProp.add`](#tree.NodeProp.add).
        NodeGroup.prototype.extend = function () {
            var props = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                props[_i] = arguments[_i];
            }
            var newTypes = [];
            for (var _a = 0, _b = this.types; _a < _b.length; _a++) {
                var type = _b[_a];
                var newProps = null;
                for (var _c = 0, props_1 = props; _c < props_1.length; _c++) {
                    var source = props_1[_c];
                    var value = source.f(type);
                    if (value !== undefined) {
                        if (!newProps) {
                            newProps = Object.create(null);
                            for (var prop in type.props)
                                newProps[prop] = type.props[prop];
                        }
                        newProps[source.prop.id] = value;
                    }
                }
                newTypes.push(newProps ? new NodeType(type.name, newProps, type.id) : type);
            }
            return new NodeGroup(newTypes);
        };
        return NodeGroup;
    }());
    exports.NodeGroup = NodeGroup;
    /// A subtree is a representation of part of the syntax tree. It may
    /// either be the tree root, or a tagged node.
    var Subtree = /** @class */ (function () {
        function Subtree() {
        }
        Object.defineProperty(Subtree.prototype, "name", {
            // Shorthand for `.type.name`.
            get: function () { return this.type.name; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Subtree.prototype, "depth", {
            /// The depth (number of parent nodes) of this subtree
            get: function () {
                var d = 0;
                for (var p = this.parent; p; p = p.parent)
                    d++;
                return d;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Subtree.prototype, "root", {
            /// The root of the tree that this subtree is part of
            get: function () {
                var cx = this;
                while (cx.parent)
                    cx = cx.parent;
                return cx;
            },
            enumerable: true,
            configurable: true
        });
        /// Find the node at a given position. By default, this will return
        /// the lowest-depth subtree that covers the position from both
        /// sides, meaning that nodes starting or ending at the position
        /// aren't entered. You can pass a `side` of `-1` to enter nodes
        /// that end at the position, or `1` to enter nodes that start
        /// there.
        Subtree.prototype.resolve = function (pos, side) {
            if (side === void 0) { side = 0; }
            var result = this.resolveAt(pos);
            // FIXME this is slightly inefficient in that it scans the result
            // of resolveAt twice (but further complicating child-finding
            // logic seems unattractive as well)
            if (side != 0)
                for (;;) {
                    var child = (side < 0 ? result.childBefore(pos) : result.childAfter(pos));
                    if (!child || (side < 0 ? child.end : child.start) != pos)
                        break;
                    result = child;
                }
            return result;
        };
        Object.defineProperty(Subtree.prototype, "firstChild", {
            /// Get the first child of this subtree.
            get: function () { return this.childAfter(this.start - 1); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Subtree.prototype, "lastChild", {
            /// Find the last child of this subtree.
            get: function () { return this.childBefore(this.end + 1); },
            enumerable: true,
            configurable: true
        });
        return Subtree;
    }());
    exports.Subtree = Subtree;
    /// A piece of syntax tree. There are two ways to approach these
    /// trees: the way they are actually stored in memory, and the
    /// convenient way.
    ///
    /// Syntax trees are stored as a tree of `Tree` and `TreeBuffer`
    /// objects. By packing detail information into `TreeBuffer` leaf
    /// nodes, the representation is made a lot more memory-efficient.
    ///
    /// However, when you want to actually work with tree nodes, this
    /// representation is very awkward, so most client code will want to
    /// use the `Subtree` interface instead, which provides a view on some
    /// part of this data structure, and can be used (through `resolve`,
    /// for example) to zoom in on any single node.
    var Tree = /** @class */ (function (_super) {
        __extends(Tree, _super);
        /// @internal
        function Tree(
        /// @internal
        type, 
        /// The tree's child nodes. Children small enough to fit in a
        /// `TreeBuffer` will be represented as such, other children can be
        /// further `Tree` instances with their own internal structure.
        children, 
        /// The positions (offsets relative to the start of this tree) of
        /// the children.
        positions, 
        /// The total length of this tree @internal
        length) {
            var _this = _super.call(this) || this;
            _this.type = type;
            _this.children = children;
            _this.positions = positions;
            _this.length = length;
            return _this;
        }
        Object.defineProperty(Tree.prototype, "start", {
            /// @internal
            get: function () { return 0; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Tree.prototype, "end", {
            /// @internal
            get: function () { return this.length; },
            enumerable: true,
            configurable: true
        });
        /// @internal
        Tree.prototype.toString = function () {
            var children = this.children.map(function (c) { return c.toString(); }).join();
            return !this.name ? children :
                (/\W/.test(this.name) && !this.type.prop(NodeProp.error) ? JSON.stringify(this.name) : this.name) +
                    (children.length ? "(" + children + ")" : "");
        };
        Tree.prototype.partial = function (start, end, offset, children, positions) {
            for (var i = 0; i < this.children.length; i++) {
                var from = this.positions[i];
                if (from > end)
                    break;
                var child = this.children[i], to = from + child.length;
                if (to < start)
                    continue;
                if (start <= from && end >= to) {
                    children.push(child);
                    positions.push(from + offset);
                }
                else if (child instanceof Tree) {
                    child.partial(start - from, end - from, offset + from, children, positions);
                }
            }
        };
        /// Apply a set of edits to a tree, removing all nodes that were
        /// touched by the edits, and moving remaining nodes so that their
        /// positions are updated for insertions/deletions before them. This
        /// is likely to destroy a lot of the structure of the tree, and
        /// mostly useful for extracting the nodes that can be reused in a
        /// subsequent incremental re-parse.
        Tree.prototype.applyChanges = function (changes) {
            if (changes.length == 0)
                return this;
            var children = [], positions = [];
            function cutAt(tree, pos, side) {
                var sub = tree.resolve(pos);
                for (var cur = pos;;) {
                    var sibling = side < 0 ? sub.childBefore(cur) : sub.childAfter(cur);
                    if (sibling)
                        return side < 0 ? sibling.end - 1 : sibling.start + 1;
                    if (!sub.parent)
                        return side < 0 ? 0 : 1e9;
                    cur = side < 0 ? sub.start : sub.end;
                    sub = sub.parent;
                }
            }
            var off = 0;
            for (var i = 0, pos = 0;; i++) {
                var next = i == changes.length ? null : changes[i];
                var nextPos = next ? cutAt(this, next.fromA, -1) : this.length;
                if (nextPos > pos)
                    this.partial(pos, nextPos, off, children, positions);
                if (!next)
                    break;
                pos = cutAt(this, next.toA, 1);
                off += (next.toB - next.fromB) - (next.toA - next.fromA);
            }
            return new Tree(NodeType.none, children, positions, this.length + off);
        };
        /// Take the part of the tree up to the given position.
        Tree.prototype.cut = function (at) {
            if (at >= this.length)
                return this;
            var children = [], positions = [];
            for (var i = 0; i < this.children.length; i++) {
                var from = this.positions[i];
                if (from >= at)
                    break;
                var child = this.children[i], to = from + child.length;
                children.push(to <= at ? child : child.cut(at - from));
                positions.push(from);
            }
            return new Tree(this.type, children, positions, at);
        };
        /// @internal
        Tree.prototype.iterate = function (_a) {
            var _b = _a.from, from = _b === void 0 ? this.start : _b, _c = _a.to, to = _c === void 0 ? this.end : _c, enter = _a.enter, leave = _a.leave;
            var iter = new Iteration(enter, leave);
            this.iterInner(from, to, 0, iter);
            return iter.result;
        };
        /// @internal
        Tree.prototype.iterInner = function (from, to, offset, iter) {
            if (this.type.name && !iter.doEnter(this.type, offset, offset + this.length))
                return;
            if (from <= to) {
                for (var i = 0; i < this.children.length && !iter.done; i++) {
                    var child = this.children[i], start = this.positions[i] + offset, end = start + child.length;
                    if (start > to)
                        break;
                    if (end < from)
                        continue;
                    child.iterInner(from, to, start, iter);
                }
            }
            else {
                for (var i = this.children.length - 1; i >= 0 && !iter.done; i--) {
                    var child = this.children[i], start = this.positions[i] + offset, end = start + child.length;
                    if (end < to)
                        break;
                    if (start > from)
                        continue;
                    child.iterInner(from, to, start, iter);
                }
            }
            if (iter.leave && this.type.name)
                iter.leave(this.type, offset, offset + this.length);
            return;
        };
        /// @internal
        Tree.prototype.resolveAt = function (pos) {
            if (cacheRoot == this) {
                for (var tree = cached;;) {
                    var next = tree.parent;
                    if (!next)
                        break;
                    if (tree.start < pos && tree.end > pos)
                        return tree.resolve(pos);
                    tree = next;
                }
            }
            cacheRoot = this;
            return cached = this.resolveInner(pos, 0, this);
        };
        /// @internal
        Tree.prototype.childBefore = function (pos) {
            return this.findChild(pos, -1, 0, this);
        };
        /// @internal
        Tree.prototype.childAfter = function (pos) {
            return this.findChild(pos, 1, 0, this);
        };
        /// @internal
        Tree.prototype.findChild = function (pos, side, start, parent) {
            for (var i = 0; i < this.children.length; i++) {
                var childStart = this.positions[i] + start, select = -1;
                if (childStart >= pos) {
                    if (side < 0 && i > 0)
                        select = i - 1;
                    else if (side > 0)
                        select = i;
                    else
                        break;
                }
                if (select < 0 && (childStart + this.children[i].length > pos || side < 0 && i == this.children.length - 1))
                    select = i;
                if (select >= 0) {
                    var child = this.children[select], childStart_1 = this.positions[select] + start;
                    if (child.length == 0 && childStart_1 == pos)
                        continue;
                    if (child instanceof Tree) {
                        if (child.type.name)
                            return new NodeSubtree(child, childStart_1, parent);
                        return child.findChild(pos, side, childStart_1, parent);
                    }
                    else {
                        var found = child.findIndex(pos, side, childStart_1, 0, child.buffer.length);
                        if (found > -1)
                            return new BufferSubtree(child, childStart_1, found, parent);
                    }
                }
            }
            return null;
        };
        /// @internal
        Tree.prototype.resolveInner = function (pos, start, parent) {
            var found = this.findChild(pos, 0, start, parent);
            return found ? found.resolveAt(pos) : parent;
        };
        /// Append another tree to this tree. `other` must have empty space
        /// big enough to fit this tree at its start.
        Tree.prototype.append = function (other) {
            if (other.children.length && other.positions[0] < this.length)
                throw new Error("Can't append overlapping trees");
            return new Tree(this.type, this.children.concat(other.children), this.positions.concat(other.positions), other.length);
        };
        /// Balance the direct children of this tree. Should only be used on
        /// non-tagged trees.
        Tree.prototype.balance = function (maxBufferLength) {
            if (maxBufferLength === void 0) { maxBufferLength = exports.DefaultBufferLength; }
            return this.children.length <= BalanceBranchFactor ? this :
                balanceRange(this.type, this.children, this.positions, 0, this.children.length, 0, maxBufferLength);
        };
        /// Build a tree from a postfix-ordered buffer of node information,
        /// or a cursor over such a buffer.
        Tree.build = function (buffer, group, topID, maxBufferLength, reused) {
            if (topID === void 0) { topID = 0; }
            if (maxBufferLength === void 0) { maxBufferLength = exports.DefaultBufferLength; }
            if (reused === void 0) { reused = []; }
            return buildTree(Array.isArray(buffer) ? new FlatBufferCursor(buffer, buffer.length) : buffer, group, topID, maxBufferLength, reused);
        };
        /// The empty tree
        Tree.empty = new Tree(NodeType.none, [], [], 0);
        return Tree;
    }(Subtree));
    exports.Tree = Tree;
    Tree.prototype.parent = null;
    // Top-level `resolveAt` calls store their last result here, so that
    // if the next call is near the last, parent trees can be cheaply
    // reused.
    var cacheRoot = Tree.empty;
    var cached = Tree.empty;
    /// Tree buffers contain (type, start, end, endIndex) quads for each
    /// node. In such a buffer, nodes are stored in prefix order (parents
    /// before children, with the endIndex of the parent indicating which
    /// children belong to it)
    var TreeBuffer = /** @class */ (function () {
        /// Create a tree buffer @internal
        function TreeBuffer(buffer, length, group) {
            this.buffer = buffer;
            this.length = length;
            this.group = group;
        }
        /// @internal
        TreeBuffer.prototype.toString = function () {
            var parts = [];
            for (var index = 0; index < this.buffer.length;)
                index = this.childToString(index, parts);
            return parts.join(",");
        };
        /// @internal
        TreeBuffer.prototype.childToString = function (index, parts) {
            var id = this.buffer[index], endIndex = this.buffer[index + 3];
            var type = this.group.types[id], result = type.name;
            if (/\W/.test(result) && !type.prop(NodeProp.error))
                result = JSON.stringify(result);
            index += 4;
            if (endIndex > index) {
                var children = [];
                while (index < endIndex)
                    index = this.childToString(index, children);
                result += "(" + children.join(",") + ")";
            }
            parts.push(result);
            return index;
        };
        /// @internal
        TreeBuffer.prototype.cut = function (at) {
            var cutPoint = 0;
            while (cutPoint < this.buffer.length && this.buffer[cutPoint + 1] < at)
                cutPoint += 4;
            var newBuffer = new Uint16Array(cutPoint);
            for (var i = 0; i < cutPoint; i += 4) {
                newBuffer[i] = this.buffer[i];
                newBuffer[i + 1] = this.buffer[i + 1];
                newBuffer[i + 2] = Math.min(at, this.buffer[i + 2]);
                newBuffer[i + 3] = Math.min(this.buffer[i + 3], cutPoint);
            }
            return new TreeBuffer(newBuffer, Math.min(at, this.length), this.group);
        };
        /// @internal
        TreeBuffer.prototype.iterInner = function (from, to, offset, iter) {
            if (from <= to) {
                for (var index = 0; index < this.buffer.length;)
                    index = this.iterChild(from, to, offset, index, iter);
            }
            else {
                this.iterRev(from, to, offset, 0, this.buffer.length, iter);
            }
        };
        /// @internal
        TreeBuffer.prototype.iterChild = function (from, to, offset, index, iter) {
            var type = this.group.types[this.buffer[index++]], start = this.buffer[index++] + offset, end = this.buffer[index++] + offset, endIndex = this.buffer[index++];
            if (start > to)
                return this.buffer.length;
            if (end >= from && iter.doEnter(type, start, end)) {
                while (index < endIndex && !iter.done)
                    index = this.iterChild(from, to, offset, index, iter);
                if (iter.leave)
                    iter.leave(type, start, end);
            }
            return endIndex;
        };
        TreeBuffer.prototype.parentNodesByEnd = function (startIndex, endIndex) {
            var _this = this;
            // Build up an array of node indices reflecting the order in which
            // non-empty nodes end, to avoid having to scan for parent nodes
            // at every position during reverse iteration.
            var order = [];
            var scan = function (index) {
                var end = _this.buffer[index + 3];
                if (end == index + 4)
                    return end;
                for (var i = index + 4; i < end;)
                    i = scan(i);
                order.push(index);
                return end;
            };
            for (var index = startIndex; index < endIndex;)
                index = scan(index);
            return order;
        };
        /// @internal
        TreeBuffer.prototype.iterRev = function (from, to, offset, startIndex, endIndex, iter) {
            var _this = this;
            var endOrder = this.parentNodesByEnd(startIndex, endIndex);
            // Index range for the next non-empty node
            var nextStart = -1, nextEnd = -1;
            var takeNext = function () {
                if (endOrder.length > 0) {
                    nextStart = endOrder.pop();
                    nextEnd = _this.buffer[nextStart + 3];
                }
                else {
                    nextEnd = -1;
                }
            };
            takeNext();
            run: for (var index = endIndex; index > startIndex && !iter.done;) {
                while (nextEnd == index) {
                    var base = nextStart;
                    var id_1 = this.buffer[base], start_1 = this.buffer[base + 1] + offset, end_1 = this.buffer[base + 2] + offset;
                    takeNext();
                    if (start_1 <= from && end_1 >= to) {
                        if (!iter.doEnter(this.group.types[id_1], start_1, end_1)) {
                            // Skip the entire node
                            index = base;
                            while (nextEnd > base)
                                takeNext();
                            continue run;
                        }
                    }
                }
                var endIndex_1 = this.buffer[--index], end = this.buffer[--index] + offset, start = this.buffer[--index] + offset, id = this.buffer[--index];
                if (start > from || end < to)
                    continue;
                if ((endIndex_1 != index + 4 || iter.doEnter(this.group.types[id], start, end)) && iter.leave)
                    iter.leave(this.group.types[id], start, end);
            }
        };
        /// @internal
        TreeBuffer.prototype.findIndex = function (pos, side, start, from, to) {
            var lastI = -1;
            for (var i = from, buf = this.buffer; i < to;) {
                var start1 = buf[i + 1] + start, end1 = buf[i + 2] + start;
                var ignore = start1 == end1 && start1 == pos;
                if (start1 >= pos) {
                    if (side > 0 && !ignore)
                        return i;
                    break;
                }
                if (end1 > pos)
                    return i;
                if (!ignore)
                    lastI = i;
                i = buf[i + 3];
            }
            return side < 0 ? lastI : -1;
        };
        return TreeBuffer;
    }());
    exports.TreeBuffer = TreeBuffer;
    var NodeSubtree = /** @class */ (function (_super) {
        __extends(NodeSubtree, _super);
        function NodeSubtree(node, start, parent) {
            var _this = _super.call(this) || this;
            _this.node = node;
            _this.start = start;
            _this.parent = parent;
            return _this;
        }
        Object.defineProperty(NodeSubtree.prototype, "type", {
            get: function () { return this.node.type; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(NodeSubtree.prototype, "end", {
            get: function () { return this.start + this.node.length; },
            enumerable: true,
            configurable: true
        });
        NodeSubtree.prototype.resolveAt = function (pos) {
            if (pos <= this.start || pos >= this.end)
                return this.parent.resolveAt(pos);
            return this.node.resolveInner(pos, this.start, this);
        };
        NodeSubtree.prototype.childBefore = function (pos) {
            return this.node.findChild(pos, -1, this.start, this);
        };
        NodeSubtree.prototype.childAfter = function (pos) {
            return this.node.findChild(pos, 1, this.start, this);
        };
        NodeSubtree.prototype.toString = function () { return this.node.toString(); };
        NodeSubtree.prototype.iterate = function (_a) {
            var _b = _a.from, from = _b === void 0 ? this.start : _b, _c = _a.to, to = _c === void 0 ? this.end : _c, enter = _a.enter, leave = _a.leave;
            var iter = new Iteration(enter, leave);
            this.node.iterInner(from, to, this.start, iter);
            return iter.result;
        };
        return NodeSubtree;
    }(Subtree));
    var BufferSubtree = /** @class */ (function (_super) {
        __extends(BufferSubtree, _super);
        function BufferSubtree(buffer, bufferStart, index, parent) {
            var _this = _super.call(this) || this;
            _this.buffer = buffer;
            _this.bufferStart = bufferStart;
            _this.index = index;
            _this.parent = parent;
            return _this;
        }
        Object.defineProperty(BufferSubtree.prototype, "type", {
            get: function () { return this.buffer.group.types[this.buffer.buffer[this.index]]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BufferSubtree.prototype, "start", {
            get: function () { return this.buffer.buffer[this.index + 1] + this.bufferStart; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BufferSubtree.prototype, "end", {
            get: function () { return this.buffer.buffer[this.index + 2] + this.bufferStart; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BufferSubtree.prototype, "endIndex", {
            get: function () { return this.buffer.buffer[this.index + 3]; },
            enumerable: true,
            configurable: true
        });
        BufferSubtree.prototype.childBefore = function (pos) {
            var index = this.buffer.findIndex(pos, -1, this.bufferStart, this.index + 4, this.endIndex);
            return index < 0 ? null : new BufferSubtree(this.buffer, this.bufferStart, index, this);
        };
        BufferSubtree.prototype.childAfter = function (pos) {
            var index = this.buffer.findIndex(pos, 1, this.bufferStart, this.index + 4, this.endIndex);
            return index < 0 ? null : new BufferSubtree(this.buffer, this.bufferStart, index, this);
        };
        BufferSubtree.prototype.iterate = function (_a) {
            var _b = _a.from, from = _b === void 0 ? this.start : _b, _c = _a.to, to = _c === void 0 ? this.end : _c, enter = _a.enter, leave = _a.leave;
            var iter = new Iteration(enter, leave);
            if (from <= to)
                this.buffer.iterChild(from, to, this.bufferStart, this.index, iter);
            else
                this.buffer.iterRev(from, to, this.bufferStart, this.index, this.endIndex, iter);
            return iter.result;
        };
        BufferSubtree.prototype.resolveAt = function (pos) {
            if (pos <= this.start || pos >= this.end)
                return this.parent.resolveAt(pos);
            var found = this.buffer.findIndex(pos, 0, this.bufferStart, this.index + 4, this.endIndex);
            return found < 0 ? this : new BufferSubtree(this.buffer, this.bufferStart, found, this).resolveAt(pos);
        };
        BufferSubtree.prototype.toString = function () {
            var result = [];
            this.buffer.childToString(this.index, result);
            return result.join("");
        };
        return BufferSubtree;
    }(Subtree));
    var FlatBufferCursor = /** @class */ (function () {
        function FlatBufferCursor(buffer, index) {
            this.buffer = buffer;
            this.index = index;
        }
        Object.defineProperty(FlatBufferCursor.prototype, "id", {
            get: function () { return this.buffer[this.index - 4]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FlatBufferCursor.prototype, "start", {
            get: function () { return this.buffer[this.index - 3]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FlatBufferCursor.prototype, "end", {
            get: function () { return this.buffer[this.index - 2]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FlatBufferCursor.prototype, "size", {
            get: function () { return this.buffer[this.index - 1]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FlatBufferCursor.prototype, "pos", {
            get: function () { return this.index; },
            enumerable: true,
            configurable: true
        });
        FlatBufferCursor.prototype.next = function () { this.index -= 4; };
        FlatBufferCursor.prototype.fork = function () { return new FlatBufferCursor(this.buffer, this.index); };
        return FlatBufferCursor;
    }());
    var BalanceBranchFactor = 8;
    var repeat = NodeProp.repeated; // Need this one a lot later on
    function buildTree(cursor, group, topID, maxBufferLength, reused) {
        var types = group.types;
        function takeNode(parentStart, minPos, children, positions) {
            var id = cursor.id, start = cursor.start, end = cursor.end, size = cursor.size, buffer;
            var startPos = start - parentStart;
            if (size < 0) { // Reused node
                children.push(reused[id]);
                positions.push(startPos);
                cursor.next();
                return;
            }
            var type = types[id], node;
            if (end - start <= maxBufferLength &&
                (buffer = findBufferSize(cursor.pos - minPos, type.prop(repeat) ? id : -1))) {
                // Small enough for a buffer, and no reused nodes inside
                var data = new Uint16Array(buffer.size - buffer.skip);
                var endPos = cursor.pos - buffer.size, index = data.length;
                while (cursor.pos > endPos)
                    index = copyToBuffer(buffer.start, data, index);
                node = new TreeBuffer(data, end - buffer.start, group);
                // Wrap if this is a repeat node
                if (type.prop(repeat))
                    node = new Tree(type, [node], [0], end - buffer.start);
                startPos = buffer.start - parentStart;
            }
            else { // Make it a node
                var endPos = cursor.pos - size;
                cursor.next();
                var localChildren = [], localPositions = [];
                while (cursor.pos > endPos)
                    takeNode(start, endPos, localChildren, localPositions);
                localChildren.reverse();
                localPositions.reverse();
                node = new Tree(type, localChildren, localPositions, end - start);
            }
            children.push(node);
            positions.push(startPos);
            // End of a (possible) sequence of repeating nodes—might need to balance
            if (type.prop(repeat) && (cursor.pos == 0 || cursor.id != id))
                maybeBalanceSiblings(children, positions, type);
        }
        function maybeBalanceSiblings(children, positions, type) {
            var to = children.length, from = to - 1;
            for (; from > 0; from--) {
                var prev = children[from - 1];
                if (!(prev instanceof Tree) || prev.type != type)
                    break;
            }
            if (to - from < BalanceBranchFactor)
                return;
            var start = positions[to - 1];
            var wrapped = balanceRange(type, children.slice(from, to).reverse(), positions.slice(from, to).reverse(), 0, to - from, start, maxBufferLength);
            children.length = positions.length = from + 1;
            children[from] = wrapped;
            positions[from] = start;
        }
        function findBufferSize(maxSize, id) {
            // Scan through the buffer to find previous siblings that fit
            // together in a TreeBuffer, and don't contain any reused nodes
            // (which can't be stored in a buffer)
            // If `type` is > -1, only include siblings with that same type
            // (used to group repeat content into a buffer)
            var fork = cursor.fork();
            var size = 0, start = 0, skip = 0, minStart = fork.end - maxBufferLength;
            scan: for (var minPos = fork.pos - maxSize; fork.pos > minPos;) {
                var nodeSize = fork.size, startPos = fork.pos - nodeSize;
                if (nodeSize < 0 || startPos < minPos || fork.start < minStart || id > -1 && fork.id != id)
                    break;
                var localSkipped = types[fork.id].prop(repeat) ? 4 : 0;
                var nodeStart = fork.start;
                fork.next();
                while (fork.pos > startPos) {
                    if (fork.size < 0)
                        break scan;
                    if (types[fork.id].prop(repeat))
                        localSkipped += 4;
                    fork.next();
                }
                start = nodeStart;
                size += nodeSize;
                skip += localSkipped;
            }
            return size > 4 ? { size: size, start: start, skip: skip } : null;
        }
        function copyToBuffer(bufferStart, buffer, index) {
            var id = cursor.id, start = cursor.start, end = cursor.end, size = cursor.size;
            cursor.next();
            var startIndex = index;
            if (size > 4) {
                var endPos = cursor.pos - (size - 4);
                while (cursor.pos > endPos)
                    index = copyToBuffer(bufferStart, buffer, index);
            }
            if (!types[id].prop(repeat)) { // Don't copy repeat nodes into buffers
                buffer[--index] = startIndex;
                buffer[--index] = end - bufferStart;
                buffer[--index] = start - bufferStart;
                buffer[--index] = id;
            }
            return index;
        }
        var children = [], positions = [];
        while (cursor.pos > 0)
            takeNode(0, 0, children, positions);
        var length = children.length ? positions[0] + children[0].length : 0;
        return new Tree(group.types[topID], children.reverse(), positions.reverse(), length);
    }
    function balanceRange(type, children, positions, from, to, start, maxBufferLength) {
        var length = (positions[to - 1] + children[to - 1].length) - start;
        if (from == to - 1 && start == 0) {
            var first = children[from];
            if (first instanceof Tree)
                return first;
        }
        var localChildren = [], localPositions = [];
        if (length <= maxBufferLength) {
            for (var i = from; i < to; i++) {
                localChildren.push(children[i]);
                localPositions.push(positions[i] - start);
            }
        }
        else {
            var maxChild = Math.max(maxBufferLength, Math.ceil(length * 1.5 / BalanceBranchFactor));
            for (var i = from; i < to;) {
                var groupFrom = i, groupStart = positions[i];
                i++;
                for (; i < to; i++) {
                    var nextEnd = positions[i] + children[i].length;
                    if (nextEnd - groupStart > maxChild)
                        break;
                }
                if (i == groupFrom + 1) {
                    var only = children[groupFrom];
                    if (only instanceof Tree && only.type == type) {
                        // Already wrapped
                        if (only.length > maxChild << 1) { // Too big, collapse
                            for (var j = 0; j < only.children.length; j++) {
                                localChildren.push(only.children[j]);
                                localPositions.push(only.positions[j] + groupStart - start);
                            }
                            continue;
                        }
                    }
                    else {
                        // Wrap with our type to make reuse possible
                        only = new Tree(type, [only], [0], only.length);
                    }
                    localChildren.push(only);
                }
                else {
                    localChildren.push(balanceRange(type, children, positions, groupFrom, i, groupStart, maxBufferLength));
                }
                localPositions.push(groupStart - start);
            }
        }
        return new Tree(type, localChildren, localPositions, length);
    }

    });

    unwrapExports(tree);
    var tree_1 = tree.DefaultBufferLength;
    var tree_2 = tree.NodeProp;
    var tree_3 = tree.NodePropSource;
    var tree_4 = tree.NodeType;
    var tree_5 = tree.NodeGroup;
    var tree_6 = tree.Subtree;
    var tree_7 = tree.Tree;
    var tree_8 = tree.TreeBuffer;

    /// A single selection range. When
    /// [`allowMultipleSelections`](#state.EditorState^allowMultipleSelections)
    /// is enabled, a [selection](#state.EditorSelection) may hold
    /// multiple ranges. By default, selections hold exactly one range.
    class SelectionRange {
        /// Create a range. `head` defaults to `anchor` when not given.
        constructor(
        /// The anchor of the range—the side that doesn't move when you
        /// extend it.
        anchor, 
        /// The head of the range, which is moved when the range is
        /// [extended](#state.SelectionRange.extend).
        head = anchor) {
            this.anchor = anchor;
            this.head = head;
        }
        /// The lower side of the range.
        get from() { return Math.min(this.anchor, this.head); }
        /// The upper side of the range.
        get to() { return Math.max(this.anchor, this.head); }
        /// True when `anchor` and `head` are at the same position.
        get empty() { return this.anchor == this.head; }
        /// Map this range through a mapping.
        map(mapping) {
            let anchor = mapping.mapPos(this.anchor), head = mapping.mapPos(this.head);
            if (anchor == this.anchor && head == this.head)
                return this;
            else
                return new SelectionRange(anchor, head);
        }
        /// Extend this range to cover at least `from` to `to`.
        extend(from, to = from) {
            if (from <= this.anchor && to >= this.anchor)
                return new SelectionRange(from, to);
            let head = Math.abs(from - this.anchor) > Math.abs(to - this.anchor) ? from : to;
            return new SelectionRange(this.anchor, head);
        }
        /// Compare this range to another range.
        eq(other) {
            return this.anchor == other.anchor && this.head == other.head;
        }
        /// Return a JSON-serializable object representing the range.
        toJSON() { return this; }
        /// Convert a JSON representation of a range to a `SelectionRange`
        /// instance.
        static fromJSON(json) {
            if (!json || typeof json.anchor != "number" || typeof json.head != "number")
                throw new RangeError("Invalid JSON representation for SelectionRange");
            return new SelectionRange(json.anchor, json.head);
        }
        /// @internal FIXME export?
        static groupAt(state, pos, bias = 1) {
            // FIXME at some point, take language-specific identifier characters into account
            let line = state.doc.lineAt(pos), linePos = pos - line.start;
            if (line.length == 0)
                return new SelectionRange(pos);
            if (linePos == 0)
                bias = 1;
            else if (linePos == line.length)
                bias = -1;
            let read = linePos + (bias < 0 ? -1 : 0), type = charType(line.slice(read, read + 1));
            let from = pos, to = pos;
            for (let lineFrom = linePos; lineFrom > 0 && charType(line.slice(lineFrom - 1, lineFrom)) == type; lineFrom--)
                from--;
            for (let lineTo = linePos; lineTo < line.length && charType(line.slice(lineTo, lineTo + 1)) == type; lineTo++)
                to++;
            return new SelectionRange(to, from);
        }
    }
    /// An editor selection holds one or more selection ranges.
    class EditorSelection {
        /// @internal
        constructor(
        /// The ranges in the selection, sorted by position. Ranges cannot
        /// overlap (but they may touch, if they aren't empty).
        ranges, 
        /// The index of the _primary_ range in the selection (which is
        /// usually the range that was added last).
        primaryIndex = 0) {
            this.ranges = ranges;
            this.primaryIndex = primaryIndex;
        }
        /// Map a selection through a mapping. Mostly used to adjust the
        /// selection position for changes.
        map(mapping) {
            return EditorSelection.create(this.ranges.map(r => r.map(mapping)), this.primaryIndex);
        }
        /// Compare this selection to another selection.
        eq(other) {
            if (this.ranges.length != other.ranges.length ||
                this.primaryIndex != other.primaryIndex)
                return false;
            for (let i = 0; i < this.ranges.length; i++)
                if (!this.ranges[i].eq(other.ranges[i]))
                    return false;
            return true;
        }
        /// Get the primary selection range. Usually, you should make sure
        /// your code applies to _all_ ranges, by using transaction methods
        /// like [`forEachRange`](#state.transaction.forEachRange).
        get primary() { return this.ranges[this.primaryIndex]; }
        /// Make sure the selection only has one range. Returns a selection
        /// holding only the primary range from this selection.
        asSingle() {
            return this.ranges.length == 1 ? this : new EditorSelection([this.primary]);
        }
        /// Extend this selection with an extra range.
        addRange(range, primary = true) {
            return EditorSelection.create([range].concat(this.ranges), primary ? 0 : this.primaryIndex + 1);
        }
        /// Replace a given range with another range, and then normalize the
        /// selection to merge and sort ranges if necessary.
        replaceRange(range, which = this.primaryIndex) {
            let ranges = this.ranges.slice();
            ranges[which] = range;
            return EditorSelection.create(ranges, this.primaryIndex);
        }
        /// Convert this selection to an object that can be serialized to
        /// JSON.
        toJSON() {
            return this.ranges.length == 1 ? this.ranges[0].toJSON() :
                { ranges: this.ranges.map(r => r.toJSON()), primaryIndex: this.primaryIndex };
        }
        /// Create a selection from a JSON representation.
        static fromJSON(json) {
            if (json && Array.isArray(json.ranges)) {
                if (typeof json.primaryIndex != "number" || json.primaryIndex >= json.ranges.length)
                    throw new RangeError("Invalid JSON representation for EditorSelection");
                return new EditorSelection(json.ranges.map((r) => SelectionRange.fromJSON(r)), json.primaryIndex);
            }
            return new EditorSelection([SelectionRange.fromJSON(json)]);
        }
        /// Create a selection holding a single range.
        static single(anchor, head = anchor) {
            return new EditorSelection([new SelectionRange(anchor, head)], 0);
        }
        /// Sort and merge the given set of ranges, creating a valid
        /// selection.
        static create(ranges, primaryIndex = 0) {
            for (let pos = 0, i = 0; i < ranges.length; i++) {
                let range = ranges[i];
                if (range.empty ? range.from <= pos : range.from < pos)
                    return normalized(ranges.slice(), primaryIndex);
                pos = range.to;
            }
            return new EditorSelection(ranges, primaryIndex);
        }
    }
    function normalized(ranges, primaryIndex = 0) {
        let primary = ranges[primaryIndex];
        ranges.sort((a, b) => a.from - b.from);
        primaryIndex = ranges.indexOf(primary);
        for (let i = 1; i < ranges.length; i++) {
            let range = ranges[i], prev = ranges[i - 1];
            if (range.empty ? range.from <= prev.to : range.from < prev.to) {
                let from = prev.from, to = Math.max(range.to, prev.to);
                if (i <= primaryIndex)
                    primaryIndex--;
                ranges.splice(--i, 2, range.anchor > range.head ? new SelectionRange(to, from) : new SelectionRange(from, to));
            }
        }
        return new EditorSelection(ranges, primaryIndex);
    }

    const extendState = new ExtensionGroup(state => state.values);
    const stateField = extendState.behavior({ static: true });
    const allowMultipleSelections = extendState.behavior({
        combine: values => values.some(v => v),
        static: true
    });
    /// Fields can store additional information in an editor state, and
    /// keep it in sync with the rest of the state.
    class StateField {
        /// Declare a field. The field instance is used as the
        /// [key](#state.EditorState.field) when retrieving the field's
        /// value from a state.
        constructor(spec) {
            /// @internal
            this.id = extendState.storageID();
            this.init = spec.init;
            this.apply = spec.apply;
            this.extension = stateField(this);
        }
    }
    /// Annotations are tagged values that are used to add metadata to
    /// transactions in an extensible way.
    class Annotation {
        /// @internal
        constructor(/** @internal */ type, 
        /** @internal */ value) {
            this.type = type;
            this.value = value;
        }
        /// Define a new type of annotation. Returns a function that you can
        /// call with a content value to create an instance of this type.
        static define() {
            return function type(value) { return new Annotation(type, value); };
        }
    }
    /// A node prop that can be stored on a grammar's top node to
    /// associate information with the language. Different extension might
    /// use different properties from this object (which they typically
    /// export as an interface).
    const languageData = new tree_2();

    const empty = [];
    /// Distinguishes different ways in which positions can be mapped.
    var MapMode;
    (function (MapMode) {
        /// Map a position to a valid new position, even when its context
        /// was deleted.
        MapMode[MapMode["Simple"] = 0] = "Simple";
        /// Return a negative number if a deletion happens across the
        /// position. This number will be `-(newPos + 1)`, where `newPos` is
        /// the result you'd get with `MapMode.Simple`.
        MapMode[MapMode["TrackDel"] = 1] = "TrackDel";
        /// Return a negative number if the character _before_ the position
        /// is deleted. The result is encoded the same way as with
        /// `MapMode.TrackDel`.
        MapMode[MapMode["TrackBefore"] = 2] = "TrackBefore";
        /// Return a negative number if the character _after_ the position is
        /// deleted.
        MapMode[MapMode["TrackAfter"] = 3] = "TrackAfter";
    })(MapMode || (MapMode = {}));
    /// A change description describes a document change. This is usually
    /// used as a superclass of [`Change`](#state.Change), but can be used
    /// to store change data without storing the replacement string
    /// content.
    class ChangeDesc {
        /// Create a description that replaces the text between positions
        /// `from` and `to` with a new string of length `length`.
        constructor(
        /// The start position of the change.
        from, 
        /// The end of the change (as a pre-change document position).
        to, 
        /// The length of the replacing content.
        length) {
            this.from = from;
            this.to = to;
            this.length = length;
        }
        /// Get the change description of the inverse of this change.
        get invertedDesc() { return new ChangeDesc(this.from, this.from + this.length, this.to - this.from); }
        /// @internal
        mapPos(pos, bias = -1, mode = MapMode.Simple) {
            let { from, to, length } = this;
            if (pos < from)
                return pos;
            if (pos > to)
                return pos + (length - (to - from));
            if (pos == to || pos == from) {
                if (from < pos && mode == MapMode.TrackBefore || to > pos && mode == MapMode.TrackAfter)
                    return -pos - 1;
                return (from == to ? bias <= 0 : pos == from) ? from : from + length;
            }
            pos = from + (bias <= 0 ? 0 : length);
            return mode != MapMode.Simple ? -pos - 1 : pos;
        }
        /// Return a JSON-serializeable object representing this value.
        toJSON() { return this; }
        /// Create a change description from its JSON representation.
        static fromJSON(json) {
            if (!json || typeof json.from != "number" || typeof json.to != "number" || typeof json.length != "number")
                throw new RangeError("Invalid JSON representation for ChangeDesc");
            return new ChangeDesc(json.from, json.to, json.length);
        }
    }
    /// Change objects describe changes to the document.
    class Change extends ChangeDesc {
        /// Create a change that replaces `from` to `to` with `text`. The
        /// text is given as an array of lines. When it doesn't span lines,
        /// the array has a single element. When it does, a new element is
        /// added for every line. It should never have zero elements.
        constructor(from, to, 
        /// The replacement content.
        text) {
            super(from, to, textLength$1(text));
            this.from = from;
            this.to = to;
            this.text = text;
        }
        /// Create the inverse of this change when applied to the given
        /// document. `change.invert(doc).apply(change.apply(doc))` gets you
        /// the same document as the original `doc`.
        invert(doc) {
            return new Change(this.from, this.from + this.length, doc.sliceLines(this.from, this.to));
        }
        /// Apply this change to the given content, returning an updated
        /// version of the document.
        apply(doc) {
            return doc.replace(this.from, this.to, this.text);
        }
        /// Map this change through a mapping, producing a new change that
        /// can be applied to a post-mapping document. May return null if
        /// the mapping completely replaces the region this change would
        /// apply to.
        map(mapping) {
            let from = mapping.mapPos(this.from, 1), to = mapping.mapPos(this.to, -1);
            return from > to ? null : new Change(from, to, this.text);
        }
        /// A change description for this change.
        get desc() { return new ChangeDesc(this.from, this.to, this.length); }
        /// Produce a JSON-serializable object representing this change.
        toJSON() {
            return { from: this.from, to: this.to, text: this.text };
        }
        /// Read a change instance from its JSON representation.
        static fromJSON(json) {
            if (!json || typeof json.from != "number" || typeof json.to != "number" ||
                !Array.isArray(json.text) || json.text.length == 0 || json.text.some((val) => typeof val != "string"))
                throw new RangeError("Invalid JSON representation for Change");
            return new Change(json.from, json.to, json.text);
        }
    }
    function textLength$1(text) {
        let length = -1;
        for (let line of text)
            length += line.length + 1;
        return length;
    }
    /// A change set holds a sequence of changes or change descriptions.
    class ChangeSet {
        /// @internal
        constructor(
        /// The changes in this set.
        changes, 
        /// @internal
        mirror = empty) {
            this.changes = changes;
            this.mirror = mirror;
        }
        /// The number of changes in the set.
        get length() {
            return this.changes.length;
        }
        /// Change sets can track which changes are inverses of each other,
        /// to allow robust position mapping in situations where changes are
        /// undone and then redone again. This queries which change is the
        /// mirror image of a given change (by index).
        getMirror(n) {
            for (let i = 0; i < this.mirror.length; i++)
                if (this.mirror[i] == n)
                    return this.mirror[i + (i % 2 ? -1 : 1)];
            return null;
        }
        /// Append a change to this set, returning an extended set. `mirror`
        /// may be the index of a change already in the set, which
        /// [mirrors](#state.ChangeSet.getMirror) the new change.
        append(change, mirror) {
            return new ChangeSet(this.changes.concat(change), mirror != null ? this.mirror.concat(this.length, mirror) : this.mirror);
        }
        /// Append another change set to this one.
        appendSet(changes) {
            return changes.length == 0 ? this :
                this.length == 0 ? changes :
                    new ChangeSet(this.changes.concat(changes.changes), this.mirror.concat(changes.mirror.map(i => i + this.length)));
        }
        /// @internal
        mapPos(pos, bias = -1, mode = MapMode.Simple) {
            return this.mapInner(pos, bias, mode, 0, this.length);
        }
        /// @internal
        mapInner(pos, bias, mode, fromI, toI) {
            let dir = toI < fromI ? -1 : 1;
            let recoverables = null;
            let hasMirrors = this.mirror.length > 0, rec, mirror, deleted = false;
            for (let i = fromI - (dir < 0 ? 1 : 0), endI = toI - (dir < 0 ? 1 : 0); i != endI; i += dir) {
                let { from, to, length } = this.changes[i];
                if (dir < 0) {
                    let len = to - from;
                    to = from + length;
                    length = len;
                }
                if (pos < from)
                    continue;
                if (pos > to) {
                    pos += length - (to - from);
                    continue;
                }
                // Change touches this position
                if (recoverables && (rec = recoverables[i]) != null) { // There's a recovery for this change, and it applies
                    pos = from + rec;
                    continue;
                }
                if (hasMirrors && (mirror = this.getMirror(i)) != null &&
                    (dir > 0 ? mirror > i && mirror < toI : mirror < i && mirror >= toI)) { // A mirror exists
                    if (pos > from && pos < to) { // If this change deletes the position, skip forward to the mirror
                        i = mirror;
                        pos = this.changes[i].from + (pos - from);
                        continue;
                    }
                    (recoverables || (recoverables = {}))[mirror] = pos - from;
                }
                if (pos > from && pos < to) {
                    if (mode != MapMode.Simple)
                        deleted = true;
                    pos = bias <= 0 ? from : from + length;
                }
                else {
                    if (from < pos && mode == MapMode.TrackBefore || to > pos && mode == MapMode.TrackAfter)
                        deleted = true;
                    pos = (from == to ? bias <= 0 : pos == from) ? from : from + length;
                }
            }
            return deleted ? -pos - 1 : pos;
        }
        /// Get a partial [mapping](#state.Mapping) covering part of this
        /// change set.
        partialMapping(from, to = this.length) {
            if (from == 0 && to == this.length)
                return this;
            return new PartialMapping(this, from, to);
        }
        /// Summarize this set of changes as a minimal sequence of changed
        /// ranges, sored by position. For example, if you have changes
        /// deleting between 1 and 4 and inserting a character at 1, the
        /// result would be a single range saying 1 to 4 in the old doc was
        /// replaced with range 1 to 2 in the new doc.
        changedRanges() {
            // FIXME cache this?
            let set = [];
            for (let i = 0; i < this.length; i++) {
                let change = this.changes[i];
                let fromA = change.from, toA = change.to, fromB = change.from, toB = change.from + change.length;
                if (i < this.length - 1) {
                    let mapping = this.partialMapping(i + 1);
                    fromB = mapping.mapPos(fromB, 1);
                    toB = mapping.mapPos(toB, -1);
                }
                if (i > 0) {
                    let mapping = this.partialMapping(i, 0);
                    fromA = mapping.mapPos(fromA, 1);
                    toA = mapping.mapPos(toA, -1);
                }
                new ChangedRange(fromA, toA, fromB, toB).addToSet(set);
            }
            return set;
        }
        /// Convert a set of changes to a set of change descriptions.
        get desc() {
            if (this.changes.length == 0 || this.changes[0] instanceof ChangeDesc)
                return this;
            return new ChangeSet(this.changes.map(ch => ch.desc), this.mirror);
        }
        /// Create a JSON-serializable representation of this change set.
        toJSON() {
            let changes = this.changes.map(change => change.toJSON());
            return this.mirror.length == 0 ? changes : { mirror: this.mirror, changes };
        }
        /// Read a change set from its JSON representation.
        static fromJSON(ChangeType, json) {
            let mirror, changes;
            if (Array.isArray(json)) {
                mirror = empty;
                changes = json;
            }
            else if (!json || !Array.isArray(json.mirror) || !Array.isArray(json.changes)) {
                throw new RangeError("Invalid JSON representation for ChangeSet");
            }
            else {
                ({ mirror, changes } = json);
            }
            return new ChangeSet(changes.map((ch) => ChangeType.fromJSON(ch)), mirror);
        }
    }
    /// The empty change set.
    ChangeSet.empty = new ChangeSet(empty);
    class PartialMapping {
        constructor(changes, from, to) {
            this.changes = changes;
            this.from = from;
            this.to = to;
        }
        mapPos(pos, bias = -1, mode = MapMode.Simple) {
            return this.changes.mapInner(pos, bias, mode, this.from, this.to);
        }
    }
    /// A changed range represents a replacement as two absolute ranges,
    /// one pointing into the old document (the replaced content) and one
    /// pointing into the new document (the content that replaces it).
    class ChangedRange {
        // FIXME store unchanged ranges instead?
        constructor(
        /// The start of the replaced range in the old document.
        fromA, 
        /// The end of the replaced range in the old document.
        toA, 
        /// The start of the replacing range in the new document.
        fromB, 
        /// The end of the replacing range in the new document.
        toB) {
            this.fromA = fromA;
            this.toA = toA;
            this.fromB = fromB;
            this.toB = toB;
        }
        /// @internal
        join(other) {
            return new ChangedRange(Math.min(this.fromA, other.fromA), Math.max(this.toA, other.toA), Math.min(this.fromB, other.fromB), Math.max(this.toB, other.toB));
        }
        /// @internal
        // FIXME used by view. Document?
        addToSet(set) {
            let i = set.length, me = this;
            for (; i > 0; i--) {
                let range = set[i - 1];
                if (range.fromA > me.toA)
                    continue;
                if (range.toA < me.fromA)
                    break;
                me = me.join(range);
                set.splice(i - 1, 1);
            }
            set.splice(i, 0, me);
            return set;
        }
        /// The difference in document length created by this change
        /// (positive when the document grew).
        get lenDiff() { return (this.toB - this.fromB) - (this.toA - this.fromA); }
        /// @internal
        static mapPos(pos, bias, changes) {
            let off = 0;
            for (let range of changes) {
                if (pos < range.fromA)
                    break;
                if (pos <= range.toA) {
                    let side = range.toA == range.fromA ? bias : pos == range.fromA ? -1 : pos == range.toA ? 1 : bias;
                    return side < 0 ? range.fromB : range.toB;
                }
                off = range.toB - range.toA;
            }
            return pos + off;
        }
    }

    /// Changes to the editor state are grouped into transactions.
    /// Usually, a user action creates a single transaction, which may
    /// contain zero or more document changes. Create a transaction by
    /// calling [`EditorState.t`](#state.EditorState.t).
    ///
    /// Transactions are mutable, and usually built up piece by piece with
    /// updating methods and method chaining (most methods return the
    /// transaction itself). Once they are
    /// [applied](#state.Transaction.apply), they can't be updated
    /// anymore.
    class Transaction {
        /// @internal
        constructor(
        /// The state from which the transaction starts.
        startState, time = Date.now()) {
            this.startState = startState;
            /// The document changes made by this transaction.
            this.changes = ChangeSet.empty;
            /// The document versions after each of the changes.
            this.docs = [];
            this.flags = 0;
            this.state = null;
            this.selection = startState.selection;
            this._annotations = [Transaction.time(time)];
            this.configuration = startState.configuration;
        }
        /// The document at the end of the transaction.
        get doc() {
            let last = this.docs.length - 1;
            return last < 0 ? this.startState.doc : this.docs[last];
        }
        /// Add annotations to this transaction. Annotations can provide
        /// additional information about the transaction.
        annotate(...annotations) {
            this.ensureOpen();
            for (let ann of annotations)
                this._annotations.push(ann);
            return this;
        }
        /// Get the value of the given annotation type, if any.
        annotation(type) {
            for (let i = this._annotations.length - 1; i >= 0; i--)
                if (this._annotations[i].type == type)
                    return this._annotations[i].value;
            return undefined;
        }
        /// Get all values associated with the given annotation in this
        /// transaction.
        annotations(type) {
            let found = none$1;
            for (let ann of this._annotations) {
                if (ann.type == type) {
                    if (found == none$1)
                        found = [];
                    found.push(ann.value);
                }
            }
            return found;
        }
        /// Add a change to this transaction. If `mirror` is given, it
        /// should be the index (in `this.changes.changes`) at which the
        /// mirror image of this change sits.
        change(change, mirror) {
            this.ensureOpen();
            if (change.from == change.to && change.length == 0)
                return this;
            if (change.from < 0 || change.to < change.from || change.to > this.doc.length)
                throw new RangeError(`Invalid change ${change.from} to ${change.to}`);
            this.changes = this.changes.append(change, mirror);
            this.docs.push(change.apply(this.doc));
            this.selection = this.selection.map(change);
            return this;
        }
        /// Indicates whether the transaction changed the document.
        get docChanged() {
            return this.changes.length > 0;
        }
        /// Add a change replacing the given document range with the given
        /// content.
        replace(from, to, text) {
            return this.change(new Change(from, to, typeof text == "string" ? this.startState.splitLines(text) : text));
        }
        /// Replace all selection ranges with the given content.
        replaceSelection(text) {
            let content = typeof text == "string" ? this.startState.splitLines(text) : text;
            return this.forEachRange(range => {
                let change = new Change(range.from, range.to, content);
                this.change(change);
                return new SelectionRange(range.from + change.length);
            });
        }
        /// Run the given function for each selection range. The method will
        /// map the ranges to reflect deletions/insertions that happen
        /// before them. At the end, set the new selection to the ranges
        /// returned by the function (again, automatically mapped to for
        /// changes that happened after them).
        forEachRange(f) {
            let sel = this.selection, start = this.changes.length, newRanges = [];
            for (let range of sel.ranges) {
                let before = this.changes.length;
                let result = f(range.map(this.changes.partialMapping(start)), this);
                if (this.changes.length > before) {
                    let mapping = this.changes.partialMapping(before);
                    for (let i = 0; i < newRanges.length; i++)
                        newRanges[i] = newRanges[i].map(mapping);
                }
                newRanges.push(result);
            }
            return this.setSelection(EditorSelection.create(newRanges, sel.primaryIndex));
        }
        /// Update the selection.
        setSelection(selection) {
            this.ensureOpen();
            this.selection = this.startState.behavior(allowMultipleSelections) ? selection : selection.asSingle();
            this.flags |= 1 /* SelectionSet */;
            return this;
        }
        /// Tells you whether this transaction explicitly sets a new
        /// selection (as opposed to just mapping the selection through
        /// changes).
        get selectionSet() {
            return (this.flags & 1 /* SelectionSet */) > 0;
        }
        /// Set a flag on this transaction that indicates that the editor
        /// should scroll the selection into view after applying it.
        scrollIntoView() {
            this.ensureOpen();
            this.flags |= 2 /* ScrollIntoView */;
            return this;
        }
        /// Query whether the selection should be scrolled into view after
        /// applying this transaction.
        get scrolledIntoView() {
            return (this.flags & 2 /* ScrollIntoView */) > 0;
        }
        /// Replace one or more [named
        /// extensions](#extension.ExtensionGroup.defineName) with new
        /// instances, creating a new configuration for the new state.
        replaceExtensions(replace) {
            this.ensureOpen();
            this.configuration = this.configuration.replaceExtensions(replace);
            this.flags |= 4 /* Reconfigure */;
            return this;
        }
        /// Move to an entirely new state configuration.
        reconfigure(extensions) {
            this.ensureOpen();
            this.configuration = extendState.resolve(extensions);
            this.flags |= 4 /* Reconfigure */;
            return this;
        }
        /// Indicates whether the transaction reconfigures the state.
        get reconfigured() {
            return (this.flags & 4 /* Reconfigure */) > 0;
        }
        ensureOpen() {
            if (this.state)
                throw new Error("Transactions may not be modified after being applied");
        }
        /// Apply this transaction, computing a new editor state. May be
        /// called multiple times (the result is cached). The transaction
        /// cannot be further modified after this has been called.
        apply() {
            return this.state || (this.state = this.startState.applyTransaction(this));
        }
        /// Create a set of changes that undo the changes made by this
        /// transaction.
        invertedChanges() {
            if (!this.changes.length)
                return ChangeSet.empty;
            let changes = [], set = this.changes;
            for (let i = set.length - 1; i >= 0; i--)
                changes.push(set.changes[i].invert(i == 0 ? this.startState.doc : this.docs[i - 1]));
            return new ChangeSet(changes, set.mirror.length ? set.mirror.map(i => set.length - i - 1) : set.mirror);
        }
    }
    /// Annotation used to store transaction timestamps.
    Transaction.time = Annotation.define();
    /// Annotation used to indicate that this transaction shouldn't
    /// clear the goal column, which is used during vertical cursor
    /// motion (so that moving over short lines doesn't reset the
    /// horizontal position to the end of the shortest line). Should
    /// generally only be set by commands that perform vertical motion.
    Transaction.preserveGoalColumn = Annotation.define();
    /// Annotation used to associate a transaction with a user interface
    /// event. The view will set this to...
    ///
    ///  - `"paste"` when pasting content
    ///  - `"cut"` when cutting
    ///  - `"drop"` when content is inserted via drag-and-drop
    ///  - `"keyboard"` when moving the selection via the keyboard
    ///  - `"pointer"` when moving the selection through the pointing device
    Transaction.userEvent = Annotation.define();
    /// Annotation indicating whether a transaction should be added to
    /// the undo history or not.
    Transaction.addToHistory = Annotation.define();
    const none$1 = [];

    const DEFAULT_INDENT_UNIT = 2, DEFAULT_TABSIZE = 4, DEFAULT_SPLIT = /\r\n?|\n/;
    /// The editor state class is a persistent (immutable) data structure.
    /// To update a state, you [create](#state.EditorState.t) and
    /// [apply](#state.Transaction.apply) a
    /// [transaction](#state.Transaction), which produces a _new_ state
    /// instance, without modifying the original object.
    ///
    /// As such, _never_ mutate properties of a state directly. That'll
    /// just break things.
    class EditorState {
        /// @internal
        constructor(
        /// @internal
        configuration, 
        /// @internal
        values, 
        /// The current document.
        doc, 
        /// The current selection.
        selection) {
            this.configuration = configuration;
            this.values = values;
            this.doc = doc;
            this.selection = selection;
            for (let range of selection.ranges)
                if (range.to > doc.length)
                    throw new RangeError("Selection points outside of document");
        }
        field(field, require = true) {
            let value = this.values[field.id];
            if (value === undefined && !Object.prototype.hasOwnProperty.call(this.values, field.id)) {
                // FIXME document or avoid this
                if (this.behavior(stateField).indexOf(field) > -1)
                    throw new RangeError("Field hasn't been initialized yet");
                if (require)
                    throw new RangeError("Field is not present in this state");
                return undefined;
            }
            return value;
        }
        /// @internal
        applyTransaction(tr) {
            let values = Object.create(null), configuration = tr.configuration;
            let newState = new EditorState(configuration, values, tr.doc, tr.selection);
            for (let field of configuration.getBehavior(stateField)) {
                let exists = configuration == this.configuration || Object.prototype.hasOwnProperty.call(this.values, field.id);
                values[field.id] = exists ? field.apply(tr, this.values[field.id], newState) : field.init(newState);
            }
            return newState;
        }
        /// Start a new transaction from this state. When not given, the
        /// timestamp defaults to
        /// [`Date.now()`](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Date/now).
        t(timestamp) {
            return new Transaction(this, timestamp);
        }
        /// Join an array of lines using the state's [line
        /// separator](#state.EditorState^lineSeparator).
        joinLines(text) { return text.join(this.behavior(EditorState.lineSeparator) || "\n"); }
        /// Split a string into lines using the state's [line
        /// separator](#state.EditorState^lineSeparator).
        splitLines(text) { return text.split(this.behavior(EditorState.lineSeparator) || DEFAULT_SPLIT); }
        /// Get the value of a state [behavior](#extension.Behavior).
        behavior(behavior) {
            return this.configuration.getBehavior(behavior, this);
        }
        /// Convert this state to a JSON-serializable object.
        toJSON() {
            // FIXME plugin state serialization
            return {
                doc: this.joinLines(this.doc.sliceLines(0, this.doc.length)),
                selection: this.selection.toJSON()
            };
        }
        /// Deserialize a state from its JSON representation.
        static fromJSON(json, config = {}) {
            if (!json || typeof json.doc != "string")
                throw new RangeError("Invalid JSON representation for EditorState");
            return EditorState.create({
                doc: json.doc,
                selection: EditorSelection.fromJSON(json.selection),
                extensions: config.extensions
            });
        }
        /// Create a new state. You'll usually only need this when
        /// initializing an editor—updated states are created by applying
        /// transactions.
        static create(config = {}) {
            let configuration = extendState.resolve(config.extensions || []);
            let values = Object.create(null);
            let doc = config.doc instanceof Text ? config.doc
                : Text.of((config.doc || "").split(configuration.getBehavior(EditorState.lineSeparator) || DEFAULT_SPLIT));
            let selection = config.selection || EditorSelection.single(0);
            if (!configuration.getBehavior(EditorState.allowMultipleSelections))
                selection = selection.asSingle();
            let state = new EditorState(configuration, values, doc, selection);
            for (let field of state.behavior(stateField)) {
                let exists = values[field.id];
                if (exists)
                    throw new Error(`Duplicate use of state field${(exists.constructor || Object) != Object && exists.constructor.name ? ` (${exists.constructor.name})` : ''}`);
                values[field.id] = field.init(state);
            }
            return state;
        }
        /// The size (in columns) of a tab in the document, determined by
        /// the [`tabSize`](#state.EditorState^tabSize) behavior.
        get tabSize() { return this.behavior(EditorState.tabSize); }
        /// The size of an indent unit in the document. Determined by the
        /// [`indentUnit`](#state.EditorState^indentUnit) behavior.
        get indentUnit() { return this.behavior(EditorState.indentUnit); }
    }
    /// The [extension group](#extension.ExtensionGroup) for editor
    /// states, mostly used to define state extensions and
    /// [set](#extension.ExtensionGroup.fallback) their precedence.
    EditorState.extend = extendState;
    /// A behavior that, when enabled, causes the editor to allow
    /// multiple ranges to be selected. You should probably not use this
    /// directly, but let a plugin like
    /// [multiple-selections](#multiple-selections) handle it (which
    /// also makes sure the selections are visible in the view).
    EditorState.allowMultipleSelections = allowMultipleSelections;
    /// Behavior that defines a way to query for automatic indentation
    /// depth at the start of a given line.
    EditorState.indentation = extendState.behavior();
    /// Configures the tab size to use in this state. The first
    /// (highest-precedence) value of the behavior is used.
    EditorState.tabSize = extendState.behavior({
        combine: values => values.length ? values[0] : DEFAULT_TABSIZE
    });
    /// The line separator to use. By default, any of `"\n"`, `"\r\n"`
    /// and `"\r"` is treated as a separator when splitting lines, and
    /// lines are joined with `"\n"`.
    ///
    /// When you configure a value here, only that precise separator
    /// will be used, allowing you to round-trip documents through the
    /// editor without normalizing line separators.
    EditorState.lineSeparator = extendState.behavior({
        combine: values => values.length ? values[0] : undefined,
        static: true
    });
    /// Behavior for overriding the unit (in columns) by which
    /// indentation happens. When not set, this defaults to 2.
    EditorState.indentUnit = extendState.behavior({
        combine: values => values.length ? values[0] : DEFAULT_INDENT_UNIT
    });
    /// Behavior that registers a parsing service for the state.
    EditorState.syntax = extendState.behavior();
    /// A behavior that registers a code folding service. When called
    /// with the extent of a line, it'll return a range object when a
    /// foldable that starts on that line (but continues beyond it) can
    /// be found.
    EditorState.foldable = extendState.behavior();

    function sym(name, random) {
      return typeof Symbol == "undefined"
        ? "__" + name + (random ? Math.floor(Math.random() * 1e8) : "")
        : random ? Symbol(name) : Symbol.for(name)
    }

    const COUNT = sym("\u037c"), SET = sym("styleSet", 1), RULES = sym("rules", 1);
    const top = typeof global == "undefined" ? window : global;

    // :: (Object<Style>, number) → StyleModule
    // Instances of this class bind the property names
    // from `spec` to CSS class names that assign the styles in the
    // corresponding property values.
    //
    // A style module can only be used in a given DOM root after it has
    // been _mounted_ there with `StyleModule.mount`.
    //
    // Style modules should be created once and stored somewhere, as
    // opposed to re-creating them every time you need them. The amount of
    // CSS rules generated for a given DOM root is bounded by the amount
    // of style modules that were used. So to avoid leaking rules, don't
    // create these dynamically, but treat them as one-time allocations.
    function StyleModule(spec) {
      this[RULES] = [];
      top[COUNT] = top[COUNT] || 1;
      for (let name in spec) {
        let style = spec[name], specificity = style.specificity || 0;
        let id = "\u037c" + (top[COUNT]++).toString(36);
        let selector = "." + id, className = id;
        for (let i = 0; i < specificity; i++) {
          let name = "\u037c_" + (i ? i.toString(36) : "");
          selector += "." + name;
          className += " " + name;
        }
        this[name] = className;
        renderStyle(selector, spec[name], this[RULES]);
      }
    }

    StyleModule.prototype = Object.create(null);

    // :: (union<Document, ShadowRoot>, union<[StyleModule], StyleModule>)
    //
    // Mount the given set of modules in the given DOM root, which ensures
    // that the CSS rules defined by the module are available in that
    // context.
    //
    // Rules are only added to the document once per root.
    //
    // Rule order will follow the order of the modules, so that rules from
    // modules later in the array take precedence of those from earlier
    // modules. If you call this function multiple times for the same root
    // in a way that changes the order of already mounted modules, the old
    // order will be changed.
    StyleModule.mount = function(root, modules) {
      (root[SET] || new StyleSet(root)).mount(Array.isArray(modules) ? modules : [modules]);
    };

    class StyleSet {
      constructor(root) {
        this.root = root;
        root[SET] = this;
        this.styleTag = (root.ownerDocument || root).createElement("style");
        let target = root.head || root;
        target.insertBefore(this.styleTag, target.firstChild);
        this.modules = [];
      }

      mount(modules) {
        let sheet = this.styleTag.sheet, reset = !sheet;
        let pos = 0 /* Current rule offset */, j = 0; /* Index into this.modules */
        for (let i = 0; i < modules.length; i++) {
          let mod = modules[i], index = this.modules.indexOf(mod);
          if (index < j && index > -1) { // Ordering conflict
            this.modules.splice(index, 1);
            j--;
            index = -1;
          }
          if (index == -1) {
            this.modules.splice(j++, 0, mod);
            if (!reset) for (let k = 0; k < mod[RULES].length; k++)
              sheet.insertRule(mod[RULES][k], pos++);
          } else {
            while (j < index) pos += this.modules[j++][RULES].length;
            pos += mod[RULES].length;
            j++;
          }
        }

        if (reset) {
          let text = "";
          for (let i = 0; i < this.modules.length; i++)
            text += this.modules[i][RULES].join("\n") + "\n";
          this.styleTag.textContent = text;
        }
      }
    }

    function renderStyle(selector, spec, output) {
      if (typeof spec != "object") throw new RangeError("Expected style object, got " + JSON.stringify(spec))
      let props = [];
      for (let prop in spec) {
        if (/^@/.test(prop)) {
          let local = [];
          renderStyle(selector, spec[prop], local);
          output.push(prop + " {" + local.join(" ") + "}");
        } else if (/&/.test(prop)) {
          renderStyle(prop.replace(/&/g, selector), spec[prop], output);
        } else if (prop != "specificity") {
          if (typeof spec[prop] == "object") throw new RangeError("The value of a property (" + prop + ") should be a primitive value.")
          props.push(prop.replace(/_.*/, "").replace(/[A-Z]/g, l => "-" + l.toLowerCase()) + ": " + spec[prop]);
        }
      }
      if (props.length) output.push(selector + " {" + props.join("; ") + "}");
    }

    // Style::Object<union<Style,string>>
    //
    // A style is an object that, in the simple case, maps CSS property
    // names to strings holding their values, as in `{color: "red",
    // fontWeight: "bold"}`. The property names can be given in
    // camel-case—the library will insert a dash before capital letters
    // when converting them to CSS.
    //
    // If you include an underscore in a property name, it and everything
    // after it will be removed from the output, which can be useful when
    // providing a property multiple times, for browser compatibility
    // reasons.
    //
    // A property in a style object can also be a sub-selector, which
    // extends the current context to add a pseudo-selector or a child
    // selector. Such a property should contain a `&` character, which
    // will be replaced by the current selector. For example `{"&:before":
    // {content: '"hi"'}}`. Sub-selectors and regular properties can
    // freely be mixed in a given object. Any property containing a `&` is
    // assumed to be a sub-selector.
    //
    // Finally, a property can specify an @-block to be wrapped around the
    // styles defined inside the object that's the property's value. For
    // example to create a media query you can do `{"@media screen and
    // (min-width: 400px)": {...}}`.

    var styleMod = /*#__PURE__*/Object.freeze({
        StyleModule: StyleModule
    });

    /// Each range is associated with a value, which must inherit from
    /// this class.
    class RangeValue {
        /// Compare this value with another value. The default
        /// implementation compares by identity.
        eq(other) { return this == other; }
    }
    RangeValue.prototype.startSide = RangeValue.prototype.endSide = 0;
    RangeValue.prototype.point = false;
    /// A range associates a value with a range of positions.
    class Range {
        constructor(from, to, value) {
            this.from = from;
            this.to = to;
            this.value = value;
        }
        /// @internal
        map(changes, oldOffset, newOffset) {
            let mapped = this.value.map(changes, this.from + oldOffset, this.to + oldOffset);
            if (mapped) {
                mapped.from -= newOffset;
                mapped.to -= newOffset;
            }
            return mapped;
        }
        /// @internal
        move(offset) {
            return offset ? new Range(this.from + offset, this.to + offset, this.value) : this;
        }
        /// @internal Here so that we can put active ranges on a heap and
        /// take them off at their end
        get heapPos() { return this.to; }
        /// @internal
        get heapSide() { return this.value.endSide; }
    }
    const none$2 = [];
    function maybeNone(array) { return array.length ? array : none$2; }
    const BASE_NODE_SIZE_SHIFT = 5, BASE_NODE_SIZE = 1 << BASE_NODE_SIZE_SHIFT;
    /// A range set stores a collection of [ranges](#rangeset.Range) in a
    /// way that makes them efficient to [map](#rangeset.RangeSet.map) and
    /// [update](#rangeset.RangeSet.update). This is an immutable data
    /// structure.
    class RangeSet {
        /// @internal
        constructor(
        /// @internal The text length covered by this set
        length, 
        /// The number of ranges in this set
        size, 
        /// @internal The locally stored ranges—which are all of them for
        /// leaf nodes, and the ones that don't fit in child sets for
        /// non-leaves. Sorted by start position, then side.
        local, 
        /// @internal The child sets, in position order. Their total
        /// length may be smaller than .length if the end is empty (never
        /// greater)
        children) {
            this.length = length;
            this.size = size;
            this.local = local;
            this.children = children;
        }
        /// Update this set, returning the modified set. The range that gets
        /// filtered can be limited with the `filterFrom` and `filterTo`
        /// arguments (specifying a smaller range makes the operation
        /// cheaper).
        update(added = none$2, filter = null, filterFrom = 0, filterTo = this.length) {
            let maxLen = added.reduce((l, d) => Math.max(l, d.to), this.length);
            // Make sure `added` is sorted
            if (added.length)
                for (let i = 1, prev = added[0]; i < added.length; i++) {
                    let next = added[i];
                    if (byPos(prev, next) > 0) {
                        added = added.slice().sort(byPos);
                        break;
                    }
                    prev = next;
                }
            return this.updateInner(added, filter, filterFrom, filterTo, 0, maxLen);
        }
        /// @internal
        updateInner(added, filter, filterFrom, filterTo, offset, length) {
            // The new local ranges. Null means no changes were made yet
            let local = filterRanges(this.local, filter, filterFrom, filterTo, offset);
            // The new array of child sets, if changed
            let children = null;
            let size = 0;
            let decI = 0, pos = offset;
            // Iterate over the child sets, applying filters and pushing added
            // ranges into them
            for (let i = 0; i < this.children.length; i++) {
                let child = this.children[i];
                let endPos = pos + child.length, localRanges = null;
                while (decI < added.length) {
                    let next = added[decI];
                    if (next.from >= endPos)
                        break;
                    decI++;
                    if (next.to > endPos) {
                        if (!local)
                            local = this.local.slice();
                        insertSorted(local, next.move(-offset));
                    }
                    else {
                        (localRanges || (localRanges = [])).push(next);
                    }
                }
                let newChild = child;
                if (localRanges || filter && filterFrom <= endPos && filterTo >= pos)
                    newChild = newChild.updateInner(localRanges || none$2, filter, filterFrom, filterTo, pos, newChild.length);
                if (newChild != child)
                    (children || (children = this.children.slice(0, i))).push(newChild);
                else if (children)
                    children.push(newChild);
                size += newChild.size;
                pos = endPos;
            }
            // If nothing was actually updated, return the existing object
            if (!local && !children && decI == added.length)
                return this;
            // Compute final size
            size += (local || this.local).length + added.length - decI;
            // This is a small node—turn it into a flat leaf
            if (size <= BASE_NODE_SIZE)
                return collapseSet(children || this.children, local || this.local.slice(), added, decI, offset, length);
            let childSize = Math.max(BASE_NODE_SIZE, size >> BASE_NODE_SIZE_SHIFT);
            if (decI < added.length) {
                if (!children)
                    children = this.children.slice();
                if (!local)
                    local = this.local.slice();
                appendRanges(local, children, added, decI, offset, length, pos, childSize);
            }
            if (children) {
                if (!local)
                    local = this.local.slice();
                rebalanceChildren(local, children, childSize);
            }
            return new RangeSet(length, size, maybeNone(local || this.local), maybeNone(children || this.children));
        }
        /// Add empty size to the end of the set @internal
        grow(length) {
            return new RangeSet(this.length + length, this.size, this.local, this.children);
        }
        /// Collect all ranges in this set into the target array, offsetting
        /// them by `offset` @internal
        collect(target, offset) {
            for (let range of this.local)
                target.push(range.move(offset));
            for (let child of this.children) {
                child.collect(target, offset);
                offset += child.length;
            }
        }
        /// Map this range set through a set of changes, return the new set.
        map(changes) {
            if (changes.length == 0 || this == RangeSet.empty)
                return this;
            return this.mapInner(changes, 0, 0, changes.mapPos(this.length, 1)).set;
        }
        // Child boundaries are always mapped forward. This may cause ranges
        // at the start of a set to end up sticking out before its new
        // start, if they map backward. Such ranges are returned in
        // `escaped`.
        mapInner(changes, oldStart, newStart, newEnd) {
            let newLocal = null;
            let escaped = null;
            let newLength = newEnd - newStart, newSize = 0;
            for (let i = 0; i < this.local.length; i++) {
                let range = this.local[i], mapped = range.map(changes, oldStart, newStart);
                let escape = mapped != null && (mapped.from < 0 || mapped.to > newLength);
                if (newLocal == null && (range != mapped || escape))
                    newLocal = this.local.slice(0, i);
                if (escape)
                    (escaped || (escaped = [])).push(mapped);
                else if (newLocal && mapped)
                    newLocal.push(mapped);
            }
            let newChildren = null;
            for (let i = 0, oldPos = oldStart, newPos = newStart; i < this.children.length; i++) {
                let child = this.children[i], newChild = child;
                let oldChildEnd = oldPos + child.length;
                let newChildEnd = changes.mapPos(oldPos + child.length, 1);
                let touch = touchesChanges(oldPos, oldChildEnd, changes.changes);
                if (touch == 0 /* Yes */) {
                    let inner = child.mapInner(changes, oldPos, newPos, newChildEnd);
                    newChild = inner.set;
                    if (inner.escaped)
                        for (let range of inner.escaped) {
                            range = range.move(newPos - newStart);
                            if (range.from < 0 || range.to > newLength)
                                insertSorted(escaped || (escaped = []), range);
                            else
                                insertSorted(newLocal || (newLocal = this.local.slice()), range);
                        }
                }
                else if (touch == 2 /* Covered */) {
                    newChild = RangeSet.empty.grow(newChildEnd - newPos);
                }
                if (newChild != child) {
                    if (newChildren == null)
                        newChildren = this.children.slice(0, i);
                    // If the node's content was completely deleted by mapping,
                    // drop the node—which is complicated by the need to
                    // distribute its length to another child when it's not the
                    // last child
                    if (newChild.size == 0 && (newChild.length == 0 || newChildren.length || i == this.children.length)) {
                        if (newChild.length > 0 && i > 0) {
                            let last = newChildren.length - 1, lastChild = newChildren[last];
                            newChildren[last] = new RangeSet(lastChild.length + newChild.length, lastChild.size, lastChild.local, lastChild.children);
                        }
                    }
                    else {
                        newChildren.push(newChild);
                    }
                }
                else if (newChildren) {
                    newChildren.push(newChild);
                }
                newSize += newChild.size;
                oldPos = oldChildEnd;
                newPos = newChildEnd;
            }
            let set = newLength == this.length && newChildren == null && newLocal == null
                ? this
                : new RangeSet(newLength, newSize + (newLocal || this.local).length, newLocal || this.local, newChildren || this.children);
            return { set, escaped };
        }
        /// Iterate over the ranges that touch the region `from` to `to`,
        /// calling `f` for each. There is no guarantee that the ranges will
        /// be reported in any order.
        between(from, to, f) {
            this.betweenInner(from, to, f, 0);
        }
        /// @internal
        betweenInner(from, to, f, offset) {
            for (let loc of this.local) {
                if (loc.from + offset <= to && loc.to + offset >= from)
                    f(loc.from + offset, loc.to + offset, loc.value);
            }
            for (let child of this.children) {
                let end = offset + child.length;
                if (offset <= to && end >= from)
                    child.betweenInner(from, to, f, offset);
                offset = end;
            }
        }
        /// Iterate over the ranges in the set that touch the area between
        /// from and to, ordered by their start position and side.
        iter(from = 0, to = this.length) {
            const heap = [];
            addIterToHeap(heap, [new IteratedSet(0, this)], from);
            if (this.local.length)
                addToHeap(heap, new LocalSet(0, this.local));
            return {
                next() {
                    for (;;) {
                        if (heap.length == 0)
                            return;
                        const next = takeFromHeap(heap);
                        const range = next.ranges[next.index++].move(next.offset);
                        if (range.from > to)
                            return;
                        // Put the rest of the set back onto the heap
                        if (next.index < next.ranges.length)
                            addToHeap(heap, next);
                        else if (next.next)
                            addIterToHeap(heap, next.next, 0);
                        if (range.to >= from)
                            return range;
                    }
                }
            };
        }
        /// Iterate over two range sets at the same time, calling methods on
        /// `comparator` to notify it of possible differences. `textDiff`
        /// indicates how the underlying data changed between these ranges,
        /// and is needed to synchronize the iteration.
        compare(other, textDiff, comparator, oldLen) {
            let oldPos = 0, newPos = 0;
            for (let range of textDiff) {
                if (range.fromB > newPos && (this != other || oldPos != newPos))
                    new RangeSetComparison(this, oldPos, other, newPos, range.fromB, comparator).run();
                oldPos = range.toA;
                newPos = range.toB;
            }
            if (oldPos < this.length || newPos < other.length || textDiff.length == 0)
                new RangeSetComparison(this, oldPos, other, newPos, newPos + (oldLen - oldPos), comparator).run();
        }
        /// Iterate over a group of range sets at the same time, notifying
        /// the iterator about the ranges covering every given piece of
        /// content.
        static iterateSpans(sets, from, to, iterator) {
            let heap = [];
            let pos = from, posSide = -FAR;
            for (let set of sets)
                if (set.size > 0) {
                    addIterToHeap(heap, [new IteratedSet(0, set)], pos);
                    if (set.local.length)
                        addToHeap(heap, new LocalSet(0, set.local));
                }
            let active = [];
            while (heap.length > 0) {
                let next = takeFromHeap(heap);
                if (next instanceof LocalSet) {
                    let range = next.ranges[next.index], rFrom = range.from + next.offset, rTo = range.to + next.offset;
                    if (rFrom > to)
                        break;
                    // Put the rest of the set back onto the heap
                    if (++next.index < next.ranges.length)
                        addToHeap(heap, next);
                    else if (next.next)
                        addIterToHeap(heap, next.next, pos);
                    if ((rTo - pos || range.value.endSide - posSide) >= 0 && !iterator.ignore(rFrom, rTo, range.value)) {
                        if (rFrom > pos) {
                            iterator.span(pos, rFrom, active);
                            pos = rFrom;
                            posSide = range.value.startSide;
                        }
                        if (range.value.point) {
                            iterator.point(pos, Math.min(rTo, to), range.value, rFrom < pos, rTo > to);
                            pos = rTo;
                            if (rTo > to)
                                break;
                            posSide = range.value.endSide;
                        }
                        else if (rTo > pos) {
                            active.push(range.value);
                            addToHeap(heap, new Range(rFrom, rTo, range.value));
                        }
                    }
                }
                else { // A range that ends here
                    let range = next;
                    if (range.to > to)
                        break;
                    if (range.to > pos) {
                        iterator.span(pos, range.to, active);
                        pos = range.to;
                        posSide = range.value.endSide;
                    }
                    active.splice(active.indexOf(range.value), 1);
                }
            }
            if (pos < to)
                iterator.span(pos, to, active);
        }
        /// Create a range set for the given range or array of ranges.
        static of(ranges) {
            return RangeSet.empty.update(ranges instanceof Range ? [ranges] : ranges);
        }
    }
    /// The empty set of ranges.
    RangeSet.empty = new RangeSet(0, 0, none$2, none$2);
    // Stack element for iterating over a range set
    class IteratedSet {
        constructor(offset, set) {
            this.offset = offset;
            this.set = set;
            // Index == -1 means the set's locals have not been yielded yet.
            // Otherwise this is an index in the set's child array.
            this.index = 0;
        }
    }
    // Cursor into a node-local set of ranges
    class LocalSet {
        constructor(offset, ranges, next = null) {
            this.offset = offset;
            this.ranges = ranges;
            this.next = next;
            this.index = 0;
        }
        // Used to make this conform to Heapable
        get heapPos() { return this.ranges[this.index].from + this.offset; }
        get heapSide() { return this.ranges[this.index].value.startSide; }
    }
    // Iterating over a range set is done using a stack that represents a
    // position into the range set's tree. There's an IteratedSet for each
    // active level, and iteration happens by calling this function to
    // move the next node onto the stack (which may involve popping off
    // nodes before it).
    //
    // Such a stack represenst the _structural_ part of the tree,
    // iterating over tree nodes. The individual ranges of each top node
    // must be accessed separately, after it has been moved onto the stack
    // (the new node is always at the top, or, if the end of the set has
    // been reached, the stack is empty).
    //
    // Nodes that fall entirely before `skipTo` are never added to the
    // stack, allowing efficient skipping of parts of the tree.
    function iterRangeSet(stack, skipTo = 0) {
        for (;;) {
            if (stack.length == 0)
                break;
            let top = stack[stack.length - 1];
            if (top.index == top.set.children.length) {
                stack.pop();
            }
            else {
                let next = top.set.children[top.index], start = top.offset;
                top.index++;
                top.offset += next.length;
                if (top.offset >= skipTo) {
                    stack.push(new IteratedSet(start, next));
                    break;
                }
            }
        }
    }
    // Iterating over the actual ranges in a set (or multiple sets) is
    // done using a binary heap to efficiently get the ordering right. The
    // heap may contain both LocalSet instances (iterating over the ranges
    // in a set tree node) and actual Range objects. At any point, the one
    // with the lowest position (and side) is taken off next.
    function compareHeapable(a, b) {
        return a.heapPos - b.heapPos || a.heapSide - b.heapSide;
    }
    // Advance the iteration over a range set (in `stack`) and add the
    // next node that has any local ranges to the heap as a `LocalSet`.
    // Links the stack to the `LocalSet` (in `.next`) if this node also
    // has child nodes, which will be used to schedule the next call to
    // `addIterToHeap` when the end of that `LocalSet` is reached.
    function addIterToHeap(heap, stack, skipTo = 0) {
        for (;;) {
            iterRangeSet(stack, skipTo);
            if (stack.length == 0)
                break;
            let next = stack[stack.length - 1], local = next.set.local;
            let leaf = next.set.children.length ? null : stack;
            if (local.length)
                addToHeap(heap, new LocalSet(next.offset, local, leaf));
            if (leaf)
                break;
        }
    }
    // Classic binary heap implementation, using the conformance to
    // `Heapable` of the elements to compare them with `compareHeapable`,
    // keeping the element with the lowest position at its top.
    function addToHeap(heap, elt) {
        let index = heap.push(elt) - 1;
        while (index > 0) {
            let parentIndex = index >> 1, parent = heap[parentIndex];
            if (compareHeapable(elt, parent) >= 0)
                break;
            heap[index] = parent;
            heap[parentIndex] = elt;
            index = parentIndex;
        }
    }
    function takeFromHeap(heap) {
        let elt = heap[0], replacement = heap.pop();
        if (heap.length == 0)
            return elt;
        heap[0] = replacement;
        for (let index = 0;;) {
            let childIndex = (index << 1) + 1;
            if (childIndex >= heap.length)
                break;
            let child = heap[childIndex];
            if (childIndex + 1 < heap.length && compareHeapable(child, heap[childIndex + 1]) >= 0) {
                child = heap[childIndex + 1];
                childIndex++;
            }
            if (compareHeapable(replacement, child) < 0)
                break;
            heap[childIndex] = replacement;
            heap[index] = child;
            index = childIndex;
        }
        return elt;
    }
    function byPos(a, b) {
        return a.from - b.from || a.value.startSide - b.value.startSide;
    }
    function insertSorted(target, range) {
        let i = target.length;
        while (i > 0 && byPos(target[i - 1], range) >= 0)
            i--;
        target.splice(i, 0, range);
    }
    function filterRanges(ranges, filter, filterFrom, filterTo, offset) {
        if (!filter)
            return null;
        let copy = null;
        for (let i = 0; i < ranges.length; i++) {
            let range = ranges[i], from = range.from + offset, to = range.to + offset;
            if (filterFrom > to || filterTo < from || filter(from, to, range.value)) {
                if (copy != null)
                    copy.push(range);
            }
            else {
                if (copy == null)
                    copy = ranges.slice(0, i);
            }
        }
        return copy;
    }
    function collapseSet(children, local, add, start, offset, length) {
        let mustSort = local.length > 0 && add.length > 0, off = 0;
        for (let child of children) {
            child.collect(local, -off);
            off += child.length;
        }
        for (let added of add)
            local.push(added.move(-offset));
        if (mustSort)
            local.sort(byPos);
        return new RangeSet(length, local.length, local, none$2);
    }
    function appendRanges(local, children, ranges, start, offset, length, pos, childSize) {
        // Group added ranges after the current children into new
        // children (will usually only happen when initially creating a
        // node or adding stuff to the top-level node)
        for (let i = start; i < ranges.length;) {
            let add = [];
            let end = Math.min(i + childSize, ranges.length);
            let endPos = end == ranges.length ? offset + length : ranges[end].from;
            for (; i < end; i++) {
                let range = ranges[i];
                if (range.to > endPos)
                    insertSorted(local, range.move(-offset));
                else
                    add.push(range);
            }
            // Move locals that fit in this new child from `local` to `add`
            for (let i = 0; i < local.length; i++) {
                let range = local[i];
                if (range.from >= pos && range.to <= endPos) {
                    local.splice(i--, 1);
                    insertSorted(add, range.move(offset));
                }
            }
            if (add.length) {
                if (add.length == ranges.length)
                    children.push(new RangeSet(endPos - pos, add.length, add.map(r => r.move(-pos)), none$2));
                else
                    children.push(RangeSet.empty.updateInner(add, null, 0, 0, pos, endPos - pos));
                pos = endPos;
            }
        }
    }
    // FIXME try to clean this up
    function rebalanceChildren(local, children, childSize) {
        for (let i = 0, off = 0; i < children.length;) {
            let child = children[i], next;
            if (child.size == 0 && (i > 0 || children.length == 1)) {
                // Drop empty node
                children.splice(i--, 1);
                if (i >= 0)
                    children[i] = children[i].grow(child.length);
            }
            else if (child.size > (childSize << 1) && child.local.length < (child.length >> 1)) {
                // Unwrap an overly big node
                for (let range of child.local)
                    insertSorted(local, range.move(off));
                children.splice(i, 1, ...child.children);
            }
            else if (child.children.length == 0 && i < children.length - 1 &&
                (next = children[i + 1]).size + child.size <= BASE_NODE_SIZE &&
                next.children.length == 0) {
                // Join two small leaf nodes
                children.splice(i, 2, new RangeSet(child.length + next.length, child.size + next.size, child.local.concat(next.local.map(d => d.move(child.length))), none$2));
            }
            else {
                // Join a number of nodes into a wrapper node
                let joinTo = i + 1, size = child.size, length = child.length;
                if (child.size < (childSize >> 1)) {
                    for (; joinTo < children.length; joinTo++) {
                        let next = children[joinTo], totalSize = size + next.size;
                        if (totalSize > childSize)
                            break;
                        size = totalSize;
                        length += next.length;
                    }
                }
                if (joinTo > i + 1) {
                    let joined = new RangeSet(length, size, none$2, children.slice(i, joinTo));
                    let joinedLocals = [];
                    for (let j = 0; j < local.length; j++) {
                        let range = local[j];
                        if (range.from >= off && range.to <= off + length) {
                            local.splice(j--, 1);
                            joinedLocals.push(range.move(-off));
                        }
                    }
                    if (joinedLocals.length)
                        joined = joined.update(joinedLocals.sort(byPos));
                    children.splice(i, joinTo - i, joined);
                    i++;
                    off += length;
                }
                else {
                    i++;
                    off += child.length;
                }
            }
        }
    }
    const SIDE_A = 1, SIDE_B = 2, FAR = 1e9;
    class ComparisonSide {
        constructor(stack) {
            this.stack = stack;
            this.heap = [];
            this.active = [];
            this.activeTo = [];
            this.tip = null;
            // A currently active point range, if any
            this.point = null;
            // The end of the current point range
            this.pointTo = -FAR;
        }
        forward(start, next) {
            let newTip = false;
            if (next.set.local.length) {
                let local = new LocalSet(next.offset, next.set.local);
                addToHeap(this.heap, local);
                if (!next.set.children.length) {
                    this.tip = local;
                    newTip = true;
                }
            }
            iterRangeSet(this.stack, start);
            return newTip;
        }
        findActive(to, value) {
            for (let i = 0; i < this.active.length; i++)
                if (this.activeTo[i] == to && (this.active[i] == value || this.active[i].eq(value)))
                    return i;
            return -1;
        }
        clearPoint() {
            this.pointTo = -FAR;
            this.point = null;
        }
        get nextPos() {
            return this.pointTo > -FAR ? this.pointTo : this.heap.length ? this.heap[0].heapPos : FAR;
        }
        get nextSide() {
            return this.pointTo > -FAR ? this.point.endSide : this.heap.length ? this.heap[0].heapSide : FAR;
        }
    }
    // Manage the synchronous iteration over a part of two range sets,
    // skipping identical nodes and ranges and calling callbacks on a
    // comparator object when differences are found.
    class RangeSetComparison {
        constructor(a, startA, b, startB, endB, comparator) {
            this.comparator = comparator;
            this.a = new ComparisonSide([new IteratedSet(startB - startA, a)]);
            this.b = new ComparisonSide([new IteratedSet(0, b)]);
            this.pos = startB;
            this.end = endB;
            this.forwardIter(SIDE_A | SIDE_B);
        }
        // Move the iteration over the tree structure forward until all of
        // the sides included in `side` (bitmask of `SIDE_A` and/or
        // `SIDE_B`) have added new nodes to their heap, or there is nothing
        // further to iterate over. This is basically used to ensure the
        // heaps are stocked with nodes from the stacks that track the
        // iteration.
        forwardIter(side) {
            for (; side > 0;) {
                let nextA = this.a.stack.length ? this.a.stack[this.a.stack.length - 1] : null;
                let nextB = this.b.stack.length ? this.b.stack[this.b.stack.length - 1] : null;
                if (!nextA && (side & SIDE_A)) {
                    // If there's no next node for A, we're done there
                    side &= ~SIDE_A;
                }
                else if (!nextB && (side & SIDE_B)) {
                    // No next node for B
                    side &= ~SIDE_B;
                }
                else if (nextA && nextB && nextA.offset == nextB.offset && nextA.set == nextB.set) {
                    // Both next nodes are the same—skip them
                    iterRangeSet(this.a.stack, this.pos);
                    iterRangeSet(this.b.stack, this.pos);
                }
                else if (nextA && (!nextB || (nextA.offset < nextB.offset ||
                    nextA.offset == nextB.offset && (this.a.stack.length == 1 ||
                        nextA.set.length >= nextB.set.length)))) {
                    // If there no next B, or it comes after the next A, or it
                    // sits at the same position and is smaller, move A forward.
                    if (this.a.forward(this.pos, nextA))
                        side &= ~SIDE_A;
                }
                else {
                    // Otherwise move B forward
                    if (this.b.forward(this.pos, nextB))
                        side &= ~SIDE_B;
                }
            }
        }
        // Driver of the comparison process. On each iteration, call
        // `advance` with the side whose next event (start of end of a
        // range) comes first, until we run out of events.
        run() {
            for (;;) {
                let nextA = this.a.nextPos, nextB = this.b.nextPos;
                if (nextA == FAR && nextB == FAR)
                    break;
                let diff = nextA - nextB || this.a.nextSide - this.a.nextSide;
                if (diff < 0)
                    this.advance(this.a, this.b);
                else
                    this.advance(this.b, this.a);
            }
        }
        advance(side, other) {
            if (side.pointTo > -1) {
                // The next thing that's happening is the end of this.point
                let end = Math.min(this.end, side.pointTo);
                if (!other.point || !side.point.eq(other.point))
                    this.comparator.comparePoint(this.pos, end, side.point, other.point);
                this.pos = end;
                if (end == this.end ||
                    other.pointTo == end && other.point.endSide == side.point.endSide)
                    other.clearPoint();
                side.clearPoint();
                return;
            }
            let next = takeFromHeap(side.heap);
            if (next instanceof LocalSet) {
                // If this is a local set, we're seeing a new range being
                // opened.
                let range = next.ranges[next.index++];
                // The actual positions are offset relative to the node
                let from = range.from + next.offset, to = range.to + next.offset;
                if (from > this.end) {
                    // If we found a range past the end, we're done
                    side.heap.length = 0;
                    return;
                }
                else if (next.index < next.ranges.length) {
                    // If there's more ranges in this node, re-add it to the heap
                    addToHeap(side.heap, next);
                }
                else {
                    // Otherwise, move the iterator forward (making sure this side is advanced)
                    this.forwardIter(side == this.a ? SIDE_A : SIDE_B);
                }
                // Ignore ranges that fall entirely in a point on the other side
                // or were skipped by a point on this side
                // FIXME should maybe also drop ranges when to == this.pos but their side < the point's side?
                if (to < this.pos || to < other.pointTo || to == other.pointTo && range.value.startSide < other.point.endSide)
                    return;
                // Otherwise, if the other side isn't a point, advance
                if (other.pointTo < 0)
                    this.advancePos(from);
                if (range.value.point) {
                    side.point = range.value;
                    side.pointTo = to;
                }
                else {
                    to = Math.min(to, this.end);
                    // Add this to the set of active ranges
                    let found = other.findActive(to, range.value);
                    if (found > -1) {
                        remove(other.active, found);
                        remove(other.activeTo, found);
                    }
                    else {
                        side.active.push(range.value);
                        side.activeTo.push(to);
                        addToHeap(side.heap, new Range(this.pos, to, range.value));
                    }
                }
            }
            else {
                // This is the end of a range, remove it from the active set if it's in there.
                let range = next;
                if (other.pointTo < 0)
                    this.advancePos(range.to);
                let found = side.findActive(range.to, range.value);
                if (found > -1) {
                    remove(side.active, found);
                    remove(side.activeTo, found);
                }
            }
        }
        advancePos(pos) {
            if (pos > this.end)
                pos = this.end;
            if (pos <= this.pos)
                return;
            if (!sameSet(this.a.active, this.b.active))
                this.comparator.compareRange(this.pos, pos, this.a.active, this.b.active);
            this.pos = pos;
        }
    }
    function sameSet(a, b) {
        if (a.length != b.length)
            return false;
        outer: for (let i = 0; i < a.length; i++) {
            for (let j = 0; j < b.length; j++)
                if (a[i].eq(b[j]))
                    continue outer;
            return false;
        }
        return true;
    }
    function remove(array, index) {
        let last = array.pop();
        if (index != array.length)
            array[index] = last;
    }
    function touchesChanges(from, to, changes) {
        let result = 1 /* No */;
        for (let change of changes) {
            if (change.to >= from && change.from <= to) {
                if (change.from < from && change.to > to)
                    result = 2 /* Covered */;
                else if (result == 1 /* No */)
                    result = 0 /* Yes */;
            }
            let diff = change.length - (change.to - change.from);
            if (from > change.from)
                from += diff;
            if (to > change.to)
                to += diff;
        }
        return result;
    }

    let [nav, doc] = typeof navigator != "undefined"
        ? [navigator, document]
        : [{ userAgent: "", vendor: "", platform: "" }, { documentElement: { style: {} } }];
    const ie_edge = /Edge\/(\d+)/.exec(nav.userAgent);
    const ie_upto10 = /MSIE \d/.test(nav.userAgent);
    const ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(nav.userAgent);
    const ie = !!(ie_upto10 || ie_11up || ie_edge);
    const gecko = !ie && /gecko\/(\d+)/i.test(nav.userAgent);
    const chrome = !ie && /Chrome\/(\d+)/.exec(nav.userAgent);
    const webkit = !ie && 'WebkitAppearance' in doc.documentElement.style;
    var browser = {
        mac: /Mac/.test(nav.platform),
        ie,
        ie_version: ie_upto10 ? doc.documentMode || 6 : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0,
        gecko,
        gecko_version: gecko ? +(/Firefox\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
        chrome: !!chrome,
        chrome_version: chrome ? +chrome[1] : 0,
        ios: !ie && /AppleWebKit/.test(nav.userAgent) && /Mobile\/\w+/.test(nav.userAgent),
        android: /Android\b/.test(nav.userAgent),
        webkit,
        safari: /Apple Computer/.test(nav.vendor),
        webkit_version: webkit ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0,
        tabSize: doc.documentElement.style.tabSize != null ? "tab-size" : "-moz-tab-size"
    };

    // Work around Chrome issue https://bugs.chromium.org/p/chromium/issues/detail?id=447523
    // (isCollapsed inappropriately returns true in shadow dom)
    function selectionCollapsed(domSel) {
        let collapsed = domSel.isCollapsed;
        if (collapsed && browser.chrome && domSel.rangeCount && !domSel.getRangeAt(0).collapsed)
            collapsed = false;
        return collapsed;
    }
    function hasSelection(dom, selection) {
        if (!selection.anchorNode)
            return false;
        try {
            // Firefox will raise 'permission denied' errors when accessing
            // properties of `sel.anchorNode` when it's in a generated CSS
            // element.
            return dom.contains(selection.anchorNode.nodeType == 3 ? selection.anchorNode.parentNode : selection.anchorNode);
        }
        catch (_) {
            return false;
        }
    }
    function clientRectsFor(dom) {
        if (dom.nodeType == 3) {
            let range = document.createRange();
            range.setEnd(dom, dom.nodeValue.length);
            range.setStart(dom, 0);
            return range.getClientRects();
        }
        else if (dom.nodeType == 1) {
            return dom.getClientRects();
        }
        else {
            return [];
        }
    }
    // Scans forward and backward through DOM positions equivalent to the
    // given one to see if the two are in the same place (i.e. after a
    // text node vs at the end of that text node)
    function isEquivalentPosition(node, off, targetNode, targetOff) {
        return targetNode ? (scanFor(node, off, targetNode, targetOff, -1) ||
            scanFor(node, off, targetNode, targetOff, 1)) : false;
    }
    function domIndex(node) {
        for (var index = 0;; index++) {
            node = node.previousSibling;
            if (!node)
                return index;
        }
    }
    function scanFor(node, off, targetNode, targetOff, dir) {
        for (;;) {
            if (node == targetNode && off == targetOff)
                return true;
            if (off == (dir < 0 ? 0 : maxOffset(node))) {
                if (node.nodeName == "DIV")
                    return false;
                let parent = node.parentNode;
                if (!parent || parent.nodeType != 1)
                    return false;
                off = domIndex(node) + (dir < 0 ? 0 : 1);
                node = parent;
            }
            else if (node.nodeType == 1) {
                node = node.childNodes[off + (dir < 0 ? -1 : 0)];
                off = dir < 0 ? maxOffset(node) : 0;
            }
            else {
                return false;
            }
        }
    }
    function maxOffset(node) {
        return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
    }
    function windowRect(win) {
        return { left: 0, right: win.innerWidth,
            top: 0, bottom: win.innerHeight };
    }
    function scrollRectIntoView(dom, rect) {
        let scrollMargin = 5;
        let doc = dom.ownerDocument, win = doc.defaultView;
        for (let cur = dom.parentNode; cur;) {
            if (cur.nodeType == 1) { // Element
                let bounding, top = cur == document.body;
                if (top) {
                    bounding = windowRect(win);
                }
                else {
                    if (cur.scrollHeight <= cur.clientHeight && cur.scrollWidth <= cur.clientWidth) {
                        cur = cur.parentNode;
                        continue;
                    }
                    let rect = cur.getBoundingClientRect();
                    bounding = { left: rect.left, right: rect.left + cur.clientWidth,
                        top: rect.top, bottom: rect.top + cur.clientHeight };
                }
                let moveX = 0, moveY = 0;
                if (rect.top < bounding.top)
                    moveY = -(bounding.top - rect.top + scrollMargin);
                else if (rect.bottom > bounding.bottom)
                    moveY = rect.bottom - bounding.bottom + scrollMargin;
                if (rect.left < bounding.left)
                    moveX = -(bounding.left - rect.left + scrollMargin);
                else if (rect.right > bounding.right)
                    moveX = rect.right - bounding.right + scrollMargin;
                if (moveX || moveY) {
                    if (top) {
                        win.scrollBy(moveX, moveY);
                    }
                    else {
                        if (moveY) {
                            let start = cur.scrollTop;
                            cur.scrollTop += moveY;
                            moveY = cur.scrollTop - start;
                        }
                        if (moveX) {
                            let start = cur.scrollLeft;
                            cur.scrollLeft += moveX;
                            moveX = cur.scrollLeft - start;
                        }
                        rect = { left: rect.left - moveX, top: rect.top - moveY,
                            right: rect.right - moveX, bottom: rect.bottom - moveY };
                    }
                }
                if (top)
                    break;
                cur = cur.parentNode;
            }
            else if (cur.nodeType == 11) { // A shadow root
                cur = cur.host;
            }
            else {
                break;
            }
        }
    }
    class DOMSelection {
        constructor() {
            this.anchorNode = null;
            this.anchorOffset = 0;
            this.focusNode = null;
            this.focusOffset = 0;
        }
        eq(domSel) {
            return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset &&
                this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
        }
        set(domSel) {
            this.anchorNode = domSel.anchorNode;
            this.anchorOffset = domSel.anchorOffset;
            this.focusNode = domSel.focusNode;
            this.focusOffset = domSel.focusOffset;
        }
    }

    class DOMPos {
        constructor(node, offset, precise = true) {
            this.node = node;
            this.offset = offset;
            this.precise = precise;
        }
        static before(dom, precise) { return new DOMPos(dom.parentNode, domIndex(dom), precise); }
        static after(dom, precise) { return new DOMPos(dom.parentNode, domIndex(dom) + 1, precise); }
    }
    const none$3 = [];
    class ContentView {
        constructor() {
            this.parent = null;
            this.dom = null;
            this.dirty = 2 /* Node */;
        }
        get editorView() {
            if (!this.parent)
                throw new Error("Accessing view in orphan content view");
            return this.parent.editorView;
        }
        get overrideDOMText() { return null; }
        get posAtStart() {
            return this.parent ? this.parent.posBefore(this) : 0;
        }
        get posAtEnd() {
            return this.posAtStart + this.length;
        }
        posBefore(view) {
            let pos = this.posAtStart;
            for (let child of this.children) {
                if (child == view)
                    return pos;
                pos += child.length + child.breakAfter;
            }
            throw new RangeError("Invalid child in posBefore");
        }
        posAfter(view) {
            return this.posBefore(view) + view.length;
        }
        coordsAt(pos) { return null; }
        sync() {
            if (this.dirty & 2 /* Node */) {
                let parent = this.dom, pos = parent.firstChild;
                for (let child of this.children) {
                    if (child.dirty) {
                        if (pos && !child.dom && !pos.cmView) {
                            let prev = pos.previousSibling;
                            if (child.reuseDOM(pos))
                                pos = prev ? prev.nextSibling : parent.firstChild;
                        }
                        child.sync();
                        child.dirty = 0 /* Not */;
                    }
                    pos = syncNodeInto(parent, pos, child.dom);
                }
                while (pos)
                    pos = rm(pos);
            }
            else if (this.dirty & 1 /* Child */) {
                for (let child of this.children)
                    if (child.dirty) {
                        child.sync();
                        child.dirty = 0 /* Not */;
                    }
            }
        }
        reuseDOM(dom) { return false; }
        localPosFromDOM(node, offset) {
            let after;
            if (node == this.dom) {
                after = this.dom.childNodes[offset];
            }
            else {
                let bias = maxOffset(node) == 0 ? 0 : offset == 0 ? -1 : 1;
                for (;;) {
                    let parent = node.parentNode;
                    if (parent == this.dom)
                        break;
                    if (bias == 0 && parent.firstChild != parent.lastChild) {
                        if (node == parent.firstChild)
                            bias = -1;
                        else
                            bias = 1;
                    }
                    node = parent;
                }
                if (bias < 0)
                    after = node;
                else
                    after = node.nextSibling;
            }
            if (after == this.dom.firstChild)
                return 0;
            while (after && !after.cmView)
                after = after.nextSibling;
            if (!after)
                return this.length;
            for (let i = 0, pos = 0;; i++) {
                let child = this.children[i];
                if (child.dom == after)
                    return pos;
                pos += child.length + child.breakAfter;
            }
        }
        domBoundsAround(from, to, offset = 0) {
            let fromI = -1, fromStart = -1, toI = -1, toEnd = -1;
            for (let i = 0, pos = offset; i < this.children.length; i++) {
                let child = this.children[i], end = pos + child.length;
                if (pos < from && end > to)
                    return child.domBoundsAround(from, to, pos);
                if (end >= from && fromI == -1) {
                    fromI = i;
                    fromStart = pos;
                }
                if (end >= to && toI == -1) {
                    toI = i;
                    toEnd = end;
                    break;
                }
                pos = end + child.breakAfter;
            }
            return { from: fromStart, to: toEnd,
                startDOM: (fromI ? this.children[fromI - 1].dom.nextSibling : null) || this.dom.firstChild,
                endDOM: toI < this.children.length - 1 ? this.children[toI + 1].dom : null };
        }
        // FIXME track precise dirty ranges, to avoid full DOM sync on every touched node?
        markDirty(andParent = false) {
            if (this.dirty & 2 /* Node */)
                return;
            this.dirty |= 2 /* Node */;
            this.markParentsDirty(andParent);
        }
        markParentsDirty(childList) {
            for (let parent = this.parent; parent; parent = parent.parent) {
                if (childList)
                    parent.dirty |= 2 /* Node */;
                if (parent.dirty & 1 /* Child */)
                    return;
                parent.dirty |= 1 /* Child */;
                childList = false;
            }
        }
        setParent(parent) {
            if (this.parent != parent) {
                this.parent = parent;
                if (this.dirty)
                    this.markParentsDirty(true);
            }
        }
        setDOM(dom) {
            this.dom = dom;
            dom.cmView = this;
        }
        get rootView() {
            for (let v = this;;) {
                let parent = v.parent;
                if (!parent)
                    return v;
                v = parent;
            }
        }
        replaceChildren(from, to, children = none$3) {
            this.markDirty();
            for (let i = from; i < to; i++)
                this.children[i].parent = null;
            this.children.splice(from, to - from, ...children);
            for (let i = 0; i < children.length; i++)
                children[i].setParent(this);
        }
        ignoreMutation(rec) { return false; }
        ignoreEvent(event) { return false; }
        childCursor(pos = this.length) {
            return new ChildCursor(this.children, pos, this.children.length);
        }
        childPos(pos, bias = 1) {
            return this.childCursor().findPos(pos, bias);
        }
        toString() {
            let name = this.constructor.name.replace("View", "");
            return name + (this.children.length ? "(" + this.children.join() + ")" :
                this.length ? "[" + (name == "Text" ? this.text : this.length) + "]" : "") +
                (this.breakAfter ? "#" : "");
        }
    }
    ContentView.prototype.breakAfter = 0;
    // Remove a DOM node and return its next sibling.
    function rm(dom) {
        let next = dom.nextSibling;
        dom.parentNode.removeChild(dom);
        return next;
    }
    function syncNodeInto(parent, pos, dom) {
        if (dom.parentNode == parent) {
            while (pos != dom)
                pos = rm(pos);
            pos = dom.nextSibling;
        }
        else {
            parent.insertBefore(dom, pos);
        }
        return pos;
    }
    class ChildCursor {
        constructor(children, pos, i) {
            this.children = children;
            this.pos = pos;
            this.i = i;
            this.off = 0;
        }
        findPos(pos, bias = 1) {
            for (;;) {
                if (pos > this.pos || pos == this.pos &&
                    (bias > 0 || this.i == 0 || this.children[this.i - 1].breakAfter)) {
                    this.off = pos - this.pos;
                    return this;
                }
                let next = this.children[--this.i];
                this.pos -= next.length + next.breakAfter;
            }
        }
    }

    function combineAttrs(source, target) {
        for (let name in source) {
            if (name == "class" && target.class)
                target.class += " " + source.class;
            else if (name == "style" && target.style)
                target.style += ";" + source.style;
            else
                target[name] = source[name];
        }
        return target;
    }
    function attrsEq(a, b) {
        if (a == b)
            return true;
        if (!a || !b)
            return false;
        let keysA = Object.keys(a), keysB = Object.keys(b);
        if (keysA.length != keysB.length)
            return false;
        for (let key of keysA) {
            if (keysB.indexOf(key) == -1 || a[key] !== b[key])
                return false;
        }
        return true;
    }
    function updateAttrs(dom, prev, attrs) {
        if (prev)
            for (let name in prev)
                if (!(attrs && name in attrs))
                    dom.removeAttribute(name);
        if (attrs)
            for (let name in attrs)
                if (!(prev && prev[name] == attrs[name]))
                    dom.setAttribute(name, attrs[name]);
    }

    const none$1$1 = [];
    class InlineView extends ContentView {
        match(other) { return false; }
        get children() { return none$1$1; }
        getSide() { return 0; }
    }
    const MAX_JOIN_LEN = 256;
    class TextView extends InlineView {
        constructor(text, tagName, clss, attrs) {
            super();
            this.text = text;
            this.tagName = tagName;
            this.attrs = attrs;
            this.textDOM = null;
            this.class = clss;
        }
        get length() { return this.text.length; }
        createDOM(textDOM) {
            let tagName = this.tagName || (this.attrs || this.class ? "span" : null);
            this.textDOM = textDOM || document.createTextNode(this.text);
            if (tagName) {
                let dom = document.createElement(tagName);
                dom.appendChild(this.textDOM);
                if (this.class)
                    dom.className = this.class;
                if (this.attrs)
                    for (let name in this.attrs)
                        dom.setAttribute(name, this.attrs[name]);
                this.setDOM(dom);
            }
            else {
                this.setDOM(this.textDOM);
            }
        }
        sync() {
            if (!this.dom)
                this.createDOM();
            if (this.textDOM.nodeValue != this.text) {
                this.textDOM.nodeValue = this.text;
                let dom = this.dom;
                if (this.textDOM != dom && (this.dom.firstChild != this.textDOM || dom.lastChild != this.textDOM)) {
                    while (dom.firstChild)
                        dom.removeChild(dom.firstChild);
                    dom.appendChild(this.textDOM);
                }
            }
        }
        reuseDOM(dom) {
            if (dom.nodeType != 3)
                return false;
            this.createDOM(dom);
            return true;
        }
        merge(from, to = this.length, source = null) {
            if (source &&
                (!(source instanceof TextView) ||
                    source.tagName != this.tagName || source.class != this.class ||
                    !attrsEq(source.attrs, this.attrs) || this.length - (to - from) + source.length > MAX_JOIN_LEN))
                return false;
            this.text = this.text.slice(0, from) + (source ? source.text : "") + this.text.slice(to);
            this.markDirty();
            return true;
        }
        slice(from, to = this.length) {
            return new TextView(this.text.slice(from, to), this.tagName, this.class, this.attrs);
        }
        localPosFromDOM(node, offset) {
            return node == this.textDOM ? offset : offset ? this.text.length : 0;
        }
        domAtPos(pos) { return new DOMPos(this.textDOM, pos); }
        domBoundsAround(from, to, offset) {
            return { from: offset, to: offset + this.length, startDOM: this.dom, endDOM: this.dom.nextSibling };
        }
        coordsAt(pos) {
            return textCoords(this.textDOM, pos);
        }
    }
    function textCoords(text, pos) {
        let range = document.createRange();
        if (browser.chrome || browser.gecko) {
            // These browsers reliably return valid rectangles for empty ranges
            range.setEnd(text, pos);
            range.setStart(text, pos);
            return range.getBoundingClientRect();
        }
        else {
            // Otherwise, get the rectangle around a character and take one side
            let extend = pos == 0 ? 1 : -1;
            range.setEnd(text, pos + (extend > 0 ? 1 : 0));
            range.setStart(text, pos - (extend < 0 ? 1 : 0));
            let rect = range.getBoundingClientRect();
            let x = extend < 0 ? rect.right : rect.left;
            return { left: x, right: x, top: rect.top, bottom: rect.bottom };
        }
    }
    // Also used for collapsed ranges that don't have a placeholder widget!
    class WidgetView extends InlineView {
        constructor(widget, length, side, open) {
            super();
            this.widget = widget;
            this.length = length;
            this.side = side;
            this.open = open;
        }
        static create(widget, length, side, open = 0) {
            return new (widget.customView || WidgetView)(widget, length, side, open);
        }
        slice(from, to = this.length) { return WidgetView.create(this.widget, to - from, this.side); }
        sync() {
            if (!this.dom || !this.widget.updateDOM(this.dom)) {
                this.setDOM(this.widget.toDOM(this.editorView));
                this.dom.contentEditable = "false";
            }
        }
        getSide() { return this.side; }
        merge(from, to = this.length, source = null) {
            if (source) {
                if (!(source instanceof WidgetView) || !source.open ||
                    from > 0 && !(source.open & 1 /* Start */) ||
                    to < this.length && !(source.open & 2 /* End */))
                    return false;
                if (!this.widget.compare(source.widget))
                    throw new Error("Trying to merge incompatible widgets");
            }
            this.length = from + (source ? source.length : 0) + (this.length - to);
            return true;
        }
        match(other) {
            if (other.length == this.length && other instanceof WidgetView && other.side == this.side) {
                if (this.widget.constructor == other.widget.constructor) {
                    if (!this.widget.eq(other.widget.value))
                        this.markDirty(true);
                    this.widget = other.widget;
                    return true;
                }
            }
            return false;
        }
        ignoreMutation() { return true; }
        ignoreEvent(event) { return this.widget.ignoreEvent(event); }
        get overrideDOMText() {
            if (this.length == 0)
                return [""];
            let top = this;
            while (top.parent)
                top = top.parent;
            let state = top.state, text = state && state.doc, start = this.posAtStart;
            return text ? text.sliceLines(start, start + this.length) : [""];
        }
        domAtPos(pos) {
            return pos == 0 ? DOMPos.before(this.dom) : DOMPos.after(this.dom, pos == this.length);
        }
        domBoundsAround() { return null; }
        coordsAt(pos) {
            let rects = this.dom.getClientRects();
            for (let i = pos > 0 ? rects.length - 1 : 0;; i += (pos > 0 ? -1 : 1)) {
                let rect = rects[i];
                if (pos > 0 ? i == 0 : i == rects.length - 1 || rect.top < rect.bottom)
                    return rects[i];
            }
            return null;
        }
    }
    class CompositionView extends WidgetView {
        domAtPos(pos) { return new DOMPos(this.widget.value.text, pos); }
        sync() { if (!this.dom)
            this.setDOM(this.widget.toDOM(this.editorView)); }
        ignoreMutation() { return false; }
        get overrideDOMText() { return null; }
        coordsAt(pos) { return textCoords(this.widget.value.text, pos); }
    }

    /// Widgets added to the content are described by subclasses of this
    /// class. This makes it possible to delay creating of the DOM
    /// structure for a widget until it is needed, and to avoid redrawing
    /// widgets even when the decorations that define them are recreated.
    /// `T` can be a type of value passed to instances of the widget type.
    class WidgetType {
        /// Create an instance of this widget type.
        constructor(
        /// @internal
        value) {
            this.value = value;
        }
        /// Compare this instance to another instance of the same class. By
        /// default, it'll compare the instances' parameters with `===`.
        eq(value) { return this.value === value; }
        /// Update a DOM element created by a widget of the same type but
        /// with a different value to reflect this widget. May return true
        /// to indicate that it could update, false to indicate it couldn't
        /// (in which case the widget will be redrawn). The default
        /// implementation just returns false.
        updateDOM(dom) { return false; }
        /// @internal
        compare(other) {
            return this == other || this.constructor == other.constructor && this.eq(other.value);
        }
        /// The estimated height this widget will have, to be used when
        /// estimating the height of content that hasn't been drawn. May
        /// return -1 to indicate you don't know. The default implementation
        /// returns -1.
        get estimatedHeight() { return -1; }
        /// Can be used to configure which kinds of events inside the widget
        /// should be ignored by the editor. The default is to ignore all
        /// events.
        ignoreEvent(event) { return true; }
        //// @internal
        get customView() { return null; }
    }
    const INLINE_BIG_SIDE = 1e8, BLOCK_BIG_SIDE = 2e8;
    /// The different types of blocks that can occur in an editor view.
    var BlockType;
    (function (BlockType) {
        /// A line of text.
        BlockType[BlockType["Text"] = 0] = "Text";
        /// A block widget associated with the position after it.
        BlockType[BlockType["WidgetBefore"] = 1] = "WidgetBefore";
        /// A block widget associated with the position before it.
        BlockType[BlockType["WidgetAfter"] = 2] = "WidgetAfter";
        /// A block widget [replacing](#view.Decoration^replace) a range of content.
        BlockType[BlockType["WidgetRange"] = 3] = "WidgetRange";
    })(BlockType || (BlockType = {}));
    /// A decoration provides information on how to draw or style a piece
    /// of content. You'll usually use it wrapped in a
    /// [`Range`](#rangeset.Range), which adds a start and
    /// end position.
    class Decoration extends RangeValue {
        /// @internal
        constructor(
        /// @internal
        startSide, 
        /// @internal
        endSide, 
        /// @internal
        widget, 
        /// The config object used to create this decoration.
        spec) {
            super();
            this.startSide = startSide;
            this.endSide = endSide;
            this.widget = widget;
            this.spec = spec;
        }
        /// @internal
        get point() { return false; }
        /// @internal
        get heightRelevant() { return false; }
        /// Create a mark decoration, which influences the styling of the
        /// text in its range.
        static mark(from, to, spec) {
            if (from >= to)
                throw new RangeError("Mark decorations may not be empty");
            return new Range(from, to, new MarkDecoration(spec));
        }
        /// Create a widget decoration, which adds an element at the given
        /// position.
        static widget(pos, spec) {
            let side = spec.side || 0;
            if (spec.block)
                side += (BLOCK_BIG_SIDE + 1) * (side > 0 ? 1 : -1);
            return new Range(pos, pos, new PointDecoration(spec, side, side, !!spec.block, spec.widget));
        }
        /// Create a replace decoration which replaces the given range with
        /// a widget, or simply hides it.
        static replace(from, to, spec) {
            let block = !!spec.block;
            let { start, end } = getInclusive(spec);
            let startSide = block ? -BLOCK_BIG_SIDE * (start ? 2 : 1) : INLINE_BIG_SIDE * (start ? -1 : 1);
            let endSide = block ? BLOCK_BIG_SIDE * (end ? 2 : 1) : INLINE_BIG_SIDE * (end ? 1 : -1);
            if (from > to || (from == to && startSide > 0 && endSide < 0))
                throw new RangeError("Invalid range for replacement decoration");
            return new Range(from, Math.max(from, to), new PointDecoration(spec, startSide, endSide, block, spec.widget || null));
        }
        /// Create a line decoration, which can add DOM attributes to the
        /// line starting at the given position.
        static line(start, spec) {
            return new Range(start, start, new LineDecoration(spec));
        }
        /// Build a [`DecorationSet`](#view.DecorationSet) from the given
        /// decorated range or ranges.
        static set(of) {
            return RangeSet.of(of);
        }
        /// @internal
        hasHeight() { return this.widget ? this.widget.estimatedHeight > -1 : false; }
        /// @internal
        mapSimple(mapping, from, to) {
            let newFrom = mapping.mapPos(from, this.startSide, MapMode.TrackDel);
            if (from == to && this.startSide == this.endSide)
                return newFrom < 0 ? null : new Range(newFrom, newFrom, this);
            let newTo = mapping.mapPos(to, this.endSide, MapMode.TrackDel);
            if (newFrom < 0) {
                if (newTo < 0)
                    return null;
                newFrom = this.startSide >= 0 ? -(newFrom + 1) : mapping.mapPos(from, 1);
            }
            else if (newTo < 0) {
                newTo = this.endSide < 0 ? -(newTo + 1) : mapping.mapPos(to, -1);
            }
            return newFrom < newTo ? new Range(newFrom, newTo, this) : null;
        }
    }
    /// The empty set of decorations.
    Decoration.none = RangeSet.empty;
    class MarkDecoration extends Decoration {
        constructor(spec) {
            let { start, end } = getInclusive(spec);
            super(INLINE_BIG_SIDE * (start ? -1 : 1), INLINE_BIG_SIDE * (end ? 1 : -1), null, spec);
        }
        map(mapping, from, to) {
            return this.mapSimple(mapping, from, to);
        }
        eq(other) {
            return this == other ||
                other instanceof MarkDecoration &&
                    this.spec.tagName == other.spec.tagName &&
                    this.spec.class == other.spec.class &&
                    attrsEq(this.spec.attributes || null, other.spec.attributes || null);
        }
    }
    class LineDecoration extends Decoration {
        constructor(spec) {
            super(-INLINE_BIG_SIDE, -INLINE_BIG_SIDE, null, spec);
        }
        get point() { return true; }
        map(mapping, pos) {
            pos = mapping.mapPos(pos, -1, MapMode.TrackBefore);
            return pos < 0 ? null : new Range(pos, pos, this);
        }
        eq(other) {
            return other instanceof LineDecoration && attrsEq(this.spec.attributes, other.spec.attributes);
        }
    }
    class PointDecoration extends Decoration {
        constructor(spec, startSide, endSide, block, widget) {
            super(startSide, endSide, widget, spec);
            this.block = block;
        }
        get point() { return true; }
        // Only relevant when this.block == true
        get type() {
            return this.startSide < this.endSide ? BlockType.WidgetRange : this.startSide < 0 ? BlockType.WidgetBefore : BlockType.WidgetAfter;
        }
        get heightRelevant() { return this.block || !!this.widget && this.widget.estimatedHeight >= 5; }
        map(mapping, from, to) {
            // FIXME make mapping behavior configurable?
            if (this.block) {
                let { type } = this;
                let newFrom = type == BlockType.WidgetAfter ? mapping.mapPos(from, 1, MapMode.TrackAfter) : mapping.mapPos(from, -1, MapMode.TrackBefore);
                let newTo = type == BlockType.WidgetRange ? mapping.mapPos(to, 1, MapMode.TrackAfter) : newFrom;
                return newFrom < 0 || newTo < 0 ? null : new Range(newFrom, newTo, this);
            }
            else {
                return this.mapSimple(mapping, from, to);
            }
        }
        eq(other) {
            return other instanceof PointDecoration &&
                widgetsEq(this.widget, other.widget) &&
                this.block == other.block &&
                this.startSide == other.startSide && this.endSide == other.endSide;
        }
    }
    function getInclusive(spec) {
        let { inclusiveStart: start, inclusiveEnd: end } = spec;
        if (start == null)
            start = spec.inclusive;
        if (end == null)
            end = spec.inclusive;
        return { start: start || false, end: end || false };
    }
    function widgetsEq(a, b) {
        return a == b || !!(a && b && a.compare(b));
    }
    const MIN_RANGE_GAP = 4;
    function addRange(from, to, ranges) {
        if (ranges[ranges.length - 1] + MIN_RANGE_GAP > from)
            ranges[ranges.length - 1] = to;
        else
            ranges.push(from, to);
    }
    function joinRanges(a, b) {
        if (a.length == 0)
            return b;
        if (b.length == 0)
            return a;
        let result = [];
        for (let iA = 0, iB = 0;;) {
            if (iA < a.length && (iB == b.length || a[iA] < b[iB]))
                addRange(a[iA++], a[iA++], result);
            else if (iB < b.length)
                addRange(b[iB++], b[iB++], result);
            else
                break;
        }
        return result;
    }
    class Changes {
        constructor() {
            this.content = [];
            this.height = [];
        }
    }
    class DecorationComparator {
        constructor() {
            this.changes = new Changes;
        }
        compareRange(from, to, activeA, activeB) {
            addRange(from, to, this.changes.content);
        }
        comparePoint(from, to, byA, byB) {
            addRange(from, to, this.changes.content);
            if (from < to || byA.heightRelevant || byB && byB.heightRelevant)
                addRange(from, to, this.changes.height);
        }
    }
    function findChangedRanges(a, b, diff, lengthA) {
        let comp = new DecorationComparator();
        a.compare(b, diff, comp, lengthA);
        return comp.changes;
    }

    const styles = new StyleModule({
        wrapper: {
            position: "relative !important",
            boxSizing: "border-box",
            "&.codemirror-focused": {
                // FIXME it would be great if we could directly use the browser's
                // default focus outline, but it appears we can't, so this tries to
                // approximate that
                outline_fallback: "1px dotted #212121",
                outline: "5px auto -webkit-focus-ring-color"
            },
            display: "flex !important",
            flexDirection: "column"
        },
        scroller: {
            display: "flex !important",
            alignItems: "flex-start !important",
            fontFamily: "monospace",
            lineHeight: 1.4,
            height: "100%"
        },
        content: {
            margin: 0,
            flexGrow: 2,
            minHeight: "100%",
            display: "block",
            whiteSpace: "pre",
            boxSizing: "border-box",
            padding: "4px 0",
            outline: "none",
            caretColor: "black",
        },
        line: {
            display: "block",
            padding: "0 2px 0 4px"
        }
    }, { priority: 0 });

    class LineView extends ContentView {
        constructor() {
            super(...arguments);
            this.children = [];
            this.length = 0;
            this.prevAttrs = undefined;
            this.attrs = null;
            this.breakAfter = 0;
        }
        // Consumes source
        merge(from, to, source, takeDeco) {
            if (source) {
                if (!(source instanceof LineView))
                    return false;
                if (!this.dom)
                    source.transferDOM(this); // Reuse source.dom when appropriate
            }
            if (takeDeco)
                this.setDeco(source ? source.attrs : null);
            let elts = source ? source.children : [];
            let cur = this.childCursor();
            let { i: toI, off: toOff } = cur.findPos(to, 1);
            let { i: fromI, off: fromOff } = cur.findPos(from, -1);
            let dLen = from - to;
            for (let view of elts)
                dLen += view.length;
            this.length += dLen;
            // Both from and to point into the same text view
            if (fromI == toI && fromOff) {
                let start = this.children[fromI];
                // Maybe just update that view and be done
                if (elts.length == 1 && start.merge(fromOff, toOff, elts[0]))
                    return true;
                if (elts.length == 0) {
                    start.merge(fromOff, toOff, null);
                    return true;
                }
                // Otherwise split it, so that we don't have to worry about aliasing front/end afterwards
                let after = start.slice(toOff);
                if (after.merge(0, 0, elts[elts.length - 1]))
                    elts[elts.length - 1] = after;
                else
                    elts.push(after);
                toI++;
                toOff = 0;
            }
            // Make sure start and end positions fall on node boundaries
            // (fromOff/toOff are no longer used after this), and that if the
            // start or end of the elts can be merged with adjacent nodes,
            // this is done
            if (toOff) {
                let end = this.children[toI];
                if (elts.length && end.merge(0, toOff, elts[elts.length - 1]))
                    elts.pop();
                else
                    end.merge(0, toOff, null);
            }
            else if (toI < this.children.length && elts.length &&
                this.children[toI].merge(0, 0, elts[elts.length - 1])) {
                elts.pop();
            }
            if (fromOff) {
                let start = this.children[fromI];
                if (elts.length && start.merge(fromOff, undefined, elts[0]))
                    elts.shift();
                else
                    start.merge(fromOff, undefined, null);
                fromI++;
            }
            else if (fromI && elts.length && this.children[fromI - 1].merge(this.children[fromI - 1].length, undefined, elts[0])) {
                elts.shift();
            }
            // Then try to merge any mergeable nodes at the start and end of
            // the changed range
            while (fromI < toI && elts.length && this.children[toI - 1].match(elts[elts.length - 1])) {
                elts.pop();
                toI--;
            }
            while (fromI < toI && elts.length && this.children[fromI].match(elts[0])) {
                elts.shift();
                fromI++;
            }
            // And if anything remains, splice the child array to insert the new elts
            if (elts.length || fromI != toI)
                this.replaceChildren(fromI, toI, elts);
            return true;
        }
        split(at) {
            let end = new LineView;
            end.breakAfter = this.breakAfter;
            if (this.length == 0)
                return end;
            let { i, off } = this.childPos(at);
            if (off) {
                end.append(this.children[i].slice(off));
                this.children[i].merge(off, undefined, null);
                i++;
            }
            for (let j = i; j < this.children.length; j++)
                end.append(this.children[j]);
            while (i > 0 && this.children[i - 1].length == 0) {
                this.children[i - 1].parent = null;
                i--;
            }
            this.children.length = i;
            this.markDirty();
            this.length = at;
            return end;
        }
        transferDOM(other) {
            if (!this.dom)
                return;
            other.setDOM(this.dom);
            other.prevAttrs = this.prevAttrs === undefined ? this.attrs : this.prevAttrs;
            this.prevAttrs = undefined;
            this.dom = null;
        }
        setDeco(attrs) {
            if (!attrsEq(this.attrs, attrs)) {
                if (this.dom) {
                    this.prevAttrs = this.attrs;
                    this.markDirty();
                }
                this.attrs = attrs;
            }
        }
        // Only called when building a line view in ContentBuilder
        append(child) {
            this.children.push(child);
            child.setParent(this);
            this.length += child.length;
        }
        // Only called when building a line view in ContentBuilder
        addLineDeco(deco) {
            let attrs = deco.spec.attributes;
            if (attrs)
                this.attrs = combineAttrs(attrs, this.attrs || {});
        }
        domAtPos(pos) {
            let i = 0;
            for (let off = 0; i < this.children.length; i++) {
                let child = this.children[i], end = off + child.length;
                if (end == off && child.getSide() <= 0)
                    continue;
                if (pos > off && pos < end && child.dom.parentNode == this.dom)
                    return child.domAtPos(pos - off);
                if (pos <= off)
                    break;
                off = end;
            }
            for (; i > 0; i--) {
                let before = this.children[i - 1].dom;
                if (before.parentNode == this.dom)
                    return DOMPos.after(before);
            }
            return new DOMPos(this.dom, 0);
        }
        // FIXME might need another hack to work around Firefox's behavior
        // of not actually displaying the cursor even though it's there in
        // the DOM
        sync() {
            if (!this.dom) {
                this.setDOM(document.createElement("div"));
                this.dom.className = "codemirror-line " + styles.line;
                this.prevAttrs = this.attrs ? null : undefined;
            }
            if (this.prevAttrs !== undefined) {
                updateAttrs(this.dom, this.prevAttrs, this.attrs);
                this.dom.classList.add("codemirror-line");
                this.dom.classList.add(styles.line);
                this.prevAttrs = undefined;
            }
            super.sync();
            let last = this.dom.lastChild;
            if (!last || last.nodeName == "BR") {
                let hack = document.createElement("BR");
                hack.cmIgnore = true;
                this.dom.appendChild(hack);
            }
        }
        measureTextSize() {
            if (this.children.length == 0 || this.length > 20)
                return null;
            let totalWidth = 0;
            for (let child of this.children) {
                if (!(child instanceof TextView))
                    return null;
                let rects = clientRectsFor(child.dom);
                if (rects.length != 1)
                    return null;
                totalWidth += rects[0].width;
            }
            return { lineHeight: this.dom.getBoundingClientRect().height,
                charWidth: totalWidth / this.length };
        }
        coordsAt(pos) {
            for (let off = 0, i = 0; i < this.children.length; i++) {
                let child = this.children[i], end = off + child.length;
                if (end >= pos)
                    return child.coordsAt(pos - off);
                off = end;
            }
            return this.dom.lastChild.getBoundingClientRect();
        }
        match(other) { return false; }
        get type() { return BlockType.Text; }
    }
    const none$2$1 = [];
    class BlockWidgetView extends ContentView {
        constructor(widget, length, type, 
        // This is set by the builder and used to distinguish between
        // adjacent widgets and parts of the same widget when calling
        // `merge`. It's kind of silly that it's an instance variable, but
        // it's hard to route there otherwise.
        open = 0) {
            super();
            this.widget = widget;
            this.length = length;
            this.type = type;
            this.open = open;
            this.breakAfter = 0;
        }
        merge(from, to, source) {
            if (!(source instanceof BlockWidgetView) || !source.open ||
                from > 0 && !(source.open & 1 /* Start */) ||
                to < this.length && !(source.open & 2 /* End */))
                return false;
            if (!this.widget.compare(source.widget))
                throw new Error("Trying to merge an open widget with an incompatible node");
            this.length = from + source.length + (this.length - to);
            return true;
        }
        domAtPos(pos) {
            return pos == 0 ? DOMPos.before(this.dom) : DOMPos.after(this.dom, pos == this.length);
        }
        split(at) {
            let len = this.length - at;
            this.length = at;
            return new BlockWidgetView(this.widget, len, this.type);
        }
        get children() { return none$2$1; }
        sync() {
            if (!this.dom || !this.widget.updateDOM(this.dom)) {
                this.setDOM(this.widget.toDOM(this.editorView));
                this.dom.contentEditable = "false";
            }
        }
        get overrideDOMText() {
            return this.parent ? this.parent.state.doc.sliceLines(this.posAtStart, this.posAtEnd) : [""];
        }
        domBoundsAround() { return null; }
        match(other) {
            if (other instanceof BlockWidgetView && other.type == this.type &&
                other.widget.constructor == this.widget.constructor) {
                if (!other.widget.eq(this.widget.value))
                    this.markDirty(true);
                this.widget = other.widget;
                this.length = other.length;
                this.breakAfter = other.breakAfter;
                return true;
            }
            return false;
        }
    }

    class ContentBuilder {
        constructor(doc, pos, end) {
            this.doc = doc;
            this.pos = pos;
            this.end = end;
            this.content = [];
            this.curLine = null;
            this.breakAtStart = 0;
            this.text = "";
            this.textOff = 0;
            this.cursor = doc.iter();
            this.skip = pos;
        }
        posCovered() {
            if (this.content.length == 0)
                return !this.breakAtStart && this.doc.lineAt(this.pos).start != this.pos;
            let last = this.content[this.content.length - 1];
            return !last.breakAfter && !(last instanceof BlockWidgetView && last.type == BlockType.WidgetBefore);
        }
        getLine() {
            if (!this.curLine)
                this.content.push(this.curLine = new LineView);
            return this.curLine;
        }
        addWidget(view) {
            this.curLine = null;
            this.content.push(view);
        }
        finish() {
            if (!this.posCovered())
                this.getLine();
        }
        buildText(length, tagName, clss, attrs, ranges) {
            while (length > 0) {
                if (this.textOff == this.text.length) {
                    let { value, lineBreak, done } = this.cursor.next(this.skip);
                    this.skip = 0;
                    if (done)
                        throw new Error("Ran out of text content when drawing inline views");
                    if (lineBreak) {
                        if (!this.posCovered())
                            this.getLine();
                        if (this.content.length)
                            this.content[this.content.length - 1].breakAfter = 1;
                        else
                            this.breakAtStart = 1;
                        this.curLine = null;
                        length--;
                        continue;
                    }
                    else {
                        this.text = value;
                        this.textOff = 0;
                    }
                }
                let take = Math.min(this.text.length - this.textOff, length);
                this.getLine().append(new TextView(this.text.slice(this.textOff, this.textOff + take), tagName, clss, attrs));
                length -= take;
                this.textOff += take;
            }
        }
        span(from, to, active) {
            let tagName = null, clss = null;
            let attrs = null;
            for (let { spec } of active) {
                if (spec.tagName)
                    tagName = spec.tagName;
                if (spec.class)
                    clss = clss ? clss + " " + spec.class : spec.class;
                if (spec.attributes)
                    for (let name in spec.attributes) {
                        let value = spec.attributes[name];
                        if (value == null)
                            continue;
                        if (name == "class") {
                            clss = clss ? clss + " " + value : value;
                        }
                        else {
                            if (!attrs)
                                attrs = {};
                            if (name == "style" && attrs.style)
                                value = attrs.style + ";" + value;
                            attrs[name] = value;
                        }
                    }
            }
            this.buildText(to - from, tagName, clss, attrs, active);
            this.pos = to;
        }
        point(from, to, deco, openStart, openEnd) {
            let open = (openStart ? 1 /* Start */ : 0) | (openEnd ? 2 /* End */ : 0);
            let len = to - from;
            if (deco instanceof PointDecoration) {
                if (deco.block) {
                    let { type } = deco;
                    if (type == BlockType.WidgetAfter && !this.posCovered())
                        this.getLine();
                    this.addWidget(new BlockWidgetView(deco.widget || new NullWidget("div"), len, type, open));
                }
                else {
                    this.getLine().append(WidgetView.create(deco.widget || new NullWidget("span"), len, deco.startSide, open));
                }
            }
            else if (this.doc.lineAt(this.pos).start == this.pos) { // Line decoration
                this.getLine().addLineDeco(deco);
            }
            if (len) {
                // Advance the iterator past the replaced content
                if (this.textOff + len <= this.text.length) {
                    this.textOff += len;
                }
                else {
                    this.skip += len - (this.text.length - this.textOff);
                    this.text = "";
                    this.textOff = 0;
                }
                this.pos = to;
            }
        }
        ignore() { return false; }
        static build(text, from, to, decorations) {
            let builder = new ContentBuilder(text, from, to);
            RangeSet.iterateSpans(decorations, from, to, builder);
            builder.finish();
            return builder;
        }
    }
    class NullWidget extends WidgetType {
        toDOM() { return document.createElement(this.value); }
        updateDOM(elt) { return elt.nodeName.toLowerCase() == this.value; }
    }

    const wrappingWhiteSpace = ["pre-wrap", "normal", "pre-line"];
    class HeightOracle {
        constructor() {
            this.doc = Text.empty;
            this.lineWrapping = false;
            this.heightSamples = {};
            this.lineHeight = 14;
            this.charWidth = 7;
            this.lineLength = 30;
            // Used to track, during updateHeight, if any actual heights changed
            this.heightChanged = false;
        }
        heightForGap(from, to) {
            let lines = this.doc.lineAt(to).number - this.doc.lineAt(from).number + 1;
            if (this.lineWrapping)
                lines += Math.ceil(((to - from) - (lines * this.lineLength * 0.5)) / this.lineLength);
            return this.lineHeight * lines;
        }
        heightForLine(length) {
            if (!this.lineWrapping)
                return this.lineHeight;
            let lines = 1 + Math.max(0, Math.ceil((length - this.lineLength) / (this.lineLength - 5)));
            return lines * this.lineHeight;
        }
        setDoc(doc) { this.doc = doc; return this; }
        mustRefresh(lineHeights) {
            let newHeight = false;
            for (let i = 0; i < lineHeights.length; i++) {
                let h = lineHeights[i];
                if (h < 0) {
                    i++;
                }
                else if (!this.heightSamples[Math.floor(h * 10)]) { // Round to .1 pixels
                    newHeight = true;
                    this.heightSamples[Math.floor(h * 10)] = true;
                }
            }
            return newHeight;
        }
        refresh(whiteSpace, lineHeight, charWidth, lineLength, knownHeights) {
            let lineWrapping = wrappingWhiteSpace.indexOf(whiteSpace) > -1;
            let changed = Math.round(lineHeight) != Math.round(this.lineHeight) || this.lineWrapping != lineWrapping;
            this.lineWrapping = lineWrapping;
            this.lineHeight = lineHeight;
            this.charWidth = charWidth;
            this.lineLength = lineLength;
            if (changed) {
                this.heightSamples = {};
                for (let i = 0; i < knownHeights.length; i++) {
                    let h = knownHeights[i];
                    if (h < 0)
                        i++;
                    else
                        this.heightSamples[Math.floor(h * 10)] = true;
                }
            }
            return changed;
        }
    }
    // This object is used by `updateHeight` to make DOM measurements
    // arrive at the right nides. The `heights` array is a sequence of
    // block heights, starting from position `from`.
    class MeasuredHeights {
        constructor(from, heights) {
            this.from = from;
            this.heights = heights;
            this.index = 0;
        }
        get more() { return this.index < this.heights.length; }
    }
    /// Record used to represent information about a block-level element
    /// in the editor view.
    class BlockInfo {
        /// @internal
        constructor(
        /// The start of the element in the document.
        from, 
        /// The length of the element.
        length, 
        /// The top position of the element.
        top, 
        /// Its height.
        height, 
        /// The type of element this is. When querying lines, this may be
        /// an array of all the blocks that make up the line.
        type) {
            this.from = from;
            this.length = length;
            this.top = top;
            this.height = height;
            this.type = type;
        }
        /// The end of the element as a document position.
        get to() { return this.from + this.length; }
        /// The bottom position of the element.
        get bottom() { return this.top + this.height; }
        /// @internal
        join(other) {
            let detail = (Array.isArray(this.type) ? this.type : [this])
                .concat(Array.isArray(other.type) ? other.type : [other]);
            return new BlockInfo(this.from, this.length + other.length, this.top, this.height + other.height, detail);
        }
    }
    var QueryType;
    (function (QueryType) {
        QueryType[QueryType["ByPos"] = 0] = "ByPos";
        QueryType[QueryType["ByHeight"] = 1] = "ByHeight";
        QueryType[QueryType["ByPosNoHeight"] = 2] = "ByPosNoHeight";
    })(QueryType || (QueryType = {}));
    class HeightMap {
        constructor(length, // The number of characters covered
        height, // Height of this part of the document
        flags = 2 /* Outdated */) {
            this.length = length;
            this.height = height;
            this.flags = flags;
        }
        get outdated() { return (this.flags & 2 /* Outdated */) > 0; }
        set outdated(value) { this.flags = (value ? 2 /* Outdated */ : 0) | (this.flags & ~2 /* Outdated */); }
        setHeight(oracle, height) {
            if (this.height != height) {
                this.height = height;
                oracle.heightChanged = true;
            }
        }
        // Base case is to replace a leaf node, which simply builds a tree
        // from the new nodes and returns that (HeightMapBranch and
        // HeightMapGap override this to actually use from/to)
        replace(from, to, nodes) {
            return HeightMap.of(nodes);
        }
        // Again, these are base cases, and are overridden for branch and gap nodes.
        decomposeLeft(to, result) { result.push(this); }
        decomposeRight(from, result) { result.push(this); }
        applyChanges(decorations, oldDoc, oracle, changes) {
            let me = this;
            for (let i = changes.length - 1; i >= 0; i--) {
                let { fromA, toA, fromB, toB } = changes[i];
                let start = me.lineAt(fromA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
                let end = start.to >= toA ? start : me.lineAt(toA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
                toB += end.to - toA;
                toA = end.to;
                while (i > 0 && start.from <= changes[i - 1].toA) {
                    fromA = changes[i - 1].fromA;
                    fromB = changes[i - 1].fromB;
                    i--;
                    if (fromA < start.from)
                        start = me.lineAt(fromA, QueryType.ByPosNoHeight, oldDoc, 0, 0);
                }
                fromB += start.from - fromA;
                fromA = start.from;
                let nodes = NodeBuilder.build(oracle, decorations, fromB, toB);
                me = me.replace(fromA, toA, nodes);
            }
            return me.updateHeight(oracle, 0);
        }
        static empty() { return new HeightMapText(0, 0); }
        // nodes uses null values to indicate the position of line breaks.
        // There are never line breaks at the start or end of the array, or
        // two line breaks next to each other, and the array isn't allowed
        // to be empty (same restrictions as return value from the builder).
        static of(nodes) {
            if (nodes.length == 1)
                return nodes[0];
            let i = 0, j = nodes.length, before = 0, after = 0;
            for (;;) {
                if (i == j) {
                    if (before > after * 2) {
                        let split = nodes[i - 1];
                        if (split.break)
                            nodes.splice(--i, 1, split.left, null, split.right);
                        else
                            nodes.splice(--i, 1, split.left, split.right);
                        j += 1 + split.break;
                        before -= split.size;
                    }
                    else if (after > before * 2) {
                        let split = nodes[j];
                        if (split.break)
                            nodes.splice(j, 1, split.left, null, split.right);
                        else
                            nodes.splice(j, 1, split.left, split.right);
                        j += 2 + split.break;
                        after -= split.size;
                    }
                    else {
                        break;
                    }
                }
                else if (before < after) {
                    let next = nodes[i++];
                    if (next)
                        before += next.size;
                }
                else {
                    let next = nodes[--j];
                    if (next)
                        after += next.size;
                }
            }
            let brk = 0;
            if (nodes[i - 1] == null) {
                brk = 1;
                i--;
            }
            else if (nodes[i] == null) {
                brk = 1;
                j++;
            }
            return new HeightMapBranch(HeightMap.of(nodes.slice(0, i)), brk, HeightMap.of(nodes.slice(j)));
        }
    }
    HeightMap.prototype.size = 1;
    class HeightMapBlock extends HeightMap {
        constructor(length, height, type) {
            super(length, height);
            this.type = type;
        }
        blockAt(height, doc, top, offset) {
            return new BlockInfo(offset, this.length, top, this.height, this.type);
        }
        lineAt(value, type, doc, top, offset) {
            return this.blockAt(0, doc, top, offset);
        }
        forEachLine(from, to, doc, top, offset, f) {
            f(this.blockAt(0, doc, top, offset));
        }
        updateHeight(oracle, offset = 0, force = false, measured) {
            if (measured && measured.from <= offset && measured.more)
                this.setHeight(oracle, measured.heights[measured.index++]);
            this.outdated = false;
            return this;
        }
        toString() { return `block(${this.length})`; }
    }
    class HeightMapText extends HeightMapBlock {
        constructor(length, height) {
            super(length, height, BlockType.Text);
            this.collapsed = 0; // Amount of collapsed content in the line
            this.widgetHeight = 0; // Maximum inline widget height
        }
        replace(from, to, nodes) {
            if (nodes.length == 1 && nodes[0] instanceof HeightMapText && Math.abs(this.length - nodes[0].length) < 10) {
                nodes[0].height = this.height;
                return nodes[0];
            }
            else {
                return HeightMap.of(nodes);
            }
        }
        updateHeight(oracle, offset = 0, force = false, measured) {
            if (measured && measured.from <= offset && measured.more)
                this.setHeight(oracle, measured.heights[measured.index++]);
            else if (force || this.outdated)
                this.setHeight(oracle, Math.max(this.widgetHeight, oracle.heightForLine(this.length - this.collapsed)));
            this.outdated = false;
            return this;
        }
        toString() {
            return `line(${this.length}${this.collapsed ? -this.collapsed : ""}${this.widgetHeight ? ":" + this.widgetHeight : ""})`;
        }
    }
    class HeightMapGap extends HeightMap {
        constructor(length) { super(length, 0); }
        lines(doc, offset) {
            let firstLine = doc.lineAt(offset).number, lastLine = doc.lineAt(offset + this.length).number;
            return { firstLine, lastLine, lineHeight: this.height / (lastLine - firstLine + 1) };
        }
        blockAt(height, doc, top, offset) {
            let { firstLine, lastLine, lineHeight } = this.lines(doc, offset);
            let line = Math.max(0, Math.min(lastLine - firstLine, Math.floor((height - top) / lineHeight)));
            let { start, length } = doc.line(firstLine + line);
            return new BlockInfo(start, length, top + lineHeight * line, lineHeight, BlockType.Text);
        }
        lineAt(value, type, doc, top, offset) {
            if (type == QueryType.ByHeight)
                return this.blockAt(value, doc, top, offset);
            if (type == QueryType.ByPosNoHeight) {
                let { start, end } = doc.lineAt(value);
                return new BlockInfo(start, end - start, 0, 0, BlockType.Text);
            }
            let { firstLine, lineHeight } = this.lines(doc, offset);
            let { start, length, number } = doc.lineAt(value);
            return new BlockInfo(start, length, top + lineHeight * (number - firstLine), lineHeight, BlockType.Text);
        }
        forEachLine(from, to, doc, top, offset, f) {
            let { firstLine, lastLine, lineHeight } = this.lines(doc, offset);
            for (let line = firstLine; line <= lastLine; line++) {
                let { start, end } = doc.line(line);
                if (start > to)
                    break;
                if (end >= from)
                    f(new BlockInfo(start, end - start, top, top += lineHeight, BlockType.Text));
            }
        }
        replace(from, to, nodes) {
            let after = this.length - to;
            if (after > 0) {
                let last = nodes[nodes.length - 1];
                if (last instanceof HeightMapGap)
                    nodes[nodes.length - 1] = new HeightMapGap(last.length + after);
                else
                    nodes.push(null, new HeightMapGap(after - 1));
            }
            if (from > 0) {
                let first = nodes[0];
                if (first instanceof HeightMapGap)
                    nodes[0] = new HeightMapGap(from + first.length);
                else
                    nodes.unshift(new HeightMapGap(from - 1), null);
            }
            return HeightMap.of(nodes);
        }
        decomposeLeft(to, result) {
            result.push(to == this.length ? this : new HeightMapGap(to));
        }
        decomposeRight(from, result) {
            result.push(from == 0 ? this : new HeightMapGap(this.length - from));
        }
        updateHeight(oracle, offset = 0, force = false, measured) {
            let end = offset + this.length;
            if (measured && measured.from <= offset + this.length && measured.more) {
                // Fill in part of this gap with measured lines. We know there
                // can't be widgets or collapsed ranges in those lines, because
                // they would already have been added to the heightmap (gaps
                // only contain plain text).
                let nodes = [], pos = Math.max(offset, measured.from);
                if (measured.from > offset)
                    nodes.push(new HeightMapGap(measured.from - offset - 1).updateHeight(oracle, offset));
                while (pos <= end && measured.more) {
                    let len = oracle.doc.lineAt(pos).length;
                    if (nodes.length)
                        nodes.push(null);
                    let line = new HeightMapText(len, measured.heights[measured.index++]);
                    line.outdated = false;
                    nodes.push(line);
                    pos += len + 1;
                }
                if (pos <= end)
                    nodes.push(null, new HeightMapGap(end - pos).updateHeight(oracle, pos));
                oracle.heightChanged = true;
                return HeightMap.of(nodes);
            }
            else if (force || this.outdated) {
                this.setHeight(oracle, oracle.heightForGap(offset, offset + this.length));
                this.outdated = false;
            }
            return this;
        }
        toString() { return `gap(${this.length})`; }
    }
    class HeightMapBranch extends HeightMap {
        constructor(left, brk, right) {
            super(left.length + brk + right.length, left.height + right.height, brk | (left.outdated || right.outdated ? 2 /* Outdated */ : 0));
            this.left = left;
            this.right = right;
            this.size = left.size + right.size;
        }
        get break() { return this.flags & 1 /* Break */; }
        blockAt(height, doc, top, offset) {
            let mid = top + this.left.height;
            return height < mid || this.right.height == 0 ? this.left.blockAt(height, doc, top, offset)
                : this.right.blockAt(height, doc, mid, offset + this.left.length + this.break);
        }
        lineAt(value, type, doc, top, offset) {
            let rightTop = top + this.left.height, rightOffset = offset + this.left.length + this.break;
            let left = type == QueryType.ByHeight ? value < rightTop || this.right.height == 0 : value < rightOffset;
            let base = left ? this.left.lineAt(value, type, doc, top, offset)
                : this.right.lineAt(value, type, doc, rightTop, rightOffset);
            if (this.break || (left ? base.to < rightOffset : base.from > rightOffset))
                return base;
            let subQuery = type == QueryType.ByPosNoHeight ? QueryType.ByPosNoHeight : QueryType.ByPos;
            if (left)
                return base.join(this.right.lineAt(rightOffset, subQuery, doc, rightTop, rightOffset));
            else
                return this.left.lineAt(rightOffset, subQuery, doc, top, offset).join(base);
        }
        forEachLine(from, to, doc, top, offset, f) {
            let rightTop = top + this.left.height, rightOffset = offset + this.left.length + this.break;
            if (this.break) {
                if (from < rightOffset)
                    this.left.forEachLine(from, to, doc, top, offset, f);
                if (to >= rightOffset)
                    this.right.forEachLine(from, to, doc, rightTop, rightOffset, f);
            }
            else {
                let mid = this.lineAt(rightOffset, QueryType.ByPos, doc, top, offset);
                if (from < mid.from)
                    this.left.forEachLine(from, mid.from - 1, doc, top, offset, f);
                if (mid.to >= from && mid.from <= to)
                    f(mid);
                if (to > mid.to)
                    this.right.forEachLine(mid.to + 1, to, doc, rightTop, rightOffset, f);
            }
        }
        replace(from, to, nodes) {
            let rightStart = this.left.length + this.break;
            if (to < rightStart)
                return this.balanced(this.left.replace(from, to, nodes), this.right);
            if (from > this.left.length)
                return this.balanced(this.left, this.right.replace(from - rightStart, to - rightStart, nodes));
            let result = [];
            if (from > 0)
                this.decomposeLeft(from, result);
            let left = result.length;
            for (let node of nodes)
                result.push(node);
            if (from > 0)
                mergeGaps(result, left - 1);
            if (to < this.length) {
                let right = result.length;
                this.decomposeRight(to, result);
                mergeGaps(result, right);
            }
            return HeightMap.of(result);
        }
        decomposeLeft(to, result) {
            let left = this.left.length;
            if (to <= left)
                return this.left.decomposeLeft(to, result);
            result.push(this.left);
            if (this.break) {
                left++;
                if (to >= left)
                    result.push(null);
            }
            if (to > left)
                this.right.decomposeLeft(to - left, result);
        }
        decomposeRight(from, result) {
            let left = this.left.length, right = left + this.break;
            if (from >= right)
                return this.right.decomposeRight(from - right, result);
            if (from < left)
                this.left.decomposeRight(from, result);
            if (this.break && from < right)
                result.push(null);
            result.push(this.right);
        }
        balanced(left, right) {
            if (left.size > 2 * right.size || right.size > 2 * left.size)
                return HeightMap.of(this.break ? [left, null, right] : [left, right]);
            this.left = left;
            this.right = right;
            this.height = left.height + right.height;
            this.outdated = left.outdated || right.outdated;
            this.size = left.size + right.size;
            this.length = left.length + this.break + right.length;
            return this;
        }
        updateHeight(oracle, offset = 0, force = false, measured) {
            let { left, right } = this, rightStart = offset + left.length + this.break, rebalance = null;
            if (measured && measured.from <= offset + left.length && measured.more)
                rebalance = left = left.updateHeight(oracle, offset, force, measured);
            else
                left.updateHeight(oracle, offset, force);
            if (measured && measured.from <= rightStart + right.length && measured.more)
                rebalance = right = right.updateHeight(oracle, rightStart, force, measured);
            else
                right.updateHeight(oracle, rightStart, force);
            if (rebalance)
                return this.balanced(left, right);
            this.height = this.left.height + this.right.height;
            this.outdated = false;
            return this;
        }
        toString() { return this.left + (this.break ? " " : "-") + this.right; }
    }
    function mergeGaps(nodes, around) {
        let before, after;
        if (nodes[around] == null &&
            (before = nodes[around - 1]) instanceof HeightMapGap &&
            (after = nodes[around + 1]) instanceof HeightMapGap)
            nodes.splice(around - 1, 3, new HeightMapGap(before.length + 1 + after.length));
    }
    const relevantWidgetHeight = 5;
    class NodeBuilder {
        constructor(pos, oracle) {
            this.pos = pos;
            this.oracle = oracle;
            this.nodes = [];
            this.lineStart = -1;
            this.lineEnd = -1;
            this.covering = null;
            this.writtenTo = pos;
        }
        get isCovered() {
            return this.covering && this.nodes[this.nodes.length - 1] == this.covering;
        }
        span(from, to) {
            if (this.lineStart > -1) {
                let end = Math.min(to, this.lineEnd), last = this.nodes[this.nodes.length - 1];
                if (last instanceof HeightMapText)
                    last.length += end - this.pos;
                else if (end > this.pos || !this.isCovered)
                    this.nodes.push(new HeightMapText(end - this.pos, -1));
                this.writtenTo = end;
                if (to > end) {
                    this.nodes.push(null);
                    this.writtenTo++;
                    this.lineStart = -1;
                }
            }
            this.pos = to;
        }
        point(from, to, deco) {
            let height = deco.widget ? Math.max(0, deco.widget.estimatedHeight) : 0;
            let len = to - from;
            if (deco.block) {
                this.addBlock(new HeightMapBlock(len, height, deco.type));
            }
            else if (len || height >= relevantWidgetHeight) {
                this.addLineDeco(height, len);
            }
            if (this.lineEnd > -1 && this.lineEnd < this.pos)
                this.lineEnd = this.oracle.doc.lineAt(this.pos).end;
        }
        enterLine() {
            if (this.lineStart > -1)
                return;
            let { start, end } = this.oracle.doc.lineAt(this.pos);
            this.lineStart = start;
            this.lineEnd = end;
            if (this.writtenTo < start) {
                if (this.writtenTo < start - 1 || this.nodes[this.nodes.length - 1] == null)
                    this.nodes.push(new HeightMapGap(start - this.writtenTo - 1));
                this.nodes.push(null);
            }
            if (this.pos > start)
                this.nodes.push(new HeightMapText(this.pos - start, -1));
            this.writtenTo = this.pos;
        }
        ensureLine() {
            this.enterLine();
            let last = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
            if (last instanceof HeightMapText)
                return last;
            let line = new HeightMapText(0, -1);
            this.nodes.push(line);
            return line;
        }
        addBlock(block) {
            this.enterLine();
            if (block.type == BlockType.WidgetAfter && !this.isCovered)
                this.ensureLine();
            this.nodes.push(block);
            this.writtenTo = this.pos = this.pos + block.length;
            if (block.type != BlockType.WidgetBefore)
                this.covering = block;
        }
        addLineDeco(height, length) {
            let line = this.ensureLine();
            line.length += length;
            line.collapsed += length;
            line.widgetHeight = Math.max(line.widgetHeight, height);
            this.writtenTo = this.pos = this.pos + length;
        }
        finish(from) {
            let last = this.nodes.length == 0 ? null : this.nodes[this.nodes.length - 1];
            if (this.lineStart > -1 && !(last instanceof HeightMapText) && !this.isCovered)
                this.nodes.push(new HeightMapText(0, -1));
            else if (this.writtenTo < this.pos || last == null)
                this.nodes.push(new HeightMapGap(this.pos - this.writtenTo));
            let pos = from;
            for (let node of this.nodes) {
                if (node instanceof HeightMapText)
                    node.updateHeight(this.oracle, pos);
                pos += node ? node.length : 1;
            }
            return this.nodes;
        }
        ignore(from, to, value) { return from == to && !value.heightRelevant; }
        // Always called with a region that on both sides either stretches
        // to a line break or the end of the document.
        // The returned array uses null to indicate line breaks, but never
        // starts or ends in a line break, or has multiple line breaks next
        // to each other.
        static build(oracle, decorations, from, to) {
            let builder = new NodeBuilder(from, oracle);
            RangeSet.iterateSpans(decorations, from, to, builder);
            return builder.finish(from);
        }
    }

    function visiblePixelRange(dom, paddingTop) {
        let rect = dom.getBoundingClientRect();
        let top = Math.max(0, Math.min(innerHeight, rect.top)), bottom = Math.max(0, Math.min(innerHeight, rect.bottom));
        for (let parent = dom.parentNode; parent;) { // (Cast to any because TypeScript is useless with Node types)
            if (parent.nodeType == 1) {
                if (parent.scrollHeight > parent.clientHeight) {
                    let parentRect = parent.getBoundingClientRect();
                    top = Math.min(parentRect.bottom, Math.max(parentRect.top, top));
                    bottom = Math.min(parentRect.bottom, Math.max(parentRect.top, bottom));
                }
                parent = parent.parentNode;
            }
            else if (parent.nodeType == 11) { // Shadow root
                parent = parent.host;
            }
            else {
                break;
            }
        }
        return { top: top - (rect.top + paddingTop), bottom: bottom - (rect.top + paddingTop) };
    }
    const VIEWPORT_MARGIN = 1000; // FIXME look into appropriate value of this through benchmarking etc
    const MIN_COVER_MARGIN = 10; // coveredBy requires at least this many extra pixels to be covered
    const MAX_COVER_MARGIN = VIEWPORT_MARGIN / 4;
    class ViewportState {
        constructor() {
            // These are contentDOM-local coordinates
            this.top = 0;
            this.bottom = 0;
        }
        updateFromDOM(dom, paddingTop) {
            let { top, bottom } = visiblePixelRange(dom, paddingTop);
            let dTop = top - this.top, dBottom = bottom - this.bottom, bias = 0;
            if (dTop > 0 && dBottom > 0)
                bias = Math.max(dTop, dBottom);
            else if (dTop < 0 && dBottom < 0)
                bias = Math.min(dTop, dBottom);
            this.top = top;
            this.bottom = bottom;
            return bias;
        }
        coverEverything() {
            this.top = -1e9;
            this.bottom = 1e9;
        }
        getViewport(doc, heightMap, bias, scrollTo) {
            // This will divide VIEWPORT_MARGIN between the top and the
            // bottom, depending on the bias (the change in viewport position
            // since the last update). It'll hold a number between 0 and 1
            let marginTop = 0.5 - Math.max(-0.5, Math.min(0.5, bias / VIEWPORT_MARGIN / 2));
            let viewport = new Viewport(heightMap.lineAt(this.top - marginTop * VIEWPORT_MARGIN, QueryType.ByHeight, doc, 0, 0).from, heightMap.lineAt(this.bottom + (1 - marginTop) * VIEWPORT_MARGIN, QueryType.ByHeight, doc, 0, 0).to);
            // If scrollTo is > -1, make sure the viewport includes that position
            if (scrollTo > -1) {
                if (scrollTo < viewport.from) {
                    let { top } = heightMap.lineAt(scrollTo, QueryType.ByPos, doc, 0, 0);
                    viewport = new Viewport(heightMap.lineAt(top - VIEWPORT_MARGIN / 2, QueryType.ByHeight, doc, 0, 0).from, heightMap.lineAt(top + (this.bottom - this.top) + VIEWPORT_MARGIN / 2, QueryType.ByHeight, doc, 0, 0).to);
                }
                else if (scrollTo > viewport.to) {
                    let { bottom } = heightMap.lineAt(scrollTo, QueryType.ByPos, doc, 0, 0);
                    viewport = new Viewport(heightMap.lineAt(bottom - (this.bottom - this.top) - VIEWPORT_MARGIN / 2, QueryType.ByHeight, doc, 0, 0).from, heightMap.lineAt(bottom + VIEWPORT_MARGIN / 2, QueryType.ByHeight, doc, 0, 0).to);
                }
            }
            return viewport;
        }
        coveredBy(doc, viewport, heightMap, bias = 0) {
            let { top } = heightMap.lineAt(viewport.from, QueryType.ByPos, doc, 0, 0);
            let { bottom } = heightMap.lineAt(viewport.to, QueryType.ByPos, doc, 0, 0);
            return (viewport.from == 0 || top <= this.top - Math.max(MIN_COVER_MARGIN, Math.min(-bias, MAX_COVER_MARGIN))) &&
                (viewport.to == doc.length || bottom >= this.bottom + Math.max(MIN_COVER_MARGIN, Math.min(bias, MAX_COVER_MARGIN)));
        }
    }
    /// Indicates the range of the document that is in the visible
    /// viewport.
    class Viewport {
        constructor(from, to) {
            this.from = from;
            this.to = to;
        }
        clip(pos) { return Math.max(this.from, Math.min(this.to, pos)); }
        eq(b) { return this.from == b.from && this.to == b.to; }
    }

    const observeOptions = {
        childList: true,
        characterData: true,
        subtree: true,
        characterDataOldValue: true
    };
    // IE11 has very broken mutation observers, so we also listen to
    // DOMCharacterDataModified there
    const useCharData = browser.ie && browser.ie_version <= 11;
    class DOMObserver {
        constructor(docView, onChange, onScrollChanged) {
            this.docView = docView;
            this.onChange = onChange;
            this.onScrollChanged = onScrollChanged;
            this.active = false;
            this.ignoreSelection = new DOMSelection;
            this.charDataQueue = [];
            this.charDataTimeout = null;
            this.scrollTargets = [];
            this.intersection = null;
            this.intersecting = false;
            this.dom = docView.dom;
            this.observer = new MutationObserver(mutations => this.flush(mutations));
            if (useCharData)
                this.onCharData = (event) => {
                    this.charDataQueue.push({ target: event.target,
                        type: "characterData",
                        oldValue: event.prevValue });
                    if (this.charDataTimeout == null)
                        this.charDataTimeout = setTimeout(() => this.flush(), 20);
                };
            this.onSelectionChange = () => {
                if (this.docView.root.activeElement == this.dom)
                    this.flush();
            };
            this.start();
            this.onScroll = this.onScroll.bind(this);
            window.addEventListener("scroll", this.onScroll);
            if (typeof IntersectionObserver == "function") {
                this.intersection = new IntersectionObserver(entries => {
                    if (entries[entries.length - 1].intersectionRatio > 0 != this.intersecting) {
                        this.intersecting = !this.intersecting;
                        this.onScroll();
                    }
                }, {});
                this.intersection.observe(this.dom);
            }
            this.listenForScroll();
        }
        onScroll() {
            if (this.intersecting) {
                this.flush();
                this.onScrollChanged();
            }
        }
        listenForScroll() {
            let i = 0, changed = null;
            for (let dom = this.dom; dom;) {
                if (dom.nodeType == 1) {
                    if (!changed && i < this.scrollTargets.length && this.scrollTargets[i] == dom)
                        i++;
                    else if (!changed)
                        changed = this.scrollTargets.slice(0, i);
                    if (changed)
                        changed.push(dom);
                    dom = dom.parentNode;
                }
                else if (dom.nodeType == 11) { // Shadow root
                    dom = dom.host;
                }
                else {
                    break;
                }
            }
            if (i < this.scrollTargets.length && !changed)
                changed = this.scrollTargets.slice(0, i);
            if (changed) {
                for (let dom of this.scrollTargets)
                    dom.removeEventListener("scroll", this.onScroll);
                for (let dom of this.scrollTargets = changed)
                    dom.addEventListener("scroll", this.onScroll);
            }
        }
        ignore(f) {
            if (!this.active)
                return f();
            try {
                this.stop();
                return f();
            }
            finally {
                this.start();
                this.clear();
            }
        }
        start() {
            if (this.active)
                return;
            this.observer.observe(this.dom, observeOptions);
            // FIXME is this shadow-root safe?
            this.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
            if (useCharData)
                this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
            this.active = true;
        }
        stop() {
            if (!this.active)
                return;
            this.active = false;
            this.observer.disconnect();
            this.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
            if (useCharData)
                this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
        }
        takeCharRecords() {
            let result = this.charDataQueue;
            if (result.length) {
                this.charDataQueue = [];
                clearTimeout(this.charDataTimeout);
                this.charDataTimeout = null;
            }
            return result;
        }
        clearSelection() {
            this.ignoreSelection.set(this.docView.root.getSelection());
        }
        // Throw away any pending changes
        clear() {
            this.observer.takeRecords();
            this.takeCharRecords();
            this.clearSelection();
        }
        // Apply pending changes, if any
        flush(records = this.observer.takeRecords()) {
            if (this.charDataQueue.length)
                records = records.concat(this.takeCharRecords());
            let selection = this.docView.root.getSelection();
            let newSel = !this.ignoreSelection.eq(selection) && hasSelection(this.dom, selection);
            if (records.length == 0 && !newSel)
                return;
            let from = -1, to = -1, typeOver = false;
            for (let record of records) {
                let range = this.readMutation(record);
                if (!range)
                    continue;
                if (range.typeOver)
                    typeOver = true;
                if (from == -1) {
                    ({ from, to } = range);
                }
                else {
                    from = Math.min(range.from, from);
                    to = Math.max(range.to, to);
                }
            }
            let apply = from > -1 || newSel;
            if (!apply || !this.onChange(from, to, typeOver)) {
                if (this.docView.dirty) {
                    this.ignore(() => this.docView.sync());
                    this.docView.dirty = 0 /* Not */;
                }
                this.docView.updateSelection();
            }
            this.clearSelection();
        }
        readMutation(rec) {
            let cView = this.docView.nearest(rec.target);
            if (!cView || cView.ignoreMutation(rec))
                return null;
            cView.markDirty();
            if (rec.type == "childList") {
                let childBefore = findChild(cView, rec.previousSibling || rec.target.previousSibling, -1);
                let childAfter = findChild(cView, rec.nextSibling || rec.target.nextSibling, 1);
                return { from: childBefore ? cView.posAfter(childBefore) : cView.posAtStart,
                    to: childAfter ? cView.posBefore(childAfter) : cView.posAtEnd, typeOver: false };
            }
            else { // "characterData"
                return { from: cView.posAtStart, to: cView.posAtEnd, typeOver: rec.target.nodeValue == rec.oldValue };
            }
        }
        destroy() {
            this.stop();
            if (this.intersection)
                this.intersection.disconnect();
            for (let dom of this.scrollTargets)
                dom.removeEventListener("scroll", this.onScroll);
            window.removeEventListener("scroll", this.onScroll);
        }
    }
    function findChild(cView, dom, dir) {
        while (dom) {
            let curView = dom.cmView;
            if (curView && curView.parent == cView)
                return curView;
            let parent = dom.parentNode;
            dom = parent != cView.dom ? parent : dir > 0 ? dom.nextSibling : dom.previousSibling;
        }
        return null;
    }

    const none$3$1 = [];
    const extendView = new ExtensionGroup(view => view.plugins);
    const handleDOMEvents = extendView.behavior();
    const clickAddsSelectionRange = extendView.behavior();
    const dragMovesSelection = extendView.behavior();
    /// View plugins associate stateful values with a view. They can
    /// influence the way the content is drawn, and are notified of things
    /// that happen in the view. They can be combined with [dynamic
    /// behavior](#extension.ExtensionGroup.dynamic) to
    /// [add](#view.EditorView^decorations)
    /// [decorations](#view.Decoration) to the view. Objects of this type
    /// serve as keys to [access](#view.EditorView.plugin) the value of
    /// the plugin.
    class ViewPlugin {
        constructor(
        /// @internal
        create, 
        /// @internal
        id, 
        /// @internal
        behaviorExtensions) {
            this.create = create;
            this.id = id;
            this.behaviorExtensions = behaviorExtensions;
        }
        /// An extension that can be used to install this plugin in a view.
        get extension() {
            return [viewPlugin(this), ...this.behaviorExtensions];
        }
        /// Declare a plugin. The `create` function will be called while
        /// initializing or reconfiguring an editor view to create the
        /// actual plugin instance.
        static create(create) {
            return new ViewPlugin(create, extendView.storageID(), []);
        }
        /// Declare a behavior as a function of this plugin. `read` maps
        /// from the plugin value to the behavior's input type.
        behavior(behavior, read) {
            return new ViewPlugin(this.create, this.id, this.behaviorExtensions.concat(extendView.dynamic(behavior, view => read(view.plugin(this)))));
        }
        /// Declare that this plugin provides [decorations](#view.EditorView^decorations).
        decorations(read) {
            return this.behavior(decorations, read);
        }
        /// Create a view plugin extension that only computes decorations.
        static decoration(spec) {
            return ViewPlugin.create(view => new DecorationPlugin(view, spec)).decorations(p => p.decorations).extension;
        }
    }
    const editorAttributes = extendView.behavior({
        combine: values => values.reduce((a, b) => combineAttrs(b, a), {})
    });
    const contentAttributes = extendView.behavior({
        combine: values => values.reduce((a, b) => combineAttrs(b, a), {})
    });
    // Registers view plugins.
    const viewPlugin = extendView.behavior({ static: true });
    // Provide decorations
    const decorations = extendView.behavior();
    class DecorationPlugin {
        constructor(view, spec) {
            this.spec = spec;
            this.decorations = spec.create(view);
        }
        update(update) {
            this.decorations = this.spec.update(this.spec.map ? this.decorations.map(update.changes) : this.decorations, update);
        }
    }
    const styleModule = extendView.behavior();
    const theme = extendView.behavior();
    const phrases = extendView.behavior();
    const scrollMargins = extendView.behavior({
        combine(rects) {
            let result = { left: 0, top: 0, right: 0, bottom: 0 };
            for (let r of rects) {
                result.left = Math.max(result.left, r.left || 0);
                result.top = Math.max(result.top, r.top || 0);
                result.right = Math.max(result.right, r.right || 0);
                result.bottom = Math.max(result.bottom, r.bottom || 0);
            }
            return result;
        }
    });
    const focusChange = Annotation.define();
    const notified = Annotation.define();
    /// View [plugins](#view.ViewPlugin) are given instances of this
    /// class, which describe what happened, whenever the view is updated.
    class ViewUpdate {
        /// @internal
        constructor(
        /// The editor view that the update is associated with.
        view, 
        /// The transactions involved in the update. May be empty.
        transactions = none$3$1, 
        /// @internal
        _annotations = none$3$1) {
            this.view = view;
            this.transactions = transactions;
            this._annotations = _annotations;
            this.state = transactions.length ? transactions[transactions.length - 1].apply() : view.state;
            this.changes = transactions.reduce((chs, tr) => chs.appendSet(tr.changes), ChangeSet.empty);
            this.prevState = view.state;
            this.prevViewport = view._viewport;
            this.prevThemes = view.behavior(theme);
        }
        /// The new viewport range.
        get viewport() { return this.view._viewport; }
        /// Tells you whether the viewport changed in this update.
        get viewportChanged() {
            return !this.prevViewport.eq(this.view._viewport);
        }
        /// Whether the document changed in this update.
        get docChanged() {
            return this.transactions.some(tr => tr.docChanged);
        }
        /// Tells you whether the set of active [theme
        /// extensions](#view.EditorView^theme) changed, which may require
        /// plugins to update [CSS class names](#view.EditorView.cssClass)
        /// on their DOM elements.
        get themeChanged() {
            return this.prevThemes != this.view.behavior(theme);
        }
        /// Get the value of the given annotation, if it was passed directly
        /// for the update or present in any of the transactions involved in
        /// the update.
        annotation(type) {
            for (let ann of this._annotations)
                if (ann.type == type)
                    return ann.value;
            for (let i = this.transactions.length - 1; i >= 0; i--) {
                let value = this.transactions[i].annotation(type);
                if (value !== undefined)
                    return value;
            }
            return undefined;
        }
        /// Get the values of all instances of the given annotation type
        /// present in the transactions or passed directly to
        /// [`update`](#view.EditorView.update).
        annotations(type) {
            let result = none$3$1;
            for (let tr of this.transactions) {
                let ann = tr.annotations(type);
                if (ann.length)
                    result = result.concat(ann);
            }
            for (let ann of this._annotations) {
                if (ann.type == type)
                    result = result.concat([ann.value]);
            }
            return result;
        }
    }

    const none$4 = [];
    class DocView extends ContentView {
        constructor(view, onDOMChange) {
            super();
            this.view = view;
            this.viewports = none$4;
            this.compositionDeco = Decoration.none;
            this.gapDeco = Decoration.none;
            this.selectionDirty = null;
            this.forceSelectionUpdate = false;
            this.heightMap = HeightMap.empty();
            this.heightOracle = new HeightOracle;
            this.layoutCheckScheduled = -1;
            // A document position that has to be scrolled into view at the next layout check
            this.scrollIntoView = -1;
            this.paddingTop = 0;
            this.paddingBottom = 0;
            // Track a minimum width for the editor. When measuring sizes in
            // checkLayout, this is updated to point at the width of a given
            // element and its extent in the document. When a change happens in
            // that range, these are reset. That way, once we've seen a
            // line/element of a given length, we keep the editor wide enough to
            // fit at least that element, until it is changed, at which point we
            // forget it again.
            this.minWidth = 0;
            this.minWidthFrom = 0;
            this.minWidthTo = 0;
            // Track whether the DOM selection was set in a lossy way, so that
            // we don't mess it up when reading it back it
            this.impreciseAnchor = null;
            this.impreciseHead = null;
            this.setDOM(view.contentDOM);
            this.viewportState = new ViewportState;
            this.observer = new DOMObserver(this, onDOMChange, () => this.checkLayout());
        }
        get length() { return this.state.doc.length; }
        get state() { return this.view.state; }
        get viewport() { return this.view._viewport; }
        get root() { return this.view.root; }
        get editorView() { return this.view; }
        init(state, initialize) {
            this.children = [new LineView];
            this.children[0].setParent(this);
            this.viewports = this.decorations = none$4;
            this.minWidth = 0;
            this.compositionDeco = Decoration.none;
            let changedRanges = [new ChangedRange(0, 0, 0, state.doc.length)];
            this.heightMap = this.heightMap.applyChanges(none$4, Text.empty, this.heightOracle.setDoc(state.doc), changedRanges);
            this.computeUpdate(state, state.doc, null, initialize, none$4, 0, -1);
            this.updateInner(changedRanges, 0);
            this.scheduleLayoutCheck();
        }
        // Update the document view to a given state. scrollIntoView can be
        // used as a hint to compute a new viewport that includes that
        // position, if we know the editor is going to scroll that position
        // into view.
        update(update, scrollIntoView = -1) {
            let prevDoc = this.state.doc;
            let state = update ? update.state : this.state;
            let changedRanges = update ? update.changes.changedRanges() : none$4;
            if (this.minWidth > 0 && changedRanges.length) {
                if (!changedRanges.every(({ fromA, toA }) => toA < this.minWidthFrom || fromA > this.minWidthTo)) {
                    this.minWidth = 0;
                }
                else {
                    this.minWidthFrom = ChangedRange.mapPos(this.minWidthFrom, 1, changedRanges);
                    this.minWidthTo = ChangedRange.mapPos(this.minWidthTo, 1, changedRanges);
                }
            }
            let contentChanges = this.computeUpdate(state, prevDoc, update, null, changedRanges, 0, scrollIntoView);
            // When the DOM nodes around the selection are moved to another
            // parent, Chrome sometimes reports a different selection through
            // getSelection than the one that it actually shows to the user.
            // This forces a selection update when lines are joined to work
            // around that. Issue #54
            if (browser.chrome && !this.compositionDeco.size && update && update.changes.changes.some(ch => ch.text.length > 1))
                this.forceSelectionUpdate = true;
            if (this.dirty == 0 /* Not */ && contentChanges.length == 0 &&
                this.state.selection.primary.from >= this.viewport.from &&
                this.state.selection.primary.to <= this.viewport.to &&
                (!update || update._annotations.length == 0)) {
                this.updateSelection();
                if (scrollIntoView > -1)
                    this.scrollPosIntoView(scrollIntoView);
                if (update)
                    this.scheduleLayoutCheck();
            }
            else {
                this.updateInner(contentChanges, prevDoc.length);
                this.cancelLayoutCheck();
                if (scrollIntoView > -1)
                    this.scrollIntoView = scrollIntoView;
                this.scheduleLayoutCheck();
            }
        }
        scheduleLayoutCheck() {
            this.layoutCheckScheduled = requestAnimationFrame(() => this.checkLayout());
        }
        // Used both by update and checkLayout do perform the actual DOM
        // update
        updateInner(changes, oldLength) {
            let visible = this.viewport, viewports = [visible];
            let { head, anchor } = this.state.selection.primary;
            if (head < visible.from || head > visible.to) {
                let { from, to } = this.lineAt(head, 0);
                viewports.push(new Viewport(from, to));
            }
            if (!viewports.some(({ from, to }) => anchor >= from && anchor <= to)) {
                let { from, to } = this.lineAt(anchor, 0);
                viewports.push(new Viewport(from, to));
            }
            viewports.sort((a, b) => a.from - b.from);
            this.updateChildren(changes, viewports, oldLength);
            this.viewports = viewports;
            this.observer.ignore(() => {
                // Lock the height during redrawing, since Chrome sometimes
                // messes with the scroll position during DOM mutation (though
                // no relayout is triggered and I cannot imagine how it can
                // recompute the scroll position without a layout)
                this.dom.style.height = this.heightMap.height + "px";
                this.dom.style.minWidth = this.minWidth + "px";
                this.sync();
                this.dirty = 0 /* Not */;
                this.updateSelection();
                this.dom.style.height = "";
            });
        }
        updateChildren(changes, viewports, oldLength) {
            let gapDeco = this.computeGapDeco(viewports, this.length);
            let gapChanges = findChangedRanges(this.gapDeco, gapDeco, changes, oldLength);
            this.gapDeco = gapDeco;
            changes = extendWithRanges(changes, gapChanges.content);
            let allDeco = [gapDeco].concat(this.decorations);
            let cursor = this.childCursor(oldLength);
            for (let i = changes.length - 1;; i--) {
                let next = i >= 0 ? changes[i] : null;
                if (!next)
                    break;
                let { fromA, toA, fromB, toB } = next;
                let { content, breakAtStart } = ContentBuilder.build(this.state.doc, fromB, toB, allDeco);
                let { i: toI, off: toOff } = cursor.findPos(toA, 1);
                let { i: fromI, off: fromOff } = cursor.findPos(fromA, -1);
                this.replaceRange(fromI, fromOff, toI, toOff, content, breakAtStart);
            }
        }
        replaceRange(fromI, fromOff, toI, toOff, content, breakAtStart) {
            let before = this.children[fromI], last = content.length ? content[content.length - 1] : null;
            let breakAtEnd = last ? last.breakAfter : breakAtStart;
            // Change within a single line
            if (fromI == toI && !breakAtStart && !breakAtEnd && content.length < 2 &&
                before.merge(fromOff, toOff, content.length ? last : null, fromOff == 0))
                return;
            let after = this.children[toI];
            // Make sure the end of the line after the update is preserved in `after`
            if (toOff < after.length || after.children.length && after.children[after.children.length - 1].length == 0) {
                // If we're splitting a line, separate part of the start line to
                // avoid that being mangled when updating the start line.
                if (fromI == toI) {
                    after = after.split(toOff);
                    toOff = 0;
                }
                // If the element after the replacement should be merged with
                // the last replacing element, update `content`
                if (!breakAtEnd && last && after.merge(0, toOff, last, true)) {
                    content[content.length - 1] = after;
                }
                else {
                    // Remove the start of the after element, if necessary, and
                    // add it to `content`.
                    if (toOff || after.children.length && after.children[0].length == 0)
                        after.merge(0, toOff, null, false);
                    content.push(after);
                }
            }
            else if (after.breakAfter) {
                // The element at `toI` is entirely covered by this range.
                // Preserve its line break, if any.
                if (last)
                    last.breakAfter = 1;
                else
                    breakAtStart = 1;
            }
            // Since we've handled the next element from the current elements
            // now, make sure `toI` points after that.
            toI++;
            before.breakAfter = breakAtStart;
            if (fromOff > 0) {
                if (!breakAtStart && content.length && before.merge(fromOff, before.length, content[0], false)) {
                    before.breakAfter = content.shift().breakAfter;
                }
                else if (fromOff < before.length) {
                    before.merge(fromOff, before.length, null, false);
                }
                fromI++;
            }
            // Try to merge widgets on the boundaries of the replacement
            while (fromI < toI && content.length) {
                if (this.children[toI - 1].match(content[content.length - 1]))
                    toI--, content.pop();
                else if (this.children[fromI].match(content[0]))
                    fromI++, content.shift();
                else
                    break;
            }
            if (fromI < toI || content.length)
                this.replaceChildren(fromI, toI, content);
        }
        // Sync the DOM selection to this.state.selection
        updateSelection(takeFocus = false) {
            this.clearSelectionDirty();
            if (this.root.activeElement != this.dom) {
                if (!takeFocus)
                    return;
                if (browser.gecko)
                    this.dom.focus(); // Avoids strange exceptions when setting the selection
            }
            let primary = this.state.selection.primary;
            // FIXME need to handle the case where the selection falls inside a block range
            let anchor = this.domAtPos(primary.anchor);
            let head = this.domAtPos(primary.head);
            let domSel = this.root.getSelection();
            // If the selection is already here, or in an equivalent position, don't touch it
            if (this.forceSelectionUpdate ||
                !isEquivalentPosition(anchor.node, anchor.offset, domSel.anchorNode, domSel.anchorOffset) ||
                !isEquivalentPosition(head.node, head.offset, domSel.focusNode, domSel.focusOffset)) {
                this.forceSelectionUpdate = false;
                this.observer.ignore(() => {
                    // Selection.extend can be used to create an 'inverted' selection
                    // (one where the focus is before the anchor), but not all
                    // browsers support it yet.
                    if (domSel.extend) {
                        domSel.collapse(anchor.node, anchor.offset);
                        if (!primary.empty)
                            domSel.extend(head.node, head.offset);
                    }
                    else {
                        let range = document.createRange();
                        if (primary.anchor > primary.head)
                            [anchor, head] = [head, anchor];
                        range.setEnd(head.node, head.offset);
                        range.setStart(anchor.node, anchor.offset);
                        domSel.removeAllRanges();
                        domSel.addRange(range);
                    }
                });
            }
            this.impreciseAnchor = anchor.precise ? null : new DOMPos(domSel.anchorNode, domSel.anchorOffset);
            this.impreciseHead = head.precise ? null : new DOMPos(domSel.focusNode, domSel.focusOffset);
        }
        lineAt(pos, editorTop) {
            if (editorTop == null)
                editorTop = this.dom.getBoundingClientRect().top;
            return this.heightMap.lineAt(pos, QueryType.ByPos, this.state.doc, editorTop + this.paddingTop, 0);
        }
        lineAtHeight(height, editorTop) {
            if (editorTop == null)
                editorTop = this.dom.getBoundingClientRect().top;
            return this.heightMap.lineAt(height, QueryType.ByHeight, this.state.doc, editorTop + this.paddingTop, 0);
        }
        blockAtHeight(height, editorTop) {
            if (editorTop == null)
                editorTop = this.dom.getBoundingClientRect().top;
            return this.heightMap.blockAt(height, this.state.doc, editorTop + this.paddingTop, 0);
        }
        forEachLine(from, to, f, editorTop) {
            if (editorTop == null)
                editorTop = this.dom.getBoundingClientRect().top;
            return this.heightMap.forEachLine(from, to, this.state.doc, editorTop + this.paddingTop, 0, f);
        }
        // Compute the new viewport and set of decorations, while giving
        // plugin views the opportunity to respond to state and viewport
        // changes. Might require more than one iteration to become stable.
        computeUpdate(state, oldDoc, update, initializing, contentChanges, viewportBias, scrollIntoView) {
            let invalidHeightMap = contentChanges.length ? contentChanges : null, prevViewport = this.viewport || new Viewport(0, 0);
            for (let i = 0;; i++) {
                let viewport;
                if (invalidHeightMap) {
                    // FIXME this is a terrible kludge (see #128) to get around
                    // the fact that plugins need a viewport to update, but the
                    // heightmap update needs the current decorations, which are
                    // produced by the plugins
                    let from = ChangedRange.mapPos(prevViewport.from, -1, contentChanges);
                    viewport = new Viewport(from, Math.min(from + (prevViewport.to - prevViewport.from) + 1000, ChangedRange.mapPos(prevViewport.to, 1, contentChanges)));
                }
                else {
                    viewport = this.viewportState.getViewport(state.doc, this.heightMap, viewportBias, scrollIntoView);
                }
                let viewportChange = prevViewport ? !viewport.eq(prevViewport) : true;
                // When the viewport is stable and no more iterations are needed, return
                if (!viewportChange && !invalidHeightMap && !update && !initializing)
                    return contentChanges;
                // After 5 tries, give up
                if (i == 5) {
                    console.warn("Viewport and decorations failed to converge");
                    return contentChanges;
                }
                let prevState = this.state || state;
                if (initializing)
                    initializing(viewport);
                else
                    this.view.updateInner(update || new ViewUpdate(this.view), viewport);
                prevViewport = viewport;
                // For the composition decoration, use none on init, recompute
                // when handling transactions, and use the previous value
                // otherwise.
                if (!this.view.inputState.composing)
                    this.compositionDeco = Decoration.none;
                else if (update && update.transactions.length)
                    this.compositionDeco = computeCompositionDeco(this.view, contentChanges);
                let decorations$1 = this.view.behavior(decorations).concat(this.compositionDeco);
                // If the decorations are stable, stop.
                if (!update && !initializing && sameArray(decorations$1, this.decorations))
                    return contentChanges;
                // Compare the decorations (between document changes)
                let { content, height } = decoChanges(update ? contentChanges : none$4, decorations$1, this.decorations, prevState.doc.length);
                this.decorations = decorations$1;
                // Update the heightmap with these changes. If this is the first
                // iteration and the document changed, also include decorations
                // for inserted ranges.
                let heightChanges = extendWithRanges(invalidHeightMap || none$4, height);
                this.heightMap = this.heightMap.applyChanges(decorations$1, oldDoc, this.heightOracle.setDoc(state.doc), heightChanges);
                invalidHeightMap = null;
                oldDoc = state.doc;
                // Accumulate content changes so that they can be redrawn
                contentChanges = extendWithRanges(contentChanges, content);
                // Make sure only one iteration is marked as required / state changing
                update = null;
                initializing = null;
            }
        }
        focus() {
            this.updateSelection(true);
        }
        cancelLayoutCheck() {
            if (this.layoutCheckScheduled > -1) {
                cancelAnimationFrame(this.layoutCheckScheduled);
                this.layoutCheckScheduled = -1;
            }
        }
        checkLayout(forceFull = false) {
            this.cancelLayoutCheck();
            this.measureVerticalPadding();
            let scrollIntoView = Math.min(this.scrollIntoView, this.state.doc.length);
            this.scrollIntoView = -1;
            let scrollBias = 0;
            if (forceFull)
                this.viewportState.coverEverything();
            else
                scrollBias = this.viewportState.updateFromDOM(this.dom, this.paddingTop);
            if (this.viewportState.top >= this.viewportState.bottom)
                return; // We're invisible!
            this.view.updateState = 1 /* Measuring */;
            let lineHeights = this.measureVisibleLineHeights(), refresh = false;
            if (this.heightOracle.mustRefresh(lineHeights)) {
                let { lineHeight, charWidth } = this.measureTextSize();
                refresh = this.heightOracle.refresh(getComputedStyle(this.dom).whiteSpace, lineHeight, charWidth, (this.dom).clientWidth / charWidth, lineHeights);
                if (refresh)
                    this.minWidth = 0;
            }
            if (scrollIntoView > -1)
                this.scrollPosIntoView(scrollIntoView);
            let toMeasure = [];
            for (let plugin of this.view.behavior(viewPlugin)) {
                let value = this.view.plugin(plugin);
                if (value.measure && value.drawMeasured)
                    toMeasure.push(value);
            }
            let update = false, measure = toMeasure.map(plugin => plugin.measure());
            for (let i = 0;; i++) {
                this.heightOracle.heightChanged = false;
                this.heightMap = this.heightMap.updateHeight(this.heightOracle, 0, refresh, new MeasuredHeights(this.viewport.from, lineHeights || this.measureVisibleLineHeights()));
                let covered = this.viewportState.coveredBy(this.state.doc, this.viewport, this.heightMap, scrollBias);
                if (covered && !this.heightOracle.heightChanged)
                    break;
                if (i > 10) {
                    console.warn("Layout failed to converge");
                    break;
                }
                this.view.updateState = 2 /* Updating */;
                update = true;
                let contentChanges = covered ? none$4 : this.computeUpdate(this.state, this.state.doc, null, null, none$4, scrollBias, -1);
                this.updateInner(contentChanges, this.length);
                lineHeights = null;
                refresh = false;
                scrollBias = 0;
                this.view.updateState = 1 /* Measuring */;
                this.viewportState.updateFromDOM(this.dom, this.paddingTop);
                measure = toMeasure.map(plugin => plugin.measure());
            }
            this.view.updateState = 2 /* Updating */;
            while (toMeasure.length) {
                toMeasure = toMeasure.filter((plugin, i) => plugin.drawMeasured(measure[i]));
                measure = toMeasure.map(plugin => plugin.measure());
            }
            if (update) {
                this.observer.listenForScroll();
                this.view.drawPlugins();
            }
            this.view.updateState = 0 /* Idle */;
        }
        scrollPosIntoView(pos) {
            let rect = this.coordsAt(pos);
            if (!rect)
                return;
            let margin = this.view.behavior(scrollMargins);
            scrollRectIntoView(this.dom, { left: rect.left - margin.left, top: rect.top - margin.top,
                right: rect.right + margin.right, bottom: rect.bottom + margin.bottom });
        }
        nearest(dom) {
            for (let cur = dom; cur;) {
                let domView = cur.cmView;
                if (domView && domView.rootView == this)
                    return domView;
                cur = cur.parentNode;
            }
            return null;
        }
        posFromDOM(node, offset) {
            let view = this.nearest(node);
            if (!view)
                throw new RangeError("Trying to find position for a DOM position outside of the document");
            return view.localPosFromDOM(node, offset) + view.posAtStart;
        }
        domAtPos(pos) {
            let { i, off } = this.childCursor().findPos(pos, -1);
            for (; i < this.children.length - 1;) {
                let child = this.children[i];
                if (off < child.length || child instanceof LineView)
                    break;
                i++;
                off = 0;
            }
            return this.children[i].domAtPos(off);
        }
        coordsAt(pos) {
            for (let off = this.length, i = this.children.length - 1;; i--) {
                let child = this.children[i], start = off - child.breakAfter - child.length;
                if (pos >= start && child.type != BlockType.WidgetAfter)
                    return child.coordsAt(pos - start);
                off = start;
            }
        }
        measureVisibleLineHeights() {
            let result = [], { from, to } = this.viewport;
            let minWidth = Math.max(this.dom.clientWidth, this.minWidth) + 1;
            for (let pos = 0, i = 0; i < this.children.length; i++) {
                let child = this.children[i], end = pos + child.length;
                if (end > to)
                    break;
                if (pos >= from) {
                    result.push(child.dom.getBoundingClientRect().height);
                    let width = child.dom.scrollWidth;
                    if (width > minWidth) {
                        this.minWidth = minWidth = width;
                        this.minWidthFrom = pos;
                        this.minWidthTo = end;
                    }
                }
                pos = end + child.breakAfter;
            }
            return result;
        }
        measureVerticalPadding() {
            let style = window.getComputedStyle(this.dom);
            this.paddingTop = parseInt(style.paddingTop) || 0;
            this.paddingBottom = parseInt(style.paddingBottom) || 0;
        }
        measureTextSize() {
            for (let child of this.children) {
                if (child instanceof LineView) {
                    let measure = child.measureTextSize();
                    if (measure)
                        return measure;
                }
            }
            // If no workable line exists, force a layout of a measurable element
            let dummy = document.createElement("div"), lineHeight, charWidth;
            dummy.className = "codemirror-line";
            dummy.textContent = "abc def ghi jkl mno pqr stu";
            this.observer.ignore(() => {
                this.dom.appendChild(dummy);
                let rect = clientRectsFor(dummy.firstChild)[0];
                lineHeight = dummy.getBoundingClientRect().height;
                charWidth = rect ? rect.width / 27 : 7;
                dummy.remove();
            });
            return { lineHeight, charWidth };
        }
        destroy() {
            cancelAnimationFrame(this.layoutCheckScheduled);
            this.observer.destroy();
        }
        clearSelectionDirty() {
            if (this.selectionDirty != null) {
                cancelAnimationFrame(this.selectionDirty);
                this.selectionDirty = null;
            }
        }
        setSelectionDirty() {
            this.observer.clearSelection();
            if (this.selectionDirty == null)
                this.selectionDirty = requestAnimationFrame(() => this.updateSelection());
        }
        childCursor(pos = this.length) {
            // Move back to start of last element when possible, so that
            // `ChildCursor.findPos` doesn't have to deal with the edge case
            // of being after the last element.
            let i = this.children.length;
            if (i)
                pos -= this.children[--i].length;
            return new ChildCursor(this.children, pos, i);
        }
        computeGapDeco(viewports, docLength) {
            let deco = [];
            for (let pos = 0, i = 0;; i++) {
                let next = i == viewports.length ? null : viewports[i];
                let end = next ? next.from - 1 : docLength;
                if (end > pos) {
                    let height = this.lineAt(end, 0).bottom - this.lineAt(pos, 0).top;
                    deco.push(Decoration.replace(pos, end, { widget: new GapWidget(height), block: true, inclusive: true }));
                }
                if (!next)
                    break;
                pos = next.to + 1;
            }
            return Decoration.set(deco);
        }
    }
    // Browsers appear to reserve a fixed amount of bits for height
    // styles, and ignore or clip heights above that. For Chrome and
    // Firefox, this is in the 20 million range, so we try to stay below
    // that.
    const MAX_NODE_HEIGHT = 1e7;
    class GapWidget extends WidgetType {
        toDOM() {
            let elt = document.createElement("div");
            this.updateDOM(elt);
            return elt;
        }
        updateDOM(elt) {
            if (this.value < MAX_NODE_HEIGHT) {
                while (elt.lastChild)
                    elt.lastChild.remove();
                elt.style.height = this.value + "px";
            }
            else {
                elt.style.height = "";
                for (let remaining = this.value; remaining > 0; remaining -= MAX_NODE_HEIGHT) {
                    let fill = elt.appendChild(document.createElement("div"));
                    fill.style.height = Math.min(remaining, MAX_NODE_HEIGHT) + "px";
                }
            }
            return true;
        }
        get estimatedHeight() { return this.value; }
    }
    function decoChanges(diff, decorations, oldDecorations, oldLength) {
        let contentRanges = [], heightRanges = [];
        for (let i = decorations.length - 1; i >= 0; i--) {
            let deco = decorations[i], oldDeco = i < oldDecorations.length ? oldDecorations[i] : Decoration.none;
            if (deco.size == 0 && oldDeco.size == 0)
                continue;
            let newRanges = findChangedRanges(oldDeco, deco, diff, oldLength);
            contentRanges = joinRanges(contentRanges, newRanges.content);
            heightRanges = joinRanges(heightRanges, newRanges.height);
        }
        return { content: contentRanges, height: heightRanges };
    }
    function extendWithRanges(diff, ranges) {
        if (ranges.length == 0)
            return diff;
        let result = [];
        for (let dI = 0, rI = 0, posA = 0, posB = 0;; dI++) {
            let next = dI == diff.length ? null : diff[dI], off = posA - posB;
            let end = next ? next.fromB : 1e9;
            while (rI < ranges.length && ranges[rI] < end) {
                let from = ranges[rI], to = ranges[rI + 1];
                let fromB = Math.max(posB, from), toB = Math.min(end, to);
                if (fromB <= toB)
                    new ChangedRange(fromB + off, toB + off, fromB, toB).addToSet(result);
                if (to > end)
                    break;
                else
                    rI += 2;
            }
            if (!next)
                return result;
            new ChangedRange(next.fromA, next.toA, next.fromB, next.toB).addToSet(result);
            posA = next.toA;
            posB = next.toB;
        }
    }
    function sameArray(a, b) {
        if (a.length != b.length)
            return false;
        for (let i = 0; i < a.length; i++)
            if (a[i] !== b[i])
                return false;
        return true;
    }
    function computeCompositionDeco(view, changes) {
        let sel = view.root.getSelection();
        let textNode = sel.focusNode && nearbyTextNode(sel.focusNode, sel.focusOffset);
        if (!textNode)
            return Decoration.none;
        let cView = view.docView.nearest(textNode);
        let from, to, topNode = textNode;
        if (cView instanceof InlineView) {
            from = cView.posAtStart;
            to = from + cView.length;
            topNode = cView.dom;
        }
        else if (cView instanceof LineView) {
            while (topNode.parentNode != cView.dom)
                topNode = topNode.parentNode;
            let prev = topNode.previousSibling;
            while (prev && !prev.cmView)
                prev = prev.previousSibling;
            from = to = prev ? prev.cmView.posAtEnd : cView.posAtStart;
        }
        else {
            return Decoration.none;
        }
        let newFrom = ChangedRange.mapPos(from, 1, changes), newTo = Math.max(newFrom, ChangedRange.mapPos(to, -1, changes));
        let text = textNode.nodeValue, doc = view.state.doc;
        if (newTo - newFrom < text.length) {
            if (doc.slice(newFrom, Math.min(doc.length, newFrom + text.length)) == text)
                newTo = newFrom + text.length;
            else if (doc.slice(Math.max(0, newTo - text.length), newTo) == text)
                newFrom = newTo - text.length;
            else
                return Decoration.none;
        }
        else if (doc.slice(newFrom, newTo) != text) {
            return Decoration.none;
        }
        return Decoration.set(Decoration.replace(newFrom, newTo, {
            widget: new CompositionWidget({ top: topNode, text: textNode })
        }));
    }
    class CompositionWidget extends WidgetType {
        eq(value) { return this.value.top == value.top && this.value.text == value.text; }
        toDOM() { return this.value.top; }
        ignoreEvent() { return false; }
        get customView() { return CompositionView; }
    }
    function nearbyTextNode(node, offset) {
        for (;;) {
            if (node.nodeType == 3)
                return node;
            if (node.nodeType == 1 && offset > 0) {
                node = node.childNodes[offset - 1];
                offset = maxOffset(node);
            }
            else if (node.nodeType == 1 && offset < node.childNodes.length) {
                node = node.childNodes[offset];
                offset = 0;
            }
            else {
                return null;
            }
        }
    }

    // FIXME rename "word" to something more descriptive of what it actually does?
    function movePos(view, start, direction, granularity = "character", action) {
        let sel = view.root.getSelection();
        let context = LineContext.get(view, start);
        let dir = direction == "forward" || direction == "right" ? 1 : -1;
        // Can only query native behavior when Selection.modify is
        // supported, the cursor is well inside the rendered viewport, and
        // we're not doing by-line motion on Gecko (which will mess up goal
        // column motion)
        if (sel.modify && context && !context.nearViewportEnd(view) && view.hasFocus &&
            granularity != "word" &&
            !(granularity == "line" && (browser.gecko || view.state.selection.ranges.length > 1))) {
            return view.docView.observer.ignore(() => {
                let prepared = context.prepareForQuery(view, start);
                let startDOM = view.docView.domAtPos(start);
                let equiv = (!browser.chrome || prepared.lines.length == 0) &&
                    isEquivalentPosition(startDOM.node, startDOM.offset, sel.focusNode, sel.focusOffset) && false;
                // Firefox skips an extra character ahead when extending across
                // an uneditable element (but not when moving)
                if (prepared.atWidget && browser.gecko && action == "extend")
                    action = "move";
                if (action == "move" && !(equiv && sel.isCollapsed))
                    sel.collapse(startDOM.node, startDOM.offset);
                else if (action == "extend" && !equiv)
                    sel.extend(startDOM.node, startDOM.offset);
                sel.modify(action, direction, granularity);
                view.docView.setSelectionDirty();
                let result = view.docView.posFromDOM(sel.focusNode, sel.focusOffset);
                context.undoQueryPreparation(view, prepared);
                return result;
            });
        }
        else if (granularity == "character") {
            return moveCharacterSimple(start, dir, context, view.state.doc);
        }
        else if (granularity == "lineboundary") {
            if (context)
                return context.start + (dir < 0 ? 0 : context.line.length);
            let line = view.state.doc.lineAt(start);
            return dir < 0 ? line.start : line.end;
        }
        else if (granularity == "line") {
            if (context && !context.nearViewportEnd(view, dir)) {
                let startCoords = view.docView.coordsAt(start);
                let goal = getGoalColumn(view, start, startCoords.left);
                for (let startY = dir < 0 ? startCoords.top : startCoords.bottom, dist = 5; dist < 50; dist += 10) {
                    let pos = posAtCoords(view, { x: goal.column, y: startY + dist * dir }, dir);
                    if (pos < 0)
                        break;
                    if (pos != start) {
                        goal.pos = pos;
                        return pos;
                    }
                }
            }
            // Can't do a precise one based on DOM positions, fall back to per-column
            return moveLineByColumn(view.state.doc, view.state.tabSize, start, dir);
        }
        else if (granularity == "word") {
            return moveWord(view, start, direction);
        }
        else {
            throw new RangeError("Invalid move granularity: " + granularity);
        }
    }
    function moveLineByColumn(doc, tabSize, pos, dir) {
        let line = doc.lineAt(pos);
        // FIXME also needs goal column?
        let col = 0;
        for (const iter = doc.iterRange(line.start, pos); !iter.next().done;)
            col = countColumn(iter.value, col, tabSize);
        if (dir < 0 && line.start == 0)
            return 0;
        else if (dir > 0 && line.end == doc.length)
            return line.end;
        let otherLine = doc.line(line.number + dir);
        let result = otherLine.start;
        let seen = 0;
        for (const iter = doc.iterRange(otherLine.start, otherLine.end); seen >= col && !iter.next().done;) {
            const { offset, leftOver } = findColumn(iter.value, seen, col, tabSize);
            seen = col - leftOver;
            result += offset;
        }
        return result;
    }
    function moveCharacterSimple(start, dir, context, doc) {
        if (context == null) {
            for (let pos = start;; pos += dir) {
                if (dir < 0 && pos == 0 || dir > 0 && pos == doc.length)
                    return pos;
                if (!isExtendingChar((dir < 0 ? doc.slice(pos - 1, pos) : doc.slice(pos, pos + 1)).charCodeAt(0))) {
                    if (dir < 0)
                        return pos - 1;
                    else if (pos != start)
                        return pos;
                }
            }
        }
        for (let { i, off } = context.line.childPos(start - context.start), { children } = context.line, pos = start;;) {
            if (off == (dir < 0 || i == children.length ? 0 : children[i].length)) {
                i += dir;
                if (i < 0 || i >= children.length) // End/start of line
                    return Math.max(0, Math.min(doc.length, pos + (start == pos ? dir : 0)));
                off = dir < 0 ? children[i].length : 0;
            }
            let inline = children[i];
            if (inline instanceof TextView) {
                if (!isExtendingChar(inline.text.charCodeAt(off - (dir < 0 ? 1 : 0)))) {
                    if (dir < 0)
                        return pos - 1;
                    else if (pos != start)
                        return pos;
                }
                off += dir;
                pos += dir;
            }
            else if (inline.length > 0) {
                return pos - off + (dir < 0 ? 0 : inline.length);
            }
        }
    }
    function moveWord(view, start, direction) {
        let { doc } = view.state;
        for (let pos = start, i = 0;; i++) {
            let next = movePos(view, pos, direction, "character", "move");
            if (next == pos)
                return pos; // End of document
            if (doc.sliceLines(Math.min(next, pos), Math.max(next, pos)).length > 1)
                return next; // Crossed a line boundary
            let group = SelectionRange.groupAt(view.state, next, next > pos ? -1 : 1);
            let away = pos < group.from && pos > group.to;
            // If the group is away from its start position, we jumped over a
            // bidi boundary, and should take the side closest (in index
            // coordinates) to the start position
            let start = away ? pos < group.head : group.from == pos ? false : group.to == pos ? true : next < pos;
            pos = start ? group.from : group.to;
            if (i > 0 || /\S/.test(doc.slice(group.from, group.to)))
                return pos;
            next = Math.max(0, Math.min(doc.length, pos + (start ? -1 : 1)));
        }
    }
    function getGoalColumn(view, pos, column) {
        for (let goal of view.inputState.goalColumns)
            if (goal.pos == pos)
                return goal;
        let goal = { pos: 0, column };
        view.inputState.goalColumns.push(goal);
        return goal;
    }
    class LineContext {
        constructor(line, start, index) {
            this.line = line;
            this.start = start;
            this.index = index;
        }
        static get(view, pos) {
            for (let i = 0, off = 0;; i++) {
                let line = view.docView.children[i], end = off + line.length;
                if (end >= pos) {
                    if (line instanceof LineView)
                        return new LineContext(line, off, i);
                    if (line.length)
                        return null;
                }
                off = end + 1;
            }
        }
        nearViewportEnd(view, side = 0) {
            for (let { from, to } of view.docView.viewports)
                if (from > 0 && from == this.start && side <= 0 ||
                    to < view.state.doc.length && to == this.start + this.line.length && side >= 0)
                    return true;
            return false;
        }
        // FIXME limit the amount of work in character motion in non-bidi
        // context? or not worth it?
        prepareForQuery(view, pos) {
            let linesToSync = [], atWidget = false;
            function maybeHide(view) {
                if (!(view instanceof TextView))
                    atWidget = true;
                if (view.length > 0)
                    return false;
                view.dom.remove();
                if (linesToSync.indexOf(view.parent) < 0)
                    linesToSync.push(view.parent);
                return true;
            }
            let { i, off } = this.line.childPos(pos - this.start);
            if (off == 0) {
                for (let j = i; j < this.line.children.length; j++)
                    if (!maybeHide(this.line.children[j]))
                        break;
                for (let j = i; j > 0; j--)
                    if (!maybeHide(this.line.children[j - 1]))
                        break;
            }
            function addForLine(line, omit = -1) {
                if (line.children.length == 0)
                    return;
                for (let i = 0, off = 0; i <= line.children.length; i++) {
                    let next = i == line.children.length ? null : line.children[i];
                    if ((!next || !(next instanceof TextView)) && off != omit &&
                        (i == 0 || !(line.children[i - 1] instanceof TextView))) {
                        line.dom.insertBefore(document.createTextNode("\u200b"), next ? next.dom : null);
                        if (linesToSync.indexOf(line) < 0)
                            linesToSync.push(line);
                    }
                    if (next)
                        off += next.length;
                }
            }
            if (this.index > 0)
                addForLine(this.line.parent.children[this.index - 1]);
            addForLine(this.line, pos - this.start);
            if (this.index < this.line.parent.children.length - 1)
                addForLine(this.line.parent.children[this.index + 1]);
            return { lines: linesToSync, atWidget };
        }
        undoQueryPreparation(view, toSync) {
            for (let line of toSync.lines) {
                line.dirty = 2 /* Node */;
                line.sync();
                line.dirty = 0 /* Not */;
            }
        }
    }
    // Search the DOM for the {node, offset} position closest to the given
    // coordinates. Very inefficient and crude, but can usually be avoided
    // by calling caret(Position|Range)FromPoint instead.
    // FIXME holding arrow-up/down at the end of the viewport is a rather
    // common use case that will repeatedly trigger this code. Maybe
    // introduce some element of binary search after all?
    function getdx(x, rect) {
        return rect.left > x ? rect.left - x : Math.max(0, x - rect.right);
    }
    function getdy(y, rect) {
        return rect.top > y ? rect.top - y : Math.max(0, y - rect.bottom);
    }
    function yOverlap(a, b) {
        return a.top < b.bottom - 1 && a.bottom > b.top + 1;
    }
    function upTop(rect, top) {
        return top < rect.top ? { top, left: rect.left, right: rect.right, bottom: rect.bottom } : rect;
    }
    function upBot(rect, bottom) {
        return bottom > rect.bottom ? { top: rect.top, left: rect.left, right: rect.right, bottom } : rect;
    }
    function domPosAtCoords(parent, x, y) {
        let closest, closestRect, closestX, closestY;
        let above, below, aboveRect, belowRect;
        for (let child = parent.firstChild; child; child = child.nextSibling) {
            let rects = clientRectsFor(child);
            for (let i = 0; i < rects.length; i++) {
                let rect = rects[i];
                if (closestRect && yOverlap(closestRect, rect))
                    rect = upTop(upBot(rect, closestRect.bottom), closestRect.top);
                let dx = getdx(x, rect), dy = getdy(y, rect);
                if (dx == 0 && dy == 0)
                    return child.nodeType == 3 ? domPosInText(child, x, y) : domPosAtCoords(child, x, y);
                if (!closest || closestY > dy || closestY == dy && closestX > dx) {
                    closest = child;
                    closestRect = rect;
                    closestX = dx;
                    closestY = dy;
                }
                if (dx == 0) {
                    if (y > rect.bottom && (!aboveRect || aboveRect.bottom < rect.bottom)) {
                        above = child;
                        aboveRect = rect;
                    }
                    else if (y < rect.top && (!belowRect || belowRect.top > rect.top)) {
                        below = child;
                        belowRect = rect;
                    }
                }
                else if (aboveRect && yOverlap(aboveRect, rect)) {
                    aboveRect = upBot(aboveRect, rect.bottom);
                }
                else if (belowRect && yOverlap(belowRect, rect)) {
                    belowRect = upTop(belowRect, rect.top);
                }
            }
        }
        if (aboveRect && aboveRect.bottom >= y) {
            closest = above;
            closestRect = aboveRect;
        }
        else if (belowRect && belowRect.top <= y) {
            closest = below;
            closestRect = belowRect;
        }
        if (!closest)
            return { node: parent, offset: 0 };
        let clipX = Math.max(closestRect.left, Math.min(closestRect.right, x));
        if (closest.nodeType == 3)
            return domPosInText(closest, clipX, y);
        if (!closestX && closest.contentEditable == "true")
            domPosAtCoords(closest, clipX, y);
        let offset = Array.prototype.indexOf.call(parent.childNodes, closest) +
            (x >= (closestRect.left + closestRect.right) / 2 ? 1 : 0);
        return { node: parent, offset };
    }
    function domPosInText(node, x, y) {
        let len = node.nodeValue.length, range = document.createRange();
        for (let i = 0; i < len; i++) {
            range.setEnd(node, i + 1);
            range.setStart(node, i);
            let rects = range.getClientRects();
            for (let j = 0; j < rects.length; j++) {
                let rect = rects[j];
                if (rect.top == rect.bottom)
                    continue;
                if (rect.left - 1 <= x && rect.right + 1 >= x &&
                    rect.top - 1 <= y && rect.bottom + 1 >= y) {
                    let right = x >= (rect.left + rect.right) / 2, after = right;
                    if (browser.chrome || browser.gecko) {
                        // Check for RTL on browsers that support getting client
                        // rects for empty ranges.
                        range.setEnd(node, i);
                        let rectBefore = range.getBoundingClientRect();
                        if (rectBefore.left == rect.right)
                            after = !right;
                    }
                    return { node, offset: i + (after ? 1 : 0) };
                }
            }
        }
        return { node, offset: 0 };
    }
    function posAtCoords(view, { x, y }, bias = -1) {
        let content = view.contentDOM.getBoundingClientRect(), block;
        let halfLine = view.defaultLineHeight / 2;
        for (let bounced = false;;) {
            block = view.blockAtHeight(y, content.top);
            if (block.top > y || block.bottom < y) {
                bias = block.top > y ? -1 : 1;
                y = Math.min(block.bottom - halfLine, Math.max(block.top + halfLine, y));
                if (bounced)
                    return -1;
                else
                    bounced = true;
            }
            if (block.type == BlockType.Text)
                break;
            y = bias > 0 ? block.bottom + halfLine : block.top - halfLine;
        }
        let lineStart = block.from;
        // If this is outside of the rendered viewport, we can't determine a position
        if (lineStart < view._viewport.from)
            return view._viewport.from == 0 ? 0 : -1;
        if (lineStart > view._viewport.to)
            return view._viewport.to == view.state.doc.length ? view.state.doc.length : -1;
        // Clip x to the viewport sides
        x = Math.max(content.left + 1, Math.min(content.right - 1, x));
        let root = view.root, element = root.elementFromPoint(x, y);
        // There's visible editor content under the point, so we can try
        // using caret(Position|Range)FromPoint as a shortcut
        let node, offset = -1;
        if (element && view.contentDOM.contains(element) && !(view.docView.nearest(element) instanceof WidgetView)) {
            if (root.caretPositionFromPoint) {
                let pos = root.caretPositionFromPoint(x, y);
                if (pos)
                    ({ offsetNode: node, offset } = pos);
            }
            else if (root.caretRangeFromPoint) {
                let range = root.caretRangeFromPoint(x, y);
                if (range)
                    ({ startContainer: node, startOffset: offset } = range);
            }
        }
        // No luck, do our own (potentially expensive) search
        if (!node) {
            let { line } = LineContext.get(view, lineStart);
            ({ node, offset } = domPosAtCoords(line.dom, x, y));
        }
        return view.docView.posFromDOM(node, offset);
    }

    // This will also be where dragging info and such goes
    class InputState {
        constructor(view) {
            this.lastKeyCode = 0;
            this.lastKeyTime = 0;
            this.lastSelectionOrigin = null;
            this.lastSelectionTime = 0;
            this.registeredEvents = [];
            this.customHandlers = [];
            this.composing = false;
            this.goalColumns = [];
            this.mouseSelection = null;
            for (let type in handlers) {
                let handler = handlers[type];
                view.contentDOM.addEventListener(type, (event) => {
                    if (!eventBelongsToEditor(view, event))
                        return;
                    if (this.runCustomHandlers(type, view, event))
                        event.preventDefault();
                    else
                        handler(view, event);
                });
                this.registeredEvents.push(type);
            }
            // Must always run, even if a custom handler handled the event
            view.contentDOM.addEventListener("keydown", (event) => {
                view.inputState.lastKeyCode = event.keyCode;
                view.inputState.lastKeyTime = Date.now();
            });
            if (view.root.activeElement == view.contentDOM)
                view.dom.classList.add("codemirror-focused");
            this.ensureHandlers(view);
        }
        setSelectionOrigin(origin) {
            this.lastSelectionOrigin = origin;
            this.lastSelectionTime = Date.now();
        }
        ensureHandlers(view) {
            let handlers = view.behavior(handleDOMEvents);
            if (handlers == this.customHandlers ||
                (handlers.length == this.customHandlers.length && handlers.every((h, i) => h == this.customHandlers[i])))
                return;
            this.customHandlers = handlers;
            for (let set of handlers) {
                for (let type in set)
                    if (this.registeredEvents.indexOf(type) < 0) {
                        this.registeredEvents.push(type);
                        view.contentDOM.addEventListener(type, (event) => {
                            if (!eventBelongsToEditor(view, event))
                                return;
                            if (this.runCustomHandlers(type, view, event))
                                event.preventDefault();
                        });
                    }
            }
        }
        runCustomHandlers(type, view, event) {
            for (let handlers of this.customHandlers) {
                let handler = handlers[type];
                if (handler) {
                    try {
                        if (handler(view, event) || event.defaultPrevented)
                            return true;
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
            return false;
        }
        startMouseSelection(view, event, update) {
            if (this.mouseSelection)
                this.mouseSelection.destroy();
            this.mouseSelection = new MouseSelection(this, view, event, update);
        }
        update(update) {
            if (this.mouseSelection)
                this.mouseSelection.map(update.changes);
            this.lastKeyCode = this.lastSelectionTime = 0;
        }
        destroy() {
            if (this.mouseSelection)
                this.mouseSelection.destroy();
        }
    }
    class MouseSelection {
        constructor(inputState, view, event, update) {
            this.inputState = inputState;
            this.view = view;
            this.update = update;
            let doc = view.contentDOM.ownerDocument;
            doc.addEventListener("mousemove", this.move = this.move.bind(this));
            doc.addEventListener("mouseup", this.up = this.up.bind(this));
            this.extend = event.shiftKey;
            this.multiple = view.state.behavior(EditorState.allowMultipleSelections) && addsSelectionRange(view, event);
            this.dragMove = dragMovesSelection$1(view, event);
            this.startSelection = view.state.selection;
            let { pos, bias } = this.queryPos(event);
            this.startPos = this.curPos = pos;
            this.startBias = this.curBias = bias;
            this.dragging = isInPrimarySelection(view, this.startPos, event) ? null : false;
            // When clicking outside of the selection, immediately apply the
            // effect of starting the selection
            if (this.dragging === false) {
                event.preventDefault();
                this.select();
            }
        }
        queryPos(event) {
            let pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
            let coords = this.view.coordsAtPos(pos);
            let bias = !coords ? 1 :
                coords.top > event.clientY ? -1 :
                    coords.bottom < event.clientY ? 1 :
                        coords.left > event.clientX ? -1 : 1;
            return { pos, bias };
        }
        move(event) {
            if (event.buttons == 0)
                return this.destroy();
            if (this.dragging !== false)
                return;
            let { pos, bias } = this.queryPos(event);
            if (pos == this.curPos && bias == this.curBias)
                return;
            this.curPos = pos;
            this.curBias = bias;
            this.select();
        }
        up(event) {
            if (this.dragging == null)
                this.select();
            this.destroy();
        }
        destroy() {
            let doc = this.view.contentDOM.ownerDocument;
            doc.removeEventListener("mousemove", this.move);
            doc.removeEventListener("mouseup", this.up);
            this.inputState.mouseSelection = null;
        }
        select() {
            let selection = this.update(this.view, this.startSelection, this.startPos, this.startBias, this.curPos, this.curBias, this.extend, this.multiple);
            if (!selection.eq(this.view.state.selection))
                this.view.dispatch(this.view.state.t().setSelection(selection)
                    .annotate(Transaction.userEvent("pointer")));
        }
        map(changes) {
            if (changes.length) {
                this.startSelection = this.startSelection.map(changes);
                this.startPos = changes.mapPos(this.startPos);
                this.curPos = changes.mapPos(this.curPos);
            }
            if (this.dragging)
                this.dragging = this.dragging.map(changes);
        }
    }
    function addsSelectionRange(view, event) {
        let behavior = view.behavior(clickAddsSelectionRange);
        return behavior.length ? behavior[0](event) : browser.mac ? event.metaKey : event.ctrlKey;
    }
    function dragMovesSelection$1(view, event) {
        let behavior = view.behavior(dragMovesSelection);
        return behavior.length ? behavior[0](event) : browser.mac ? !event.altKey : !event.ctrlKey;
    }
    function isInPrimarySelection(view, pos, event) {
        let { primary } = view.state.selection;
        if (primary.empty)
            return false;
        if (pos < primary.from || pos > primary.to)
            return false;
        if (pos > primary.from && pos < primary.to)
            return true;
        // On boundary clicks, check whether the coordinates are inside the
        // selection's client rectangles
        let sel = view.root.getSelection();
        if (sel.rangeCount == 0)
            return true;
        let rects = sel.getRangeAt(0).getClientRects();
        for (let i = 0; i < rects.length; i++) {
            let rect = rects[i];
            if (rect.left <= event.clientX && rect.right >= event.clientX &&
                rect.top <= event.clientY && rect.bottom >= event.clientY)
                return true;
        }
        return false;
    }
    function eventBelongsToEditor(view, event) {
        if (!event.bubbles)
            return true;
        if (event.defaultPrevented)
            return false;
        for (let node = event.target; node != view.contentDOM; node = node.parentNode)
            if (!node || node.nodeType == 11 || (node.cmView && node.cmView.ignoreEvent(event)))
                return false;
        return true;
    }
    const handlers = Object.create(null);
    // This is very crude, but unfortunately both these browsers _pretend_
    // that they have a clipboard API—all the objects and methods are
    // there, they just don't work, and they are hard to test.
    const brokenClipboardAPI = (browser.ie && browser.ie_version < 15) ||
        (browser.ios && browser.webkit_version < 604);
    function capturePaste(view) {
        let doc = view.dom.ownerDocument;
        let target = doc.body.appendChild(doc.createElement("textarea"));
        target.style.cssText = "position: fixed; left: -10000px; top: 10px";
        target.focus();
        setTimeout(() => {
            view.focus();
            doc.body.removeChild(target);
            doPaste(view, target.value);
        }, 50);
    }
    function doPaste(view, text) {
        view.dispatch(view.state.t().replaceSelection(text)
            .annotate(Transaction.userEvent("paste")).scrollIntoView());
    }
    function mustCapture(event) {
        let mods = (event.ctrlKey ? 1 /* Ctrl */ : 0) | (event.metaKey ? 8 /* Meta */ : 0) |
            (event.altKey ? 2 /* Alt */ : 0) | (event.shiftKey ? 4 /* Shift */ : 0);
        let code = event.keyCode, macCtrl = browser.mac && mods == 1 /* Ctrl */;
        return code == 8 || (macCtrl && code == 72) || // Backspace, Ctrl-h on Mac
            code == 46 || (macCtrl && code == 68) || // Delete, Ctrl-d on Mac
            code == 27 || // Esc
            (mods == (browser.mac ? 8 /* Meta */ : 1 /* Ctrl */) && // Ctrl/Cmd-[biyz]
                (code == 66 || code == 73 || code == 89 || code == 90));
    }
    handlers.keydown = (view, event) => {
        if (mustCapture(event))
            event.preventDefault();
        view.inputState.setSelectionOrigin("keyboard");
    };
    handlers.touchdown = handlers.touchmove = (view, event) => {
        view.inputState.setSelectionOrigin("pointer");
    };
    handlers.mousedown = (view, event) => {
        if (event.button == 0)
            view.startMouseSelection(event, updateMouseSelection(event.detail));
    };
    function rangeForClick(view, pos, bias, type) {
        if (type == 1) { // Single click
            return new SelectionRange(pos);
        }
        else if (type == 2) { // Double click
            return SelectionRange.groupAt(view.state, pos, bias);
        }
        else { // Triple click
            let context = LineContext.get(view, pos);
            if (context)
                return new SelectionRange(context.start + context.line.length, context.start);
            let { start, end } = view.state.doc.lineAt(pos);
            return new SelectionRange(start, end);
        }
    }
    function updateMouseSelection(type) {
        return (view, startSelection, startPos, startBias, curPos, curBias, extend, multiple) => {
            let range = rangeForClick(view, curPos, curBias, type);
            if (startPos != curPos && !extend) {
                let startRange = rangeForClick(view, startPos, startBias, type);
                range = range.extend(Math.min(startRange.from, range.from), Math.max(startRange.to, range.to));
            }
            if (extend)
                return startSelection.replaceRange(startSelection.primary.extend(range.from, range.to));
            else if (multiple)
                return startSelection.addRange(range);
            else
                return EditorSelection.create([range]);
        };
    }
    handlers.dragstart = (view, event) => {
        let { doc, selection: { primary } } = view.state;
        let { mouseSelection } = view.inputState;
        if (mouseSelection)
            mouseSelection.dragging = primary;
        if (event.dataTransfer) {
            event.dataTransfer.setData("Text", doc.slice(primary.from, primary.to));
            event.dataTransfer.effectAllowed = "copyMove";
        }
    };
    handlers.drop = (view, event) => {
        if (!event.dataTransfer)
            return;
        let dropPos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        let text = event.dataTransfer.getData("Text");
        if (dropPos < 0 || !text)
            return;
        event.preventDefault();
        let tr = view.state.t();
        let { mouseSelection } = view.inputState;
        if (mouseSelection && mouseSelection.dragging && mouseSelection.dragMove) {
            tr.replace(mouseSelection.dragging.from, mouseSelection.dragging.to, "");
            dropPos = tr.changes.mapPos(dropPos);
        }
        let change = new Change(dropPos, dropPos, view.state.splitLines(text));
        tr.change(change)
            .setSelection(EditorSelection.single(dropPos, dropPos + change.length))
            .annotate(Transaction.userEvent("drop"));
        view.focus();
        view.dispatch(tr);
    };
    handlers.paste = (view, event) => {
        view.docView.observer.flush();
        let data = brokenClipboardAPI ? null : event.clipboardData;
        let text = data && data.getData("text/plain");
        if (text) {
            doPaste(view, text);
            event.preventDefault();
        }
        else {
            capturePaste(view);
        }
    };
    function captureCopy(view, text) {
        // The extra wrapper is somehow necessary on IE/Edge to prevent the
        // content from being mangled when it is put onto the clipboard
        let doc = view.dom.ownerDocument;
        let target = doc.body.appendChild(doc.createElement("textarea"));
        target.style.cssText = "position: fixed; left: -10000px; top: 10px";
        target.value = text;
        target.focus();
        target.selectionEnd = text.length;
        target.selectionStart = 0;
        setTimeout(() => {
            doc.body.removeChild(target);
            view.focus();
        }, 50);
    }
    handlers.copy = handlers.cut = (view, event) => {
        let range = view.state.selection.primary;
        if (range.empty)
            return;
        let data = brokenClipboardAPI ? null : event.clipboardData;
        let text = view.state.joinLines(view.state.doc.sliceLines(range.from, range.to));
        if (data) {
            event.preventDefault();
            data.clearData();
            data.setData("text/plain", text);
        }
        else {
            captureCopy(view, text);
        }
        if (event.type == "cut") {
            view.dispatch(view.state.t().replaceSelection([""]).scrollIntoView().annotate(Transaction.userEvent("cut")));
        }
    };
    handlers.focus = view => {
        view.update([], [focusChange(true)]);
    };
    handlers.blur = view => {
        view.update([], [focusChange(false)]);
    };
    handlers.beforeprint = view => {
        view.docView.checkLayout(true);
    };
    // Dummy annotation to force a display update in the absence of other triggers
    const compositionEndAnnotation = Annotation.define();
    function forceClearComposition(view) {
        if (view.docView.compositionDeco.size)
            view.update([], [compositionEndAnnotation(null)]);
    }
    handlers.compositionstart = handlers.compositionupdate = view => {
        if (!view.inputState.composing) {
            if (view.docView.compositionDeco.size) {
                view.docView.observer.flush();
                forceClearComposition(view);
            }
            // FIXME possibly set a timeout to clear it again on Android
            view.inputState.composing = true;
        }
    };
    handlers.compositionend = view => {
        view.inputState.composing = false;
        setTimeout(() => {
            if (!view.inputState.composing)
                forceClearComposition(view);
        }, 50);
    };

    const LINE_SEP = "\ufdda"; // A Unicode 'non-character', used to denote newlines internally
    function applyDOMChange(view, start, end, typeOver) {
        let change, newSel;
        let sel = view.state.selection.primary, bounds;
        if (start > -1 && (bounds = view.docView.domBoundsAround(start, end, 0))) {
            let { from, to } = bounds;
            let selPoints = view.docView.impreciseHead || view.docView.impreciseAnchor ? [] : selectionPoints(view.contentDOM, view.root);
            let reader = new DOMReader(selPoints);
            reader.readRange(bounds.startDOM, bounds.endDOM);
            newSel = selectionFromPoints(selPoints, from);
            let preferredPos = sel.from, preferredSide = null;
            // Prefer anchoring to end when Backspace is pressed
            if (view.inputState.lastKeyCode === 8 && view.inputState.lastKeyTime > Date.now() - 100) {
                preferredPos = sel.to;
                preferredSide = "end";
            }
            let diff = findDiff(view.state.doc.slice(from, to, LINE_SEP), reader.text, preferredPos - from, preferredSide);
            if (diff)
                change = new Change(from + diff.from, from + diff.toA, reader.text.slice(diff.from, diff.toB).split(LINE_SEP));
        }
        else if (view.hasFocus) {
            let domSel = view.root.getSelection();
            let { impreciseHead: iHead, impreciseAnchor: iAnchor } = view.docView;
            let head = iHead && iHead.node == domSel.focusNode && iHead.offset == domSel.focusOffset ? view.state.selection.primary.head
                : view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset);
            let anchor = iAnchor && iAnchor.node == domSel.anchorNode && iAnchor.offset == domSel.anchorOffset ? view.state.selection.primary.anchor
                : selectionCollapsed(domSel) ? head : view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset);
            if (head != sel.head || anchor != sel.anchor)
                newSel = EditorSelection.single(anchor, head);
        }
        if (!change && !newSel)
            return false;
        // Heuristic to notice typing over a selected character
        if (!change && typeOver && !sel.empty && newSel && newSel.primary.empty)
            change = new Change(sel.from, sel.to, view.state.doc.sliceLines(sel.from, sel.to));
        if (change) {
            let startState = view.state;
            // Android browsers don't fire reasonable key events for enter,
            // backspace, or delete. So this detects changes that look like
            // they're caused by those keys, and reinterprets them as key
            // events.
            if (browser.android &&
                ((change.from == sel.from && change.to == sel.to &&
                    change.length == 1 && change.text.length == 2 &&
                    dispatchKey(view, "Enter", 10)) ||
                    (change.from == sel.from - 1 && change.to == sel.to && change.length == 0 &&
                        dispatchKey(view, "Backspace", 8)) ||
                    (change.from == sel.from && change.to == sel.to + 1 && change.length == 0 &&
                        dispatchKey(view, "Delete", 46))))
                return view.state != startState;
            let tr = startState.t();
            if (change.from >= sel.from && change.to <= sel.to && change.to - change.from >= (sel.to - sel.from) / 3) {
                let before = sel.from < change.from ? startState.doc.slice(sel.from, change.from, LINE_SEP) : "";
                let after = sel.to > change.to ? startState.doc.slice(change.to, sel.to, LINE_SEP) : "";
                tr.replaceSelection((before + change.text.join(LINE_SEP) + after).split(LINE_SEP));
            }
            else {
                tr.change(change);
                if (newSel && !tr.selection.primary.eq(newSel.primary))
                    tr.setSelection(tr.selection.replaceRange(newSel.primary));
            }
            view.dispatch(tr.scrollIntoView());
            return true;
        }
        else if (newSel && !newSel.primary.eq(sel)) {
            let tr = view.state.t().setSelection(newSel);
            if (view.inputState.lastSelectionTime > Date.now() - 50) {
                if (view.inputState.lastSelectionOrigin == "keyboard")
                    tr.scrollIntoView();
                else
                    tr.annotate(Transaction.userEvent(view.inputState.lastSelectionOrigin));
            }
            view.dispatch(tr);
            return true;
        }
        return false;
    }
    function findDiff(a, b, preferredPos, preferredSide) {
        let minLen = Math.min(a.length, b.length);
        let from = 0;
        while (from < minLen && a.charCodeAt(from) == b.charCodeAt(from))
            from++;
        if (from == minLen && a.length == b.length)
            return null;
        let toA = a.length, toB = b.length;
        while (toA > 0 && toB > 0 && a.charCodeAt(toA - 1) == b.charCodeAt(toB - 1)) {
            toA--;
            toB--;
        }
        if (preferredSide == "end") {
            let adjust = Math.max(0, from - Math.min(toA, toB));
            preferredPos -= toA + adjust - from;
        }
        if (toA < from && a.length < b.length) {
            let move = preferredPos <= from && preferredPos >= toA ? from - preferredPos : 0;
            from -= move;
            toB = from + (toB - toA);
            toA = from;
        }
        else if (toB < from) {
            let move = preferredPos <= from && preferredPos >= toB ? from - preferredPos : 0;
            from -= move;
            toA = from + (toA - toB);
            toB = from;
        }
        return { from, toA, toB };
    }
    class DOMReader {
        constructor(points) {
            this.points = points;
            this.text = "";
        }
        readRange(start, end) {
            if (!start)
                return;
            let parent = start.parentNode;
            for (let cur = start;;) {
                this.findPointBefore(parent, cur);
                this.readNode(cur);
                let next = cur.nextSibling;
                if (next == end)
                    break;
                let view = cur.cmView, nextView = next.cmView;
                if ((view ? view.breakAfter : isBlockElement(cur)) ||
                    ((nextView ? nextView.breakAfter : isBlockElement(next)) && cur.nodeName != "BR"))
                    this.text += LINE_SEP;
                cur = next;
            }
            this.findPointBefore(parent, end);
        }
        readNode(node) {
            if (node.cmIgnore)
                return;
            let view = node.cmView;
            let fromView = view && view.overrideDOMText;
            let text;
            if (fromView != null)
                text = fromView.join(LINE_SEP);
            else if (node.nodeType == 3)
                text = node.nodeValue;
            else if (node.nodeName == "BR")
                text = node.nextSibling ? LINE_SEP : "";
            else if (node.nodeType == 1)
                this.readRange(node.firstChild, null);
            if (text != null) {
                this.findPointIn(node, text.length);
                this.text += text;
            }
        }
        findPointBefore(node, next) {
            for (let point of this.points)
                if (point.node == node && node.childNodes[point.offset] == next)
                    point.pos = this.text.length;
        }
        findPointIn(node, maxLen) {
            for (let point of this.points)
                if (point.node == node)
                    point.pos = this.text.length + Math.min(point.offset, maxLen);
        }
    }
    function isBlockElement(node) {
        return node.nodeType == 1 && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(node.nodeName);
    }
    class DOMPoint {
        constructor(node, offset) {
            this.node = node;
            this.offset = offset;
            this.pos = -1;
        }
    }
    function selectionPoints(dom, root) {
        let result = [];
        if (root.activeElement != dom)
            return result;
        let { anchorNode, anchorOffset, focusNode, focusOffset } = root.getSelection();
        if (anchorNode) {
            result.push(new DOMPoint(anchorNode, anchorOffset));
            if (focusNode != anchorNode || focusOffset != anchorOffset)
                result.push(new DOMPoint(focusNode, focusOffset));
        }
        return result;
    }
    function selectionFromPoints(points, base) {
        if (points.length == 0)
            return null;
        let anchor = points[0].pos, head = points.length == 2 ? points[1].pos : anchor;
        return anchor > -1 && head > -1 ? EditorSelection.single(anchor + base, head + base) : null;
    }
    function dispatchKey(view, name, code) {
        let options = { key: name, code: name, keyCode: code, which: code, cancelable: true };
        let down = new KeyboardEvent("keydown", options);
        view.contentDOM.dispatchEvent(down);
        let up = new KeyboardEvent("keyup", options);
        view.contentDOM.dispatchEvent(up);
        return down.defaultPrevented || up.defaultPrevented;
    }

    // The editor's update state machine looks something like this:
    //
    //     Idle → Updating ⇆ Idle (unchecked) → Measuring → Idle
    //                                         ↑      ↓
    //                                         Updating (measure)
    //
    // The difference between 'Idle' and 'Idle (unchecked)' lies in
    // whether a layout check has been scheduled. A regular update through
    // the `update` method updates the DOM in a write-only fashion, and
    // relies on a check (scheduled with `requestAnimationFrame`) to make
    // sure everything is where it should be and the viewport covers the
    // visible code. That check continues to measure and then optionally
    // update until it reaches a coherent state.
    /// An editor view represents the editor's user interface. It holds
    /// the editable DOM surface, and possibly other elements such as the
    /// line number gutter. It handles events and dispatches state
    /// transactions for editing actions.
    class EditorView {
        /// Construct a new view. You'll usually want to put `view.dom` into
        /// your document after creating a view, so that the user can see
        /// it.
        constructor(config = {}) {
            /// @internal
            this.plugins = Object.create(null);
            this.editorAttrs = {};
            this.contentAttrs = {};
            this.themeCache = Object.create(null);
            this.themeCacheFor = [];
            /// @internal
            this.updateState = 2 /* Updating */;
            /// @internal
            this.waiting = [];
            this.contentDOM = document.createElement("div");
            this.scrollDOM = document.createElement("div");
            this.scrollDOM.appendChild(this.contentDOM);
            this.dom = document.createElement("div");
            this.dom.appendChild(this.scrollDOM);
            this.dispatch = config.dispatch || ((tr) => this.update([tr]));
            this.root = (config.root || document);
            this.docView = new DocView(this, (start, end, typeOver) => applyDOMChange(this, start, end, typeOver));
            let state = config.state || EditorState.create();
            this.extensions = config.extensions || [];
            this.configure(state.configuration.foreign);
            this.inputState = new InputState(this);
            this.docView.init(state, viewport => {
                this._viewport = viewport;
                this._state = state;
                for (let plugin of this.behavior(viewPlugin)) {
                    let exists = this.plugins[plugin.id];
                    if (exists)
                        throw new Error(`Duplicated view plugin${(exists.constructor || Object) != Object && exists.constructor.name ? ` (${exists.constructor.name})` : ''}`);
                    this.plugins[plugin.id] = plugin.create(this);
                }
            });
            this.mountStyles();
            this.updateAttrs();
            this.updateState = 0 /* Idle */;
            ensureGlobalHandler();
        }
        /// The current editor state.
        get state() { return this._state; }
        /// To be able to display large documents without consuming too much
        /// memory or overloading the browser, CodeMirror only draws the
        /// code that is visible, plus a margin around it, to the DOM. This
        /// property tells you the extent of the current drawn viewport, in
        /// document positions.
        get viewport() { return this._viewport; }
        /// Update the view for the given array of transactions. This will
        /// update the visible document and selection to match the state
        /// produced by the transactions, and notify view plugins of the
        /// change.
        update(transactions = [], annotations = []) {
            if (this.updateState != 0 /* Idle */)
                throw new Error("Calls to EditorView.update are not allowed while an update is in progress");
            this.updateState = 2 /* Updating */;
            this.clearWaiting();
            let state = this.state, prevForeign = state.configuration.foreign;
            for (let tr of transactions) {
                if (tr.startState != state)
                    throw new RangeError("Trying to update state with a transaction that doesn't start from the current state.");
                state = tr.apply();
            }
            let curForeign = state.configuration.foreign;
            if (curForeign != prevForeign) {
                this.configure(curForeign);
                this.updatePlugins();
            }
            let update = transactions.length > 0 || annotations.length > 0 ? new ViewUpdate(this, transactions, annotations) : null;
            if (state.doc != this.state.doc || transactions.some(tr => tr.selectionSet && !tr.annotation(Transaction.preserveGoalColumn)))
                this.inputState.goalColumns.length = 0;
            this.docView.update(update, transactions.some(tr => tr.scrolledIntoView) ? state.selection.primary.head : -1);
            if (update) {
                this.inputState.ensureHandlers(this);
                this.drawPlugins();
                if (this.behavior(styleModule) != this.styleModules)
                    this.mountStyles();
            }
            this.updateAttrs();
            this.updateState = 0 /* Idle */;
        }
        /// Wait for the given promise to resolve, and then run an update.
        /// Or, if an update happens before that, set the promise's
        /// `canceled` property to true and ignore it.
        waitFor(promise) {
            promise.then(() => {
                if (!promise.canceled)
                    this.update([], [notified(true)]);
            });
            this.waiting.push(promise);
        }
        clearWaiting() {
            for (let promise of this.waiting)
                promise.canceled = true;
            this.waiting.length = 0;
        }
        /// @internal
        updateAttrs() {
            let editorAttrs = this.behavior(editorAttributes), contentAttrs = this.behavior(contentAttributes);
            updateAttrs(this.dom, this.editorAttrs, editorAttrs);
            this.editorAttrs = editorAttrs;
            updateAttrs(this.contentDOM, this.contentAttrs, contentAttrs);
            this.contentAttrs = contentAttrs;
            this.scrollDOM.className = this.cssClass("scroller") + " " + styles.scroller;
        }
        configure(fromState) {
            this.configuration = extendView.resolve([defaultAttrs].concat(this.extensions).concat(fromState));
            if (this.configuration.foreign.length)
                throw new Error("Non-view extensions found in view");
        }
        updatePlugins() {
            let old = this.plugins;
            this.plugins = Object.create(null);
            for (let plugin of this.behavior(viewPlugin))
                this.plugins[plugin.id] = Object.prototype.hasOwnProperty.call(old, plugin.id) ? old[plugin.id] : plugin.create(this);
        }
        mountStyles() {
            this.styleModules = this.behavior(styleModule);
            StyleModule.mount(this.root, this.styleModules.concat(styles).reverse());
        }
        /// @internal
        drawPlugins() {
            for (let plugin of this.behavior(viewPlugin)) {
                let value = this.plugins[plugin.id];
                if (value.draw) {
                    try {
                        value.draw();
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
            this.updateAttrs();
        }
        /// Get an instance of the given plugin class, or `undefined` if
        /// none exists in this view.
        plugin(plugin) {
            let result = this.plugins[plugin.id];
            if (result === undefined && this.behavior(viewPlugin).indexOf(plugin) > -1)
                throw new Error("Accessing a plugin from another plugin with higher precedence");
            return result;
        }
        /// Get the value of a view behavior.
        behavior(behavior) {
            return this.configuration.getBehavior(behavior, this);
        }
        /// @internal
        updateInner(update, viewport) {
            this._viewport = viewport;
            this._state = update.state;
            // FIXME separate plugins from behavior cache?
            let oldPlugins = this.plugins;
            this.plugins = Object.create(null);
            for (let plugin of this.behavior(viewPlugin)) {
                let value = this.plugins[plugin.id] = oldPlugins[plugin.id];
                if (value.update) {
                    try {
                        value.update(update);
                    }
                    catch (e) {
                        console.error(e);
                        this.plugins[plugin.id] = { update() { } };
                    }
                }
            }
        }
        /// Query the active themes for the CSS class names associated with
        /// the given name. Names can be single words or words separated by
        /// dot characters. In the latter case, the returned classes combine
        /// those that match the full name and those that match some
        /// prefix—for example `cssClass("panel.search")` will match both
        /// the theme styles specified as `"panel.search"` and those with
        /// just `"panel"`. More specific theme styles (with more dots) take
        /// precedence.
        cssClass(selector) {
            let themes = this.behavior(theme);
            if (themes != this.themeCacheFor) {
                this.themeCache = Object.create(null);
                this.themeCacheFor = themes;
            }
            else {
                let known = this.themeCache[selector];
                if (known != null)
                    return known;
            }
            let result = "";
            for (let pos = 0;;) {
                let dot = selector.indexOf(".", pos);
                let cls = dot < 0 ? selector : selector.slice(0, dot);
                result += (result ? " " : "") + "codemirror-" + (pos ? cls.replace(/\./g, "-") : cls);
                for (let theme of themes) {
                    let has = theme[cls];
                    if (has)
                        result += " " + has;
                }
                if (dot < 0)
                    break;
                pos = dot + 1;
            }
            return this.themeCache[selector] = result;
        }
        /// Look up a translation for the given phrase (via the
        /// [`phrases`](#view.EditorView^phrases) behavior), or return the
        /// original string if no translation is found.
        phrase(phrase) {
            for (let map of this.behavior(phrases)) {
                if (Object.prototype.hasOwnProperty.call(map, phrase))
                    return map[phrase];
            }
            return phrase;
        }
        /// Find the DOM parent node and offset (child offset if `node` is
        /// an element, character offset when it is a text node) at the
        /// given document position.
        domAtPos(pos) {
            return this.docView.domAtPos(pos);
        }
        /// Find the document position at the given DOM node. Can be useful
        /// for associating positions with DOM events. Will raise an error
        /// when `node` isn't part of the editor content.
        posAtDOM(node, offset = 0) {
            return this.docView.posFromDOM(node, offset);
        }
        readingLayout() {
            if (this.updateState == 2 /* Updating */)
                throw new Error("Reading the editor layout isn't allowed during an update");
            if (this.updateState == 0 /* Idle */ && this.docView.layoutCheckScheduled > -1)
                this.docView.checkLayout();
        }
        /// Make sure plugins get a chance to measure the DOM before the
        /// next frame. Calling this is preferable to messing with the DOM
        /// directly from, for example, an even handler, because it'll make
        /// sure measuring and drawing done by other components is
        /// synchronized, avoiding unnecessary DOM layout computations.
        requireMeasure() {
            this.docView.scheduleLayoutCheck();
        }
        /// Find the line or block widget at the given vertical position.
        /// `editorTop`, if given, provides the vertical position of the top
        /// of the editor. It defaults to the editor's screen position
        /// (which will force a DOM layout).
        blockAtHeight(height, editorTop) {
            this.readingLayout();
            return this.docView.blockAtHeight(height, editorTop);
        }
        /// Find information for the line at the given vertical position.
        /// The resulting block info might hold another array of block info
        /// structs in its `type` field if this line consists of more than
        /// one block.
        lineAtHeight(height, editorTop) {
            this.readingLayout();
            return this.docView.lineAtHeight(height, editorTop);
        }
        /// Find the height information for the given line.
        lineAt(pos, editorTop) {
            this.readingLayout();
            return this.docView.lineAt(pos, editorTop);
        }
        /// Iterate over the height information of the lines in the
        /// viewport.
        viewportLines(f, editorTop) {
            let { from, to } = this._viewport;
            this.docView.forEachLine(from, to, f, editorTop);
        }
        /// The editor's total content height.
        get contentHeight() {
            return this.docView.heightMap.height + this.docView.paddingTop + this.docView.paddingBottom;
        }
        /// Compute cursor motion from the given position, in the given
        /// direction, by the given unit. Since this might involve
        /// temporarily mutating the DOM selection, you can pass the action
        /// type this will be used for to, in case the editor selection is
        /// set to the new position right away, avoid an extra DOM selection
        /// change.
        movePos(start, direction, granularity = "character", action = "move") {
            return movePos(this, start, direction, granularity, action);
        }
        /// Get the document position at the given screen coordinates.
        /// Returns -1 if no valid position could be found.
        posAtCoords(coords) {
            this.readingLayout();
            return posAtCoords(this, coords);
        }
        /// Get the screen coordinates at the given document position.
        coordsAtPos(pos) {
            this.readingLayout();
            return this.docView.coordsAt(pos);
        }
        /// The default width of a character in the editor. May not
        /// accurately reflect the width of all characters.
        get defaultCharacterWidth() { return this.docView.heightOracle.charWidth; }
        /// The default height of a line in the editor.
        get defaultLineHeight() { return this.docView.heightOracle.lineHeight; }
        /// Start a custom mouse selection event.
        startMouseSelection(event, update) {
            this.focus();
            this.inputState.startMouseSelection(this, event, update);
        }
        /// Check whether the editor has focus.
        get hasFocus() {
            return this.root.activeElement == this.contentDOM;
        }
        /// Put focus on the editor.
        focus() {
            this.docView.focus();
        }
        /// Clean up this editor view, removing its element from the
        /// document, unregistering event handlers, and notifying
        /// extensions. The view instance can no longer be used after
        /// calling this.
        destroy() {
            for (let plugin of this.behavior(viewPlugin)) {
                let value = this.plugins[plugin.id];
                if (value.destroy) {
                    try {
                        value.destroy();
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
            this.inputState.destroy();
            this.dom.remove();
            this.docView.destroy();
        }
        /// Behavior that provides CSS classes to add to elements identified
        /// by the given string.
        static theme(spec) {
            for (let prop in spec) {
                let specificity = prop.split(".").length - 1;
                if (specificity > 0)
                    spec[prop].specificity = specificity;
            }
            let module = new StyleModule(spec);
            return [theme(module), styleModule(module)];
        }
    }
    /// The view extension group, used to define new view extensions.
    EditorView.extend = extendView;
    /// Behavior to add a [style
    /// module](https://github.com/marijnh/style-mod#readme) to an editor
    /// view. The view will ensure that the module is registered in its
    /// [document root](#view.EditorConfig.root).
    EditorView.styleModule = styleModule;
    /// Behavior that can be used to add DOM event handlers. The value
    /// should be an object mapping event names to handler functions. The
    /// first such function to return true will be assumed to have handled
    /// that event, and no other handlers or built-in behavior will be
    /// activated for it.
    EditorView.handleDOMEvents = handleDOMEvents;
    /// Behavior used to configure whether a given selection drag event
    /// should move or copy the selection. The given predicate will be
    /// called with the `mousedown` event, and can return `true` when
    /// the drag should move the content.
    EditorView.dragMovesSelection = dragMovesSelection;
    /// Behavior used to configure whether a given selecting click adds
    /// a new range to the existing selection or replaces it entirely.
    EditorView.clickAddsSelectionRange = clickAddsSelectionRange;
    /// A behavior that determines which [decorations](#view.Decoration)
    /// are shown in the view.
    EditorView.decorations = decorations;
    /// Registers translation phrases. The
    /// [`phrase`](#view.EditorView.phrase) method will look through all
    /// objects registered with this behavior to find translations for
    /// its argument.
    EditorView.phrases = phrases;
    /// This behavior can be used to indicate that, when scrolling
    /// something into view, certain parts at the side of the editor
    /// should be scrolled past (for example because there is a gutter
    /// or panel blocking them from view).
    EditorView.scrollMargins = scrollMargins;
    /// Behavior that provides editor DOM attributes for the editor's
    /// outer element. FIXME move to EditorView?
    EditorView.contentAttributes = contentAttributes;
    /// Behavior that provides attributes for the editor's editable DOM
    /// element.
    EditorView.editorAttributes = editorAttributes;
    /// An annotation that is used as a flag in view updates caused by
    /// changes to the view's focus state. Its value will be `true` when
    /// the view is being focused, `false` when it's losing focus.
    EditorView.focusChange = focusChange;
    const defaultAttrs = [
        extendView.dynamic(editorAttributes, view => ({
            class: "codemirror " + styles.wrapper + (view.hasFocus ? " codemirror-focused " : " ") + view.cssClass("wrap")
        })),
        extendView.dynamic(contentAttributes, view => ({
            spellcheck: "false",
            contenteditable: "true",
            class: styles.content + " " + view.cssClass("content"),
            style: `${browser.tabSize}: ${view.state.tabSize}`
        }))
    ];
    let resizeDebounce = -1;
    function ensureGlobalHandler() {
        window.addEventListener("resize", () => {
            if (resizeDebounce == -1)
                resizeDebounce = setTimeout(handleResize, 50);
        });
    }
    function handleResize() {
        resizeDebounce = -1;
        let found = document.querySelectorAll(".codemirror-content");
        for (let i = 0; i < found.length; i++) {
            let docView = found[i].cmView;
            if (docView)
                docView.editorView.update([], [notified(true)]); // FIXME remove need to pass an annotation?
        }
    }

    var base = {
      8: "Backspace",
      9: "Tab",
      10: "Enter",
      12: "NumLock",
      13: "Enter",
      16: "Shift",
      17: "Control",
      18: "Alt",
      20: "CapsLock",
      27: "Escape",
      32: " ",
      33: "PageUp",
      34: "PageDown",
      35: "End",
      36: "Home",
      37: "ArrowLeft",
      38: "ArrowUp",
      39: "ArrowRight",
      40: "ArrowDown",
      44: "PrintScreen",
      45: "Insert",
      46: "Delete",
      59: ";",
      61: "=",
      91: "Meta",
      92: "Meta",
      106: "*",
      107: "+",
      108: ",",
      109: "-",
      110: ".",
      111: "/",
      144: "NumLock",
      145: "ScrollLock",
      160: "Shift",
      161: "Shift",
      162: "Control",
      163: "Control",
      164: "Alt",
      165: "Alt",
      173: "-",
      186: ";",
      187: "=",
      188: ",",
      189: "-",
      190: ".",
      191: "/",
      192: "`",
      219: "[",
      220: "\\",
      221: "]",
      222: "'",
      229: "q"
    };
    var base_1 = base;

    var shift = {
      48: ")",
      49: "!",
      50: "@",
      51: "#",
      52: "$",
      53: "%",
      54: "^",
      55: "&",
      56: "*",
      57: "(",
      59: ";",
      61: "+",
      173: "_",
      186: ":",
      187: "+",
      188: "<",
      189: "_",
      190: ">",
      191: "?",
      192: "~",
      219: "{",
      220: "|",
      221: "}",
      222: "\"",
      229: "Q"
    };

    var chrome$1 = typeof navigator != "undefined" && /Chrome\/(\d+)/.exec(navigator.userAgent);
    var safari = typeof navigator != "undefined" && /Apple Computer/.test(navigator.vendor);
    var gecko$1 = typeof navigator != "undefined" && /Gecko\/\d+/.test(navigator.userAgent);
    var mac = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
    var ie$1 = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
    var brokenModifierNames = chrome$1 && (mac || +chrome$1[1] < 57) || gecko$1 && mac;

    // Fill in the digit keys
    for (var i = 0; i < 10; i++) base[48 + i] = base[96 + i] = String(i);

    // The function keys
    for (var i = 1; i <= 24; i++) base[i + 111] = "F" + i;

    // And the alphabetic keys
    for (var i = 65; i <= 90; i++) {
      base[i] = String.fromCharCode(i + 32);
      shift[i] = String.fromCharCode(i);
    }

    // For each code that doesn't have a shift-equivalent, copy the base name
    for (var code in base) if (!shift.hasOwnProperty(code)) shift[code] = base[code];

    var keyName = function(event) {
      // Don't trust event.key in Chrome when there are modifiers until
      // they fix https://bugs.chromium.org/p/chromium/issues/detail?id=633838
      var ignoreKey = brokenModifierNames && (event.ctrlKey || event.altKey || event.metaKey) ||
        (safari || ie$1) && event.shiftKey && event.key && event.key.length == 1;
      var name = (!ignoreKey && event.key) ||
        (event.shiftKey ? shift : base)[event.keyCode] ||
        event.key || "Unidentified";
      // Edge sometimes produces wrong names (Issue #3)
      if (name == "Esc") name = "Escape";
      if (name == "Del") name = "Delete";
      // https://developer.microsoft.com/en-us/microsoft-edge/platform/issues/8860571/
      if (name == "Left") name = "ArrowLeft";
      if (name == "Up") name = "ArrowUp";
      if (name == "Right") name = "ArrowRight";
      if (name == "Down") name = "ArrowDown";
      return name
    };

    const mac$1 = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false;
    function normalizeKeyName(name) {
        const parts = name.split(/-(?!$)/);
        let result = parts[parts.length - 1];
        if (result == "Space")
            result = " ";
        let alt, ctrl, shift, meta;
        for (let i = 0; i < parts.length - 1; ++i) {
            const mod = parts[i];
            if (/^(cmd|meta|m)$/i.test(mod))
                meta = true;
            else if (/^a(lt)?$/i.test(mod))
                alt = true;
            else if (/^(c|ctrl|control)$/i.test(mod))
                ctrl = true;
            else if (/^s(hift)?$/i.test(mod))
                shift = true;
            else if (/^mod$/i.test(mod)) {
                if (mac$1)
                    meta = true;
                else
                    ctrl = true;
            }
            else
                throw new Error("Unrecognized modifier name: " + mod);
        }
        if (alt)
            result = "Alt-" + result;
        if (ctrl)
            result = "Ctrl-" + result;
        if (meta)
            result = "Meta-" + result;
        if (shift)
            result = "Shift-" + result;
        return result;
    }
    function modifiers(name, event, shift) {
        if (event.altKey)
            name = "Alt-" + name;
        if (event.ctrlKey)
            name = "Ctrl-" + name;
        if (event.metaKey)
            name = "Meta-" + name;
        if (shift !== false && event.shiftKey)
            name = "Shift-" + name;
        return name;
    }
    /// Create a view extension that registers a keymap.
    ///
    /// You can add multiple keymap behaviors to an editor. Their
    /// priorities determine their precedence (the ones specified early or
    /// with high priority get to dispatch first). When a handler has
    /// returned `true` for a given key, no further handlers are called.
    const keymap = (map) => {
        let set = new NormalizedKeymap(map);
        return EditorView.handleDOMEvents({
            keydown(view, event) {
                let handler = set.get(event);
                return handler ? handler(view) : false;
            }
        });
    };
    /// Stores a set of keybindings in normalized form, and helps looking
    /// up the binding for a keyboard event. Only needed when binding keys
    /// in some custom way.
    class NormalizedKeymap {
        /// Create a normalized map.
        constructor(map) {
            this.map = Object.create(null);
            for (const prop in map)
                this.map[normalizeKeyName(prop)] = map[prop];
        }
        /// Look up the binding for the given keyboard event, or `undefined`
        /// if none is found.
        get(event) {
            const name = keyName(event), isChar = name.length == 1 && name != " ";
            const direct = this.map[modifiers(name, event, !isChar)];
            if (direct)
                return direct;
            let baseName;
            if (isChar && (event.shiftKey || event.altKey || event.metaKey) &&
                (baseName = base_1[event.keyCode]) && baseName != name) {
                const fromCode = this.map[modifiers(baseName, event, true)];
                if (fromCode)
                    return fromCode;
            }
            return undefined;
        }
    }

    class Item {
        constructor(map, inverted = null, selection = null) {
            this.map = map;
            this.inverted = inverted;
            this.selection = selection;
        }
        get isChange() { return this.inverted != null; }
    }
    function updateBranch(branch, to, maxLen, newItem) {
        let start = to + 1 > maxLen + 20 ? to - maxLen - 1 : 0;
        let newBranch = branch.slice(start, to);
        newBranch.push(newItem);
        return newBranch;
    }
    function isAdjacent(prev, cur) {
        return !!prev && cur.from <= prev.mapPos(prev.to, 1) && cur.to >= prev.mapPos(prev.from);
    }
    function addChanges(branch, changes, inverted, selectionBefore, maxLen, mayMerge) {
        if (branch.length) {
            const lastItem = branch[branch.length - 1];
            if (lastItem.selection && lastItem.isChange == Boolean(inverted) && mayMerge(lastItem))
                return inverted ? updateBranch(branch, branch.length - 1, maxLen, new Item(lastItem.map.appendSet(changes.desc), inverted.appendSet(lastItem.inverted), lastItem.selection)) : branch;
        }
        return updateBranch(branch, branch.length, maxLen, new Item(changes.desc, inverted, selectionBefore));
    }
    function popChanges(branch, only) {
        let map = null;
        let idx = branch.length - 1;
        for (;; idx--) {
            if (idx < 0)
                throw new RangeError("popChanges called on empty branch");
            let entry = branch[idx];
            if (entry.isChange || (only == 1 /* Any */ && entry.selection))
                break;
            map = map ? entry.map.appendSet(map) : entry.map;
        }
        let changeItem = branch[idx];
        let newBranch = branch.slice(0, idx), changes = changeItem.inverted || ChangeSet.empty, selection = changeItem.selection;
        if (map) {
            let startIndex = changeItem.map.length;
            map = changeItem.map.appendSet(map);
            let mappedChanges = [];
            for (let i = 0; i < changes.length; i++) {
                let mapped = changes.changes[i].map(map.partialMapping(startIndex - i));
                if (mapped) {
                    map = map.append(mapped.desc);
                    mappedChanges.push(mapped);
                }
            }
            newBranch.push(new Item(map));
            changes = new ChangeSet(mappedChanges); // FIXME preserve mirror data?
            selection = selection.map(map);
        }
        return { changes, branch: newBranch, selection };
    }
    function nope() { return false; }
    function eqSelectionShape(a, b) {
        return a.ranges.length == b.ranges.length &&
            a.ranges.filter((r, i) => r.empty != b.ranges[i].empty).length === 0;
    }
    class HistoryState {
        constructor(done, undone, prevTime = null, prevUserEvent = undefined) {
            this.done = done;
            this.undone = undone;
            this.prevTime = prevTime;
            this.prevUserEvent = prevUserEvent;
        }
        resetTime() {
            return new HistoryState(this.done, this.undone);
        }
        addChanges(changes, inverted, selection, time, userEvent, newGroupDelay, maxLen) {
            let mayMerge = nope;
            if (this.prevTime !== null && time - this.prevTime < newGroupDelay &&
                (inverted || (this.prevUserEvent == userEvent && userEvent == "keyboard")))
                mayMerge = inverted
                    ? prev => isAdjacent(prev.map.changes[prev.map.length - 1], changes.changes[0])
                    : prev => eqSelectionShape(prev.selection, selection);
            return new HistoryState(addChanges(this.done, changes, inverted, selection, maxLen, mayMerge), this.undone, time, userEvent);
        }
        addMapping(map, maxLen) {
            if (this.done.length == 0)
                return this;
            return new HistoryState(updateBranch(this.done, this.done.length, maxLen, new Item(map)), this.undone);
        }
        canPop(done, only) {
            const target = done == 0 /* Done */ ? this.done : this.undone;
            for (const { isChange, selection } of target)
                if (isChange || (only == 1 /* Any */ && selection))
                    return true;
            return false;
        }
        pop(done, only, transaction, maxLen) {
            let { changes, branch, selection } = popChanges(done == 0 /* Done */ ? this.done : this.undone, only);
            let oldSelection = transaction.selection;
            for (let change of changes.changes)
                transaction.change(change);
            transaction.setSelection(selection);
            let otherBranch = (done == 0 /* Done */ ? this.undone : this.done);
            otherBranch = addChanges(otherBranch, transaction.changes, transaction.changes.length > 0 ? transaction.invertedChanges() : null, oldSelection, maxLen, nope);
            return { transaction, state: new HistoryState(done == 0 /* Done */ ? branch : otherBranch, done == 0 /* Done */ ? otherBranch : branch) };
        }
        eventCount(done, only) {
            let count = 0, branch = done == 0 /* Done */ ? this.done : this.undone;
            for (const { isChange, selection } of branch)
                if (isChange || (only == 1 /* Any */ && selection))
                    ++count;
            return count;
        }
    }
    HistoryState.empty = new HistoryState([], []);

    const historyStateAnnotation = Annotation.define();
    const closeHistoryAnnotation = Annotation.define();
    const historyField = new StateField({
        init(editorState) {
            return HistoryState.empty;
        },
        apply(tr, state, editorState) {
            const fromMeta = tr.annotation(historyStateAnnotation);
            if (fromMeta)
                return fromMeta;
            if (tr.annotation(closeHistoryAnnotation))
                state = state.resetTime();
            if (!tr.changes.length && !tr.selectionSet)
                return state;
            let config = editorState.behavior(historyConfig)[0];
            if (tr.annotation(Transaction.addToHistory) !== false)
                return state.addChanges(tr.changes, tr.changes.length ? tr.invertedChanges() : null, tr.startState.selection, tr.annotation(Transaction.time), tr.annotation(Transaction.userEvent), config.newGroupDelay, config.minDepth);
            return state.addMapping(tr.changes.desc, config.minDepth);
        }
    });
    const historyConfig = EditorState.extend.behavior();
    /// Create a history extension with the given configuration.
    const history = EditorState.extend.unique(configs => {
        let config = combineConfig(configs, {
            minDepth: 100,
            newGroupDelay: 500
        }, { minDepth: Math.max, newGroupDelay: Math.min });
        return [
            historyField.extension,
            historyConfig(config)
        ];
    }, {});
    function cmd(target, only) {
        return function ({ state, dispatch }) {
            let behavior = state.behavior(historyConfig);
            if (!behavior.length)
                return false;
            let config = behavior[0];
            let historyState = state.field(historyField);
            if (!historyState.canPop(target, only))
                return false;
            const { transaction, state: newState } = historyState.pop(target, only, state.t(), config.minDepth);
            dispatch(transaction.annotate(historyStateAnnotation(newState)));
            return true;
        };
    }
    /// Undo a single group of history events. Returns false if no group
    /// was available.
    const undo = cmd(0 /* Done */, 0 /* OnlyChanges */);
    /// Redo a group of history events. Returns false if no group was
    /// available.
    const redo = cmd(1 /* Undone */, 0 /* OnlyChanges */);
    /// Undo a selection change.
    const undoSelection = cmd(0 /* Done */, 1 /* Any */);
    /// Redo a selection change.
    const redoSelection = cmd(1 /* Undone */, 1 /* Any */);

    /// A gutter marker represents a bit of information attached to a line
    /// in a specific gutter. Your own custom markers have to extend this
    /// class.
    class GutterMarker extends RangeValue {
        /// @internal
        compare(other) {
            return this == other || this.constructor == other.constructor && this.eq(other);
        }
        /// Map this marker through a position mapping.
        map(mapping, pos) {
            pos = mapping.mapPos(pos, -1, MapMode.TrackBefore);
            return pos < 0 ? null : new Range(pos, pos, this);
        }
        /// Render the DOM node for this marker, if any.
        toDOM(view) { return null; }
        /// Create a range that places this marker at the given position.
        at(pos) { return new Range(pos, pos, this); }
    }
    GutterMarker.prototype.elementClass = "";
    const defaults = {
        style: "",
        renderEmptyElements: false,
        elementStyle: "",
        initialMarkers: () => RangeSet.empty,
        updateMarkers: (markers) => markers,
        lineMarker: () => null,
        initialSpacer: null,
        updateSpacer: null,
        handleDOMEvents: {}
    };
    const gutterBehavior = EditorView.extend.behavior();
    /// Defines an editor gutter.
    class Gutter {
        constructor(config) {
            this.config = fillConfig(config, defaults);
        }
        /// The extension that installs this gutter.
        get extension() {
            return [
                gutters(),
                gutterBehavior(this)
            ];
        }
    }
    /// The gutter-drawing plugin is automatically enabled when you add a
    /// gutter, but you can use this function to explicitly configure it.
    ///
    /// Unless `fixed` is explicitly set to `false`, the gutters are
    /// fixed, meaning they don't scroll along with the content
    /// horizontally.
    const gutters = EditorView.extend.unique((config) => {
        let fixed = config.every(c => c.fixed !== false);
        return [
            ViewPlugin.create(view => new GutterView(view, { fixed }))
                .behavior(EditorView.scrollMargins, gutterView => gutterView.scrollMargins())
                .extension,
            EditorView.theme(baseTheme)
        ];
    }, {});
    class GutterView {
        constructor(view, config) {
            this.view = view;
            this.config = config;
            this.dom = document.createElement("div");
            this.dom.setAttribute("aria-hidden", "true");
            this.gutters = view.behavior(gutterBehavior).map(gutter => new SingleGutterView(view, gutter.config));
            for (let gutter of this.gutters)
                this.dom.appendChild(gutter.dom);
            if (config.fixed) {
                // FIXME IE11 fallback, which doesn't support position: sticky,
                // by using position: relative + event handlers that realign the
                // gutter (or just force fixed=false on IE11?)
                this.dom.style.position = "sticky";
            }
            view.scrollDOM.insertBefore(this.dom, view.contentDOM);
            this.updateTheme();
        }
        updateTheme() {
            this.dom.className = this.view.cssClass("gutters");
            for (let gutter of this.gutters)
                gutter.updateTheme();
        }
        update(update) {
            if (update.themeChanged)
                this.updateTheme();
            for (let gutter of this.gutters)
                gutter.update(update);
        }
        draw() {
            // FIXME would be nice to be able to recognize updates that didn't redraw
            let contexts = this.gutters.map(gutter => new UpdateContext(gutter, this.view.viewport));
            this.view.viewportLines(line => {
                let text;
                if (Array.isArray(line.type))
                    text = line.type.find(b => b.type == BlockType.Text);
                else
                    text = line.type == BlockType.Text ? line : undefined;
                if (!text)
                    return;
                for (let cx of contexts)
                    cx.line(this.view, text);
            }, 0);
            for (let cx of contexts)
                cx.finish(this.view);
            this.dom.style.minHeight = this.view.contentHeight + "px";
        }
        scrollMargins() {
            if (this.gutters.length == 0 || !this.config.fixed)
                return {};
            return getComputedStyle(this.view.scrollDOM).direction == "ltr" ? { left: this.dom.offsetWidth } : { right: this.dom.offsetWidth };
        }
    }
    class UpdateContext {
        constructor(gutter, viewport) {
            this.gutter = gutter;
            this.localMarkers = [];
            this.i = 0;
            this.height = 0;
            this.next = gutter.markers.iter(viewport.from, viewport.to).next;
            this.nextMarker = this.next();
        }
        line(view, line) {
            if (this.localMarkers.length)
                this.localMarkers = [];
            while (this.nextMarker && this.nextMarker.from <= line.from) {
                if (this.nextMarker.from == line.from)
                    this.localMarkers.push(this.nextMarker.value);
                this.nextMarker = this.next();
            }
            let forLine = this.gutter.config.lineMarker(view, line, this.localMarkers);
            if (forLine)
                this.localMarkers.unshift(forLine);
            let gutter = this.gutter;
            if (this.localMarkers.length == 0 && !gutter.config.renderEmptyElements)
                return;
            let above = line.top - this.height;
            if (this.i == gutter.elements.length) {
                let newElt = new GutterElement(view, line.height, above, this.localMarkers, gutter.elementClass);
                gutter.elements.push(newElt);
                gutter.dom.appendChild(newElt.dom);
            }
            else {
                let markers = this.localMarkers, elt = gutter.elements[this.i];
                if (sameMarkers(markers, elt.markers)) {
                    markers = elt.markers;
                    this.localMarkers.length = 0;
                }
                elt.update(view, line.height, above, markers, gutter.elementClass);
            }
            this.height = line.bottom;
            this.i++;
        }
        finish(view) {
            let gutter = this.gutter;
            while (gutter.elements.length > this.i)
                gutter.dom.removeChild(gutter.elements.pop().dom);
        }
    }
    class SingleGutterView {
        constructor(view, config) {
            this.view = view;
            this.config = config;
            this.elements = [];
            this.spacer = null;
            this.dom = document.createElement("div");
            for (let prop in config.handleDOMEvents) {
                this.dom.addEventListener(prop, (event) => {
                    let line = view.lineAtHeight(event.clientY);
                    if (config.handleDOMEvents[prop](view, line, event))
                        event.preventDefault();
                });
            }
            this.markers = config.initialMarkers(view);
            if (config.initialSpacer) {
                this.spacer = new GutterElement(view, 0, 0, [config.initialSpacer(view)], this.elementClass);
                this.dom.appendChild(this.spacer.dom);
                this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none";
            }
            this.updateTheme();
        }
        updateTheme() {
            this.dom.className = this.view.cssClass("gutter" + (this.config.style ? "." + this.config.style : ""));
            this.elementClass = this.view.cssClass("gutterElement" + (this.config.style ? "." + this.config.style : ""));
            while (this.elements.length)
                this.dom.removeChild(this.elements.pop().dom);
        }
        update(update) {
            if (update.themeChanged)
                this.updateTheme();
            this.markers = this.config.updateMarkers(this.markers.map(update.changes), update);
            if (this.spacer && this.config.updateSpacer) {
                let updated = this.config.updateSpacer(this.spacer.markers[0], update);
                if (updated != this.spacer.markers[0])
                    this.spacer.update(update.view, 0, 0, [updated], this.elementClass);
            }
        }
        destroy() {
            this.dom.remove();
        }
    }
    class GutterElement {
        constructor(view, height, above, markers, eltClass) {
            this.height = -1;
            this.above = 0;
            this.dom = document.createElement("div");
            this.update(view, height, above, markers, eltClass);
        }
        update(view, height, above, markers, cssClass) {
            if (this.height != height)
                this.dom.style.height = (this.height = height) + "px";
            if (this.above != above)
                this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
            if (this.markers != markers) {
                this.markers = markers;
                for (let ch; ch = this.dom.lastChild;)
                    ch.remove();
                let cls = cssClass;
                for (let m of markers) {
                    let dom = m.toDOM(view);
                    if (dom)
                        this.dom.appendChild(dom);
                    let c = m.elementClass;
                    if (c)
                        cls += " " + c;
                }
                this.dom.className = cls;
            }
        }
    }
    function sameMarkers(a, b) {
        if (a.length != b.length)
            return false;
        for (let i = 0; i < a.length; i++)
            if (!a[i].compare(b[i]))
                return false;
        return true;
    }
    /// Used to insert markers into the line number gutter.
    const lineNumberMarkers = Annotation.define();
    /// Create a line number gutter extension. The order in which the
    /// gutters appear is determined by their extension priority.
    const lineNumbers = EditorView.extend.unique(configs => {
        let config = combineConfig(configs, { formatNumber: String, handleDOMEvents: {} }, {
            handleDOMEvents(a, b) {
                let result = {};
                for (let event in a)
                    result[event] = a[event];
                for (let event in b) {
                    let exists = result[event], add = b[event];
                    result[event] = exists ? (view, line, event) => exists(view, line, event) || add(view, line, event) : add;
                }
                return result;
            }
        });
        class NumberMarker extends GutterMarker {
            constructor(number) {
                super();
                this.number = number;
            }
            eq(other) { return this.number == other.number; }
            toDOM() {
                return document.createTextNode(config.formatNumber(this.number));
            }
        }
        // FIXME preserve markers across reconfigurations by somehow making
        // this gutter static
        return new Gutter({
            style: "lineNumber",
            updateMarkers(markers, update) {
                let ann = update.annotation(lineNumberMarkers);
                if (ann)
                    markers = markers.update(ann.add || [], ann.filter || null);
                return markers;
            },
            lineMarker(view, line, others) {
                if (others.length)
                    return null;
                // FIXME try to make the line number queries cheaper?
                return new NumberMarker(view.state.doc.lineAt(line.from).number);
            },
            initialSpacer(view) {
                return new NumberMarker(maxLineNumber(view.state.doc.lines));
            },
            updateSpacer(spacer, update) {
                let max = maxLineNumber(update.view.state.doc.lines);
                return max == spacer.number ? spacer : new NumberMarker(max);
            }
        }).extension;
    }, {});
    function maxLineNumber(lines) {
        let last = 9;
        while (last < lines)
            last = last * 10 + 9;
        return last;
    }
    const baseTheme = {
        gutters: {
            background: "#f5f5f5",
            borderRight: "1px solid silver",
            color: "#999",
            display: "flex",
            height: "100%",
            boxSizing: "border-box",
            left: 0
        },
        gutter: {
            display: "flex !important",
            flexDirection: "column",
            flexShrink: 0,
            boxSizing: "border-box",
            height: "100%",
            overflow: "hidden"
        },
        gutterElement: {
            boxSizing: "border-box"
        },
        "gutterElement.lineNumber": {
            padding: "0 3px 0 5px",
            minWidth: "20px",
            textAlign: "right",
            whiteSpace: "nowrap"
        }
    };

    function moveSelection(view, dir, granularity) {
        let transaction = view.state.t().forEachRange(range => {
            if (!range.empty && granularity != "lineboundary")
                return new SelectionRange(dir == "left" || dir == "backward" ? range.from : range.to);
            return new SelectionRange(view.movePos(range.head, dir, granularity, "move"));
        });
        if (transaction.selection.eq(view.state.selection))
            return false;
        if (granularity == "line")
            transaction.annotate(Transaction.preserveGoalColumn(true));
        view.dispatch(transaction.scrollIntoView());
        return true;
    }
    /// Move the selection one character to the left (which is backward in
    /// left-to-right text, forward in right-to-left text).
    const moveCharLeft = view => moveSelection(view, "left", "character");
    /// Move the selection one character to the right.
    const moveCharRight = view => moveSelection(view, "right", "character");
    /// Move the selection one word to the left.
    const moveWordLeft = view => moveSelection(view, "left", "word");
    /// Move the selection one word to the right.
    const moveWordRight = view => moveSelection(view, "right", "word");
    /// Move the selection one line up.
    const moveLineUp = view => moveSelection(view, "backward", "line");
    /// Move the selection one line down.
    const moveLineDown = view => moveSelection(view, "forward", "line");
    /// Move the selection to the start of the line.
    const moveLineStart = view => moveSelection(view, "backward", "lineboundary");
    /// Move the selection to the end of the line.
    const moveLineEnd = view => moveSelection(view, "forward", "lineboundary");
    function extendSelection(view, dir, granularity) {
        let transaction = view.state.t().forEachRange(range => {
            return new SelectionRange(range.anchor, view.movePos(range.head, dir, granularity, "extend"));
        });
        if (transaction.selection.eq(view.state.selection))
            return false;
        if (granularity == "line")
            transaction.annotate(Transaction.preserveGoalColumn(true));
        view.dispatch(transaction.scrollIntoView());
        return true;
    }
    /// Move the selection head one character to the left, while leaving
    /// the anchor in place.
    const extendCharLeft = view => extendSelection(view, "left", "character");
    /// Move the selection head one character to the right.
    const extendCharRight = view => extendSelection(view, "right", "character");
    /// Move the selection head one word to the left.
    const extendWordLeft = view => extendSelection(view, "left", "word");
    /// Move the selection head one word to the right.
    const extendWordRight = view => extendSelection(view, "right", "word");
    /// Move the selection head one line up.
    const extendLineUp = view => extendSelection(view, "backward", "line");
    /// Move the selection head one line down.
    const extendLineDown = view => extendSelection(view, "forward", "line");
    /// Move the selection head to the start of the line.
    const extendLineStart = view => extendSelection(view, "backward", "lineboundary");
    /// Move the selection head to the end of the line.
    const extendLineEnd = view => extendSelection(view, "forward", "lineboundary");
    /// Move the selection to the start of the document.
    const selectDocStart = ({ state, dispatch }) => {
        dispatch(state.t().setSelection(EditorSelection.single(0)).scrollIntoView());
        return true;
    };
    /// Move the selection to the end of the document.
    const selectDocEnd = ({ state, dispatch }) => {
        dispatch(state.t().setSelection(EditorSelection.single(state.doc.length)).scrollIntoView());
        return true;
    };
    /// Select the entire document.
    const selectAll = ({ state, dispatch }) => {
        dispatch(state.t().setSelection(EditorSelection.single(0, state.doc.length)));
        return true;
    };
    function deleteText(view, dir) {
        let transaction = view.state.t().forEachRange((range, transaction) => {
            let { from, to } = range;
            if (from == to) {
                let target = view.movePos(range.head, dir, "character", "move");
                from = Math.min(from, target);
                to = Math.max(to, target);
            }
            if (from == to)
                return range;
            transaction.replace(from, to, "");
            return new SelectionRange(from);
        });
        if (!transaction.docChanged)
            return false;
        view.dispatch(transaction.scrollIntoView());
        return true;
    }
    /// Delete the character before the cursor (which is the one to left
    /// in left-to-right text, but the one to the right in right-to-left
    /// text).
    const deleteCharBackward = view => deleteText(view, "backward");
    /// Delete the character after the cursor.
    const deleteCharForward = view => deleteText(view, "forward");
    // FIXME support indenting by tab, configurable indent units
    function space(n) {
        let result = "";
        for (let i = 0; i < n; i++)
            result += " ";
        return result;
    }
    function getIndentation(state, pos) {
        for (let f of state.behavior(EditorState.indentation)) {
            let result = f(state, pos);
            if (result > -1)
                return result;
        }
        return -1;
    }
    /// Replace the selection with a newline and indent the newly created
    /// line(s).
    const insertNewlineAndIndent = ({ state, dispatch }) => {
        let i = 0, indentation = state.selection.ranges.map(r => {
            let indent = getIndentation(state, r.from);
            return indent > -1 ? indent : /^\s*/.exec(state.doc.lineAt(r.from).slice(0, 50))[0].length;
        });
        dispatch(state.t().forEachRange(({ from, to }, tr) => {
            let indent = indentation[i++], line = tr.doc.lineAt(to);
            while (to < line.end && /s/.test(line.slice(to - line.start, to + 1 - line.start)))
                to++;
            tr.replace(from, to, ["", space(indent)]);
            return new SelectionRange(from + indent + 1);
        }).scrollIntoView());
        return true;
    };
    /// Auto-indent the selected lines. This uses the [indentation
    /// behavor](#state.EditorState^indentation) as source.
    const indentSelection = ({ state, dispatch }) => {
        // FIXME this will base all indentation on the same state, which is
        // wrong (indentation looks at the indent of previous lines, which may
        // be changed).
        let lastLine = -1, positions = [];
        for (let range of state.selection.ranges) {
            for (let { start, end } = state.doc.lineAt(range.from);;) {
                if (start != lastLine) {
                    lastLine = start;
                    let indent = getIndentation(state, start), current;
                    if (indent > -1 &&
                        indent != (current = /^\s*/.exec(state.doc.slice(start, Math.min(end, start + 100)))[0].length))
                        positions.push({ pos: start, current, indent });
                }
                if (end + 1 > range.to)
                    break;
                ({ start, end } = state.doc.lineAt(end + 1));
            }
        }
        if (positions.length > 0) {
            let tr = state.t();
            for (let { pos, current, indent } of positions) {
                let start = tr.changes.mapPos(pos);
                tr.replace(start, start + current, space(indent));
            }
            dispatch(tr);
        }
        return true;
    };
    /// The default keymap for Linux/Windows/non-Mac platforms. Binds the
    /// arrows for cursor motion, shift-arrow for selection extension,
    /// ctrl-arrows for by-word motion, home/end for line start/end,
    /// ctrl-home/end for document start/end, ctrl-a to select all,
    /// backspace/delete for deletion, and enter for newline-and-indent.
    const pcBaseKeymap = {
        "ArrowLeft": moveCharLeft,
        "ArrowRight": moveCharRight,
        "Shift-ArrowLeft": extendCharLeft,
        "Shift-ArrowRight": extendCharRight,
        "Mod-ArrowLeft": moveWordLeft,
        "Mod-ArrowRight": moveWordRight,
        "Shift-Mod-ArrowLeft": extendWordLeft,
        "Shift-Mod-ArrowRight": extendWordRight,
        "ArrowUp": moveLineUp,
        "ArrowDown": moveLineDown,
        "Shift-ArrowUp": extendLineUp,
        "Shift-ArrowDown": extendLineDown,
        "Home": moveLineStart,
        "End": moveLineEnd,
        "Shift-Home": extendLineStart,
        "Shift-End": extendLineEnd,
        "Mod-Home": selectDocStart,
        "Mod-End": selectDocEnd,
        "Mod-a": selectAll,
        "Backspace": deleteCharBackward,
        "Delete": deleteCharForward,
        "Enter": insertNewlineAndIndent
    };
    /// The default keymap for Mac platforms. Includes the bindings from
    /// the [PC keymap](#commands.pcBaseKeymap) (using Cmd instead of
    /// Ctrl), and adds Mac-specific default bindings.
    const macBaseKeymap = {
        "Control-b": moveCharLeft,
        "Control-f": moveCharRight,
        "Shift-Control-b": extendCharLeft,
        "Shift-Control-f": extendCharRight,
        "Control-p": moveLineUp,
        "Control-n": moveLineDown,
        "Shift-Control-p": extendLineUp,
        "Shift-Control-n": extendLineDown,
        "Control-a": moveLineStart,
        "Control-e": moveLineEnd,
        "Shift-Control-a": extendLineStart,
        "Shift-Control-e": extendLineEnd,
        "Cmd-ArrowUp": selectDocStart,
        "Cmd-ArrowDown": selectDocEnd,
        "Control-d": deleteCharForward,
        "Control-h": deleteCharBackward
    };
    for (let key in pcBaseKeymap)
        macBaseKeymap[key] = pcBaseKeymap[key];
    const mac$2 = typeof navigator != "undefined" ? /Mac/.test(navigator.platform)
        : typeof os != "undefined" ? os.platform() == "darwin" : false;
    /// The default keymap for the current platform.
    const baseKeymap = mac$2 ? macBaseKeymap : pcBaseKeymap;

    var char_1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u180b-\u180d\u18a9\u200c\u200d]/;
    try {
        extendingChars = new RegExp("\\p{Grapheme_Extend}", "u");
    }
    catch (_) { }
    function isExtendingChar(ch) {
        var code = ch.charCodeAt(0);
        return code >= 768 && (code >= 0xdc00 && code < 0xe000 || extendingChars.test(ch));
    }
    exports.isExtendingChar = isExtendingChar;
    var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
    var wordChar;
    try {
        wordChar = new RegExp("[\\p{Alphabetic}_]", "u");
    }
    catch (_) { }
    // FIXME this doesn't work for astral chars yet (need different calling convention)
    function isWordCharBasic(ch) {
        if (wordChar)
            return wordChar.test(ch);
        return /\w/.test(ch) || ch > "\x80" &&
            (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch));
    }
    function isWordChar(ch, wordChars) {
        if (!wordChars)
            return isWordCharBasic(ch);
        if (wordChars.source.indexOf("\\w") > -1 && isWordCharBasic(ch))
            return true;
        return wordChars.test(ch);
    }
    exports.isWordChar = isWordChar;
    var CharType;
    (function (CharType) {
        CharType[CharType["Word"] = 0] = "Word";
        CharType[CharType["Space"] = 1] = "Space";
        CharType[CharType["Other"] = 2] = "Other";
    })(CharType = exports.CharType || (exports.CharType = {}));
    function charType(ch, wordChars) {
        return /\s/.test(ch) ? CharType.Space : isWordChar(ch, wordChars) ? CharType.Word : CharType.Other;
    }
    exports.charType = charType;
    });

    unwrapExports(char_1);
    var char_2 = char_1.isExtendingChar;
    var char_3 = char_1.isWordChar;
    var char_4 = char_1.CharType;
    var char_5 = char_1.charType;

    var column = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    function countColumn(string, n, tabSize) {
        for (var i = 0; i < string.length; i++) {
            var code = string.charCodeAt(i);
            if (code == 9)
                n += tabSize - (n % tabSize);
            else if (code < 768 || !char_1.isExtendingChar(string.charAt(i)))
                n++;
        }
        return n;
    }
    exports.countColumn = countColumn;
    function findColumn(string, n, col, tabSize) {
        for (var i = 0; i < string.length; i++) {
            var code = string.charCodeAt(i);
            if (code >= 768 && char_1.isExtendingChar(string.charAt(i)))
                continue;
            if (n >= col)
                return { offset: i, leftOver: 0 };
            n += code == 9 ? tabSize - (n % tabSize) : 1;
        }
        return { offset: string.length, leftOver: col - n };
    }
    exports.findColumn = findColumn;
    });

    unwrapExports(column);
    var column_1 = column.countColumn;
    var column_2 = column.findColumn;

    var text$1 = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    // The base size of a leaf node
    var BASE_LEAF = 512;
    // The max size of a leaf node
    var MAX_LEAF = BASE_LEAF << 1;
    // The desired amount of branches per node, as an exponent of 2 (so 3
    // means 8 branches)
    var TARGET_BRANCH_SHIFT = 3;
    // Note line numbers are 1-based
    var Text = /** @class */ (function () {
        // @internal
        function Text() {
        }
        Text.prototype.lineAt = function (pos) {
            if (pos < 0 || pos > this.length)
                throw new RangeError("Invalid position " + pos + " in document of length " + this.length);
            for (var i = 0; i < lineCache.length; i += 2) {
                if (lineCache[i] != this)
                    continue;
                var line = lineCache[i + 1];
                if (line.start <= pos && line.end >= pos)
                    return line;
            }
            return cacheLine(this, this.lineInner(pos, false, 1, 0).finish(this));
        };
        Text.prototype.line = function (n) {
            if (n < 1 || n > this.lines)
                throw new RangeError("Invalid line number ${n} in ${this.lines}-line document");
            for (var i = 0; i < lineCache.length; i += 2) {
                if (lineCache[i] != this)
                    continue;
                var line = lineCache[i + 1];
                if (line.number == n)
                    return line;
            }
            return cacheLine(this, this.lineInner(n, true, 1, 0).finish(this));
        };
        Text.prototype.replace = function (from, to, text) {
            if (text.length == 0)
                throw new RangeError("An inserted range must have at least one line");
            return this.replaceInner(from, to, text, textLength(text));
        };
        Text.prototype.sliceLines = function (from, to) {
            if (to === void 0) { to = this.length; }
            return this.sliceTo(from, to, [""]);
        };
        Text.prototype.slice = function (from, to, lineSeparator) {
            return joinLines(this.sliceLines(from, to), lineSeparator);
        };
        Text.prototype.eq = function (other) { return this == other || eqContent(this, other); };
        Text.prototype.iter = function (dir) {
            if (dir === void 0) { dir = 1; }
            return new RawTextCursor(this, dir);
        };
        Text.prototype.iterRange = function (from, to) {
            if (to === void 0) { to = this.length; }
            return new PartialTextCursor(this, from, to);
        };
        Text.prototype.iterLines = function (from) {
            if (from === void 0) { from = 0; }
            return new LineCursor(this, from);
        };
        Text.prototype.toString = function () { return this.slice(0, this.length); };
        Text.of = function (text, lineSeparator) {
            if (typeof text == "string")
                text = splitLines(text, lineSeparator);
            else if (text.length == 0)
                throw new RangeError("A document must have at least one line");
            var length = textLength(text);
            return length < MAX_LEAF ? new TextLeaf(text, length) : TextNode.from(TextLeaf.split(text, []), length);
        };
        return Text;
    }());
    exports.Text = Text;
    var lineCache = [], lineCachePos = -2, lineCacheSize = 12;
    function cacheLine(text, line) {
        lineCachePos = (lineCachePos + 2) % lineCacheSize;
        lineCache[lineCachePos] = text;
        lineCache[lineCachePos + 1] = line;
        return line;
    }
    function splitLines(text, lineSeparator) {
        if (lineSeparator === void 0) { lineSeparator = DEFAULT_SPLIT; }
        return text.split(lineSeparator);
    }
    exports.splitLines = splitLines;
    function joinLines(text, lineSeparator) {
        if (lineSeparator === void 0) { lineSeparator = "\n"; }
        return text.join(lineSeparator);
    }
    exports.joinLines = joinLines;
    var DEFAULT_SPLIT = /\r\n?|\n/;
    var TextLeaf = /** @class */ (function (_super) {
        __extends(TextLeaf, _super);
        function TextLeaf(text, length) {
            if (length === void 0) { length = textLength(text); }
            var _this = _super.call(this) || this;
            _this.text = text;
            _this.length = length;
            return _this;
        }
        Object.defineProperty(TextLeaf.prototype, "lines", {
            get: function () { return this.text.length; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TextLeaf.prototype, "children", {
            get: function () { return null; },
            enumerable: true,
            configurable: true
        });
        TextLeaf.prototype.replaceInner = function (from, to, text, length) {
            return Text.of(appendText(this.text, appendText(text, sliceText(this.text, 0, from)), to));
        };
        TextLeaf.prototype.sliceTo = function (from, to, target) {
            if (to === void 0) { to = this.length; }
            return appendText(this.text, target, from, to);
        };
        TextLeaf.prototype.lineInner = function (target, isLine, line, offset) {
            for (var i = 0;; i++) {
                var string = this.text[i], end = offset + string.length;
                if ((isLine ? line : end) >= target)
                    return new Line(offset, end, line, string);
                offset = end + 1;
                line++;
            }
        };
        TextLeaf.prototype.decomposeStart = function (to, target) {
            target.push(new TextLeaf(sliceText(this.text, 0, to), to));
        };
        TextLeaf.prototype.decomposeEnd = function (from, target) {
            target.push(new TextLeaf(sliceText(this.text, from), this.length - from));
        };
        TextLeaf.prototype.lastLineLength = function () { return this.text[this.text.length - 1].length; };
        TextLeaf.prototype.firstLineLength = function () { return this.text[0].length; };
        TextLeaf.split = function (text, target) {
            var part = [], length = -1;
            for (var _i = 0, text_1 = text; _i < text_1.length; _i++) {
                var line = text_1[_i];
                for (;;) {
                    var newLength = length + line.length + 1;
                    if (newLength < BASE_LEAF) {
                        length = newLength;
                        part.push(line);
                        break;
                    }
                    var cut = BASE_LEAF - length - 1, after = line.charCodeAt(cut);
                    if (after >= 0xdc00 && after < 0xe000)
                        cut++;
                    part.push(line.slice(0, cut));
                    target.push(new TextLeaf(part, BASE_LEAF));
                    line = line.slice(cut);
                    length = -1;
                    part = [];
                }
            }
            if (length != -1)
                target.push(new TextLeaf(part, length));
            return target;
        };
        return TextLeaf;
    }(Text));
    var TextNode = /** @class */ (function (_super) {
        __extends(TextNode, _super);
        function TextNode(children, length) {
            var _this = _super.call(this) || this;
            _this.children = children;
            _this.length = length;
            _this.lines = 1;
            for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
                var child = children_1[_i];
                _this.lines += child.lines - 1;
            }
            return _this;
        }
        TextNode.prototype.replaceInner = function (from, to, text, length) {
            var lengthDiff = length - (to - from), newLength = this.length + lengthDiff;
            if (newLength <= BASE_LEAF)
                return new TextLeaf(appendText(this.sliceLines(to), appendText(text, this.sliceTo(0, from, [""]))), newLength);
            var children;
            for (var i = 0, pos = 0; i < this.children.length; i++) {
                var child = this.children[i], end = pos + child.length;
                if (from >= pos && to <= end &&
                    (lengthDiff > 0
                        ? child.length + lengthDiff < Math.max(newLength >> (TARGET_BRANCH_SHIFT - 1), MAX_LEAF)
                        : child.length + lengthDiff > newLength >> (TARGET_BRANCH_SHIFT + 1))) {
                    // Fast path: if the change only affects one child and the
                    // child's size remains in the acceptable range, only update
                    // that child
                    children = this.children.slice();
                    children[i] = child.replace(from - pos, to - pos, text);
                    return new TextNode(children, newLength);
                }
                else if (end >= from) {
                    // Otherwise, we must build up a new array of children
                    if (children == null)
                        children = this.children.slice(0, i);
                    if (pos < from) {
                        if (end == from)
                            children.push(child);
                        else
                            child.decomposeStart(from - pos, children);
                    }
                    if (pos <= from && end >= from)
                        TextLeaf.split(text, children);
                    if (pos >= to)
                        children.push(child);
                    else if (end > to)
                        child.decomposeEnd(to - pos, children);
                }
                pos = end;
            }
            return children ? TextNode.from(children, newLength) : this;
        };
        TextNode.prototype.sliceTo = function (from, to, target) {
            var pos = 0;
            for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                var child = _a[_i];
                var end = pos + child.length;
                if (to > pos && from < end)
                    child.sliceTo(Math.max(0, from - pos), Math.min(child.length, to - pos), target);
                pos = end;
            }
            return target;
        };
        TextNode.prototype.lineInner = function (target, isLine, line, offset) {
            for (var i = 0;; i++) {
                var child = this.children[i], end = offset + child.length, endLine = line + child.lines - 1;
                if ((isLine ? endLine : end) >= target) {
                    var inner = child.lineInner(target, isLine, line, offset), add = void 0;
                    if (inner.start == offset && (add = this.lineLengthTo(i))) {
                        inner.start -= add;
                        inner.content = null;
                    }
                    if (inner.end == end && (add = this.lineLengthFrom(i + 1))) {
                        inner.end += add;
                        inner.content = null;
                    }
                    return inner;
                }
                offset = end;
                line = endLine;
            }
        };
        TextNode.prototype.decomposeStart = function (to, target) {
            for (var i = 0, pos = 0;; i++) {
                var child = this.children[i], end = pos + child.length;
                if (end <= to) {
                    target.push(child);
                }
                else {
                    if (pos < to)
                        child.decomposeStart(to - pos, target);
                    break;
                }
                pos = end;
            }
        };
        TextNode.prototype.decomposeEnd = function (from, target) {
            var pos = 0;
            for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                var child = _a[_i];
                var end = pos + child.length;
                if (pos >= from)
                    target.push(child);
                else if (end > from && pos < from)
                    child.decomposeEnd(from - pos, target);
                pos = end;
            }
        };
        TextNode.prototype.lineLengthTo = function (to) {
            var length = 0;
            for (var i = to - 1; i >= 0; i--) {
                var child = this.children[i];
                if (child.lines > 1)
                    return length + child.lastLineLength();
                length += child.length;
            }
            return length;
        };
        TextNode.prototype.lastLineLength = function () { return this.lineLengthTo(this.children.length); };
        TextNode.prototype.lineLengthFrom = function (from) {
            var length = 0;
            for (var i = from; i < this.children.length; i++) {
                var child = this.children[i];
                if (child.lines > 1)
                    return length + child.firstLineLength();
                length += child.length;
            }
            return length;
        };
        TextNode.prototype.firstLineLength = function () { return this.lineLengthFrom(0); };
        TextNode.from = function (children, length) {
            if (length < MAX_LEAF) {
                var text = [""];
                for (var _i = 0, children_2 = children; _i < children_2.length; _i++) {
                    var child = children_2[_i];
                    child.sliceTo(0, child.length, text);
                }
                return new TextLeaf(text, length);
            }
            var chunkLength = Math.max(BASE_LEAF, length >> TARGET_BRANCH_SHIFT), maxLength = chunkLength << 1, minLength = chunkLength >> 1;
            var chunked = [], currentLength = 0, currentChunk = [];
            function add(child) {
                var childLength = child.length, last;
                if (childLength > maxLength && child instanceof TextNode) {
                    for (var _i = 0, _a = child.children; _i < _a.length; _i++) {
                        var node = _a[_i];
                        add(node);
                    }
                }
                else if (childLength > minLength && (currentLength > minLength || currentLength == 0)) {
                    flush();
                    chunked.push(child);
                }
                else if (child instanceof TextLeaf && currentLength > 0 &&
                    (last = currentChunk[currentChunk.length - 1]) instanceof TextLeaf &&
                    child.length + last.length <= BASE_LEAF) {
                    currentLength += childLength;
                    currentChunk[currentChunk.length - 1] = new TextLeaf(appendText(child.text, last.text.slice()), child.length + last.length);
                }
                else {
                    if (currentLength + childLength > chunkLength)
                        flush();
                    currentLength += childLength;
                    currentChunk.push(child);
                }
            }
            function flush() {
                if (currentLength == 0)
                    return;
                chunked.push(currentChunk.length == 1 ? currentChunk[0] : TextNode.from(currentChunk, currentLength));
                currentLength = 0;
                currentChunk.length = 0;
            }
            for (var _a = 0, children_3 = children; _a < children_3.length; _a++) {
                var child = children_3[_a];
                add(child);
            }
            flush();
            return chunked.length == 1 ? chunked[0] : new TextNode(chunked, length);
        };
        return TextNode;
    }(Text));
    Text.empty = Text.of("");
    function textLength(text) {
        var length = -1;
        for (var _i = 0, text_2 = text; _i < text_2.length; _i++) {
            var line = text_2[_i];
            length += line.length + 1;
        }
        return length;
    }
    function appendText(text, target, from, to) {
        if (from === void 0) { from = 0; }
        if (to === void 0) { to = 1e9; }
        for (var pos = 0, i = 0, first = true; i < text.length && pos <= to; i++) {
            var line = text[i], end = pos + line.length;
            if (end >= from) {
                if (end > to)
                    line = line.slice(0, to - pos);
                if (pos < from)
                    line = line.slice(from - pos);
                if (first) {
                    target[target.length - 1] += line;
                    first = false;
                }
                else
                    target.push(line);
            }
            pos = end + 1;
        }
        return target;
    }
    function sliceText(text, from, to) {
        return appendText(text, [""], from, to);
    }
    function eqContent(a, b) {
        if (a.length != b.length || a.lines != b.lines)
            return false;
        var iterA = new RawTextCursor(a), iterB = new RawTextCursor(b);
        for (var offA = 0, offB = 0;;) {
            if (iterA.lineBreak != iterB.lineBreak || iterA.done != iterB.done) {
                return false;
            }
            else if (iterA.done) {
                return true;
            }
            else if (iterA.lineBreak) {
                iterA.next();
                iterB.next();
                offA = offB = 0;
            }
            else {
                var strA = iterA.value.slice(offA), strB = iterB.value.slice(offB);
                if (strA.length == strB.length) {
                    if (strA != strB)
                        return false;
                    iterA.next();
                    iterB.next();
                    offA = offB = 0;
                }
                else if (strA.length > strB.length) {
                    if (strA.slice(0, strB.length) != strB)
                        return false;
                    offA += strB.length;
                    iterB.next();
                    offB = 0;
                }
                else {
                    if (strB.slice(0, strA.length) != strA)
                        return false;
                    offB += strA.length;
                    iterA.next();
                    offA = 0;
                }
            }
        }
    }
    var RawTextCursor = /** @class */ (function () {
        // @internal
        function RawTextCursor(text, dir) {
            if (dir === void 0) { dir = 1; }
            this.dir = dir;
            this.done = false;
            this.lineBreak = false;
            this.value = "";
            this.nodes = [text];
            this.offsets = [dir > 0 ? 0 : text instanceof TextLeaf ? text.text.length : text.children.length];
        }
        RawTextCursor.prototype.next = function (skip) {
            if (skip === void 0) { skip = 0; }
            for (;;) {
                var last = this.nodes.length - 1;
                if (last < 0) {
                    this.done = true;
                    this.value = "";
                    this.lineBreak = false;
                    return this;
                }
                var top_1 = this.nodes[last];
                var offset = this.offsets[last];
                if (top_1 instanceof TextLeaf) {
                    // Internal ofset with lineBreak == false means we have to
                    // count the line break at this position
                    if (offset != (this.dir > 0 ? 0 : top_1.text.length) && !this.lineBreak) {
                        this.lineBreak = true;
                        if (skip == 0) {
                            this.value = "\n";
                            return this;
                        }
                        skip--;
                        continue;
                    }
                    // Otherwise, move to the next string
                    var next = top_1.text[offset - (this.dir < 0 ? 1 : 0)];
                    this.offsets[last] = (offset += this.dir);
                    if (offset == (this.dir > 0 ? top_1.text.length : 0)) {
                        this.nodes.pop();
                        this.offsets.pop();
                    }
                    this.lineBreak = false;
                    if (next.length > skip) {
                        this.value = skip == 0 ? next : this.dir > 0 ? next.slice(skip) : next.slice(0, next.length - skip);
                        return this;
                    }
                    skip -= next.length;
                }
                else if (offset == (this.dir > 0 ? top_1.children.length : 0)) {
                    this.nodes.pop();
                    this.offsets.pop();
                }
                else {
                    var next = top_1.children[this.dir > 0 ? offset : offset - 1], len = next.length;
                    this.offsets[last] = offset + this.dir;
                    if (skip > len) {
                        skip -= len;
                    }
                    else {
                        this.nodes.push(next);
                        this.offsets.push(this.dir > 0 ? 0 : next instanceof TextLeaf ? next.text.length : next.children.length);
                    }
                }
            }
        };
        return RawTextCursor;
    }());
    var PartialTextCursor = /** @class */ (function () {
        function PartialTextCursor(text, start, end) {
            this.value = "";
            this.cursor = new RawTextCursor(text, start > end ? -1 : 1);
            if (start > end) {
                this.skip = text.length - start;
                this.limit = start - end;
            }
            else {
                this.skip = start;
                this.limit = end - start;
            }
        }
        PartialTextCursor.prototype.next = function () {
            if (this.limit <= 0) {
                this.limit = -1;
            }
            else {
                var _a = this.cursor.next(this.skip), value = _a.value, lineBreak = _a.lineBreak;
                this.skip = 0;
                this.value = value;
                var len = lineBreak ? 1 : value.length;
                if (len > this.limit)
                    this.value = this.cursor.dir > 0 ? value.slice(0, this.limit) : value.slice(len - this.limit);
                this.limit -= this.value.length;
            }
            return this;
        };
        Object.defineProperty(PartialTextCursor.prototype, "lineBreak", {
            get: function () { return this.cursor.lineBreak; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PartialTextCursor.prototype, "done", {
            get: function () { return this.limit < 0; },
            enumerable: true,
            configurable: true
        });
        return PartialTextCursor;
    }());
    var LineCursor = /** @class */ (function () {
        function LineCursor(text, from) {
            if (from === void 0) { from = 0; }
            this.value = "";
            this.done = false;
            this.cursor = text.iter();
            this.skip = from;
        }
        LineCursor.prototype.next = function () {
            if (this.cursor.done) {
                this.done = true;
                this.value = "";
                return this;
            }
            for (this.value = "";;) {
                var _a = this.cursor.next(this.skip), value = _a.value, lineBreak = _a.lineBreak, done = _a.done;
                this.skip = 0;
                if (done || lineBreak)
                    return this;
                this.value += value;
            }
        };
        Object.defineProperty(LineCursor.prototype, "lineBreak", {
            get: function () { return false; },
            enumerable: true,
            configurable: true
        });
        return LineCursor;
    }());
    // FIXME rename start/end to from/to for consistency with other types?
    var Line = /** @class */ (function () {
        function Line(start, end, number, 
        // @internal
        content) {
            this.start = start;
            this.end = end;
            this.number = number;
            this.content = content;
        }
        Object.defineProperty(Line.prototype, "length", {
            get: function () { return this.end - this.start; },
            enumerable: true,
            configurable: true
        });
        Line.prototype.slice = function (from, to) {
            if (from === void 0) { from = 0; }
            if (to === void 0) { to = this.length; }
            if (typeof this.content == "string")
                return to == from + 1 ? this.content.charAt(from) : this.content.slice(from, to);
            if (from == to)
                return "";
            var result = this.content.slice(from, to);
            if (from == 0 && to == this.length)
                this.content = result;
            return result;
        };
        // @internal
        Line.prototype.finish = function (text) {
            if (this.content == null)
                this.content = new LineContent(text, this.start);
            return this;
        };
        return Line;
    }());
    exports.Line = Line;
    var LineContent = /** @class */ (function () {
        function LineContent(doc, start) {
            this.doc = doc;
            this.start = start;
            this.cursor = null;
            this.strings = null;
        }
        // FIXME quadratic complexity (somewhat) when iterating long lines in small pieces
        LineContent.prototype.slice = function (from, to) {
            if (!this.cursor) {
                this.cursor = this.doc.iter();
                this.strings = [this.cursor.next(this.start).value];
            }
            for (var result = "", pos = 0, i = 0;; i++) {
                if (i == this.strings.length)
                    this.strings.push(this.cursor.next().value);
                var string = this.strings[i], end = pos + string.length;
                if (end <= from)
                    continue;
                result += string.slice(Math.max(0, from - pos), Math.min(string.length, to - pos));
                if (end >= to)
                    return result;
                pos += string.length;
            }
        };
        return LineContent;
    }());
    });

    unwrapExports(text$1);
    var text_1 = text$1.Text;
    var text_2 = text$1.splitLines;
    var text_3 = text$1.joinLines;
    var text_4 = text$1.Line;

    var src = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    exports.isExtendingChar = char_1.isExtendingChar;
    exports.isWordChar = char_1.isWordChar;
    exports.charType = char_1.charType;
    exports.CharType = char_1.CharType;

    exports.countColumn = column.countColumn;
    exports.findColumn = column.findColumn;

    exports.Line = text$1.Line;
    exports.Text = text$1.Text;
    exports.splitLines = text$1.splitLines;
    exports.joinLines = text$1.joinLines;
    });

    unwrapExports(src);
    var src_1 = src.isExtendingChar;
    var src_2 = src.isWordChar;
    var src_3 = src.charType;
    var src_4 = src.CharType;
    var src_5 = src.countColumn;
    var src_6 = src.findColumn;
    var src_7 = src.Line;
    var src_8 = src.Text;
    var src_9 = src.splitLines;
    var src_10 = src.joinLines;

    var selection = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    var SelectionRange = /** @class */ (function () {
        function SelectionRange(anchor, head) {
            if (head === void 0) { head = anchor; }
            this.anchor = anchor;
            this.head = head;
        }
        Object.defineProperty(SelectionRange.prototype, "from", {
            get: function () { return Math.min(this.anchor, this.head); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SelectionRange.prototype, "to", {
            get: function () { return Math.max(this.anchor, this.head); },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SelectionRange.prototype, "empty", {
            get: function () { return this.anchor == this.head; },
            enumerable: true,
            configurable: true
        });
        SelectionRange.prototype.map = function (mapping) {
            var anchor = mapping.mapPos(this.anchor), head = mapping.mapPos(this.head);
            if (anchor == this.anchor && head == this.head)
                return this;
            else
                return new SelectionRange(anchor, head);
        };
        SelectionRange.prototype.extend = function (from, to) {
            if (to === void 0) { to = from; }
            if (from <= this.anchor && to >= this.anchor)
                return new SelectionRange(from, to);
            var head = Math.abs(from - this.anchor) > Math.abs(to - this.anchor) ? from : to;
            return new SelectionRange(this.anchor, head);
        };
        SelectionRange.prototype.eq = function (other) {
            return this.anchor == other.anchor && this.head == other.head;
        };
        SelectionRange.prototype.toJSON = function () { return this; };
        SelectionRange.fromJSON = function (json) {
            if (!json || typeof json.anchor != "number" || typeof json.head != "number")
                throw new RangeError("Invalid JSON representation for SelectionRange");
            return new SelectionRange(json.anchor, json.head);
        };
        SelectionRange.groupAt = function (state, pos, bias) {
            if (bias === void 0) { bias = 1; }
            // FIXME at some point, take language-specific identifier characters into account
            var line = state.doc.lineAt(pos), linePos = pos - line.start;
            if (line.length == 0)
                return new SelectionRange(pos);
            if (linePos == 0)
                bias = 1;
            else if (linePos == line.length)
                bias = -1;
            var read = linePos + (bias < 0 ? -1 : 0), type = src.charType(line.slice(read, read + 1));
            var from = pos, to = pos;
            for (var lineFrom = linePos; lineFrom > 0 && src.charType(line.slice(lineFrom - 1, lineFrom)) == type; lineFrom--)
                from--;
            for (var lineTo = linePos; lineTo < line.length && src.charType(line.slice(lineTo, lineTo + 1)) == type; lineTo++)
                to++;
            return new SelectionRange(to, from);
        };
        return SelectionRange;
    }());
    exports.SelectionRange = SelectionRange;
    var EditorSelection = /** @class */ (function () {
        /** @internal */
        function EditorSelection(ranges, primaryIndex) {
            if (primaryIndex === void 0) { primaryIndex = 0; }
            this.ranges = ranges;
            this.primaryIndex = primaryIndex;
        }
        EditorSelection.prototype.map = function (mapping) {
            return EditorSelection.create(this.ranges.map(function (r) { return r.map(mapping); }), this.primaryIndex);
        };
        EditorSelection.prototype.eq = function (other) {
            if (this.ranges.length != other.ranges.length ||
                this.primaryIndex != other.primaryIndex)
                return false;
            for (var i = 0; i < this.ranges.length; i++)
                if (!this.ranges[i].eq(other.ranges[i]))
                    return false;
            return true;
        };
        Object.defineProperty(EditorSelection.prototype, "primary", {
            get: function () { return this.ranges[this.primaryIndex]; },
            enumerable: true,
            configurable: true
        });
        EditorSelection.prototype.asSingle = function () {
            return this.ranges.length == 1 ? this : new EditorSelection([this.primary]);
        };
        EditorSelection.prototype.addRange = function (range, primary) {
            if (primary === void 0) { primary = true; }
            return EditorSelection.create([range].concat(this.ranges), primary ? 0 : this.primaryIndex + 1);
        };
        EditorSelection.prototype.replaceRange = function (range, which) {
            if (which === void 0) { which = this.primaryIndex; }
            var ranges = this.ranges.slice();
            ranges[which] = range;
            return EditorSelection.create(ranges, this.primaryIndex);
        };
        EditorSelection.prototype.toJSON = function () {
            return this.ranges.length == 1 ? this.ranges[0].toJSON() :
                { ranges: this.ranges.map(function (r) { return r.toJSON(); }), primaryIndex: this.primaryIndex };
        };
        EditorSelection.fromJSON = function (json) {
            if (json && Array.isArray(json.ranges)) {
                if (typeof json.primaryIndex != "number" || json.primaryIndex >= json.ranges.length)
                    throw new RangeError("Invalid JSON representation for EditorSelection");
                return new EditorSelection(json.ranges.map(function (r) { return SelectionRange.fromJSON(r); }), json.primaryIndex);
            }
            return new EditorSelection([SelectionRange.fromJSON(json)]);
        };
        EditorSelection.single = function (anchor, head) {
            if (head === void 0) { head = anchor; }
            return new EditorSelection([new SelectionRange(anchor, head)], 0);
        };
        EditorSelection.create = function (ranges, primaryIndex) {
            if (primaryIndex === void 0) { primaryIndex = 0; }
            for (var pos = 0, i = 0; i < ranges.length; i++) {
                var range = ranges[i];
                if (range.empty ? range.from <= pos : range.from < pos)
                    return normalized(ranges.slice(), primaryIndex);
                pos = range.to;
            }
            return new EditorSelection(ranges, primaryIndex);
        };
        EditorSelection.default = EditorSelection.single(0);
        return EditorSelection;
    }());
    exports.EditorSelection = EditorSelection;
    function normalized(ranges, primaryIndex) {
        if (primaryIndex === void 0) { primaryIndex = 0; }
        var primary = ranges[primaryIndex];
        ranges.sort(function (a, b) { return a.from - b.from; });
        primaryIndex = ranges.indexOf(primary);
        for (var i = 1; i < ranges.length; i++) {
            var range = ranges[i], prev = ranges[i - 1];
            if (range.empty ? range.from <= prev.to : range.from < prev.to) {
                var from = prev.from, to = Math.max(range.to, prev.to);
                if (i <= primaryIndex)
                    primaryIndex--;
                ranges.splice(--i, 2, range.anchor > range.head ? new SelectionRange(to, from) : new SelectionRange(from, to));
            }
        }
        return new EditorSelection(ranges, primaryIndex);
    }
    });

    unwrapExports(selection);
    var selection_1 = selection.SelectionRange;
    var selection_2 = selection.EditorSelection;

    var extension = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var Slot = /** @class */ (function () {
        // @internal
        function Slot(/* @internal */ type, 
        /* @internal */ value) {
            this.type = type;
            this.value = value;
        }
        Slot.define = function () {
            var type = function (value) { return new Slot(type, value); };
            return type;
        };
        Slot.get = function (type, slots) {
            for (var i = slots.length - 1; i >= 0; i--)
                if (slots[i].type == type)
                    return slots[i].value;
            return undefined;
        };
        return Slot;
    }());
    exports.Slot = Slot;
    var Extension = /** @class */ (function () {
        // @internal
        function Extension(/* @internal */ kind, 
        /* @internal */ id, 
        /* @internal */ value, 
        /* @internal */ priority) {
            if (priority === void 0) { priority = -2; }
            this.kind = kind;
            this.id = id;
            this.value = value;
            this.priority = priority;
        }
        Extension.prototype.setPrio = function (priority) {
            // Crude casting because TypeScript doesn't understand new this.constructor
            return new this.constructor(this.kind, this.id, this.value, priority);
        };
        Extension.prototype.fallback = function () { return this.setPrio(-1); };
        Extension.prototype.extend = function () { return this.setPrio(1); };
        Extension.prototype.override = function () { return this.setPrio(2); };
        // @internal
        Extension.prototype.flatten = function (priority, target) {
            if (target === void 0) { target = []; }
            if (this.kind == 1 /* Multi */)
                for (var _i = 0, _a = this.value; _i < _a.length; _i++) {
                    var ext = _a[_i];
                    ext.flatten(this.priority > -2 ? this.priority : priority, target);
                }
            else
                target.push(this.priority > -2 ? this : this.setPrio(priority));
            return target;
        };
        // Insert this extension in an array of extensions so that it
        // appears after any already-present extensions with the same or
        // lower priority, but before any extensions with higher priority.
        // @internal
        Extension.prototype.collect = function (array) {
            var i = 0;
            while (i < array.length && array[i].priority >= this.priority)
                i++;
            array.splice(i, 0, this);
        };
        // Define a type of behavior, which is the thing that extensions
        // eventually resolve to. Each behavior can have an ordered sequence
        // of values associated with it. An `Extension` can be seen as a
        // tree of sub-extensions with behaviors as leaves.
        Extension.defineBehavior = function () {
            var _this = this;
            var behavior = function (value) { return new _this(0 /* Behavior */, behavior, value); };
            return behavior;
        };
        Extension.unique = function (instantiate, defaultSpec) {
            var _this = this;
            var type = new UniqueExtensionType(instantiate);
            return function (spec) {
                if (spec === void 0) { spec = defaultSpec; }
                if (spec === undefined)
                    throw new RangeError("This extension has no default spec");
                return new _this(2 /* Unique */, type, spec);
            };
        };
        Extension.all = function () {
            var extensions = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                extensions[_i] = arguments[_i];
            }
            return new this(1 /* Multi */, null, extensions);
        };
        // Resolve an array of extenders by expanding all extensions until
        // only behaviors are left, and then collecting the behaviors into
        // arrays of values, preserving priority ordering throughout.
        Extension.resolve = function (extensions) {
            var pending = new this(1 /* Multi */, null, extensions).flatten(0);
            // This does a crude topological ordering to resolve behaviors
            // top-to-bottom in the dependency ordering. If there are no
            // cyclic dependencies, we can always find a behavior in the top
            // `pending` array that isn't a dependency of any unresolved
            // behavior, and thus find and order all its specs in order to
            // resolve them.
            for (var resolved = [];;) {
                var top_1 = findTopUnique(pending, this);
                if (!top_1)
                    break; // Only behaviors left
                // Prematurely evaluated a behavior type because of missing
                // sub-behavior information -- start over, in the assumption
                // that newly gathered information will make the next attempt
                // more successful.
                if (resolved.indexOf(top_1) > -1)
                    return this.resolve(extensions);
                top_1.resolve(pending);
                resolved.push(top_1);
            }
            // Collect the behavior values.
            var store = new BehaviorStore;
            for (var _i = 0, pending_1 = pending; _i < pending_1.length; _i++) {
                var ext = pending_1[_i];
                if (!(ext instanceof this)) {
                    // Collect extensions of the wrong type into store.foreign
                    store.foreign.push(ext);
                    continue;
                }
                if (store.behaviors.indexOf(ext.id) > -1)
                    continue; // Already collected
                var values = [];
                for (var _a = 0, pending_2 = pending; _a < pending_2.length; _a++) {
                    var e = pending_2[_a];
                    if (e.id == ext.id)
                        e.collect(values);
                }
                store.behaviors.push(ext.id);
                store.values.push(values.map(function (v) { return v.value; }));
            }
            return store;
        };
        return Extension;
    }());
    exports.Extension = Extension;
    var UniqueExtensionType = /** @class */ (function () {
        function UniqueExtensionType(instantiate) {
            this.instantiate = instantiate;
            this.knownSubs = [];
        }
        UniqueExtensionType.prototype.hasSub = function (type) {
            for (var _i = 0, _a = this.knownSubs; _i < _a.length; _i++) {
                var known = _a[_i];
                if (known == type || known.hasSub(type))
                    return true;
            }
            return false;
        };
        UniqueExtensionType.prototype.resolve = function (extensions) {
            // Replace all instances of this type in extneions with the
            // sub-extensions that instantiating produces.
            var ours = [];
            for (var _i = 0, extensions_1 = extensions; _i < extensions_1.length; _i++) {
                var ext = extensions_1[_i];
                if (ext.id == this)
                    ext.collect(ours);
            }
            var first = true;
            for (var i = 0; i < extensions.length; i++) {
                var ext = extensions[i];
                if (ext.id != this)
                    continue;
                var sub = first ? this.subs(ours.map(function (s) { return s.value; }), ext.priority) : none;
                extensions.splice.apply(extensions, [i, 1].concat(sub));
                first = false;
                i += sub.length - 1;
            }
        };
        UniqueExtensionType.prototype.subs = function (specs, priority) {
            var subs = this.instantiate(specs).flatten(priority);
            for (var _i = 0, subs_1 = subs; _i < subs_1.length; _i++) {
                var sub = subs_1[_i];
                if (sub.kind == 2 /* Unique */ && this.knownSubs.indexOf(sub.id) == -1)
                    this.knownSubs.push(sub.id);
            }
            return subs;
        };
        return UniqueExtensionType;
    }());
    var none = [];
    // An instance of this is part of EditorState and stores the behaviors
    // provided for the state.
    var BehaviorStore = /** @class */ (function () {
        function BehaviorStore() {
            // @internal
            this.behaviors = [];
            // @internal
            this.values = [];
            // Any extensions that weren't an instance of the given type when
            // resolving.
            this.foreign = [];
        }
        BehaviorStore.prototype.get = function (behavior) {
            var found = this.behaviors.indexOf(behavior);
            return found < 0 ? none : this.values[found];
        };
        return BehaviorStore;
    }());
    exports.BehaviorStore = BehaviorStore;
    // Find the extension type that must be resolved next, meaning it is
    // not a (transitive) sub-extension of any other extensions that are
    // still in extenders.
    function findTopUnique(extensions, type) {
        var foundUnique = false;
        var _loop_1 = function (ext) {
            if (ext.kind == 2 /* Unique */ && ext instanceof type) {
                foundUnique = true;
                if (!extensions.some(function (e) { return e.kind == 2 /* Unique */ && e.id.hasSub(ext.id); }))
                    return { value: ext.id };
            }
        };
        for (var _i = 0, extensions_2 = extensions; _i < extensions_2.length; _i++) {
            var ext = extensions_2[_i];
            var state_1 = _loop_1(ext);
            if (typeof state_1 === "object")
                return state_1.value;
        }
        if (foundUnique)
            throw new RangeError("Sub-extension cycle in unique extensions");
        return null;
    }
    // Utility function for combining behaviors to fill in a config
    // object from an array of provided configs. Will, by default, error
    // when a field gets two values that aren't ===-equal, but you can
    // provide combine functions per field to do something else.
    function combineConfig(configs, defaults, // Should hold only the optional properties of Config, but I haven't managed to express that
    combine) {
        if (combine === void 0) { combine = {}; }
        var result = {};
        for (var _i = 0, configs_1 = configs; _i < configs_1.length; _i++) {
            var config = configs_1[_i];
            for (var _a = 0, _b = Object.keys(config); _a < _b.length; _a++) {
                var key = _b[_a];
                var value = config[key], current = result[key];
                if (current === undefined)
                    result[key] = value;
                else if (current === value || value === undefined) ; // No conflict
                else if (Object.hasOwnProperty.call(combine, key))
                    result[key] = combine[key](current, value);
                else
                    throw new Error("Config merge conflict for field " + key);
            }
        }
        for (var key in defaults)
            if (result[key] === undefined)
                result[key] = defaults[key];
        return result;
    }
    exports.combineConfig = combineConfig;
    function fillConfig(config, defaults) {
        var result = {};
        for (var key in config)
            result[key] = config[key];
        for (var key in defaults)
            if (result[key] === undefined)
                result[key] = defaults[key];
        return result;
    }
    exports.fillConfig = fillConfig;
    });

    unwrapExports(extension);
    var extension_1 = extension.Slot;
    var extension_2 = extension.Extension;
    var extension_3 = extension.BehaviorStore;
    var extension_4 = extension.combineConfig;
    var extension_5 = extension.fillConfig;

    var change = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    var empty = [];
    var MapMode;
    (function (MapMode) {
        MapMode[MapMode["Simple"] = 0] = "Simple";
        MapMode[MapMode["TrackDel"] = 1] = "TrackDel";
        MapMode[MapMode["TrackBefore"] = 2] = "TrackBefore";
        MapMode[MapMode["TrackAfter"] = 3] = "TrackAfter";
    })(MapMode = exports.MapMode || (exports.MapMode = {}));
    var ChangeDesc = /** @class */ (function () {
        function ChangeDesc(from, to, length) {
            this.from = from;
            this.to = to;
            this.length = length;
        }
        Object.defineProperty(ChangeDesc.prototype, "invertedDesc", {
            get: function () { return new ChangeDesc(this.from, this.from + this.length, this.to - this.from); },
            enumerable: true,
            configurable: true
        });
        ChangeDesc.prototype.mapPos = function (pos, bias, mode) {
            if (bias === void 0) { bias = -1; }
            if (mode === void 0) { mode = MapMode.Simple; }
            var _a = this, from = _a.from, to = _a.to, length = _a.length;
            if (pos < from)
                return pos;
            if (pos > to)
                return pos + (length - (to - from));
            if (pos == to || pos == from) {
                if (from < pos && mode == MapMode.TrackBefore || to > pos && mode == MapMode.TrackAfter)
                    return -pos - 1;
                return (from == to ? bias <= 0 : pos == from) ? from : from + length;
            }
            pos = from + (bias <= 0 ? 0 : length);
            return mode != MapMode.Simple ? -pos - 1 : pos;
        };
        ChangeDesc.prototype.toJSON = function () { return this; };
        ChangeDesc.fromJSON = function (json) {
            if (!json || typeof json.from != "number" || typeof json.to != "number" || typeof json.length != "number")
                throw new RangeError("Invalid JSON representation for ChangeDesc");
            return new ChangeDesc(json.from, json.to, json.length);
        };
        return ChangeDesc;
    }());
    exports.ChangeDesc = ChangeDesc;
    var Change = /** @class */ (function (_super) {
        __extends(Change, _super);
        function Change(from, to, text) {
            var _this = _super.call(this, from, to, textLength(text)) || this;
            _this.from = from;
            _this.to = to;
            _this.text = text;
            return _this;
        }
        Change.prototype.invert = function (doc) {
            return new Change(this.from, this.from + this.length, doc.sliceLines(this.from, this.to));
        };
        Change.prototype.apply = function (doc) {
            return doc.replace(this.from, this.to, this.text);
        };
        Change.prototype.map = function (mapping) {
            var from = mapping.mapPos(this.from, 1), to = mapping.mapPos(this.to, -1);
            return from > to ? null : new Change(from, to, this.text);
        };
        Object.defineProperty(Change.prototype, "desc", {
            get: function () { return new ChangeDesc(this.from, this.to, this.length); },
            enumerable: true,
            configurable: true
        });
        Change.prototype.toJSON = function () {
            return { from: this.from, to: this.to, text: this.text };
        };
        Change.fromJSON = function (json) {
            if (!json || typeof json.from != "number" || typeof json.to != "number" ||
                !Array.isArray(json.text) || json.text.length == 0 || json.text.some(function (val) { return typeof val != "string"; }))
                throw new RangeError("Invalid JSON representation for Change");
            return new Change(json.from, json.to, json.text);
        };
        return Change;
    }(ChangeDesc));
    exports.Change = Change;
    function textLength(text) {
        var length = -1;
        for (var _i = 0, text_1 = text; _i < text_1.length; _i++) {
            var line = text_1[_i];
            length += line.length + 1;
        }
        return length;
    }
    var ChangeSet = /** @class */ (function () {
        function ChangeSet(changes, mirror) {
            if (mirror === void 0) { mirror = empty; }
            this.changes = changes;
            this.mirror = mirror;
        }
        Object.defineProperty(ChangeSet.prototype, "length", {
            get: function () {
                return this.changes.length;
            },
            enumerable: true,
            configurable: true
        });
        ChangeSet.prototype.getMirror = function (n) {
            for (var i = 0; i < this.mirror.length; i++)
                if (this.mirror[i] == n)
                    return this.mirror[i + (i % 2 ? -1 : 1)];
            return null;
        };
        ChangeSet.prototype.append = function (change, mirror) {
            return new ChangeSet(this.changes.concat(change), mirror != null ? this.mirror.concat(this.length, mirror) : this.mirror);
        };
        ChangeSet.prototype.appendSet = function (changes) {
            var _this = this;
            return changes.length == 0 ? this :
                this.length == 0 ? changes :
                    new ChangeSet(this.changes.concat(changes.changes), this.mirror.concat(changes.mirror.map(function (i) { return i + _this.length; })));
        };
        ChangeSet.prototype.mapPos = function (pos, bias, mode) {
            if (bias === void 0) { bias = -1; }
            if (mode === void 0) { mode = MapMode.Simple; }
            return this.mapInner(pos, bias, mode, 0, this.length);
        };
        /** @internal */
        ChangeSet.prototype.mapInner = function (pos, bias, mode, fromI, toI) {
            var dir = toI < fromI ? -1 : 1;
            var recoverables = null;
            var hasMirrors = this.mirror.length > 0, rec, mirror, deleted = false;
            for (var i = fromI - (dir < 0 ? 1 : 0), endI = toI - (dir < 0 ? 1 : 0); i != endI; i += dir) {
                var _a = this.changes[i], from = _a.from, to = _a.to, length_1 = _a.length;
                if (dir < 0) {
                    var len = to - from;
                    to = from + length_1;
                    length_1 = len;
                }
                if (pos < from)
                    continue;
                if (pos > to) {
                    pos += length_1 - (to - from);
                    continue;
                }
                // Change touches this position
                if (recoverables && (rec = recoverables[i]) != null) { // There's a recovery for this change, and it applies
                    pos = from + rec;
                    continue;
                }
                if (hasMirrors && (mirror = this.getMirror(i)) != null &&
                    (dir > 0 ? mirror > i && mirror < toI : mirror < i && mirror >= toI)) { // A mirror exists
                    if (pos > from && pos < to) { // If this change deletes the position, skip forward to the mirror
                        i = mirror;
                        pos = this.changes[i].from + (pos - from);
                        continue;
                    }
                    (recoverables || (recoverables = {}))[mirror] = pos - from;
                }
                if (pos > from && pos < to) {
                    if (mode != MapMode.Simple)
                        deleted = true;
                    pos = bias <= 0 ? from : from + length_1;
                }
                else {
                    if (from < pos && mode == MapMode.TrackBefore || to > pos && mode == MapMode.TrackAfter)
                        deleted = true;
                    pos = (from == to ? bias <= 0 : pos == from) ? from : from + length_1;
                }
            }
            return deleted ? -pos - 1 : pos;
        };
        ChangeSet.prototype.partialMapping = function (from, to) {
            if (to === void 0) { to = this.length; }
            if (from == 0 && to == this.length)
                return this;
            return new PartialMapping(this, from, to);
        };
        // FIXME cache this?
        ChangeSet.prototype.changedRanges = function () {
            var set = [];
            for (var i = 0; i < this.length; i++) {
                var change = this.changes[i];
                var fromA = change.from, toA = change.to, fromB = change.from, toB = change.from + change.length;
                if (i < this.length - 1) {
                    var mapping = this.partialMapping(i + 1);
                    fromB = mapping.mapPos(fromB, 1);
                    toB = mapping.mapPos(toB, -1);
                }
                if (i > 0) {
                    var mapping = this.partialMapping(i, 0);
                    fromA = mapping.mapPos(fromA, 1);
                    toA = mapping.mapPos(toA, -1);
                }
                new ChangedRange(fromA, toA, fromB, toB).addToSet(set);
            }
            return set;
        };
        Object.defineProperty(ChangeSet.prototype, "desc", {
            get: function () {
                if (this.changes.length == 0 || this.changes[0] instanceof ChangeDesc)
                    return this;
                return new ChangeSet(this.changes.map(function (ch) { return ch.desc; }), this.mirror);
            },
            enumerable: true,
            configurable: true
        });
        ChangeSet.prototype.toJSON = function () {
            var changes = this.changes.map(function (change) { return change.toJSON(); });
            return this.mirror.length == 0 ? changes : { mirror: this.mirror, changes: changes };
        };
        ChangeSet.fromJSON = function (ChangeType, json) {
            var mirror, changes;
            if (Array.isArray(json)) {
                mirror = empty;
                changes = json;
            }
            else if (!json || !Array.isArray(json.mirror) || !Array.isArray(json.changes)) {
                throw new RangeError("Invalid JSON representation for ChangeSet");
            }
            else {
                (mirror = json.mirror, changes = json.changes);
            }
            return new ChangeSet(changes.map(function (ch) { return ChangeType.fromJSON(ch); }), mirror);
        };
        ChangeSet.empty = new ChangeSet(empty);
        return ChangeSet;
    }());
    exports.ChangeSet = ChangeSet;
    var PartialMapping = /** @class */ (function () {
        function PartialMapping(changes, from, to) {
            this.changes = changes;
            this.from = from;
            this.to = to;
        }
        PartialMapping.prototype.mapPos = function (pos, bias, mode) {
            if (bias === void 0) { bias = -1; }
            if (mode === void 0) { mode = MapMode.Simple; }
            return this.changes.mapInner(pos, bias, mode, this.from, this.to);
        };
        return PartialMapping;
    }());
    var ChangedRange = /** @class */ (function () {
        function ChangedRange(fromA, toA, fromB, toB) {
            this.fromA = fromA;
            this.toA = toA;
            this.fromB = fromB;
            this.toB = toB;
        }
        ChangedRange.prototype.join = function (other) {
            return new ChangedRange(Math.min(this.fromA, other.fromA), Math.max(this.toA, other.toA), Math.min(this.fromB, other.fromB), Math.max(this.toB, other.toB));
        };
        ChangedRange.prototype.addToSet = function (set) {
            var i = set.length, me = this;
            for (; i > 0; i--) {
                var range = set[i - 1];
                if (range.fromA > me.toA)
                    continue;
                if (range.toA < me.fromA)
                    break;
                me = me.join(range);
                set.splice(i - 1, 1);
            }
            set.splice(i, 0, me);
            return set;
        };
        Object.defineProperty(ChangedRange.prototype, "lenDiff", {
            get: function () { return (this.toB - this.fromB) - (this.toA - this.fromA); },
            enumerable: true,
            configurable: true
        });
        ChangedRange.mapPos = function (pos, bias, changes) {
            var off = 0;
            for (var _i = 0, changes_1 = changes; _i < changes_1.length; _i++) {
                var range = changes_1[_i];
                if (pos < range.fromA)
                    break;
                if (pos <= range.toA) {
                    var side = range.toA == range.fromA ? bias : pos == range.fromA ? -1 : pos == range.toA ? 1 : bias;
                    return side < 0 ? range.fromB : range.toB;
                }
                off = range.toB - range.toA;
            }
            return pos + off;
        };
        return ChangedRange;
    }());
    exports.ChangedRange = ChangedRange;
    });

    unwrapExports(change);
    var change_1 = change.MapMode;
    var change_2 = change.ChangeDesc;
    var change_3 = change.Change;
    var change_4 = change.ChangeSet;
    var change_5 = change.ChangedRange;

    var transaction = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });



    var FLAG_SELECTION_SET = 1, FLAG_SCROLL_INTO_VIEW = 2;
    var Transaction = /** @class */ (function () {
        function Transaction(startState, time) {
            if (time === void 0) { time = Date.now(); }
            this.startState = startState;
            this.changes = change.ChangeSet.empty;
            this.docs = [];
            this.flags = 0;
            this.state = null;
            this.selection = startState.selection;
            this.metadata = [Transaction.time(time)];
        }
        Object.defineProperty(Transaction.prototype, "doc", {
            get: function () {
                var last = this.docs.length - 1;
                return last < 0 ? this.startState.doc : this.docs[last];
            },
            enumerable: true,
            configurable: true
        });
        Transaction.prototype.addMeta = function () {
            var metadata = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                metadata[_i] = arguments[_i];
            }
            this.ensureOpen();
            for (var _a = 0, metadata_1 = metadata; _a < metadata_1.length; _a++) {
                var slot = metadata_1[_a];
                this.metadata.push(slot);
            }
            return this;
        };
        Transaction.prototype.getMeta = function (type) {
            return extension.Slot.get(type, this.metadata);
        };
        Transaction.prototype.change = function (change, mirror) {
            this.ensureOpen();
            if (change.from == change.to && change.length == 0)
                return this;
            if (change.from < 0 || change.to < change.from || change.to > this.doc.length)
                throw new RangeError("Invalid change " + change.from + " to " + change.to);
            this.changes = this.changes.append(change, mirror);
            this.docs.push(change.apply(this.doc));
            this.selection = this.selection.map(change);
            return this;
        };
        Transaction.prototype.replace = function (from, to, text) {
            return this.change(new change.Change(from, to, typeof text == "string" ? this.startState.splitLines(text) : text));
        };
        Transaction.prototype.replaceSelection = function (text) {
            var _this = this;
            var content = typeof text == "string" ? this.startState.splitLines(text) : text;
            return this.forEachRange(function (range) {
                var change$1 = new change.Change(range.from, range.to, content);
                _this.change(change$1);
                return new selection.SelectionRange(range.from + change$1.length);
            });
        };
        Transaction.prototype.forEachRange = function (f) {
            var sel = this.selection, start = this.changes.length, newRanges = [];
            for (var _i = 0, _a = sel.ranges; _i < _a.length; _i++) {
                var range = _a[_i];
                var before = this.changes.length;
                var result = f(range.map(this.changes.partialMapping(start)), this);
                if (this.changes.length > before) {
                    var mapping = this.changes.partialMapping(before);
                    for (var i = 0; i < newRanges.length; i++)
                        newRanges[i] = newRanges[i].map(mapping);
                }
                newRanges.push(result);
            }
            return this.setSelection(selection.EditorSelection.create(newRanges, sel.primaryIndex));
        };
        Transaction.prototype.setSelection = function (selection) {
            this.ensureOpen();
            this.selection = this.startState.multipleSelections ? selection : selection.asSingle();
            this.flags |= FLAG_SELECTION_SET;
            return this;
        };
        Object.defineProperty(Transaction.prototype, "selectionSet", {
            get: function () {
                return (this.flags & FLAG_SELECTION_SET) > 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Transaction.prototype, "docChanged", {
            get: function () {
                return this.changes.length > 0;
            },
            enumerable: true,
            configurable: true
        });
        Transaction.prototype.scrollIntoView = function () {
            this.ensureOpen();
            this.flags |= FLAG_SCROLL_INTO_VIEW;
            return this;
        };
        Object.defineProperty(Transaction.prototype, "scrolledIntoView", {
            get: function () {
                return (this.flags & FLAG_SCROLL_INTO_VIEW) > 0;
            },
            enumerable: true,
            configurable: true
        });
        Transaction.prototype.ensureOpen = function () {
            if (this.state)
                throw new Error("Transactions may not be modified after being applied");
        };
        Transaction.prototype.apply = function () {
            return this.state || (this.state = this.startState.applyTransaction(this));
        };
        Transaction.prototype.invertedChanges = function () {
            if (!this.changes.length)
                return change.ChangeSet.empty;
            var changes = [], set = this.changes;
            for (var i = set.length - 1; i >= 0; i--)
                changes.push(set.changes[i].invert(i == 0 ? this.startState.doc : this.docs[i - 1]));
            return new change.ChangeSet(changes, set.mirror.length ? set.mirror.map(function (i) { return set.length - i - 1; }) : set.mirror);
        };
        Transaction.time = extension.Slot.define();
        Transaction.changeTabSize = extension.Slot.define();
        Transaction.changeLineSeparator = extension.Slot.define();
        Transaction.preserveGoalColumn = extension.Slot.define();
        Transaction.userEvent = extension.Slot.define();
        Transaction.addToHistory = extension.Slot.define();
        return Transaction;
    }());
    exports.Transaction = Transaction;
    });

    unwrapExports(transaction);
    var transaction_1 = transaction.Transaction;

    var state = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });




    var StateExtension = /** @class */ (function (_super) {
        __extends(StateExtension, _super);
        function StateExtension() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        StateExtension.allowMultipleSelections = StateExtension.defineBehavior();
        StateExtension.indentation = StateExtension.defineBehavior();
        return StateExtension;
    }(extension.Extension));
    exports.StateExtension = StateExtension;
    var Configuration = /** @class */ (function () {
        function Configuration(behavior, fields, multipleSelections, tabSize, lineSeparator) {
            this.behavior = behavior;
            this.fields = fields;
            this.multipleSelections = multipleSelections;
            this.tabSize = tabSize;
            this.lineSeparator = lineSeparator;
        }
        Configuration.create = function (config) {
            var behavior = StateExtension.resolve(config.extensions || []);
            return new Configuration(behavior, behavior.get(stateFieldBehavior), behavior.get(StateExtension.allowMultipleSelections).some(function (x) { return x; }), config.tabSize || 4, config.lineSeparator || null);
        };
        Configuration.prototype.updateTabSize = function (tabSize) {
            return new Configuration(this.behavior, this.fields, this.multipleSelections, tabSize, this.lineSeparator);
        };
        Configuration.prototype.updateLineSeparator = function (lineSep) {
            return new Configuration(this.behavior, this.fields, this.multipleSelections, this.tabSize, lineSep);
        };
        return Configuration;
    }());
    var EditorState = /** @class */ (function () {
        /** @internal */
        function EditorState(/* @internal */ config, fields, doc, selection) {
            this.config = config;
            this.fields = fields;
            this.doc = doc;
            this.selection = selection;
            for (var _i = 0, _a = selection.ranges; _i < _a.length; _i++) {
                var range = _a[_i];
                if (range.to > doc.length)
                    throw new RangeError("Selection points outside of document");
            }
        }
        EditorState.prototype.getField = function (field) {
            var index = this.config.fields.indexOf(field);
            if (index < 0)
                throw new RangeError("Field is not present in this state");
            if (index >= this.fields.length)
                throw new RangeError("Field hasn't been initialized yet");
            return this.fields[index];
        };
        /** @internal */
        EditorState.prototype.applyTransaction = function (tr) {
            var $conf = this.config;
            var tabSize = tr.getMeta(transaction.Transaction.changeTabSize), lineSep = tr.getMeta(transaction.Transaction.changeLineSeparator);
            if (tabSize !== undefined)
                $conf = $conf.updateTabSize(tabSize);
            // FIXME changing the line separator might involve rearranging line endings (?)
            if (lineSep !== undefined)
                $conf = $conf.updateLineSeparator(lineSep);
            var fields = [];
            var newState = new EditorState($conf, fields, tr.doc, tr.selection);
            for (var i = 0; i < this.fields.length; i++)
                fields[i] = $conf.fields[i].apply(tr, this.fields[i], newState);
            return newState;
        };
        EditorState.prototype.t = function (time) {
            return new transaction.Transaction(this, time);
        };
        Object.defineProperty(EditorState.prototype, "tabSize", {
            get: function () { return this.config.tabSize; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EditorState.prototype, "multipleSelections", {
            get: function () { return this.config.multipleSelections; },
            enumerable: true,
            configurable: true
        });
        EditorState.prototype.joinLines = function (text) { return src.joinLines(text, this.config.lineSeparator || undefined); };
        EditorState.prototype.splitLines = function (text) { return src.splitLines(text, this.config.lineSeparator || undefined); };
        Object.defineProperty(EditorState.prototype, "behavior", {
            get: function () { return this.config.behavior; },
            enumerable: true,
            configurable: true
        });
        // FIXME plugin state serialization
        EditorState.prototype.toJSON = function () {
            return {
                doc: this.joinLines(this.doc.sliceLines(0, this.doc.length)),
                selection: this.selection.toJSON(),
                lineSeparator: this.config.lineSeparator,
                tabSize: this.tabSize
            };
        };
        EditorState.fromJSON = function (json, config) {
            if (config === void 0) { config = {}; }
            if (!json || (json.lineSeparator && typeof json.lineSeparator != "string") ||
                typeof json.tabSize != "number" || typeof json.doc != "string")
                throw new RangeError("Invalid JSON representation for EditorState");
            return EditorState.create({
                doc: json.doc,
                selection: selection.EditorSelection.fromJSON(json.selection),
                extensions: config.extensions,
                tabSize: config.tabSize,
                lineSeparator: config.lineSeparator
            });
        };
        EditorState.create = function (config) {
            if (config === void 0) { config = {}; }
            var $config = Configuration.create(config);
            var doc = config.doc instanceof src.Text ? config.doc
                : src.Text.of(config.doc || "", config.lineSeparator || undefined);
            var selection$1 = config.selection || selection.EditorSelection.default;
            if (!$config.multipleSelections)
                selection$1 = selection$1.asSingle();
            var fields = [];
            var state = new EditorState($config, fields, doc, selection$1);
            for (var _i = 0, _a = $config.fields; _i < _a.length; _i++) {
                var field = _a[_i];
                fields.push(field.init(state));
            }
            return state;
        };
        return EditorState;
    }());
    exports.EditorState = EditorState;
    var stateFieldBehavior = StateExtension.defineBehavior();
    var StateField = /** @class */ (function () {
        function StateField(_a) {
            var init = _a.init, apply = _a.apply;
            this.init = init;
            this.apply = apply;
            this.extension = stateFieldBehavior(this);
        }
        return StateField;
    }());
    exports.StateField = StateField;
    });

    unwrapExports(state);
    var state_1 = state.StateExtension;
    var state_2 = state.EditorState;
    var state_3 = state.StateField;

    var src$1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    exports.EditorState = state.EditorState;
    exports.StateField = state.StateField;
    exports.StateExtension = state.StateExtension;

    exports.EditorSelection = selection.EditorSelection;
    exports.SelectionRange = selection.SelectionRange;

    exports.Change = change.Change;
    exports.ChangeDesc = change.ChangeDesc;
    exports.ChangeSet = change.ChangeSet;
    exports.MapMode = change.MapMode;
    exports.ChangedRange = change.ChangedRange;

    exports.Transaction = transaction.Transaction;

    exports.Slot = extension.Slot;
    });

    unwrapExports(src$1);
    var src_1$1 = src$1.EditorState;
    var src_2$1 = src$1.StateField;
    var src_3$1 = src$1.StateExtension;
    var src_4$1 = src$1.EditorSelection;
    var src_5$1 = src$1.SelectionRange;
    var src_6$1 = src$1.Change;
    var src_7$1 = src$1.ChangeDesc;
    var src_8$1 = src$1.ChangeSet;
    var src_9$1 = src$1.MapMode;
    var src_10$1 = src$1.ChangedRange;
    var src_11 = src$1.Transaction;
    var src_12 = src$1.Slot;

    var browser$1 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var _a = typeof navigator != "undefined"
        ? [navigator, document]
        : [{ userAgent: "", vendor: "", platform: "" }, { documentElement: { style: {} } }], nav = _a[0], doc = _a[1];
    var ie_edge = /Edge\/(\d+)/.exec(nav.userAgent);
    var ie_upto10 = /MSIE \d/.test(nav.userAgent);
    var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(nav.userAgent);
    var ie = !!(ie_upto10 || ie_11up || ie_edge);
    var gecko = !ie && /gecko\/(\d+)/i.test(nav.userAgent);
    var chrome = !ie && /Chrome\/(\d+)/.exec(nav.userAgent);
    var webkit = !ie && 'WebkitAppearance' in doc.documentElement.style;
    exports.default = {
        mac: /Mac/.test(nav.platform),
        ie: ie,
        ie_version: ie_upto10 ? doc.documentMode || 6 : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0,
        gecko: gecko,
        gecko_version: gecko ? +(/Firefox\/(\d+)/.exec(nav.userAgent) || [0, 0])[1] : 0,
        chrome: !!chrome,
        chrome_version: chrome ? +chrome[1] : 0,
        ios: !ie && /AppleWebKit/.test(nav.userAgent) && /Mobile\/\w+/.test(nav.userAgent),
        android: /Android\b/.test(nav.userAgent),
        webkit: webkit,
        safari: /Apple Computer/.test(nav.vendor),
        webkit_version: webkit ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0
    };
    });

    unwrapExports(browser$1);

    var dom = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    // Work around Chrome issue https://bugs.chromium.org/p/chromium/issues/detail?id=447523
    // (isCollapsed inappropriately returns true in shadow dom)
    function selectionCollapsed(domSel) {
        var collapsed = domSel.isCollapsed;
        if (collapsed && browser$1.default.chrome && domSel.rangeCount && !domSel.getRangeAt(0).collapsed)
            collapsed = false;
        return collapsed;
    }
    exports.selectionCollapsed = selectionCollapsed;
    function hasSelection(dom, selection) {
        if (!selection.anchorNode)
            return false;
        try {
            // Firefox will raise 'permission denied' errors when accessing
            // properties of `sel.anchorNode` when it's in a generated CSS
            // element.
            return dom.contains(selection.anchorNode.nodeType == 3 ? selection.anchorNode.parentNode : selection.anchorNode);
        }
        catch (_) {
            return false;
        }
    }
    exports.hasSelection = hasSelection;
    function clientRectsFor(dom) {
        if (dom.nodeType == 3) {
            var range = document.createRange();
            range.setEnd(dom, dom.nodeValue.length);
            range.setStart(dom, 0);
            return range.getClientRects();
        }
        else if (dom.nodeType == 1) {
            return dom.getClientRects();
        }
        else {
            return [];
        }
    }
    exports.clientRectsFor = clientRectsFor;
    // Scans forward and backward through DOM positions equivalent to the
    // given one to see if the two are in the same place (i.e. after a
    // text node vs at the end of that text node)
    function isEquivalentPosition(node, off, targetNode, targetOff) {
        return targetNode ? (scanFor(node, off, targetNode, targetOff, -1) ||
            scanFor(node, off, targetNode, targetOff, 1)) : false;
    }
    exports.isEquivalentPosition = isEquivalentPosition;
    function domIndex(node) {
        for (var index = 0;; index++) {
            node = node.previousSibling;
            if (!node)
                return index;
        }
    }
    exports.domIndex = domIndex;
    function scanFor(node, off, targetNode, targetOff, dir) {
        for (;;) {
            if (node == targetNode && off == targetOff)
                return true;
            if (off == (dir < 0 ? 0 : maxOffset(node))) {
                if (node.nodeName == "DIV")
                    return false;
                var parent_1 = node.parentNode;
                if (!parent_1 || parent_1.nodeType != 1)
                    return false;
                off = domIndex(node) + (dir < 0 ? 0 : 1);
                node = parent_1;
            }
            else if (node.nodeType == 1) {
                node = node.childNodes[off + (dir < 0 ? -1 : 0)];
                off = dir < 0 ? maxOffset(node) : 0;
            }
            else {
                return false;
            }
        }
    }
    function maxOffset(node) {
        return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
    }
    exports.maxOffset = maxOffset;
    function windowRect(win) {
        return { left: 0, right: win.innerWidth,
            top: 0, bottom: win.innerHeight };
    }
    function scrollRectIntoView(dom, rect) {
        var scrollThreshold = 0, scrollMargin = 5;
        var doc = dom.ownerDocument, win = doc.defaultView;
        var gutterCover = 0, prev = dom.previousSibling;
        if (prev && getComputedStyle(prev).position == "sticky")
            gutterCover = dom.offsetLeft;
        for (var cur = dom.parentNode; cur;) {
            if (cur.nodeType == 1) { // Element or document
                var bounding = void 0, top_1 = cur == document.body;
                if (top_1) {
                    bounding = windowRect(win);
                }
                else {
                    if (cur.scrollHeight <= cur.clientHeight && cur.scrollWidth <= cur.clientWidth) {
                        cur = cur.parentNode;
                        continue;
                    }
                    var rect_1 = cur.getBoundingClientRect();
                    bounding = { left: rect_1.left, right: rect_1.left + cur.clientWidth,
                        top: rect_1.top, bottom: rect_1.top + cur.clientHeight };
                }
                var moveX = 0, moveY = 0;
                if (rect.top < bounding.top + scrollThreshold)
                    moveY = -(bounding.top - rect.top + scrollMargin);
                else if (rect.bottom > bounding.bottom - scrollThreshold)
                    moveY = rect.bottom - bounding.bottom + scrollMargin;
                if (rect.left < bounding.left + gutterCover + scrollThreshold)
                    moveX = -(bounding.left + gutterCover - rect.left + scrollMargin);
                else if (rect.right > bounding.right - scrollThreshold)
                    moveX = rect.right - bounding.right + scrollMargin;
                if (moveX || moveY) {
                    if (top_1) {
                        win.scrollBy(moveX, moveY);
                    }
                    else {
                        if (moveY)
                            cur.scrollTop += moveY;
                        if (moveX)
                            cur.scrollLeft += moveX;
                        rect = { left: rect.left - moveX, top: rect.top - moveY,
                            right: rect.right - moveX, bottom: rect.bottom - moveY };
                    }
                }
                if (top_1)
                    break;
                cur = cur.parentNode;
            }
            else if (cur.nodeType == 11) { // A shadow root
                cur = cur.host;
            }
            else {
                break;
            }
        }
    }
    exports.scrollRectIntoView = scrollRectIntoView;
    var DOMSelection = /** @class */ (function () {
        function DOMSelection() {
            this.anchorNode = null;
            this.anchorOffset = 0;
            this.focusNode = null;
            this.focusOffset = 0;
        }
        DOMSelection.prototype.eq = function (domSel) {
            return this.anchorNode == domSel.anchorNode && this.anchorOffset == domSel.anchorOffset &&
                this.focusNode == domSel.focusNode && this.focusOffset == domSel.focusOffset;
        };
        DOMSelection.prototype.set = function (domSel) {
            this.anchorNode = domSel.anchorNode;
            this.anchorOffset = domSel.anchorOffset;
            this.focusNode = domSel.focusNode;
            this.focusOffset = domSel.focusOffset;
        };
        return DOMSelection;
    }());
    exports.DOMSelection = DOMSelection;
    });

    unwrapExports(dom);
    var dom_1 = dom.selectionCollapsed;
    var dom_2 = dom.hasSelection;
    var dom_3 = dom.clientRectsFor;
    var dom_4 = dom.isEquivalentPosition;
    var dom_5 = dom.domIndex;
    var dom_6 = dom.maxOffset;
    var dom_7 = dom.scrollRectIntoView;
    var dom_8 = dom.DOMSelection;

    var contentview = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });

    var DOMPos = /** @class */ (function () {
        function DOMPos(node, offset, precise) {
            if (precise === void 0) { precise = true; }
            this.node = node;
            this.offset = offset;
            this.precise = precise;
        }
        DOMPos.before = function (dom$1, precise) { return new DOMPos(dom$1.parentNode, dom.domIndex(dom$1), precise); };
        DOMPos.after = function (dom$1, precise) { return new DOMPos(dom$1.parentNode, dom.domIndex(dom$1) + 1, precise); };
        return DOMPos;
    }());
    exports.DOMPos = DOMPos;
    var none = [];
    var ContentView = /** @class */ (function () {
        function ContentView() {
            this.parent = null;
            this.dom = null;
            this.dirty = 2 /* Node */;
        }
        Object.defineProperty(ContentView.prototype, "overrideDOMText", {
            get: function () { return null; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ContentView.prototype, "posAtStart", {
            get: function () {
                return this.parent ? this.parent.posBefore(this) : 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ContentView.prototype, "posAtEnd", {
            get: function () {
                return this.posAtStart + this.length;
            },
            enumerable: true,
            configurable: true
        });
        ContentView.prototype.posBefore = function (view) {
            var pos = this.posAtStart;
            for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                var child = _a[_i];
                if (child == view)
                    return pos;
                pos += child.length + child.breakAfter;
            }
            throw new RangeError("Invalid child in posBefore");
        };
        ContentView.prototype.posAfter = function (view) {
            return this.posBefore(view) + view.length;
        };
        ContentView.prototype.coordsAt = function (pos) { return null; };
        ContentView.prototype.sync = function () {
            if (this.dirty & 2 /* Node */) {
                var parent_1 = this.dom, pos = parent_1.firstChild;
                for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                    var child = _a[_i];
                    if (child.dirty) {
                        if (pos && !child.dom && !pos.cmView) {
                            var prev = pos.previousSibling;
                            if (child.reuseDOM(pos))
                                pos = prev ? prev.nextSibling : parent_1.firstChild;
                        }
                        child.sync();
                        child.dirty = 0 /* Not */;
                    }
                    pos = syncNodeInto(parent_1, pos, child.dom);
                }
                while (pos)
                    pos = rm(pos);
            }
            else if (this.dirty & 1 /* Child */) {
                for (var _b = 0, _c = this.children; _b < _c.length; _b++) {
                    var child = _c[_b];
                    if (child.dirty) {
                        child.sync();
                        child.dirty = 0 /* Not */;
                    }
                }
            }
        };
        ContentView.prototype.reuseDOM = function (dom) { return false; };
        ContentView.prototype.localPosFromDOM = function (node, offset) {
            var after;
            if (node == this.dom) {
                after = this.dom.childNodes[offset];
            }
            else {
                var bias = dom.maxOffset(node) == 0 ? 0 : offset == 0 ? -1 : 1;
                for (;;) {
                    var parent_2 = node.parentNode;
                    if (parent_2 == this.dom)
                        break;
                    if (bias == 0 && parent_2.firstChild != parent_2.lastChild) {
                        if (node == parent_2.firstChild)
                            bias = -1;
                        else
                            bias = 1;
                    }
                    node = parent_2;
                }
                if (bias < 0)
                    after = node;
                else
                    after = node.nextSibling;
            }
            if (after == this.dom.firstChild)
                return 0;
            while (after && !after.cmView)
                after = after.nextSibling;
            if (!after)
                return this.length;
            for (var i = 0, pos = 0;; i++) {
                var child = this.children[i];
                if (child.dom == after)
                    return pos;
                pos += child.length + child.breakAfter;
            }
        };
        ContentView.prototype.domBoundsAround = function (from, to, offset) {
            if (offset === void 0) { offset = 0; }
            var fromI = -1, fromStart = -1, toI = -1, toEnd = -1;
            for (var i = 0, pos = offset; i < this.children.length; i++) {
                var child = this.children[i], end = pos + child.length;
                if (pos < from && end > to)
                    return child.domBoundsAround(from, to, pos);
                if (end >= from && fromI == -1) {
                    fromI = i;
                    fromStart = pos;
                }
                if (end >= to && toI == -1) {
                    toI = i;
                    toEnd = end;
                    break;
                }
                pos = end + child.breakAfter;
            }
            return { from: fromStart, to: toEnd,
                startDOM: (fromI ? this.children[fromI - 1].dom.nextSibling : null) || this.dom.firstChild,
                endDOM: toI < this.children.length - 1 ? this.children[toI + 1].dom : null };
        };
        // FIXME track precise dirty ranges, to avoid full DOM sync on every touched node?
        ContentView.prototype.markDirty = function (andParent) {
            if (andParent === void 0) { andParent = false; }
            if (this.dirty & 2 /* Node */)
                return;
            this.dirty |= 2 /* Node */;
            this.markParentsDirty(andParent);
        };
        ContentView.prototype.markParentsDirty = function (childList) {
            for (var parent_3 = this.parent; parent_3; parent_3 = parent_3.parent) {
                if (childList)
                    parent_3.dirty |= 2 /* Node */;
                if (parent_3.dirty & 1 /* Child */)
                    return;
                parent_3.dirty |= 1 /* Child */;
                childList = false;
            }
        };
        ContentView.prototype.setParent = function (parent) {
            if (this.parent != parent) {
                this.parent = parent;
                if (this.dirty)
                    this.markParentsDirty(true);
            }
        };
        ContentView.prototype.setDOM = function (dom) {
            this.dom = dom;
            dom.cmView = this;
        };
        Object.defineProperty(ContentView.prototype, "rootView", {
            get: function () {
                for (var v = this;;) {
                    var parent_4 = v.parent;
                    if (!parent_4)
                        return v;
                    v = parent_4;
                }
            },
            enumerable: true,
            configurable: true
        });
        ContentView.prototype.replaceChildren = function (from, to, children) {
            var _a;
            if (children === void 0) { children = none; }
            this.markDirty();
            for (var i = from; i < to; i++)
                this.children[i].parent = null;
            (_a = this.children).splice.apply(_a, [from, to - from].concat(children));
            for (var i = 0; i < children.length; i++)
                children[i].setParent(this);
        };
        ContentView.prototype.ignoreMutation = function (rec) { return false; };
        ContentView.prototype.ignoreEvent = function (event) { return false; };
        ContentView.prototype.childCursor = function (pos, i) {
            if (pos === void 0) { pos = this.length; }
            if (i === void 0) { i = this.children.length; }
            return new ChildCursor(this.children, pos, i);
        };
        ContentView.prototype.childPos = function (pos, bias) {
            if (bias === void 0) { bias = 1; }
            return this.childCursor().findPos(pos, bias);
        };
        ContentView.prototype.toString = function () {
            var name = this.constructor.name.replace("View", "");
            return name + (this.children.length ? "(" + this.children.join() + ")" :
                this.length ? "[" + (name == "Text" ? this.text : this.length) + "]" : "") +
                (this.breakAfter ? "#" : "");
        };
        return ContentView;
    }());
    exports.ContentView = ContentView;
    ContentView.prototype.breakAfter = 0;
    // Remove a DOM node and return its next sibling.
    function rm(dom) {
        var next = dom.nextSibling;
        dom.parentNode.removeChild(dom);
        return next;
    }
    function syncNodeInto(parent, pos, dom) {
        if (dom.parentNode == parent) {
            while (pos != dom)
                pos = rm(pos);
            pos = dom.nextSibling;
        }
        else {
            parent.insertBefore(dom, pos);
        }
        return pos;
    }
    var ChildCursor = /** @class */ (function () {
        function ChildCursor(children, pos, i) {
            this.children = children;
            this.pos = pos;
            this.i = i;
            this.off = 0;
        }
        ChildCursor.prototype.findPos = function (pos, bias) {
            if (bias === void 0) { bias = 1; }
            for (;;) {
                if (pos > this.pos || pos == this.pos && (bias > 0 || this.i == 0)) {
                    this.off = pos - this.pos;
                    return this;
                }
                this.pos -= this.children[--this.i].length;
            }
        };
        return ChildCursor;
    }());
    exports.ChildCursor = ChildCursor;
    // FIXME merge back with ChildCursor again
    var DocChildCursor = /** @class */ (function (_super) {
        __extends(DocChildCursor, _super);
        function DocChildCursor(children, pos, i) {
            var _this = this;
            if (i)
                _this = _super.call(this, children, pos - children[i - 1].length, i - 1) || this;
            else
                _this = _super.call(this, children, pos, i) || this;
            return _this;
        }
        DocChildCursor.prototype.findPos = function (pos, bias) {
            if (bias === void 0) { bias = 1; }
            for (;;) {
                if (pos > this.pos || pos == this.pos &&
                    (bias > 0 || this.i == 0 || this.children[this.i - 1].breakAfter)) {
                    this.off = pos - this.pos;
                    return this;
                }
                var next = this.children[--this.i];
                this.pos -= next.length + next.breakAfter;
            }
        };
        return DocChildCursor;
    }(ChildCursor));
    exports.DocChildCursor = DocChildCursor;
    });

    unwrapExports(contentview);
    var contentview_1 = contentview.DOMPos;
    var contentview_2 = contentview.ContentView;
    var contentview_3 = contentview.ChildCursor;
    var contentview_4 = contentview.DocChildCursor;

    var attributes = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    function combineAttrs(source, target) {
        for (var name_1 in source) {
            if (name_1 == "class" && target.class)
                target.class += " " + source.class;
            else if (name_1 == "style" && target.style)
                target.style += ";" + source.style;
            else
                target[name_1] = source[name_1];
        }
        return target;
    }
    exports.combineAttrs = combineAttrs;
    function attrsEq(a, b) {
        if (a == b)
            return true;
        if (!a || !b)
            return false;
        var keysA = Object.keys(a), keysB = Object.keys(b);
        if (keysA.length != keysB.length)
            return false;
        for (var _i = 0, keysA_1 = keysA; _i < keysA_1.length; _i++) {
            var key = keysA_1[_i];
            if (keysB.indexOf(key) == -1 || a[key] !== b[key])
                return false;
        }
        return true;
    }
    exports.attrsEq = attrsEq;
    function updateAttrs(dom, prev, attrs) {
        if (prev)
            for (var name_2 in prev)
                if (!(attrs && name_2 in attrs))
                    dom.removeAttribute(name_2);
        if (attrs)
            for (var name_3 in attrs)
                if (!(prev && prev[name_3] == attrs[name_3]))
                    dom.setAttribute(name_3, attrs[name_3]);
    }
    exports.updateAttrs = updateAttrs;
    });

    unwrapExports(attributes);
    var attributes_1 = attributes.combineAttrs;
    var attributes_2 = attributes.attrsEq;
    var attributes_3 = attributes.updateAttrs;

    var inlineview = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });



    var none = [];
    var InlineView = /** @class */ (function (_super) {
        __extends(InlineView, _super);
        function InlineView() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        InlineView.prototype.match = function (other) { return false; };
        Object.defineProperty(InlineView.prototype, "children", {
            get: function () { return none; },
            enumerable: true,
            configurable: true
        });
        InlineView.prototype.getSide = function () { return 0; };
        return InlineView;
    }(contentview.ContentView));
    exports.InlineView = InlineView;
    var MAX_JOIN_LEN = 256;
    var TextView = /** @class */ (function (_super) {
        __extends(TextView, _super);
        function TextView(text, tagName, clss, attrs) {
            var _this = _super.call(this) || this;
            _this.text = text;
            _this.tagName = tagName;
            _this.attrs = attrs;
            _this.textDOM = null;
            _this.class = clss;
            return _this;
        }
        Object.defineProperty(TextView.prototype, "length", {
            get: function () { return this.text.length; },
            enumerable: true,
            configurable: true
        });
        TextView.prototype.createDOM = function (textDOM) {
            var tagName = this.tagName || (this.attrs || this.class ? "span" : null);
            this.textDOM = textDOM || document.createTextNode(this.text);
            if (tagName) {
                var dom = document.createElement(tagName);
                dom.appendChild(this.textDOM);
                if (this.class)
                    dom.className = this.class;
                if (this.attrs)
                    for (var name_1 in this.attrs)
                        dom.setAttribute(name_1, this.attrs[name_1]);
                this.setDOM(dom);
            }
            else {
                this.setDOM(this.textDOM);
            }
        };
        TextView.prototype.sync = function () {
            if (!this.dom)
                this.createDOM();
            if (this.textDOM.nodeValue != this.text) {
                this.textDOM.nodeValue = this.text;
                var dom = this.dom;
                if (this.textDOM != dom && (this.dom.firstChild != this.textDOM || dom.lastChild != this.textDOM)) {
                    while (dom.firstChild)
                        dom.removeChild(dom.firstChild);
                    dom.appendChild(this.textDOM);
                }
            }
        };
        TextView.prototype.reuseDOM = function (dom) {
            if (dom.nodeType != 3)
                return false;
            this.createDOM(dom);
            return true;
        };
        TextView.prototype.merge = function (from, to, source) {
            if (to === void 0) { to = this.length; }
            if (source === void 0) { source = null; }
            if (source &&
                (!(source instanceof TextView) ||
                    source.tagName != this.tagName || source.class != this.class ||
                    !attributes.attrsEq(source.attrs, this.attrs) || this.length - (to - from) + source.length > MAX_JOIN_LEN))
                return false;
            this.text = this.text.slice(0, from) + (source ? source.text : "") + this.text.slice(to);
            this.markDirty();
            return true;
        };
        TextView.prototype.slice = function (from, to) {
            if (to === void 0) { to = this.length; }
            return new TextView(this.text.slice(from, to), this.tagName, this.class, this.attrs);
        };
        TextView.prototype.localPosFromDOM = function (node, offset) {
            return node == this.textDOM ? offset : offset ? this.text.length : 0;
        };
        TextView.prototype.domAtPos = function (pos) { return new contentview.DOMPos(this.textDOM, pos); };
        TextView.prototype.domBoundsAround = function (from, to, offset) {
            return { from: offset, to: offset + this.length, startDOM: this.dom, endDOM: this.dom.nextSibling };
        };
        TextView.prototype.coordsAt = function (pos) {
            return textCoords(this.textDOM, pos);
        };
        return TextView;
    }(InlineView));
    exports.TextView = TextView;
    function textCoords(text, pos) {
        var range = document.createRange();
        if (browser$1.default.chrome || browser$1.default.gecko) {
            // These browsers reliably return valid rectangles for empty ranges
            range.setEnd(text, pos);
            range.setStart(text, pos);
            return range.getBoundingClientRect();
        }
        else {
            // Otherwise, get the rectangle around a character and take one side
            var extend = pos == 0 ? 1 : -1;
            range.setEnd(text, pos + (extend > 0 ? 1 : 0));
            range.setStart(text, pos - (extend < 0 ? 1 : 0));
            var rect = range.getBoundingClientRect();
            var x = extend < 0 ? rect.right : rect.left;
            return { left: x, right: x, top: rect.top, bottom: rect.bottom };
        }
    }
    // Also used for collapsed ranges that don't have a placeholder widget!
    var WidgetView = /** @class */ (function (_super) {
        __extends(WidgetView, _super);
        function WidgetView(widget, length, side, open) {
            var _this = _super.call(this) || this;
            _this.widget = widget;
            _this.length = length;
            _this.side = side;
            _this.open = open;
            return _this;
        }
        WidgetView.create = function (widget, length, side, open) {
            if (open === void 0) { open = 0; }
            return new (widget.customView || WidgetView)(widget, length, side, open);
        };
        WidgetView.prototype.slice = function (from, to) {
            if (to === void 0) { to = this.length; }
            return WidgetView.create(this.widget, to - from, this.side);
        };
        WidgetView.prototype.sync = function () {
            if (!this.dom || !this.widget.updateDOM(this.dom)) {
                this.setDOM(this.widget.toDOM());
                this.dom.contentEditable = "false";
            }
        };
        WidgetView.prototype.getSide = function () { return this.side; };
        WidgetView.prototype.merge = function (from, to, source) {
            if (to === void 0) { to = this.length; }
            if (source === void 0) { source = null; }
            if (source) {
                if (!(source instanceof WidgetView) || !source.open ||
                    from > 0 && !(source.open & 1 /* Start */) ||
                    to < this.length && !(source.open & 2 /* End */))
                    return false;
                if (!this.widget.compare(source.widget))
                    throw new Error("Trying to merge incompatible widgets");
            }
            this.length = from + (source ? source.length : 0) + (this.length - to);
            return true;
        };
        WidgetView.prototype.match = function (other) {
            if (other.length == this.length && other instanceof WidgetView && other.side == this.side) {
                if (this.widget.constructor == other.widget.constructor) {
                    if (!this.widget.eq(other.widget.value))
                        this.markDirty(true);
                    this.widget = other.widget;
                    return true;
                }
            }
            return false;
        };
        WidgetView.prototype.ignoreMutation = function () { return true; };
        WidgetView.prototype.ignoreEvent = function (event) { return this.widget.ignoreEvent(event); };
        Object.defineProperty(WidgetView.prototype, "overrideDOMText", {
            get: function () {
                if (this.length == 0)
                    return [""];
                var top = this;
                while (top.parent)
                    top = top.parent;
                var state = top.state, text = state && state.doc, start = this.posAtStart;
                return text ? text.sliceLines(start, start + this.length) : [""];
            },
            enumerable: true,
            configurable: true
        });
        WidgetView.prototype.domAtPos = function (pos) {
            return pos == 0 ? contentview.DOMPos.before(this.dom) : contentview.DOMPos.after(this.dom, pos == this.length);
        };
        WidgetView.prototype.domBoundsAround = function () { return null; };
        WidgetView.prototype.coordsAt = function (pos) {
            var rects = this.dom.getClientRects();
            for (var i = pos > 0 ? rects.length - 1 : 0;; i += (pos > 0 ? -1 : 1)) {
                var rect = rects[i];
                if (pos > 0 ? i == 0 : i == rects.length - 1 || rect.top < rect.bottom)
                    return rects[i];
            }
            return null;
        };
        return WidgetView;
    }(InlineView));
    exports.WidgetView = WidgetView;
    var CompositionView = /** @class */ (function (_super) {
        __extends(CompositionView, _super);
        function CompositionView() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        CompositionView.prototype.domAtPos = function (pos) { return new contentview.DOMPos(this.widget.value.text, pos); };
        CompositionView.prototype.sync = function () { if (!this.dom)
            this.setDOM(this.widget.toDOM()); };
        CompositionView.prototype.ignoreMutation = function () { return false; };
        Object.defineProperty(CompositionView.prototype, "overrideDOMText", {
            get: function () { return null; },
            enumerable: true,
            configurable: true
        });
        CompositionView.prototype.coordsAt = function (pos) { return textCoords(this.widget.value.text, pos); };
        return CompositionView;
    }(WidgetView));
    exports.CompositionView = CompositionView;
    });

    unwrapExports(inlineview);
    var inlineview_1 = inlineview.InlineView;
    var inlineview_2 = inlineview.TextView;
    var inlineview_3 = inlineview.WidgetView;
    var inlineview_4 = inlineview.CompositionView;

    var blockview = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });





    var LineView = /** @class */ (function (_super) {
        __extends(LineView, _super);
        function LineView() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.children = [];
            _this.length = 0;
            _this.prevAttrs = undefined;
            _this.attrs = null;
            _this.breakAfter = 0;
            return _this;
        }
        // Consumes source
        LineView.prototype.merge = function (from, to, source, takeDeco) {
            if (source) {
                if (!(source instanceof LineView))
                    return false;
                if (!this.dom)
                    source.transferDOM(this); // Reuse source.dom when appropriate
            }
            if (takeDeco)
                this.setDeco(source ? source.attrs : null);
            var elts = source ? source.children : [];
            var cur = this.childCursor();
            var _a = cur.findPos(to, 1), toI = _a.i, toOff = _a.off;
            var _b = cur.findPos(from, -1), fromI = _b.i, fromOff = _b.off;
            var dLen = from - to;
            for (var _i = 0, elts_1 = elts; _i < elts_1.length; _i++) {
                var view = elts_1[_i];
                dLen += view.length;
            }
            this.length += dLen;
            // Both from and to point into the same text view
            if (fromI == toI && fromOff) {
                var start = this.children[fromI];
                // Maybe just update that view and be done
                if (elts.length == 1 && start.merge(fromOff, toOff, elts[0]))
                    return true;
                if (elts.length == 0) {
                    start.merge(fromOff, toOff, null);
                    return true;
                }
                // Otherwise split it, so that we don't have to worry about aliasing front/end afterwards
                var after = start.slice(toOff);
                if (after.merge(0, 0, elts[elts.length - 1]))
                    elts[elts.length - 1] = after;
                else
                    elts.push(after);
                toI++;
                toOff = 0;
            }
            // Make sure start and end positions fall on node boundaries
            // (fromOff/toOff are no longer used after this), and that if the
            // start or end of the elts can be merged with adjacent nodes,
            // this is done
            if (toOff) {
                var end = this.children[toI];
                if (elts.length && end.merge(0, toOff, elts[elts.length - 1]))
                    elts.pop();
                else
                    end.merge(0, toOff, null);
            }
            else if (toI < this.children.length && elts.length &&
                this.children[toI].merge(0, 0, elts[elts.length - 1])) {
                elts.pop();
            }
            if (fromOff) {
                var start = this.children[fromI];
                if (elts.length && start.merge(fromOff, undefined, elts[0]))
                    elts.shift();
                else
                    start.merge(fromOff, undefined, null);
                fromI++;
            }
            else if (fromI && elts.length && this.children[fromI - 1].merge(this.children[fromI - 1].length, undefined, elts[0])) {
                elts.shift();
            }
            // Then try to merge any mergeable nodes at the start and end of
            // the changed range
            while (fromI < toI && elts.length && this.children[toI - 1].match(elts[elts.length - 1])) {
                elts.pop();
                toI--;
            }
            while (fromI < toI && elts.length && this.children[fromI].match(elts[0])) {
                elts.shift();
                fromI++;
            }
            // And if anything remains, splice the child array to insert the new elts
            if (elts.length || fromI != toI)
                this.replaceChildren(fromI, toI, elts);
            return true;
        };
        LineView.prototype.split = function (at) {
            var end = new LineView;
            end.breakAfter = this.breakAfter;
            if (this.length == 0)
                return end;
            var _a = this.childCursor().findPos(at), i = _a.i, off = _a.off;
            if (off) {
                end.append(this.children[i].slice(off));
                this.children[i].merge(off, undefined, null);
                i++;
            }
            for (var j = i; j < this.children.length; j++)
                end.append(this.children[j]);
            this.children.length = i;
            this.markDirty();
            this.length = at;
            return end;
        };
        LineView.prototype.transferDOM = function (other) {
            if (!this.dom)
                return;
            other.setDOM(this.dom);
            other.prevAttrs = this.prevAttrs === undefined ? this.attrs : this.prevAttrs;
            this.prevAttrs = undefined;
            this.dom = null;
        };
        LineView.prototype.setDeco = function (attrs) {
            if (!attributes.attrsEq(this.attrs, attrs)) {
                if (this.dom) {
                    this.prevAttrs = this.attrs;
                    this.markDirty();
                }
                this.attrs = attrs;
            }
        };
        // Only called when building a line view in ContentBuilder
        LineView.prototype.append = function (child) {
            this.children.push(child);
            child.setParent(this);
            this.length += child.length;
        };
        // Only called when building a line view in ContentBuilder
        LineView.prototype.addLineDeco = function (deco) {
            var attrs = deco.spec.attributes;
            if (attrs)
                this.attrs = attributes.combineAttrs(attrs, this.attrs || {});
        };
        LineView.prototype.domAtPos = function (pos) {
            var i = 0;
            for (var off = 0; i < this.children.length; i++) {
                var child = this.children[i], end = off + child.length;
                if (end == off && child.getSide() <= 0)
                    continue;
                if (pos > off && pos < end && child.dom.parentNode == this.dom)
                    return child.domAtPos(pos - off);
                if (pos <= off)
                    break;
                off = end;
            }
            for (; i > 0; i--) {
                var before = this.children[i - 1].dom;
                if (before.parentNode == this.dom)
                    return contentview.DOMPos.after(before);
            }
            return new contentview.DOMPos(this.dom, 0);
        };
        // FIXME might need another hack to work around Firefox's behavior
        // of not actually displaying the cursor even though it's there in
        // the DOM
        LineView.prototype.sync = function () {
            if (!this.dom) {
                this.setDOM(document.createElement("div"));
                this.dom.className = "codemirror-line " + editorview.styles.line;
                this.prevAttrs = this.attrs ? null : undefined;
            }
            if (this.prevAttrs !== undefined) {
                attributes.updateAttrs(this.dom, this.prevAttrs, this.attrs);
                this.dom.classList.add("codemirror-line");
                this.dom.classList.add(editorview.styles.line);
                this.prevAttrs = undefined;
            }
            _super.prototype.sync.call(this);
            var last = this.dom.lastChild;
            if (!last || last.nodeName == "BR") {
                var hack = document.createElement("BR");
                hack.cmIgnore = true;
                this.dom.appendChild(hack);
            }
        };
        LineView.prototype.measureTextSize = function () {
            if (this.children.length == 0 || this.length > 20)
                return null;
            var totalWidth = 0;
            for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                var child = _a[_i];
                if (!(child instanceof inlineview.TextView))
                    return null;
                var rects = dom.clientRectsFor(child.dom);
                if (rects.length != 1)
                    return null;
                totalWidth += rects[0].width;
            }
            return { lineHeight: this.dom.getBoundingClientRect().height,
                charWidth: totalWidth / this.length };
        };
        LineView.prototype.coordsAt = function (pos) {
            for (var off = 0, i = 0; i < this.children.length; i++) {
                var child = this.children[i], end = off + child.length;
                if (end >= pos)
                    return child.coordsAt(pos - off);
                off = end;
            }
            return this.dom.lastChild.getBoundingClientRect();
        };
        LineView.prototype.match = function (other) { return false; };
        Object.defineProperty(LineView.prototype, "type", {
            get: function () { return 0 /* Text */; },
            enumerable: true,
            configurable: true
        });
        return LineView;
    }(contentview.ContentView));
    exports.LineView = LineView;
    var none = [];
    var BlockWidgetView = /** @class */ (function (_super) {
        __extends(BlockWidgetView, _super);
        function BlockWidgetView(widget, length, type, 
        // This is set by the builder and used to distinguish between
        // adjacent widgets and parts of the same widget when calling
        // `merge`. It's kind of silly that it's an instance variable, but
        // it's hard to route there otherwise.
        open) {
            if (open === void 0) { open = 0; }
            var _this = _super.call(this) || this;
            _this.widget = widget;
            _this.length = length;
            _this.type = type;
            _this.open = open;
            _this.breakAfter = 0;
            return _this;
        }
        BlockWidgetView.prototype.merge = function (from, to, source) {
            if (!(source instanceof BlockWidgetView) || !source.open ||
                from > 0 && !(source.open & 1 /* Start */) ||
                to < this.length && !(source.open & 2 /* End */))
                return false;
            if (!this.widget.compare(source.widget))
                throw new Error("Trying to merge an open widget with an incompatible node");
            this.length = from + source.length + (this.length - to);
            return true;
        };
        BlockWidgetView.prototype.domAtPos = function (pos) {
            return pos == 0 ? contentview.DOMPos.before(this.dom) : contentview.DOMPos.after(this.dom, pos == this.length);
        };
        BlockWidgetView.prototype.split = function (at) {
            var len = this.length - at;
            this.length = at;
            return new BlockWidgetView(this.widget, len, this.type);
        };
        Object.defineProperty(BlockWidgetView.prototype, "children", {
            get: function () { return none; },
            enumerable: true,
            configurable: true
        });
        BlockWidgetView.prototype.sync = function () {
            if (!this.dom || !this.widget.updateDOM(this.dom)) {
                this.setDOM(this.widget.toDOM());
                this.dom.contentEditable = "false";
            }
        };
        Object.defineProperty(BlockWidgetView.prototype, "overrideDOMText", {
            get: function () {
                return this.parent ? this.parent.state.doc.sliceLines(this.posAtStart, this.posAtEnd) : [""];
            },
            enumerable: true,
            configurable: true
        });
        BlockWidgetView.prototype.domBoundsAround = function () { return null; };
        BlockWidgetView.prototype.match = function (other) {
            if (other instanceof BlockWidgetView && other.type == this.type &&
                other.widget.constructor == this.widget.constructor) {
                if (!other.widget.eq(this.widget.value))
                    this.markDirty(true);
                this.widget = other.widget;
                this.length = other.length;
                this.breakAfter = other.breakAfter;
                return true;
            }
            return false;
        };
        return BlockWidgetView;
    }(contentview.ContentView));
    exports.BlockWidgetView = BlockWidgetView;
    });

    unwrapExports(blockview);
    var blockview_1 = blockview.LineView;
    var blockview_2 = blockview.BlockWidgetView;

    var rangeset = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    var RangeValue = /** @class */ (function () {
        function RangeValue() {
        }
        RangeValue.prototype.eq = function (other) { return this == other; };
        return RangeValue;
    }());
    exports.RangeValue = RangeValue;
    RangeValue.prototype.startSide = RangeValue.prototype.endSide = 0;
    RangeValue.prototype.point = false;
    var Range = /** @class */ (function () {
        function Range(from, to, value) {
            this.from = from;
            this.to = to;
            this.value = value;
        }
        /** @internal */
        Range.prototype.map = function (changes, oldOffset, newOffset) {
            var mapped = this.value.map(changes, this.from + oldOffset, this.to + oldOffset);
            if (mapped) {
                mapped.from -= newOffset;
                mapped.to -= newOffset;
            }
            return mapped;
        };
        /** @internal */
        Range.prototype.move = function (offset) {
            return offset ? new Range(this.from + offset, this.to + offset, this.value) : this;
        };
        Object.defineProperty(Range.prototype, "heapPos", {
            /** @internal Here so that we can put active ranges on a heap
             * and take them off at their end */
            get: function () { return this.to; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Range.prototype, "heapSide", {
            get: function () { return this.value.endSide; },
            enumerable: true,
            configurable: true
        });
        return Range;
    }());
    exports.Range = Range;
    var none = [];
    function maybeNone(array) { return array.length ? array : none; }
    var BASE_NODE_SIZE_SHIFT = 5, BASE_NODE_SIZE = 1 << BASE_NODE_SIZE_SHIFT;
    var RangeSet = /** @class */ (function () {
        // @internal
        function RangeSet(
        // @internal The text length covered by this set
        length, 
        // The number of ranges in the set
        size, 
        // @internal The locally stored ranges—which are all of them
        // for leaf nodes, and the ones that don't fit in child sets for
        // non-leaves. Sorted by start position, then side.
        local, 
        // @internal The child sets, in position order. Their total
        // length may be smaller than .length if the end is empty (never
        // greater)
        children) {
            this.length = length;
            this.size = size;
            this.local = local;
            this.children = children;
        }
        RangeSet.prototype.update = function (added, filter, filterFrom, filterTo) {
            if (added === void 0) { added = none; }
            if (filter === void 0) { filter = null; }
            if (filterFrom === void 0) { filterFrom = 0; }
            if (filterTo === void 0) { filterTo = this.length; }
            var maxLen = added.reduce(function (l, d) { return Math.max(l, d.to); }, this.length);
            return this.updateInner(added.length ? added.slice().sort(byPos) : added, filter, filterFrom, filterTo, 0, maxLen);
        };
        /** @internal */
        RangeSet.prototype.updateInner = function (added, filter, filterFrom, filterTo, offset, length) {
            // The new local ranges. Null means no changes were made yet
            var local = filterRanges(this.local, filter, filterFrom, filterTo, offset);
            // The new array of child sets, if changed
            var children = null;
            var size = 0;
            var decI = 0, pos = offset;
            // Iterate over the child sets, applying filters and pushing added
            // ranges into them
            for (var i = 0; i < this.children.length; i++) {
                var child = this.children[i];
                var endPos = pos + child.length, localRanges = null;
                while (decI < added.length) {
                    var next = added[decI];
                    if (next.from >= endPos)
                        break;
                    decI++;
                    if (next.to > endPos) {
                        if (!local)
                            local = this.local.slice();
                        insertSorted(local, next.move(-offset));
                    }
                    else {
                        (localRanges || (localRanges = [])).push(next);
                    }
                }
                var newChild = child;
                if (localRanges || filter && filterFrom <= endPos && filterTo >= pos)
                    newChild = newChild.updateInner(localRanges || none, filter, filterFrom, filterTo, pos, newChild.length);
                if (newChild != child)
                    (children || (children = this.children.slice(0, i))).push(newChild);
                else if (children)
                    children.push(newChild);
                size += newChild.size;
                pos = endPos;
            }
            // If nothing was actually updated, return the existing object
            if (!local && !children && decI == added.length)
                return this;
            // Compute final size
            size += (local || this.local).length + added.length - decI;
            // This is a small node—turn it into a flat leaf
            if (size <= BASE_NODE_SIZE)
                return collapseSet(children || this.children, local || this.local.slice(), added, decI, offset, length);
            var childSize = Math.max(BASE_NODE_SIZE, size >> BASE_NODE_SIZE_SHIFT);
            if (decI < added.length) {
                if (!children)
                    children = this.children.slice();
                if (!local)
                    local = this.local.slice();
                appendRanges(local, children, added, decI, offset, length, pos, childSize);
            }
            if (children) {
                if (!local)
                    local = this.local.slice();
                rebalanceChildren(local, children, childSize);
            }
            return new RangeSet(length, size, maybeNone(local || this.local), maybeNone(children || this.children));
        };
        RangeSet.prototype.grow = function (length) {
            return new RangeSet(this.length + length, this.size, this.local, this.children);
        };
        // Collect all ranges in this set into the target array,
        // offsetting them by `offset`
        RangeSet.prototype.collect = function (target, offset) {
            for (var _i = 0, _a = this.local; _i < _a.length; _i++) {
                var range = _a[_i];
                target.push(range.move(offset));
            }
            for (var _b = 0, _c = this.children; _b < _c.length; _b++) {
                var child = _c[_b];
                child.collect(target, offset);
                offset += child.length;
            }
        };
        RangeSet.prototype.map = function (changes) {
            if (changes.length == 0 || this == RangeSet.empty)
                return this;
            return this.mapInner(changes, 0, 0, changes.mapPos(this.length, 1)).set;
        };
        // Child boundaries are always mapped forward. This may cause ranges
        // at the start of a set to end up sticking out before its new
        // start, if they map backward. Such ranges are returned in
        // `escaped`.
        RangeSet.prototype.mapInner = function (changes, oldStart, newStart, newEnd) {
            var newLocal = null;
            var escaped = null;
            var newLength = newEnd - newStart, newSize = 0;
            for (var i = 0; i < this.local.length; i++) {
                var range = this.local[i], mapped = range.map(changes, oldStart, newStart);
                var escape_1 = mapped != null && (mapped.from < 0 || mapped.to > newLength);
                if (newLocal == null && (range != mapped || escape_1))
                    newLocal = this.local.slice(0, i);
                if (escape_1)
                    (escaped || (escaped = [])).push(mapped);
                else if (newLocal && mapped)
                    newLocal.push(mapped);
            }
            var newChildren = null;
            for (var i = 0, oldPos = oldStart, newPos = newStart; i < this.children.length; i++) {
                var child = this.children[i], newChild = child;
                var oldChildEnd = oldPos + child.length;
                var newChildEnd = changes.mapPos(oldPos + child.length, 1);
                var touch = touchesChanges(oldPos, oldChildEnd, changes.changes);
                if (touch == 0 /* Yes */) {
                    var inner = child.mapInner(changes, oldPos, newPos, newChildEnd);
                    newChild = inner.set;
                    if (inner.escaped)
                        for (var _i = 0, _a = inner.escaped; _i < _a.length; _i++) {
                            var range = _a[_i];
                            range = range.move(newPos - newStart);
                            if (range.from < 0 || range.to > newLength)
                                insertSorted(escaped || (escaped = []), range);
                            else
                                insertSorted(newLocal || (newLocal = this.local.slice()), range);
                        }
                }
                else if (touch == 2 /* Covered */) {
                    newChild = RangeSet.empty.grow(newChildEnd - newPos);
                }
                if (newChild != child) {
                    if (newChildren == null)
                        newChildren = this.children.slice(0, i);
                    // If the node's content was completely deleted by mapping,
                    // drop the node—which is complicated by the need to
                    // distribute its length to another child when it's not the
                    // last child
                    if (newChild.size == 0 && (newChild.length == 0 || newChildren.length || i == this.children.length)) {
                        if (newChild.length > 0 && i > 0) {
                            var last = newChildren.length - 1, lastChild = newChildren[last];
                            newChildren[last] = new RangeSet(lastChild.length + newChild.length, lastChild.size, lastChild.local, lastChild.children);
                        }
                    }
                    else {
                        newChildren.push(newChild);
                    }
                }
                else if (newChildren) {
                    newChildren.push(newChild);
                }
                newSize += newChild.size;
                oldPos = oldChildEnd;
                newPos = newChildEnd;
            }
            var set = newLength == this.length && newChildren == null && newLocal == null
                ? this
                : new RangeSet(newLength, newSize + (newLocal || this.local).length, newLocal || this.local, newChildren || this.children);
            return { set: set, escaped: escaped };
        };
        RangeSet.prototype.forEach = function (f) { this.forEachInner(f, 0); };
        RangeSet.prototype.forEachInner = function (f, offset) {
            for (var _i = 0, _a = this.local; _i < _a.length; _i++) {
                var range = _a[_i];
                f(range.from + offset, range.to + offset, range.value);
            }
            for (var _b = 0, _c = this.children; _b < _c.length; _b++) {
                var child = _c[_b];
                child.forEachInner(f, offset);
                offset += child.length;
            }
        };
        // Iterate over the ranges in the set that touch the area between
        // from and to, ordered by their start position and side
        RangeSet.prototype.iter = function (from, to) {
            if (from === void 0) { from = 0; }
            if (to === void 0) { to = this.length; }
            var heap = [];
            addIterToHeap(heap, [new IteratedSet(0, this)], from);
            if (this.local.length)
                addToHeap(heap, new LocalSet(0, this.local));
            return {
                next: function () {
                    for (;;) {
                        if (heap.length == 0)
                            return;
                        var next = takeFromHeap(heap);
                        var range = next.ranges[next.index++].move(next.offset);
                        if (range.from > to)
                            return;
                        // Put the rest of the set back onto the heap
                        if (next.index < next.ranges.length)
                            addToHeap(heap, next);
                        else if (next.next)
                            addIterToHeap(heap, next.next, 0);
                        if (range.to >= from)
                            return range;
                    }
                }
            };
        };
        RangeSet.prototype.compare = function (other, textDiff, comparator, oldLen) {
            var oldPos = 0, newPos = 0;
            for (var _i = 0, textDiff_1 = textDiff; _i < textDiff_1.length; _i++) {
                var range = textDiff_1[_i];
                if (range.fromB > newPos && (this != other || oldPos != newPos))
                    new RangeSetComparison(this, oldPos, other, newPos, range.fromB, comparator).run();
                oldPos = range.toA;
                newPos = range.toB;
            }
            if (oldPos < this.length || newPos < other.length || textDiff.length == 0)
                new RangeSetComparison(this, oldPos, other, newPos, newPos + (oldLen - oldPos), comparator).run();
        };
        RangeSet.iterateSpans = function (sets, from, to, iterator) {
            var heap = [];
            var pos = from, posSide = -FAR;
            for (var _i = 0, sets_1 = sets; _i < sets_1.length; _i++) {
                var set = sets_1[_i];
                if (set.size > 0) {
                    addIterToHeap(heap, [new IteratedSet(0, set)], pos);
                    if (set.local.length)
                        addToHeap(heap, new LocalSet(0, set.local));
                }
            }
            var active = [];
            while (heap.length > 0) {
                var next = takeFromHeap(heap);
                if (next instanceof LocalSet) {
                    var range = next.ranges[next.index], rFrom = range.from + next.offset, rTo = range.to + next.offset;
                    if (rFrom > to)
                        break;
                    // Put the rest of the set back onto the heap
                    if (++next.index < next.ranges.length)
                        addToHeap(heap, next);
                    else if (next.next)
                        addIterToHeap(heap, next.next, pos);
                    if ((rTo - pos || range.value.endSide - posSide) >= 0 && !iterator.ignore(rFrom, rTo, range.value)) {
                        if (rFrom > pos) {
                            iterator.span(pos, rFrom, active);
                            pos = rFrom;
                            posSide = range.value.startSide;
                        }
                        if (range.value.point) {
                            iterator.point(pos, Math.min(rTo, to), range.value, rFrom < pos, rTo > to);
                            pos = rTo;
                            if (rTo > to)
                                break;
                            posSide = range.value.endSide;
                        }
                        else if (rTo > pos) {
                            active.push(range.value);
                            addToHeap(heap, new Range(rFrom, rTo, range.value));
                        }
                    }
                }
                else { // A range that ends here
                    var range = next;
                    if (range.to > to)
                        break;
                    if (range.to > pos) {
                        iterator.span(pos, range.to, active);
                        pos = range.to;
                        posSide = range.value.endSide;
                    }
                    active.splice(active.indexOf(range.value), 1);
                }
            }
            if (pos < to)
                iterator.span(pos, to, active);
        };
        RangeSet.of = function (ranges) {
            return RangeSet.empty.update(ranges instanceof Range ? [ranges] : ranges);
        };
        RangeSet.empty = new RangeSet(0, 0, none, none);
        return RangeSet;
    }());
    exports.RangeSet = RangeSet;
    // Stack element for iterating over a range set
    var IteratedSet = /** @class */ (function () {
        function IteratedSet(offset, set) {
            this.offset = offset;
            this.set = set;
            // Index == -1 means the set's locals have not been yielded yet.
            // Otherwise this is an index in the set's child array.
            this.index = 0;
        }
        return IteratedSet;
    }());
    // Cursor into a node-local set of ranges
    var LocalSet = /** @class */ (function () {
        function LocalSet(offset, ranges, next) {
            if (next === void 0) { next = null; }
            this.offset = offset;
            this.ranges = ranges;
            this.next = next;
            this.index = 0;
        }
        Object.defineProperty(LocalSet.prototype, "heapPos", {
            // Used to make this conform to Heapable
            get: function () { return this.ranges[this.index].from + this.offset; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(LocalSet.prototype, "heapSide", {
            get: function () { return this.ranges[this.index].value.startSide; },
            enumerable: true,
            configurable: true
        });
        return LocalSet;
    }());
    // Iterating over a range set is done using a stack that represents a
    // position into the range set's tree. There's an IteratedSet for each
    // active level, and iteration happens by calling this function to
    // move the next node onto the stack (which may involve popping off
    // nodes before it).
    //
    // Such a stack represenst the _structural_ part of the tree,
    // iterating over tree nodes. The individual ranges of each top node
    // must be accessed separately, after it has been moved onto the stack
    // (the new node is always at the top, or, if the end of the set has
    // been reached, the stack is empty).
    //
    // Nodes that fall entirely before `skipTo` are never added to the
    // stack, allowing efficient skipping of parts of the tree.
    function iterRangeSet(stack, skipTo) {
        if (skipTo === void 0) { skipTo = 0; }
        for (;;) {
            if (stack.length == 0)
                break;
            var top_1 = stack[stack.length - 1];
            if (top_1.index == top_1.set.children.length) {
                stack.pop();
            }
            else {
                var next = top_1.set.children[top_1.index], start = top_1.offset;
                top_1.index++;
                top_1.offset += next.length;
                if (top_1.offset >= skipTo) {
                    stack.push(new IteratedSet(start, next));
                    break;
                }
            }
        }
    }
    // Iterating over the actual ranges in a set (or multiple sets) is
    // done using a binary heap to efficiently get the ordering right. The
    // heap may contain both LocalSet instances (iterating over the ranges
    // in a set tree node) and actual Range objects. At any point, the one
    // with the lowest position (and side) is taken off next.
    function compareHeapable(a, b) {
        return a.heapPos - b.heapPos || a.heapSide - b.heapSide;
    }
    // Advance the iteration over a range set (in `stack`) and add the
    // next node that has any local ranges to the heap as a `LocalSet`.
    // Links the stack to the `LocalSet` (in `.next`) if this node also
    // has child nodes, which will be used to schedule the next call to
    // `addIterToHeap` when the end of that `LocalSet` is reached.
    function addIterToHeap(heap, stack, skipTo) {
        if (skipTo === void 0) { skipTo = 0; }
        for (;;) {
            iterRangeSet(stack, skipTo);
            if (stack.length == 0)
                break;
            var next = stack[stack.length - 1], local = next.set.local;
            var leaf = next.set.children.length ? null : stack;
            if (local.length)
                addToHeap(heap, new LocalSet(next.offset, local, leaf));
            if (leaf)
                break;
        }
    }
    // Classic binary heap implementation, using the conformance to
    // `Heapable` of the elements to compare them with `compareHeapable`,
    // keeping the element with the lowest position at its top.
    function addToHeap(heap, elt) {
        var index = heap.push(elt) - 1;
        while (index > 0) {
            var parentIndex = index >> 1, parent_1 = heap[parentIndex];
            if (compareHeapable(elt, parent_1) >= 0)
                break;
            heap[index] = parent_1;
            heap[parentIndex] = elt;
            index = parentIndex;
        }
    }
    function takeFromHeap(heap) {
        var elt = heap[0], replacement = heap.pop();
        if (heap.length == 0)
            return elt;
        heap[0] = replacement;
        for (var index = 0;;) {
            var childIndex = (index << 1) + 1;
            if (childIndex >= heap.length)
                break;
            var child = heap[childIndex];
            if (childIndex + 1 < heap.length && compareHeapable(child, heap[childIndex + 1]) >= 0) {
                child = heap[childIndex + 1];
                childIndex++;
            }
            if (compareHeapable(replacement, child) < 0)
                break;
            heap[childIndex] = replacement;
            heap[index] = child;
            index = childIndex;
        }
        return elt;
    }
    function byPos(a, b) {
        return a.from - b.from || a.value.startSide - b.value.startSide;
    }
    function insertSorted(target, range) {
        var i = target.length;
        while (i > 0 && byPos(target[i - 1], range) >= 0)
            i--;
        target.splice(i, 0, range);
    }
    function filterRanges(ranges, filter, filterFrom, filterTo, offset) {
        if (!filter)
            return null;
        var copy = null;
        for (var i = 0; i < ranges.length; i++) {
            var range = ranges[i], from = range.from + offset, to = range.to + offset;
            if (filterFrom > to || filterTo < from || filter(from, to, range.value)) {
                if (copy != null)
                    copy.push(range);
            }
            else {
                if (copy == null)
                    copy = ranges.slice(0, i);
            }
        }
        return copy;
    }
    function collapseSet(children, local, add, start, offset, length) {
        var mustSort = local.length > 0 && add.length > 0, off = 0;
        for (var _i = 0, children_1 = children; _i < children_1.length; _i++) {
            var child = children_1[_i];
            child.collect(local, -off);
            off += child.length;
        }
        for (var _a = 0, add_1 = add; _a < add_1.length; _a++) {
            var added = add_1[_a];
            local.push(added.move(-offset));
        }
        if (mustSort)
            local.sort(byPos);
        return new RangeSet(length, local.length, local, none);
    }
    function appendRanges(local, children, ranges, start, offset, length, pos, childSize) {
        // Group added ranges after the current children into new
        // children (will usually only happen when initially creating a
        // node or adding stuff to the top-level node)
        for (var i = start; i < ranges.length;) {
            var add = [];
            var end = Math.min(i + childSize, ranges.length);
            var endPos = end == ranges.length ? offset + length : ranges[end].from;
            for (; i < end; i++) {
                var range = ranges[i];
                if (range.to > endPos)
                    insertSorted(local, range.move(-offset));
                else
                    add.push(range);
            }
            // Move locals that fit in this new child from `local` to `add`
            for (var i_1 = 0; i_1 < local.length; i_1++) {
                var range = local[i_1];
                if (range.from >= pos && range.to <= endPos) {
                    local.splice(i_1--, 1);
                    insertSorted(add, range.move(offset));
                }
            }
            if (add.length) {
                if (add.length == ranges.length)
                    children.push(new RangeSet(endPos - pos, add.length, add.map(function (r) { return r.move(-pos); }), none));
                else
                    children.push(RangeSet.empty.updateInner(add, null, 0, 0, pos, endPos - pos));
                pos = endPos;
            }
        }
    }
    // FIXME try to clean this up
    function rebalanceChildren(local, children, childSize) {
        var _loop_1 = function (i, off) {
            var child = children[i], next = void 0;
            if (child.size == 0 && (i > 0 || children.length == 1)) {
                // Drop empty node
                children.splice(i--, 1);
                if (i >= 0)
                    children[i] = children[i].grow(child.length);
            }
            else if (child.size > (childSize << 1) && child.local.length < (child.length >> 1)) {
                // Unwrap an overly big node
                for (var _i = 0, _a = child.local; _i < _a.length; _i++) {
                    var range = _a[_i];
                    insertSorted(local, range.move(off));
                }
                children.splice.apply(children, [i, 1].concat(child.children));
            }
            else if (child.children.length == 0 && i < children.length - 1 &&
                (next = children[i + 1]).size + child.size <= BASE_NODE_SIZE &&
                next.children.length == 0) {
                // Join two small leaf nodes
                children.splice(i, 2, new RangeSet(child.length + next.length, child.size + next.size, child.local.concat(next.local.map(function (d) { return d.move(child.length); })), none));
            }
            else {
                // Join a number of nodes into a wrapper node
                var joinTo = i + 1, size = child.size, length_1 = child.length;
                if (child.size < (childSize >> 1)) {
                    for (; joinTo < children.length; joinTo++) {
                        var next_1 = children[joinTo], totalSize = size + next_1.size;
                        if (totalSize > childSize)
                            break;
                        size = totalSize;
                        length_1 += next_1.length;
                    }
                }
                if (joinTo > i + 1) {
                    var joined = new RangeSet(length_1, size, none, children.slice(i, joinTo));
                    var joinedLocals = [];
                    for (var j = 0; j < local.length; j++) {
                        var range = local[j];
                        if (range.from >= off && range.to <= off + length_1) {
                            local.splice(j--, 1);
                            joinedLocals.push(range.move(-off));
                        }
                    }
                    if (joinedLocals.length)
                        joined = joined.update(joinedLocals.sort(byPos));
                    children.splice(i, joinTo - i, joined);
                    i++;
                    off += length_1;
                }
                else {
                    i++;
                    off += child.length;
                }
            }
            out_i_1 = i;
            out_off_1 = off;
        };
        var out_i_1, out_off_1;
        for (var i = 0, off = 0; i < children.length;) {
            _loop_1(i, off);
            i = out_i_1;
            off = out_off_1;
        }
    }
    var SIDE_A = 1, SIDE_B = 2, FAR = 1e9;
    var ComparisonSide = /** @class */ (function () {
        function ComparisonSide(stack) {
            this.stack = stack;
            this.heap = [];
            this.active = [];
            this.activeTo = [];
            this.points = [];
            this.tip = null;
            this.point = null;
            this.pointTo = -FAR;
        }
        ComparisonSide.prototype.forward = function (start, next) {
            var newTip = false;
            if (next.set.local.length) {
                var local = new LocalSet(next.offset, next.set.local);
                addToHeap(this.heap, local);
                if (!next.set.children.length) {
                    this.tip = local;
                    newTip = true;
                }
            }
            iterRangeSet(this.stack, start);
            return newTip;
        };
        ComparisonSide.prototype.findActive = function (to, value) {
            for (var i = 0; i < this.active.length; i++)
                if (this.activeTo[i] == to && (this.active[i] == value || this.active[i].eq(value)))
                    return i;
            return -1;
        };
        ComparisonSide.prototype.clearPoint = function () {
            this.pointTo = -FAR;
            this.point = null;
        };
        Object.defineProperty(ComparisonSide.prototype, "nextPos", {
            get: function () {
                return this.pointTo > -FAR ? this.pointTo : this.heap.length ? this.heap[0].heapPos : FAR;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ComparisonSide.prototype, "nextSide", {
            get: function () {
                return this.pointTo > -FAR ? this.point.endSide : this.heap.length ? this.heap[0].heapSide : FAR;
            },
            enumerable: true,
            configurable: true
        });
        return ComparisonSide;
    }());
    // Manage the synchronous iteration over a part of two range sets,
    // skipping identical nodes and ranges and calling callbacks on a
    // comparator object when differences are found.
    var RangeSetComparison = /** @class */ (function () {
        function RangeSetComparison(a, startA, b, startB, endB, comparator) {
            this.comparator = comparator;
            this.a = new ComparisonSide([new IteratedSet(startB - startA, a)]);
            this.b = new ComparisonSide([new IteratedSet(0, b)]);
            this.pos = startB;
            this.end = endB;
            this.forwardIter(SIDE_A | SIDE_B);
        }
        // Move the iteration over the tree structure forward until all of
        // the sides included in `side` (bitmask of `SIDE_A` and/or
        // `SIDE_B`) have added new nodes to their heap, or there is nothing
        // further to iterate over. This is basically used to ensure the
        // heaps are stocked with nodes from the stacks that track the
        // iteration.
        RangeSetComparison.prototype.forwardIter = function (side) {
            for (; side > 0;) {
                var nextA = this.a.stack.length ? this.a.stack[this.a.stack.length - 1] : null;
                var nextB = this.b.stack.length ? this.b.stack[this.b.stack.length - 1] : null;
                if (!nextA && (side & SIDE_A)) {
                    // If there's no next node for A, we're done there
                    side &= ~SIDE_A;
                }
                else if (!nextB && (side & SIDE_B)) {
                    // No next node for B
                    side &= ~SIDE_B;
                }
                else if (nextA && nextB && nextA.offset == nextB.offset && nextA.set == nextB.set) {
                    // Both next nodes are the same—skip them
                    iterRangeSet(this.a.stack, this.pos);
                    iterRangeSet(this.b.stack, this.pos);
                }
                else if (nextA && (!nextB || (nextA.offset < nextB.offset ||
                    nextA.offset == nextB.offset && (this.a.stack.length == 1 ||
                        nextA.set.length >= nextB.set.length)))) {
                    // If there no next B, or it comes after the next A, or it
                    // sits at the same position and is smaller, move A forward.
                    if (this.a.forward(this.pos, nextA))
                        side &= ~SIDE_A;
                }
                else {
                    // Otherwise move B forward
                    if (this.b.forward(this.pos, nextB))
                        side &= ~SIDE_B;
                }
            }
        };
        // Driver of the comparison process. On each iteration, call
        // `advance` with the side whose next event (start of end of a
        // range) comes first, until we run out of events.
        RangeSetComparison.prototype.run = function () {
            for (;;) {
                var nextA = this.a.nextPos, nextB = this.b.nextPos;
                if (nextA == FAR && nextB == FAR)
                    break;
                var diff = nextA - nextB || this.a.nextSide - this.a.nextSide;
                if (diff < 0)
                    this.advance(this.a, this.b);
                else
                    this.advance(this.b, this.a);
            }
        };
        RangeSetComparison.prototype.advance = function (side, other) {
            if (side.pointTo > -1) {
                // The next thing that's happening is the end of this.point
                var end = Math.min(this.end, side.pointTo);
                if (!other.point || !side.point.eq(other.point))
                    this.comparator.comparePoint(this.pos, end, side.point, other.point);
                this.pos = end;
                if (end == this.end ||
                    other.pointTo == end && other.point.endSide == side.point.endSide)
                    other.clearPoint();
                side.clearPoint();
                return;
            }
            var next = takeFromHeap(side.heap);
            if (next instanceof LocalSet) {
                // If this is a local set, we're seeing a new range being
                // opened.
                var range = next.ranges[next.index++];
                // The actual positions are offset relative to the node
                var from = range.from + next.offset, to = range.to + next.offset;
                if (from > this.end) {
                    // If we found a range past the end, we're done
                    side.heap.length = 0;
                    return;
                }
                else if (next.index < next.ranges.length) {
                    // If there's more ranges in this node, re-add it to the heap
                    addToHeap(side.heap, next);
                }
                else {
                    // Otherwise, move the iterator forward (making sure this side is advanced)
                    this.forwardIter(side == this.a ? SIDE_A : SIDE_B);
                }
                // Ignore ranges that fall entirely in a point on the other side
                if (to < other.pointTo || to == other.pointTo && range.value.startSide < other.point.endSide)
                    return;
                // Otherwise, if the other side isn't a point, advance
                if (other.pointTo < 0)
                    this.advancePos(from);
                if (range.value.point) {
                    side.point = range.value;
                    side.pointTo = to;
                }
                else {
                    to = Math.min(to, this.end);
                    // Add this to the set of active ranges
                    var found = other.findActive(to, range.value);
                    if (found > -1) {
                        remove(other.active, found);
                        remove(other.activeTo, found);
                    }
                    else {
                        side.active.push(range.value);
                        side.activeTo.push(to);
                        addToHeap(side.heap, new Range(this.pos, to, range.value));
                    }
                }
            }
            else {
                // This is the end of a range, remove it from the active set if it's in there.
                var range = next;
                if (other.pointTo < 0)
                    this.advancePos(range.to);
                var found = side.findActive(range.to, range.value);
                if (found > -1) {
                    remove(side.active, found);
                    remove(side.activeTo, found);
                }
            }
        };
        RangeSetComparison.prototype.advancePos = function (pos) {
            if (pos > this.end)
                pos = this.end;
            if (pos <= this.pos)
                return;
            if (!sameSet(this.a.active, this.b.active))
                this.comparator.compareRange(this.pos, pos, this.a.active, this.b.active);
            this.pos = pos;
        };
        return RangeSetComparison;
    }());
    function sameSet(a, b) {
        if (a.length != b.length)
            return false;
        outer: for (var i = 0; i < a.length; i++) {
            for (var j = 0; j < b.length; j++)
                if (a[i].eq(b[j]))
                    continue outer;
            return false;
        }
        return true;
    }
    function remove(array, index) {
        var last = array.pop();
        if (index != array.length)
            array[index] = last;
    }
    function touchesChanges(from, to, changes) {
        var result = 1 /* No */;
        for (var _i = 0, changes_1 = changes; _i < changes_1.length; _i++) {
            var change = changes_1[_i];
            if (change.to >= from && change.from <= to) {
                if (change.from < from && change.to > to)
                    result = 2 /* Covered */;
                else if (result == 1 /* No */)
                    result = 0 /* Yes */;
            }
            var diff = change.length - (change.to - change.from);
            if (from > change.from)
                from += diff;
            if (to > change.to)
                to += diff;
        }
        return result;
    }
    });

    unwrapExports(rangeset);
    var rangeset_1 = rangeset.RangeValue;
    var rangeset_2 = rangeset.Range;
    var rangeset_3 = rangeset.RangeSet;

    var decoration = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });



    var WidgetType = /** @class */ (function () {
        function WidgetType(value) {
            this.value = value;
        }
        WidgetType.prototype.eq = function (value) { return this.value === value; };
        WidgetType.prototype.updateDOM = function (dom) { return false; };
        /** @internal */
        WidgetType.prototype.compare = function (other) {
            return this == other || this.constructor == other.constructor && this.eq(other.value);
        };
        Object.defineProperty(WidgetType.prototype, "estimatedHeight", {
            get: function () { return -1; },
            enumerable: true,
            configurable: true
        });
        WidgetType.prototype.ignoreEvent = function (event) { return true; };
        Object.defineProperty(WidgetType.prototype, "customView", {
            // @internal
            get: function () { return null; },
            enumerable: true,
            configurable: true
        });
        return WidgetType;
    }());
    exports.WidgetType = WidgetType;
    var INLINE_BIG_SIDE = 1e8, BLOCK_BIG_SIDE = 2e8;
    var Decoration = /** @class */ (function (_super) {
        __extends(Decoration, _super);
        // @internal
        function Decoration(
        // @internal
        startSide, 
        // @internal
        endSide, 
        // @internal
        widget, spec) {
            var _this = _super.call(this) || this;
            _this.startSide = startSide;
            _this.endSide = endSide;
            _this.widget = widget;
            _this.spec = spec;
            return _this;
        }
        Object.defineProperty(Decoration.prototype, "point", {
            get: function () { return false; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Decoration.prototype, "heightRelevant", {
            get: function () { return false; },
            enumerable: true,
            configurable: true
        });
        Decoration.mark = function (from, to, spec) {
            if (from >= to)
                throw new RangeError("Mark decorations may not be empty");
            return new rangeset.Range(from, to, new MarkDecoration(spec));
        };
        Decoration.widget = function (pos, spec) {
            var side = spec.side || 0;
            if (spec.block)
                side += (BLOCK_BIG_SIDE + 1) * (side > 0 ? 1 : -1);
            return new rangeset.Range(pos, pos, new PointDecoration(spec, side, side, !!spec.block, spec.widget));
        };
        Decoration.replace = function (from, to, spec) {
            var block = !!spec.block;
            var _a = getInclusive(spec), start = _a.start, end = _a.end;
            var startSide = block ? -BLOCK_BIG_SIDE * (start ? 2 : 1) : INLINE_BIG_SIDE * (start ? -1 : 1);
            var endSide = block ? BLOCK_BIG_SIDE * (end ? 2 : 1) : INLINE_BIG_SIDE * (end ? 1 : -1);
            if (from > to || (from == to && startSide > 0 && endSide < 0))
                throw new RangeError("Invalid range for replacement decoration");
            return new rangeset.Range(from, Math.max(from, to), new PointDecoration(spec, startSide, endSide, block, spec.widget || null));
        };
        Decoration.line = function (start, spec) {
            return new rangeset.Range(start, start, new LineDecoration(spec));
        };
        Decoration.set = function (of) {
            return rangeset.RangeSet.of(of);
        };
        // @internal
        Decoration.prototype.hasHeight = function () { return this.widget ? this.widget.estimatedHeight > -1 : false; };
        // @internal
        Decoration.prototype.mapSimple = function (mapping, from, to) {
            var newFrom = mapping.mapPos(from, this.startSide, src$1.MapMode.TrackDel);
            if (from == to && this.startSide == this.endSide)
                return newFrom < 0 ? null : new rangeset.Range(newFrom, newFrom, this);
            var newTo = mapping.mapPos(to, this.endSide, src$1.MapMode.TrackDel);
            if (newFrom < 0) {
                if (newTo < 0)
                    return null;
                newFrom = this.startSide >= 0 ? -(newFrom + 1) : mapping.mapPos(from, 1);
            }
            else if (newTo < 0) {
                newTo = this.endSide < 0 ? -(newTo + 1) : mapping.mapPos(to, -1);
            }
            return newFrom < newTo ? new rangeset.Range(newFrom, newTo, this) : null;
        };
        Decoration.none = rangeset.RangeSet.empty;
        return Decoration;
    }(rangeset.RangeValue));
    exports.Decoration = Decoration;
    var MarkDecoration = /** @class */ (function (_super) {
        __extends(MarkDecoration, _super);
        function MarkDecoration(spec) {
            var _this = this;
            var _a = getInclusive(spec), start = _a.start, end = _a.end;
            _this = _super.call(this, INLINE_BIG_SIDE * (start ? -1 : 1), INLINE_BIG_SIDE * (end ? 1 : -1), null, spec) || this;
            return _this;
        }
        MarkDecoration.prototype.map = function (mapping, from, to) {
            return this.mapSimple(mapping, from, to);
        };
        MarkDecoration.prototype.eq = function (other) {
            return this == other ||
                other instanceof MarkDecoration &&
                    this.spec.tagName == other.spec.tagName &&
                    this.spec.class == other.spec.class &&
                    attributes.attrsEq(this.spec.attributes || null, other.spec.attributes || null);
        };
        return MarkDecoration;
    }(Decoration));
    exports.MarkDecoration = MarkDecoration;
    var LineDecoration = /** @class */ (function (_super) {
        __extends(LineDecoration, _super);
        function LineDecoration(spec) {
            return _super.call(this, -INLINE_BIG_SIDE, -INLINE_BIG_SIDE, null, spec) || this;
        }
        Object.defineProperty(LineDecoration.prototype, "point", {
            get: function () { return true; },
            enumerable: true,
            configurable: true
        });
        LineDecoration.prototype.map = function (mapping, pos) {
            pos = mapping.mapPos(pos, -1, src$1.MapMode.TrackBefore);
            return pos < 0 ? null : new rangeset.Range(pos, pos, this);
        };
        LineDecoration.prototype.eq = function (other) {
            return other instanceof LineDecoration && attributes.attrsEq(this.spec.attributes, other.spec.attributes);
        };
        return LineDecoration;
    }(Decoration));
    exports.LineDecoration = LineDecoration;
    var PointDecoration = /** @class */ (function (_super) {
        __extends(PointDecoration, _super);
        function PointDecoration(spec, startSide, endSide, block, widget) {
            var _this = _super.call(this, startSide, endSide, widget, spec) || this;
            _this.block = block;
            return _this;
        }
        Object.defineProperty(PointDecoration.prototype, "point", {
            get: function () { return true; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PointDecoration.prototype, "type", {
            // Only relevant when this.block == true
            get: function () {
                return this.startSide < this.endSide ? 3 /* WidgetRange */ : this.startSide < 0 ? 1 /* WidgetBefore */ : 2 /* WidgetAfter */;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(PointDecoration.prototype, "heightRelevant", {
            get: function () { return this.block || !!this.widget && this.widget.estimatedHeight >= 5; },
            enumerable: true,
            configurable: true
        });
        PointDecoration.prototype.map = function (mapping, from, to) {
            // FIXME make mapping behavior configurable?
            if (this.block) {
                var type = this.type;
                var newFrom = type == 2 /* WidgetAfter */ ? mapping.mapPos(from, 1, src$1.MapMode.TrackAfter) : mapping.mapPos(from, -1, src$1.MapMode.TrackBefore);
                var newTo = type == 3 /* WidgetRange */ ? mapping.mapPos(to, 1, src$1.MapMode.TrackAfter) : newFrom;
                return newFrom < 0 || newTo < 0 ? null : new rangeset.Range(newFrom, newTo, this);
            }
            else {
                return this.mapSimple(mapping, from, to);
            }
        };
        PointDecoration.prototype.eq = function (other) {
            return other instanceof PointDecoration &&
                widgetsEq(this.widget, other.widget) &&
                this.block == other.block &&
                this.startSide == other.startSide && this.endSide == other.endSide;
        };
        return PointDecoration;
    }(Decoration));
    exports.PointDecoration = PointDecoration;
    function getInclusive(spec) {
        var start = spec.inclusiveStart, end = spec.inclusiveEnd;
        if (start == null)
            start = spec.inclusive;
        if (end == null)
            end = spec.inclusive;
        return { start: start || false, end: end || false };
    }
    function widgetsEq(a, b) {
        return a == b || !!(a && b && a.compare(b));
    }
    var MIN_RANGE_GAP = 4;
    function addRange(from, to, ranges) {
        if (ranges[ranges.length - 1] + MIN_RANGE_GAP > from)
            ranges[ranges.length - 1] = to;
        else
            ranges.push(from, to);
    }
    function joinRanges(a, b) {
        if (a.length == 0)
            return b;
        if (b.length == 0)
            return a;
        var result = [];
        for (var iA = 0, iB = 0;;) {
            if (iA < a.length && (iB == b.length || a[iA] < b[iB]))
                addRange(a[iA++], a[iA++], result);
            else if (iB < b.length)
                addRange(b[iB++], b[iB++], result);
            else
                break;
        }
        return result;
    }
    exports.joinRanges = joinRanges;
    var Changes = /** @class */ (function () {
        function Changes() {
            this.content = [];
            this.height = [];
        }
        return Changes;
    }());
    var DecorationComparator = /** @class */ (function () {
        function DecorationComparator() {
            this.changes = new Changes;
        }
        DecorationComparator.prototype.compareRange = function (from, to, activeA, activeB) {
            addRange(from, to, this.changes.content);
        };
        DecorationComparator.prototype.comparePoint = function (from, to, byA, byB) {
            addRange(from, to, this.changes.content);
            if (from > to || byA.heightRelevant || byB && byB.heightRelevant)
                addRange(from, to, this.changes.height);
        };
        return DecorationComparator;
    }());
    function findChangedRanges(a, b, diff, lengthA) {
        var comp = new DecorationComparator();
        a.compare(b, diff, comp, lengthA);
        return comp.changes;
    }
    exports.findChangedRanges = findChangedRanges;
    var HeightDecoScanner = /** @class */ (function () {
        function HeightDecoScanner() {
            this.ranges = [];
        }
        HeightDecoScanner.prototype.span = function () { };
        HeightDecoScanner.prototype.point = function (from, to, value) { addRange(from, to, this.ranges); };
        HeightDecoScanner.prototype.ignore = function (from, to, value) { return from == to && !value.heightRelevant; };
        return HeightDecoScanner;
    }());
    function heightRelevantDecorations(decorations, ranges) {
        var scanner = new HeightDecoScanner;
        for (var _i = 0, ranges_1 = ranges; _i < ranges_1.length; _i++) {
            var _a = ranges_1[_i], fromB = _a.fromB, toB = _a.toB;
            rangeset.RangeSet.iterateSpans(decorations, fromB, toB, scanner);
        }
        return scanner.ranges;
    }
    exports.heightRelevantDecorations = heightRelevantDecorations;
    });

    unwrapExports(decoration);
    var decoration_1 = decoration.WidgetType;
    var decoration_2 = decoration.Decoration;
    var decoration_3 = decoration.MarkDecoration;
    var decoration_4 = decoration.LineDecoration;
    var decoration_5 = decoration.PointDecoration;
    var decoration_6 = decoration.joinRanges;
    var decoration_7 = decoration.findChangedRanges;
    var decoration_8 = decoration.heightRelevantDecorations;

    var buildview = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });




    var ContentBuilder = /** @class */ (function () {
        function ContentBuilder(doc, pos, end) {
            this.doc = doc;
            this.pos = pos;
            this.end = end;
            this.content = [];
            this.curLine = null;
            this.breakAtStart = 0;
            this.text = "";
            this.textOff = 0;
            this.cursor = doc.iter();
            this.skip = pos;
        }
        ContentBuilder.prototype.posCovered = function () {
            if (this.content.length == 0)
                return !this.breakAtStart && this.doc.lineAt(this.pos).start != this.pos;
            var last = this.content[this.content.length - 1];
            return !last.breakAfter && !(last instanceof blockview.BlockWidgetView && last.type == 1 /* WidgetBefore */);
        };
        ContentBuilder.prototype.getLine = function () {
            if (!this.curLine)
                this.content.push(this.curLine = new blockview.LineView);
            return this.curLine;
        };
        ContentBuilder.prototype.addWidget = function (view) {
            this.curLine = null;
            this.content.push(view);
        };
        ContentBuilder.prototype.finish = function () {
            if (!this.posCovered())
                this.getLine();
        };
        ContentBuilder.prototype.buildText = function (length, tagName, clss, attrs, ranges) {
            while (length > 0) {
                if (this.textOff == this.text.length) {
                    var _a = this.cursor.next(this.skip), value = _a.value, lineBreak = _a.lineBreak, done = _a.done;
                    this.skip = 0;
                    if (done)
                        throw new Error("Ran out of text content when drawing inline views");
                    if (lineBreak) {
                        if (!this.posCovered())
                            this.getLine();
                        if (this.content.length)
                            this.content[this.content.length - 1].breakAfter = 1;
                        else
                            this.breakAtStart = 1;
                        this.curLine = null;
                        length--;
                        continue;
                    }
                    else {
                        this.text = value;
                        this.textOff = 0;
                    }
                }
                var take = Math.min(this.text.length - this.textOff, length);
                this.getLine().append(new inlineview.TextView(this.text.slice(this.textOff, this.textOff + take), tagName, clss, attrs));
                length -= take;
                this.textOff += take;
            }
        };
        ContentBuilder.prototype.span = function (from, to, active) {
            var tagName = null, clss = null;
            var attrs = null;
            for (var _i = 0, _a = active; _i < _a.length; _i++) {
                var spec = _a[_i].spec;
                if (spec.tagName)
                    tagName = spec.tagName;
                if (spec.class)
                    clss = clss ? clss + " " + spec.class : spec.class;
                if (spec.attributes)
                    for (var name_1 in spec.attributes) {
                        var value = spec.attributes[name_1];
                        if (value == null)
                            continue;
                        if (name_1 == "class") {
                            clss = clss ? clss + " " + value : value;
                        }
                        else {
                            if (!attrs)
                                attrs = {};
                            if (name_1 == "style" && attrs.style)
                                value = attrs.style + ";" + value;
                            attrs[name_1] = value;
                        }
                    }
            }
            this.buildText(to - from, tagName, clss, attrs, active);
            this.pos = to;
        };
        ContentBuilder.prototype.point = function (from, to, deco, openStart, openEnd) {
            var open = (openStart ? 1 /* Start */ : 0) | (openEnd ? 2 /* End */ : 0);
            var len = to - from;
            if (deco instanceof decoration.PointDecoration) {
                if (deco.block) {
                    var type = deco.type;
                    if (type == 2 /* WidgetAfter */ && !this.posCovered())
                        this.getLine();
                    this.addWidget(new blockview.BlockWidgetView(deco.widget || new NullWidget("div"), len, type, open));
                }
                else {
                    this.getLine().append(inlineview.WidgetView.create(deco.widget || new NullWidget("span"), len, deco.startSide, open));
                }
            }
            else if (this.doc.lineAt(this.pos).start == this.pos) { // Line decoration
                this.getLine().addLineDeco(deco);
            }
            if (len) {
                // Advance the iterator past the replaced content
                if (this.textOff + len <= this.text.length) {
                    this.textOff += len;
                }
                else {
                    this.skip += len - (this.text.length - this.textOff);
                    this.text = "";
                    this.textOff = 0;
                }
                this.pos = to;
            }
        };
        ContentBuilder.prototype.ignore = function () { return false; };
        ContentBuilder.build = function (text, from, to, decorations) {
            var builder = new ContentBuilder(text, from, to);
            rangeset.RangeSet.iterateSpans(decorations, from, to, builder);
            builder.finish();
            return builder;
        };
        return ContentBuilder;
    }());
    exports.ContentBuilder = ContentBuilder;
    var NullWidget = /** @class */ (function (_super) {
        __extends(NullWidget, _super);
        function NullWidget() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        NullWidget.prototype.toDOM = function () { return document.createElement(this.value); };
        NullWidget.prototype.updateDOM = function (elt) { return elt.nodeName.toLowerCase() == this.value; };
        return NullWidget;
    }(decoration.WidgetType));
    });

    unwrapExports(buildview);
    var buildview_1 = buildview.ContentBuilder;

    var viewport = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    function visiblePixelRange(dom, paddingTop) {
        var rect = dom.getBoundingClientRect();
        var top = Math.max(0, Math.min(innerHeight, rect.top)), bottom = Math.max(0, Math.min(innerHeight, rect.bottom));
        for (var parent_1 = dom.parentNode; parent_1;) { // (Cast to any because TypeScript is useless with Node types)
            if (parent_1.nodeType == 1) {
                if (parent_1.scrollHeight > parent_1.clientHeight) {
                    var parentRect = parent_1.getBoundingClientRect();
                    top = Math.min(parentRect.bottom, Math.max(parentRect.top, top));
                    bottom = Math.min(parentRect.bottom, Math.max(parentRect.top, bottom));
                }
                parent_1 = parent_1.parentNode;
            }
            else if (parent_1.nodeType == 11) { // Shadow root
                parent_1 = parent_1.host;
            }
            else {
                break;
            }
        }
        return { top: top - (rect.top + paddingTop), bottom: bottom - (rect.top + paddingTop) };
    }
    var VIEWPORT_MARGIN = 1000; // FIXME look into appropriate value of this through benchmarking etc
    var MIN_COVER_MARGIN = 10; // coveredBy requires at least this many extra pixels to be covered
    var MAX_COVER_MARGIN = VIEWPORT_MARGIN / 4;
    var ViewportState = /** @class */ (function () {
        function ViewportState() {
            // These are contentDOM-local coordinates
            this.top = 0;
            this.bottom = 0;
        }
        ViewportState.prototype.updateFromDOM = function (dom, paddingTop) {
            var _a = visiblePixelRange(dom, paddingTop), top = _a.top, bottom = _a.bottom;
            var dTop = top - this.top, dBottom = bottom - this.bottom, bias = 0;
            if (dTop > 0 && dBottom > 0)
                bias = Math.max(dTop, dBottom);
            else if (dTop < 0 && dBottom < 0)
                bias = Math.min(dTop, dBottom);
            this.top = top;
            this.bottom = bottom;
            return bias;
        };
        ViewportState.prototype.coverEverything = function () {
            this.top = -1e9;
            this.bottom = 1e9;
        };
        ViewportState.prototype.getViewport = function (doc, heightMap, bias, scrollTo) {
            // This will divide VIEWPORT_MARGIN between the top and the
            // bottom, depending on the bias (the change in viewport position
            // since the last update). It'll hold a number between 0 and 1
            var marginTop = 0.5 - Math.max(-0.5, Math.min(0.5, bias / VIEWPORT_MARGIN / 2));
            var viewport = new Viewport(heightMap.lineAt(this.top - marginTop * VIEWPORT_MARGIN, 1 /* ByHeight */, doc, 0, 0).from, heightMap.lineAt(this.bottom + (1 - marginTop) * VIEWPORT_MARGIN, 1 /* ByHeight */, doc, 0, 0).to);
            // If scrollTo is > -1, make sure the viewport includes that position
            if (scrollTo > -1) {
                if (scrollTo < viewport.from) {
                    var top_1 = heightMap.lineAt(scrollTo, 0 /* ByPos */, doc, 0, 0).top;
                    viewport = new Viewport(heightMap.lineAt(top_1 - VIEWPORT_MARGIN / 2, 1 /* ByHeight */, doc, 0, 0).from, heightMap.lineAt(top_1 + (this.bottom - this.top) + VIEWPORT_MARGIN / 2, 1 /* ByHeight */, doc, 0, 0).to);
                }
                else if (scrollTo > viewport.to) {
                    var bottom = heightMap.lineAt(scrollTo, 0 /* ByPos */, doc, 0, 0).bottom;
                    viewport = new Viewport(heightMap.lineAt(bottom - (this.bottom - this.top) - VIEWPORT_MARGIN / 2, 1 /* ByHeight */, doc, 0, 0).from, heightMap.lineAt(bottom + VIEWPORT_MARGIN / 2, 1 /* ByHeight */, doc, 0, 0).to);
                }
            }
            return viewport;
        };
        ViewportState.prototype.coveredBy = function (doc, viewport, heightMap, bias) {
            if (bias === void 0) { bias = 0; }
            var top = heightMap.lineAt(viewport.from, 0 /* ByPos */, doc, 0, 0).top;
            var bottom = heightMap.lineAt(viewport.to, 0 /* ByPos */, doc, 0, 0).bottom;
            return (viewport.from == 0 || top <= this.top - Math.max(MIN_COVER_MARGIN, Math.min(-bias, MAX_COVER_MARGIN))) &&
                (viewport.to == doc.length || bottom >= this.bottom + Math.max(MIN_COVER_MARGIN, Math.min(bias, MAX_COVER_MARGIN)));
        };
        return ViewportState;
    }());
    exports.ViewportState = ViewportState;
    var Viewport = /** @class */ (function () {
        function Viewport(from, to) {
            this.from = from;
            this.to = to;
        }
        Viewport.prototype.clip = function (pos) { return Math.max(this.from, Math.min(this.to, pos)); };
        Viewport.prototype.eq = function (b) { return this.from == b.from && this.to == b.to; };
        return Viewport;
    }());
    exports.Viewport = Viewport;
    });

    unwrapExports(viewport);
    var viewport_1 = viewport.ViewportState;
    var viewport_2 = viewport.Viewport;

    var domobserver = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });


    var observeOptions = {
        childList: true,
        characterData: true,
        subtree: true,
        characterDataOldValue: true
    };
    // IE11 has very broken mutation observers, so we also listen to
    // DOMCharacterDataModified there
    var useCharData = browser$1.default.ie && browser$1.default.ie_version <= 11;
    var DOMObserver = /** @class */ (function () {
        function DOMObserver(docView, onChange, onScrollChanged) {
            var _this = this;
            this.docView = docView;
            this.onChange = onChange;
            this.onScrollChanged = onScrollChanged;
            this.active = false;
            this.ignoreSelection = new dom.DOMSelection;
            this.charDataQueue = [];
            this.charDataTimeout = null;
            this.scrollTargets = [];
            this.intersection = null;
            this.intersecting = false;
            this.dom = docView.dom;
            this.observer = new MutationObserver(function (mutations) { return _this.flush(mutations); });
            if (useCharData)
                this.onCharData = function (event) {
                    _this.charDataQueue.push({ target: event.target,
                        type: "characterData",
                        oldValue: event.prevValue });
                    if (_this.charDataTimeout == null)
                        _this.charDataTimeout = setTimeout(function () { return _this.flush(); }, 20);
                };
            this.onSelectionChange = function () {
                if (_this.docView.root.activeElement == _this.dom)
                    _this.flush();
            };
            this.start();
            this.onScroll = this.onScroll.bind(this);
            window.addEventListener("scroll", this.onScroll);
            if (typeof IntersectionObserver == "function") {
                this.intersection = new IntersectionObserver(function (entries) {
                    if (entries[entries.length - 1].intersectionRatio > 0 != _this.intersecting) {
                        _this.intersecting = !_this.intersecting;
                        _this.onScroll();
                    }
                }, {});
                this.intersection.observe(this.dom);
            }
            this.listenForScroll();
        }
        DOMObserver.prototype.onScroll = function () {
            if (this.intersecting) {
                this.flush();
                this.onScrollChanged();
            }
        };
        DOMObserver.prototype.listenForScroll = function () {
            var i = 0, changed = null;
            for (var dom = this.dom; dom;) {
                if (dom.nodeType == 1) {
                    if (!changed && i < this.scrollTargets.length && this.scrollTargets[i] == dom)
                        i++;
                    else if (!changed)
                        changed = this.scrollTargets.slice(0, i);
                    if (changed)
                        changed.push(dom);
                    dom = dom.parentNode;
                }
                else if (dom.nodeType == 11) { // Shadow root
                    dom = dom.host;
                }
                else {
                    break;
                }
            }
            if (i < this.scrollTargets.length && !changed)
                changed = this.scrollTargets.slice(0, i);
            if (changed) {
                for (var _i = 0, _a = this.scrollTargets; _i < _a.length; _i++) {
                    var dom = _a[_i];
                    dom.removeEventListener("scroll", this.onScroll);
                }
                for (var _b = 0, _c = this.scrollTargets = changed; _b < _c.length; _b++) {
                    var dom = _c[_b];
                    dom.addEventListener("scroll", this.onScroll);
                }
            }
        };
        DOMObserver.prototype.ignore = function (f) {
            if (!this.active)
                return f();
            try {
                this.stop();
                return f();
            }
            finally {
                this.start();
                this.clear();
            }
        };
        DOMObserver.prototype.start = function () {
            if (this.active)
                return;
            this.observer.observe(this.dom, observeOptions);
            // FIXME is this shadow-root safe?
            this.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
            if (useCharData)
                this.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
            this.active = true;
        };
        DOMObserver.prototype.stop = function () {
            if (!this.active)
                return;
            this.active = false;
            this.observer.disconnect();
            this.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
            if (useCharData)
                this.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
        };
        DOMObserver.prototype.takeCharRecords = function () {
            var result = this.charDataQueue;
            if (result.length) {
                this.charDataQueue = [];
                clearTimeout(this.charDataTimeout);
                this.charDataTimeout = null;
            }
            return result;
        };
        DOMObserver.prototype.clearSelection = function () {
            this.ignoreSelection.set(this.docView.root.getSelection());
        };
        // Throw away any pending changes
        DOMObserver.prototype.clear = function () {
            this.observer.takeRecords();
            this.takeCharRecords();
            this.clearSelection();
        };
        // Apply pending changes, if any
        DOMObserver.prototype.flush = function (records) {
            var _this = this;
            if (records === void 0) { records = this.observer.takeRecords(); }
            if (this.charDataQueue.length)
                records = records.concat(this.takeCharRecords());
            var selection = this.docView.root.getSelection();
            var newSel = !this.ignoreSelection.eq(selection) && dom.hasSelection(this.dom, selection);
            if (records.length == 0 && !newSel)
                return;
            var from = -1, to = -1, typeOver = false;
            for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
                var record = records_1[_i];
                var range = this.readMutation(record);
                if (!range)
                    continue;
                if (range.typeOver)
                    typeOver = true;
                if (from == -1) {
                    (from = range.from, to = range.to);
                }
                else {
                    from = Math.min(range.from, from);
                    to = Math.max(range.to, to);
                }
            }
            var apply = from > -1 || newSel;
            if (!apply || !this.onChange(from, to, typeOver)) {
                if (this.docView.dirty)
                    this.ignore(function () { return _this.docView.sync(); });
                this.docView.updateSelection();
            }
            this.clearSelection();
        };
        DOMObserver.prototype.readMutation = function (rec) {
            var cView = this.docView.nearest(rec.target);
            if (!cView || cView.ignoreMutation(rec))
                return null;
            cView.markDirty();
            if (rec.type == "childList") {
                var childBefore = findChild(cView, rec.previousSibling || rec.target.previousSibling, -1);
                var childAfter = findChild(cView, rec.nextSibling || rec.target.nextSibling, 1);
                return { from: childBefore ? cView.posAfter(childBefore) : cView.posAtStart,
                    to: childAfter ? cView.posBefore(childAfter) : cView.posAtEnd, typeOver: false };
            }
            else { // "characterData"
                return { from: cView.posAtStart, to: cView.posAtEnd, typeOver: rec.target.nodeValue == rec.oldValue };
            }
        };
        DOMObserver.prototype.destroy = function () {
            this.stop();
            if (this.intersection)
                this.intersection.disconnect();
            for (var _i = 0, _a = this.scrollTargets; _i < _a.length; _i++) {
                var dom = _a[_i];
                dom.removeEventListener("scroll", this.onScroll);
            }
            window.removeEventListener("scroll", this.onScroll);
        };
        return DOMObserver;
    }());
    exports.DOMObserver = DOMObserver;
    function findChild(cView, dom, dir) {
        while (dom) {
            var curView = dom.cmView;
            if (curView && curView.parent == cView)
                return curView;
            var parent_1 = dom.parentNode;
            dom = parent_1 != cView.dom ? parent_1 : dir > 0 ? dom.nextSibling : dom.previousSibling;
        }
        return null;
    }
    });

    unwrapExports(domobserver);
    var domobserver_1 = domobserver.DOMObserver;

    var heightmap = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });


    var wrappingWhiteSpace = ["pre-wrap", "normal", "pre-line"];
    var HeightOracle = /** @class */ (function () {
        function HeightOracle() {
            this.doc = src.Text.empty;
            this.lineWrapping = false;
            this.heightSamples = {};
            this.lineHeight = 14;
            this.charWidth = 7;
            this.lineLength = 30;
            // Used to track, during updateHeight, if any actual heights changed
            this.heightChanged = false;
        }
        HeightOracle.prototype.heightForGap = function (from, to) {
            var lines = this.doc.lineAt(to).number - this.doc.lineAt(from).number + 1;
            if (this.lineWrapping)
                lines += Math.ceil(((to - from) - (lines * this.lineLength * 0.5)) / this.lineLength);
            return this.lineHeight * lines;
        };
        HeightOracle.prototype.heightForLine = function (length) {
            if (!this.lineWrapping)
                return this.lineHeight;
            var lines = 1 + Math.max(0, Math.ceil((length - this.lineLength) / (this.lineLength - 5)));
            return lines * this.lineHeight;
        };
        HeightOracle.prototype.setDoc = function (doc) { this.doc = doc; return this; };
        HeightOracle.prototype.mustRefresh = function (lineHeights) {
            var newHeight = false;
            for (var i = 0; i < lineHeights.length; i++) {
                var h = lineHeights[i];
                if (h < 0) {
                    i++;
                }
                else if (!this.heightSamples[Math.floor(h * 10)]) { // Round to .1 pixels
                    newHeight = true;
                    this.heightSamples[Math.floor(h * 10)] = true;
                }
            }
            return newHeight;
        };
        HeightOracle.prototype.refresh = function (whiteSpace, lineHeight, charWidth, lineLength, knownHeights) {
            var lineWrapping = wrappingWhiteSpace.indexOf(whiteSpace) > -1;
            var changed = Math.round(lineHeight) != Math.round(this.lineHeight) || this.lineWrapping != lineWrapping;
            this.lineWrapping = lineWrapping;
            this.lineHeight = lineHeight;
            this.charWidth = charWidth;
            this.lineLength = lineLength;
            if (changed) {
                this.heightSamples = {};
                for (var i = 0; i < knownHeights.length; i++) {
                    var h = knownHeights[i];
                    if (h < 0)
                        i++;
                    else
                        this.heightSamples[Math.floor(h * 10)] = true;
                }
            }
            return changed;
        };
        return HeightOracle;
    }());
    exports.HeightOracle = HeightOracle;
    // This object is used by `updateHeight` to make DOM measurements
    // arrive at the right nides. The `heights` array is a sequence of
    // block heights, starting from position `from`.
    var MeasuredHeights = /** @class */ (function () {
        function MeasuredHeights(from, heights) {
            this.from = from;
            this.heights = heights;
            this.index = 0;
        }
        Object.defineProperty(MeasuredHeights.prototype, "more", {
            get: function () { return this.index < this.heights.length; },
            enumerable: true,
            configurable: true
        });
        return MeasuredHeights;
    }());
    exports.MeasuredHeights = MeasuredHeights;
    var BlockInfo = /** @class */ (function () {
        function BlockInfo(from, length, top, height, type) {
            this.from = from;
            this.length = length;
            this.top = top;
            this.height = height;
            this.type = type;
        }
        Object.defineProperty(BlockInfo.prototype, "to", {
            get: function () { return this.from + this.length; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(BlockInfo.prototype, "bottom", {
            get: function () { return this.top + this.height; },
            enumerable: true,
            configurable: true
        });
        // @internal
        BlockInfo.prototype.join = function (other) {
            var detail = (Array.isArray(this.type) ? this.type : [this])
                .concat(Array.isArray(other.type) ? other.type : [other]);
            return new BlockInfo(this.from, this.length + other.length, this.top, this.height + other.height, detail);
        };
        return BlockInfo;
    }());
    exports.BlockInfo = BlockInfo;
    var HeightMap = /** @class */ (function () {
        function HeightMap(length, // The number of characters covered
        height, // Height of this part of the document
        flags) {
            if (flags === void 0) { flags = 2 /* Outdated */; }
            this.length = length;
            this.height = height;
            this.flags = flags;
        }
        Object.defineProperty(HeightMap.prototype, "outdated", {
            get: function () { return (this.flags & 2 /* Outdated */) > 0; },
            set: function (value) { this.flags = (value ? 2 /* Outdated */ : 0) | (this.flags & ~2 /* Outdated */); },
            enumerable: true,
            configurable: true
        });
        HeightMap.prototype.setHeight = function (oracle, height) {
            if (this.height != height) {
                this.height = height;
                oracle.heightChanged = true;
            }
        };
        // Base case is to replace a leaf node, which simply builds a tree
        // from the new nodes and returns that (HeightMapBranch and
        // HeightMapGap override this to actually use from/to)
        HeightMap.prototype.replace = function (from, to, nodes) {
            return HeightMap.of(nodes);
        };
        // Again, these are base cases, and are overridden for branch and gap nodes.
        HeightMap.prototype.decomposeLeft = function (to, result) { result.push(this); };
        HeightMap.prototype.decomposeRight = function (from, result) { result.push(this); };
        HeightMap.prototype.applyChanges = function (decorations, oldDoc, oracle, changes) {
            var me = this;
            for (var i = changes.length - 1; i >= 0; i--) {
                var _a = changes[i], fromA = _a.fromA, toA = _a.toA, fromB = _a.fromB, toB = _a.toB;
                var start = me.lineAt(fromA, 2 /* ByPosNoHeight */, oldDoc, 0, 0);
                var end = start.to >= toA ? start : me.lineAt(toA, 2 /* ByPosNoHeight */, oldDoc, 0, 0);
                toB += end.to - toA;
                toA = end.to;
                while (i > 0 && start.from <= changes[i - 1].toA) {
                    fromA = changes[i - 1].fromA;
                    fromB = changes[i - 1].fromB;
                    i--;
                    if (fromA < start.from)
                        start = me.lineAt(fromA, 2 /* ByPosNoHeight */, oldDoc, 0, 0);
                }
                fromB += start.from - fromA;
                fromA = start.from;
                var nodes = NodeBuilder.build(oracle, decorations, fromB, toB);
                me = me.replace(fromA, toA, nodes);
            }
            return me.updateHeight(oracle, 0);
        };
        HeightMap.empty = function () { return new HeightMapText(0, 0); };
        // nodes uses null values to indicate the position of line breaks.
        // There are never line breaks at the start or end of the array, or
        // two line breaks next to each other, and the array isn't allowed
        // to be empty (same restrictions as return value from the builder).
        HeightMap.of = function (nodes) {
            if (nodes.length == 1)
                return nodes[0];
            var i = 0, j = nodes.length, before = 0, after = 0;
            for (;;) {
                if (i == j) {
                    if (before > after * 2) {
                        var split = nodes[i - 1];
                        if (split.break)
                            nodes.splice(--i, 1, split.left, null, split.right);
                        else
                            nodes.splice(--i, 1, split.left, split.right);
                        j += 1 + split.break;
                        before -= split.size;
                    }
                    else if (after > before * 2) {
                        var split = nodes[j];
                        if (split.break)
                            nodes.splice(j, 1, split.left, null, split.right);
                        else
                            nodes.splice(j, 1, split.left, split.right);
                        j += 2 + split.break;
                        after -= split.size;
                    }
                    else {
                        break;
                    }
                }
                else if (before < after) {
                    var next = nodes[i++];
                    if (next)
                        before += next.size;
                }
                else {
                    var next = nodes[--j];
                    if (next)
                        after += next.size;
                }
            }
            var brk = 0;
            if (nodes[i - 1] == null) {
                brk = 1;
                i--;
            }
            else if (nodes[i] == null) {
                brk = 1;
                j++;
            }
            return new HeightMapBranch(HeightMap.of(nodes.slice(0, i)), brk, HeightMap.of(nodes.slice(j)));
        };
        return HeightMap;
    }());
    exports.HeightMap = HeightMap;
    HeightMap.prototype.size = 1;
    var HeightMapBlock = /** @class */ (function (_super) {
        __extends(HeightMapBlock, _super);
        function HeightMapBlock(length, height, type) {
            var _this = _super.call(this, length, height) || this;
            _this.type = type;
            return _this;
        }
        HeightMapBlock.prototype.blockAt = function (height, doc, top, offset) {
            return new BlockInfo(offset, this.length, top, this.height, this.type);
        };
        HeightMapBlock.prototype.lineAt = function (value, type, doc, top, offset) {
            return this.blockAt(0, doc, top, offset);
        };
        HeightMapBlock.prototype.forEachLine = function (from, to, doc, top, offset, f) {
            f(this.blockAt(0, doc, top, offset));
        };
        HeightMapBlock.prototype.updateHeight = function (oracle, offset, force, measured) {
            if (offset === void 0) { offset = 0; }
            if (force === void 0) { force = false; }
            if (measured && measured.from <= offset && measured.more)
                this.setHeight(oracle, measured.heights[measured.index++]);
            this.outdated = false;
            return this;
        };
        HeightMapBlock.prototype.toString = function () { return "block(" + this.length + ")"; };
        return HeightMapBlock;
    }(HeightMap));
    var HeightMapText = /** @class */ (function (_super) {
        __extends(HeightMapText, _super);
        function HeightMapText(length, height) {
            var _this = _super.call(this, length, height, 0 /* Text */) || this;
            _this.collapsed = 0; // Amount of collapsed content in the line
            _this.widgetHeight = 0; // Maximum inline widget height
            return _this;
        }
        HeightMapText.prototype.replace = function (from, to, nodes) {
            if (nodes.length == 1 && nodes[0] instanceof HeightMapText && Math.abs(this.length - nodes[0].length) < 10) {
                nodes[0].height = this.height;
                return nodes[0];
            }
            else {
                return HeightMap.of(nodes);
            }
        };
        HeightMapText.prototype.updateHeight = function (oracle, offset, force, measured) {
            if (offset === void 0) { offset = 0; }
            if (force === void 0) { force = false; }
            if (measured && measured.from <= offset && measured.more)
                this.setHeight(oracle, measured.heights[measured.index++]);
            else if (force || this.outdated)
                this.setHeight(oracle, Math.max(this.widgetHeight, oracle.heightForLine(this.length - this.collapsed)));
            this.outdated = false;
            return this;
        };
        HeightMapText.prototype.toString = function () {
            return "line(" + this.length + (this.collapsed ? -this.collapsed : "") + (this.widgetHeight ? ":" + this.widgetHeight : "") + ")";
        };
        return HeightMapText;
    }(HeightMapBlock));
    var HeightMapGap = /** @class */ (function (_super) {
        __extends(HeightMapGap, _super);
        function HeightMapGap(length) {
            return _super.call(this, length, 0) || this;
        }
        HeightMapGap.prototype.lines = function (doc, offset) {
            var firstLine = doc.lineAt(offset).number, lastLine = doc.lineAt(offset + this.length).number;
            return { firstLine: firstLine, lastLine: lastLine, lineHeight: this.height / (lastLine - firstLine + 1) };
        };
        HeightMapGap.prototype.blockAt = function (height, doc, top, offset) {
            var _a = this.lines(doc, offset), firstLine = _a.firstLine, lastLine = _a.lastLine, lineHeight = _a.lineHeight;
            var line = Math.max(0, Math.min(lastLine - firstLine, Math.floor((height - top) / lineHeight)));
            var _b = doc.line(firstLine + line), start = _b.start, length = _b.length;
            return new BlockInfo(start, length, top + lineHeight * line, lineHeight, 0 /* Text */);
        };
        HeightMapGap.prototype.lineAt = function (value, type, doc, top, offset) {
            if (type == 1 /* ByHeight */)
                return this.blockAt(value, doc, top, offset);
            if (type == 2 /* ByPosNoHeight */) {
                var _a = doc.lineAt(value), start_1 = _a.start, end = _a.end;
                return new BlockInfo(start_1, end - start_1, 0, 0, 0 /* Text */);
            }
            var _b = this.lines(doc, offset), firstLine = _b.firstLine, lineHeight = _b.lineHeight;
            var _c = doc.lineAt(value), start = _c.start, length = _c.length, number = _c.number;
            return new BlockInfo(start, length, top + lineHeight * (number - firstLine), lineHeight, 0 /* Text */);
        };
        HeightMapGap.prototype.forEachLine = function (from, to, doc, top, offset, f) {
            var _a = this.lines(doc, offset), firstLine = _a.firstLine, lastLine = _a.lastLine, lineHeight = _a.lineHeight;
            for (var line = firstLine; line <= lastLine; line++) {
                var _b = doc.line(line), start = _b.start, end = _b.end;
                if (start > to)
                    break;
                if (end >= from)
                    f(new BlockInfo(start, end - start, top, top += lineHeight, 0 /* Text */));
            }
        };
        HeightMapGap.prototype.replace = function (from, to, nodes) {
            var after = this.length - to;
            if (after > 0) {
                var last = nodes[nodes.length - 1];
                if (last instanceof HeightMapGap)
                    nodes[nodes.length - 1] = new HeightMapGap(last.length + after);
                else
                    nodes.push(null, new HeightMapGap(after - 1));
            }
            if (from > 0) {
                var first = nodes[0];
                if (first instanceof HeightMapGap)
                    nodes[0] = new HeightMapGap(from + first.length);
                else
                    nodes.unshift(new HeightMapGap(from - 1), null);
            }
            return HeightMap.of(nodes);
        };
        HeightMapGap.prototype.decomposeLeft = function (to, result) {
            result.push(to == this.length ? this : new HeightMapGap(to));
        };
        HeightMapGap.prototype.decomposeRight = function (from, result) {
            result.push(from == 0 ? this : new HeightMapGap(this.length - from));
        };
        HeightMapGap.prototype.updateHeight = function (oracle, offset, force, measured) {
            if (offset === void 0) { offset = 0; }
            if (force === void 0) { force = false; }
            var end = offset + this.length;
            if (measured && measured.from <= offset + this.length && measured.more) {
                // Fill in part of this gap with measured lines. We know there
                // can't be widgets or collapsed ranges in those lines, because
                // they would already have been added to the heightmap (gaps
                // only contain plain text).
                var nodes = [], pos = Math.max(offset, measured.from);
                if (measured.from > offset)
                    nodes.push(new HeightMapGap(measured.from - offset - 1).updateHeight(oracle, offset));
                while (pos <= end && measured.more) {
                    var len = oracle.doc.lineAt(pos).length;
                    if (nodes.length)
                        nodes.push(null);
                    var line = new HeightMapText(len, measured.heights[measured.index++]);
                    line.outdated = false;
                    nodes.push(line);
                    pos += len + 1;
                }
                if (pos <= end)
                    nodes.push(null, new HeightMapGap(end - pos).updateHeight(oracle, pos));
                oracle.heightChanged = true;
                return HeightMap.of(nodes);
            }
            else if (force || this.outdated) {
                this.setHeight(oracle, oracle.heightForGap(offset, offset + this.length));
                this.outdated = false;
            }
            return this;
        };
        HeightMapGap.prototype.toString = function () { return "gap(" + this.length + ")"; };
        return HeightMapGap;
    }(HeightMap));
    var HeightMapBranch = /** @class */ (function (_super) {
        __extends(HeightMapBranch, _super);
        function HeightMapBranch(left, brk, right) {
            var _this = _super.call(this, left.length + brk + right.length, left.height + right.height, brk | (left.outdated || right.outdated ? 2 /* Outdated */ : 0)) || this;
            _this.left = left;
            _this.right = right;
            _this.size = left.size + right.size;
            return _this;
        }
        Object.defineProperty(HeightMapBranch.prototype, "break", {
            get: function () { return this.flags & 1 /* Break */; },
            enumerable: true,
            configurable: true
        });
        HeightMapBranch.prototype.blockAt = function (height, doc, top, offset) {
            var mid = top + this.left.height;
            return height < mid || this.right.height == 0 ? this.left.blockAt(height, doc, top, offset)
                : this.right.blockAt(height, doc, mid, offset + this.left.length + this.break);
        };
        HeightMapBranch.prototype.lineAt = function (value, type, doc, top, offset) {
            var rightTop = top + this.left.height, rightOffset = offset + this.left.length + this.break;
            var left = type == 1 /* ByHeight */ ? value < rightTop || this.right.height == 0 : value < rightOffset;
            var base = left ? this.left.lineAt(value, type, doc, top, offset)
                : this.right.lineAt(value, type, doc, rightTop, rightOffset);
            if (this.break || (left ? base.to < rightOffset : base.from > rightOffset))
                return base;
            var subQuery = type == 2 /* ByPosNoHeight */ ? 2 /* ByPosNoHeight */ : 0 /* ByPos */;
            if (left)
                return base.join(this.right.lineAt(rightOffset, subQuery, doc, rightTop, rightOffset));
            else
                return this.left.lineAt(rightOffset, subQuery, doc, top, offset).join(base);
        };
        HeightMapBranch.prototype.forEachLine = function (from, to, doc, top, offset, f) {
            var rightTop = top + this.left.height, rightOffset = offset + this.left.length + this.break;
            if (this.break) {
                if (from < rightOffset)
                    this.left.forEachLine(from, to, doc, top, offset, f);
                if (to >= rightOffset)
                    this.right.forEachLine(from, to, doc, rightTop, rightOffset, f);
            }
            else {
                var mid = this.lineAt(rightOffset, 0 /* ByPos */, doc, top, offset);
                if (from < mid.from)
                    this.left.forEachLine(from, mid.from - 1, doc, top, offset, f);
                if (mid.to >= from && mid.from <= to)
                    f(mid);
                if (to > mid.to)
                    this.right.forEachLine(mid.to + 1, to, doc, rightTop, rightOffset, f);
            }
        };
        HeightMapBranch.prototype.replace = function (from, to, nodes) {
            var rightStart = this.left.length + this.break;
            if (to < rightStart)
                return this.balanced(this.left.replace(from, to, nodes), this.right);
            if (from > this.left.length)
                return this.balanced(this.left, this.right.replace(from - rightStart, to - rightStart, nodes));
            var result = [];
            if (from > 0)
                this.decomposeLeft(from, result);
            var left = result.length;
            for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                var node = nodes_1[_i];
                result.push(node);
            }
            if (from > 0)
                mergeGaps(result, left - 1);
            if (to < this.length) {
                var right = result.length;
                this.decomposeRight(to, result);
                mergeGaps(result, right);
            }
            return HeightMap.of(result);
        };
        HeightMapBranch.prototype.decomposeLeft = function (to, result) {
            var left = this.left.length;
            if (to <= left)
                return this.left.decomposeLeft(to, result);
            result.push(this.left);
            if (this.break) {
                left++;
                if (to >= left)
                    result.push(null);
            }
            if (to > left)
                this.right.decomposeLeft(to - left, result);
        };
        HeightMapBranch.prototype.decomposeRight = function (from, result) {
            var left = this.left.length, right = left + this.break;
            if (from >= right)
                return this.right.decomposeRight(from - right, result);
            if (from < left)
                this.left.decomposeRight(from, result);
            if (this.break && from < right)
                result.push(null);
            result.push(this.right);
        };
        HeightMapBranch.prototype.balanced = function (left, right) {
            if (left.size > 2 * right.size || right.size > 2 * left.size)
                return HeightMap.of(this.break ? [left, null, right] : [left, right]);
            this.left = left;
            this.right = right;
            this.height = left.height + right.height;
            this.outdated = left.outdated || right.outdated;
            this.size = left.size + right.size;
            this.length = left.length + this.break + right.length;
            return this;
        };
        HeightMapBranch.prototype.updateHeight = function (oracle, offset, force, measured) {
            if (offset === void 0) { offset = 0; }
            if (force === void 0) { force = false; }
            var _a = this, left = _a.left, right = _a.right, rightStart = offset + left.length + this.break, rebalance = null;
            if (measured && measured.from <= offset + left.length && measured.more)
                rebalance = left = left.updateHeight(oracle, offset, force, measured);
            else
                left.updateHeight(oracle, offset, force);
            if (measured && measured.from <= rightStart + right.length && measured.more)
                rebalance = right = right.updateHeight(oracle, rightStart, force, measured);
            else
                right.updateHeight(oracle, rightStart, force);
            if (rebalance)
                return this.balanced(left, right);
            this.height = this.left.height + this.right.height;
            this.outdated = false;
            return this;
        };
        HeightMapBranch.prototype.toString = function () { return this.left + (this.break ? " " : "-") + this.right; };
        return HeightMapBranch;
    }(HeightMap));
    function mergeGaps(nodes, around) {
        var before, after;
        if (nodes[around] == null &&
            (before = nodes[around - 1]) instanceof HeightMapGap &&
            (after = nodes[around + 1]) instanceof HeightMapGap)
            nodes.splice(around - 1, 3, new HeightMapGap(before.length + 1 + after.length));
    }
    var relevantWidgetHeight = 5;
    var NodeBuilder = /** @class */ (function () {
        function NodeBuilder(pos, oracle) {
            this.pos = pos;
            this.oracle = oracle;
            this.nodes = [];
            this.lineStart = -1;
            this.lineEnd = -1;
            this.covering = null;
            this.writtenTo = pos;
        }
        Object.defineProperty(NodeBuilder.prototype, "isCovered", {
            get: function () {
                return this.covering && this.nodes[this.nodes.length - 1] == this.covering;
            },
            enumerable: true,
            configurable: true
        });
        NodeBuilder.prototype.span = function (from, to) {
            if (this.lineStart > -1) {
                var end = Math.min(to, this.lineEnd), last = this.nodes[this.nodes.length - 1];
                if (last instanceof HeightMapText)
                    last.length += end - this.pos;
                else if (end > this.pos || !this.isCovered)
                    this.nodes.push(new HeightMapText(end - this.pos, -1));
                this.writtenTo = end;
                if (to > end) {
                    this.nodes.push(null);
                    this.writtenTo++;
                    this.lineStart = -1;
                }
            }
            this.pos = to;
        };
        NodeBuilder.prototype.point = function (from, to, deco) {
            var height = deco.widget ? Math.max(0, deco.widget.estimatedHeight) : 0;
            var len = to - from;
            if (deco.block) {
                this.addBlock(new HeightMapBlock(len, height, deco.type));
            }
            else if (len || height >= relevantWidgetHeight) {
                this.addLineDeco(height, len);
            }
            if (this.lineEnd > -1 && this.lineEnd < this.pos)
                this.lineEnd = this.oracle.doc.lineAt(this.pos).end;
        };
        NodeBuilder.prototype.enterLine = function () {
            if (this.lineStart > -1)
                return;
            var _a = this.oracle.doc.lineAt(this.pos), start = _a.start, end = _a.end;
            this.lineStart = start;
            this.lineEnd = end;
            if (this.writtenTo < start) {
                if (this.writtenTo < start - 1 || this.nodes[this.nodes.length - 1] == null)
                    this.nodes.push(new HeightMapGap(start - this.writtenTo - 1));
                this.nodes.push(null);
            }
            if (this.pos > start)
                this.nodes.push(new HeightMapText(this.pos - start, -1));
            this.writtenTo = this.pos;
        };
        NodeBuilder.prototype.ensureLine = function () {
            this.enterLine();
            var last = this.nodes.length ? this.nodes[this.nodes.length - 1] : null;
            if (last instanceof HeightMapText)
                return last;
            var line = new HeightMapText(0, -1);
            this.nodes.push(line);
            return line;
        };
        NodeBuilder.prototype.addBlock = function (block) {
            this.enterLine();
            if (block.type == 2 /* WidgetAfter */ && !this.isCovered)
                this.ensureLine();
            this.nodes.push(block);
            this.writtenTo = this.pos = this.pos + block.length;
            if (block.type != 1 /* WidgetBefore */)
                this.covering = block;
        };
        NodeBuilder.prototype.addLineDeco = function (height, length) {
            var line = this.ensureLine();
            line.length += length;
            line.collapsed += length;
            line.widgetHeight = Math.max(line.widgetHeight, height);
            this.writtenTo = this.pos = this.pos + length;
        };
        NodeBuilder.prototype.finish = function (from) {
            var last = this.nodes.length == 0 ? null : this.nodes[this.nodes.length - 1];
            if (this.lineStart > -1 && !(last instanceof HeightMapText) && !this.isCovered)
                this.nodes.push(new HeightMapText(0, -1));
            else if (this.writtenTo < this.pos || last == null)
                this.nodes.push(new HeightMapGap(this.pos - this.writtenTo));
            var pos = from;
            for (var _i = 0, _a = this.nodes; _i < _a.length; _i++) {
                var node = _a[_i];
                if (node instanceof HeightMapText)
                    node.updateHeight(this.oracle, pos);
                pos += node ? node.length : 1;
            }
            return this.nodes;
        };
        NodeBuilder.prototype.ignore = function (from, to, value) { return from == to && !value.heightRelevant; };
        // Always called with a region that on both sides either stretches
        // to a line break or the end of the document.
        // The returned array uses null to indicate line breaks, but never
        // starts or ends in a line break, or has multiple line breaks next
        // to each other.
        NodeBuilder.build = function (oracle, decorations, from, to) {
            var builder = new NodeBuilder(from, oracle);
            rangeset.RangeSet.iterateSpans(decorations, from, to, builder);
            return builder.finish(from);
        };
        return NodeBuilder;
    }());
    });

    unwrapExports(heightmap);
    var heightmap_1 = heightmap.HeightOracle;
    var heightmap_2 = heightmap.MeasuredHeights;
    var heightmap_3 = heightmap.BlockInfo;
    var heightmap_4 = heightmap.HeightMap;

    var extension$1 = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });



    var none = [];
    var ViewField = /** @class */ (function () {
        function ViewField(_a) {
            var create = _a.create, update = _a.update, _b = _a.effects, effects = _b === void 0 ? [] : _b;
            this.create = create;
            this.update = update;
            this.effects = effects;
        }
        Object.defineProperty(ViewField.prototype, "extension", {
            get: function () { return exports.viewField(this); },
            enumerable: true,
            configurable: true
        });
        ViewField.decorations = function (_a) {
            var create = _a.create, update = _a.update, map = _a.map;
            return new ViewField({
                create: create || (function () { return decoration.Decoration.none; }),
                update: function (deco, u) {
                    if (map)
                        deco = deco.map(u.changes);
                    return update(deco, u);
                },
                effects: [ViewField.decorationEffect(function (d) { return d; })]
            }).extension;
        };
        ViewField.decorationEffect = extension.Slot.define();
        ViewField.editorAttributeEffect = extension.Slot.define();
        ViewField.contentAttributeEffect = extension.Slot.define();
        ViewField.editorAttributes = attributeField(ViewField.editorAttributeEffect);
        ViewField.contentAttributes = attributeField(ViewField.contentAttributeEffect);
        return ViewField;
    }());
    exports.ViewField = ViewField;
    function attributeField(effect) {
        return function (value, update) {
            return new ViewField({
                create: value instanceof Function ? value : function () { return value; },
                update: update || (function (a) { return a; }), effects: [effect(function (a) { return a; })]
            }).extension;
        };
    }
    var ViewExtension = /** @class */ (function (_super) {
        __extends(ViewExtension, _super);
        function ViewExtension() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        return ViewExtension;
    }(extension.Extension));
    exports.ViewExtension = ViewExtension;
    exports.viewField = ViewExtension.defineBehavior();
    exports.handleDOMEvents = ViewExtension.defineBehavior();
    exports.clickAddsSelectionRange = ViewExtension.defineBehavior();
    exports.dragMovesSelection = ViewExtension.defineBehavior();
    exports.viewPlugin = ViewExtension.defineBehavior();
    exports.styleModule = ViewExtension.defineBehavior();
    exports.focusChange = extension.Slot.define();
    var ViewUpdate = /** @class */ (function () {
        function ViewUpdate(view, transactions, 
        // @internal
        metadata) {
            if (transactions === void 0) { transactions = none; }
            if (metadata === void 0) { metadata = none; }
            this.view = view;
            this.transactions = transactions;
            this.metadata = metadata;
            this.state = transactions.length ? transactions[transactions.length - 1].apply() : view.state;
            this.changes = transactions.reduce(function (chs, tr) { return chs.appendSet(tr.changes); }, src$1.ChangeSet.empty);
            this.prevState = view.state;
            this.prevFields = view.fields;
            this.prevFieldValues = view.fieldValues;
            this.prevViewport = view.viewport;
        }
        Object.defineProperty(ViewUpdate.prototype, "viewport", {
            get: function () { return this.view.viewport; },
            enumerable: true,
            configurable: true
        });
        ViewUpdate.prototype.prevField = function (field, defaultValue) {
            return getField(field, this.prevFields, this.prevFieldValues, defaultValue);
        };
        Object.defineProperty(ViewUpdate.prototype, "viewportChanged", {
            get: function () {
                return this.prevViewport.eq(this.view.viewport);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ViewUpdate.prototype, "docChanged", {
            get: function () {
                return this.transactions.some(function (tr) { return tr.docChanged; });
            },
            enumerable: true,
            configurable: true
        });
        ViewUpdate.prototype.getMeta = function (type) {
            for (var i = this.transactions.length; i >= 0; i--) {
                var found = i == this.transactions.length ? extension.Slot.get(type, this.metadata) : this.transactions[i].getMeta(type);
                if (found !== undefined)
                    return found;
            }
            return undefined;
        };
        return ViewUpdate;
    }());
    exports.ViewUpdate = ViewUpdate;
    function getField(field, fields, values, defaultValue) {
        var index = fields.indexOf(field);
        if (index < 0) {
            if (defaultValue === undefined)
                throw new RangeError("Field isn't present");
            else
                return defaultValue;
        }
        if (index >= values.length)
            throw new RangeError("Accessing a field that isn't initialized yet");
        return values[index];
    }
    exports.getField = getField;
    });

    unwrapExports(extension$1);
    var extension_2$1 = extension$1.ViewField;
    var extension_3$1 = extension$1.ViewExtension;
    var extension_4$1 = extension$1.viewField;
    var extension_5$1 = extension$1.handleDOMEvents;
    var extension_6 = extension$1.clickAddsSelectionRange;
    var extension_7 = extension$1.dragMovesSelection;
    var extension_8 = extension$1.viewPlugin;
    var extension_9 = extension$1.styleModule;
    var extension_10 = extension$1.focusChange;
    var extension_11 = extension$1.ViewUpdate;
    var extension_12 = extension$1.getField;

    var docview = createCommonjsModule(function (module, exports) {
    var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
            return extendStatics(d, b);
        };
        return function (d, b) {
            extendStatics(d, b);
            function __() { this.constructor = d; }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });













    var none = [];
    var DocView = /** @class */ (function (_super) {
        __extends(DocView, _super);
        function DocView(view, onDOMChange) {
            var _this = _super.call(this) || this;
            _this.view = view;
            _this.viewports = none;
            _this.compositionDeco = decoration.Decoration.none;
            _this.gapDeco = decoration.Decoration.none;
            _this.selectionDirty = null;
            _this.forceSelectionUpdate = false;
            _this.heightOracle = new heightmap.HeightOracle;
            _this.layoutCheckScheduled = -1;
            // A document position that has to be scrolled into view at the next layout check
            _this.scrollIntoView = -1;
            _this.paddingTop = 0;
            _this.paddingBottom = 0;
            // Track a minimum width for the editor. When measuring sizes in
            // checkLayout, this is updated to point at the width of a given
            // element and its extent in the document. When a change happens in
            // that range, these are reset. That way, once we've seen a
            // line/element of a given length, we keep the editor wide enough to
            // fit at least that element, until it is changed, at which point we
            // forget it again.
            _this.minWidth = 0;
            _this.minWidthFrom = 0;
            _this.minWidthTo = 0;
            // Track whether the DOM selection was set in a lossy way, so that
            // we don't mess it up when reading it back it
            _this.impreciseAnchor = null;
            _this.impreciseHead = null;
            _this.setDOM(view.contentDOM);
            _this.viewportState = new viewport.ViewportState;
            _this.observer = new domobserver.DOMObserver(_this, onDOMChange, function () { return _this.checkLayout(); });
            return _this;
        }
        Object.defineProperty(DocView.prototype, "length", {
            get: function () { return this.state.doc.length; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DocView.prototype, "state", {
            get: function () { return this.view.state; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DocView.prototype, "viewport", {
            get: function () { return this.view.viewport; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DocView.prototype, "root", {
            get: function () { return this.view.root; },
            enumerable: true,
            configurable: true
        });
        DocView.prototype.init = function (state) {
            var _this = this;
            var changedRanges = [new src$1.ChangedRange(0, 0, 0, state.doc.length)];
            this.heightMap = heightmap.HeightMap.empty().applyChanges(none, src.Text.empty, this.heightOracle.setDoc(state.doc), changedRanges);
            this.children = [new blockview.LineView];
            this.children[0].setParent(this);
            this.viewports = this.decorations = none;
            this.minWidth = 0;
            this.compositionDeco = decoration.Decoration.none;
            var contentChanges = this.computeUpdate(state, null, true, changedRanges, 0, -1);
            this.updateInner(contentChanges, 0);
            this.cancelLayoutCheck();
            this.layoutCheckScheduled = requestAnimationFrame(function () { return _this.checkLayout(); });
        };
        // Update the document view to a given state. scrollIntoView can be
        // used as a hint to compute a new viewport that includes that
        // position, if we know the editor is going to scroll that position
        // into view.
        DocView.prototype.update = function (update, scrollIntoView) {
            // FIXME need some way to stabilize viewport—if a change causes the
            // top of the visible viewport to move, scroll position should be
            // adjusted to keep the content in place
            var _this = this;
            if (scrollIntoView === void 0) { scrollIntoView = -1; }
            var prevDoc = this.state.doc;
            var state = update ? update.state : this.state;
            var changedRanges = update ? update.changes.changedRanges() : none;
            if (this.minWidth > 0 && changedRanges.length) {
                if (!changedRanges.every(function (_a) {
                    var fromA = _a.fromA, toA = _a.toA;
                    return toA < _this.minWidthFrom || fromA > _this.minWidthTo;
                })) {
                    this.minWidth = 0;
                }
                else {
                    this.minWidthFrom = src$1.ChangedRange.mapPos(this.minWidthFrom, 1, changedRanges);
                    this.minWidthTo = src$1.ChangedRange.mapPos(this.minWidthTo, 1, changedRanges);
                }
            }
            this.heightMap = this.heightMap.applyChanges(none, prevDoc, this.heightOracle.setDoc(state.doc), changedRanges);
            var contentChanges = this.computeUpdate(state, update, false, changedRanges, 0, scrollIntoView);
            // When the DOM nodes around the selection are moved to another
            // parent, Chrome sometimes reports a different selection through
            // getSelection than the one that it actually shows to the user.
            // This forces a selection update when lines are joined to work
            // around that. Issue #54
            if (browser$1.default.chrome && !this.compositionDeco.size && update && update.changes.changes.some(function (ch) { return ch.text.length > 1; }))
                this.forceSelectionUpdate = true;
            if (this.dirty == 0 /* Not */ && contentChanges.length == 0 &&
                this.state.selection.primary.from >= this.viewport.from &&
                this.state.selection.primary.to <= this.viewport.to &&
                (!update || update.metadata.length == 0)) {
                this.updateSelection();
                if (scrollIntoView > -1)
                    this.scrollPosIntoView(scrollIntoView);
            }
            else {
                this.updateInner(contentChanges, prevDoc.length);
                this.cancelLayoutCheck();
                if (scrollIntoView > -1)
                    this.scrollIntoView = scrollIntoView;
                this.layoutCheckScheduled = requestAnimationFrame(function () { return _this.checkLayout(); });
            }
        };
        // Used both by update and checkLayout do perform the actual DOM
        // update
        DocView.prototype.updateInner = function (changes, oldLength) {
            var _this = this;
            var visible = this.viewport, viewports = [visible];
            var _a = this.state.selection.primary, head = _a.head, anchor = _a.anchor;
            if (head < visible.from || head > visible.to) {
                var _b = this.lineAt(head, 0), from = _b.from, to = _b.to;
                viewports.push(new viewport.Viewport(from, to));
            }
            if (!viewports.some(function (_a) {
                var from = _a.from, to = _a.to;
                return anchor >= from && anchor <= to;
            })) {
                var _c = this.lineAt(anchor, 0), from = _c.from, to = _c.to;
                viewports.push(new viewport.Viewport(from, to));
            }
            viewports.sort(function (a, b) { return a.from - b.from; });
            this.updateChildren(changes, viewports, oldLength);
            this.viewports = viewports;
            this.observer.ignore(function () {
                // Lock the height during redrawing, since Chrome sometimes
                // messes with the scroll position during DOM mutation (though
                // no relayout is triggered and I cannot imagine how it can
                // recompute the scroll position without a layout)
                _this.dom.style.height = _this.heightMap.height + "px";
                _this.dom.style.minWidth = _this.minWidth + "px";
                _this.sync();
                _this.dirty = 0 /* Not */;
                _this.updateSelection();
                _this.dom.style.height = "";
            });
        };
        DocView.prototype.updateChildren = function (changes, viewports, oldLength) {
            var gapDeco = this.computeGapDeco(viewports, this.length);
            var gapChanges = decoration.findChangedRanges(this.gapDeco, gapDeco, changes, oldLength);
            this.gapDeco = gapDeco;
            changes = extendWithRanges(changes, gapChanges.content);
            var allDeco = [gapDeco].concat(this.decorations);
            var cursor = this.childCursor(oldLength);
            for (var i = changes.length - 1;; i--) {
                var next = i >= 0 ? changes[i] : null;
                if (!next)
                    break;
                var fromA = next.fromA, toA = next.toA, fromB = next.fromB, toB = next.toB;
                var _a = buildview.ContentBuilder.build(this.state.doc, fromB, toB, allDeco), content = _a.content, breakAtStart = _a.breakAtStart;
                var _b = cursor.findPos(toA, 1), toI = _b.i, toOff = _b.off;
                var _c = cursor.findPos(fromA, -1), fromI = _c.i, fromOff = _c.off;
                this.replaceRange(fromI, fromOff, toI, toOff, content, breakAtStart);
            }
        };
        DocView.prototype.replaceRange = function (fromI, fromOff, toI, toOff, content, breakAtStart) {
            var before = this.children[fromI], last = content.length ? content[content.length - 1] : null;
            var breakAtEnd = last ? last.breakAfter : breakAtStart;
            // Change within a single line
            if (fromI == toI && !breakAtStart && !breakAtEnd && content.length < 2 &&
                before.merge(fromOff, toOff, content.length ? last : null, fromOff == 0))
                return;
            var after = this.children[toI];
            if (toOff < after.length) {
                if (fromI == toI) {
                    after = after.split(toOff);
                    toOff = 0;
                }
                if (!breakAtEnd && last && after.merge(0, toOff, last, true)) {
                    content[content.length - 1] = after;
                }
                else {
                    if (toOff)
                        after.merge(0, toOff, null, false);
                    content.push(after);
                }
            }
            else if (after.breakAfter) {
                if (last)
                    last.breakAfter = 1;
                else
                    breakAtStart = 1;
            }
            toI++;
            before.breakAfter = breakAtStart;
            if (fromOff > 0) {
                if (!breakAtStart && content.length && before.merge(fromOff, before.length, content[0], false)) {
                    before.breakAfter = content.shift().breakAfter;
                }
                else if (fromOff < before.length) {
                    before.merge(fromOff, before.length, null, false);
                }
                fromI++;
            }
            // Try to merge widgets on the boundaries of the replacement
            while (fromI < toI && content.length) {
                if (this.children[toI - 1].match(content[content.length - 1]))
                    toI--, content.pop();
                else if (this.children[fromI].match(content[0]))
                    fromI++, content.shift();
                else
                    break;
            }
            if (fromI < toI || content.length)
                this.replaceChildren(fromI, toI, content);
        };
        // Sync the DOM selection to this.state.selection
        DocView.prototype.updateSelection = function (takeFocus) {
            if (takeFocus === void 0) { takeFocus = false; }
            this.clearSelectionDirty();
            if (!takeFocus && this.root.activeElement != this.dom)
                return;
            var primary = this.state.selection.primary;
            // FIXME need to handle the case where the selection falls inside a block range
            var anchor = this.domAtPos(primary.anchor);
            var head = this.domAtPos(primary.head);
            var domSel = this.root.getSelection();
            // If the selection is already here, or in an equivalent position, don't touch it
            if (this.forceSelectionUpdate ||
                !dom.isEquivalentPosition(anchor.node, anchor.offset, domSel.anchorNode, domSel.anchorOffset) ||
                !dom.isEquivalentPosition(head.node, head.offset, domSel.focusNode, domSel.focusOffset)) {
                this.forceSelectionUpdate = false;
                this.observer.ignore(function () {
                    var _a;
                    // Selection.extend can be used to create an 'inverted' selection
                    // (one where the focus is before the anchor), but not all
                    // browsers support it yet.
                    if (domSel.extend) {
                        domSel.collapse(anchor.node, anchor.offset);
                        if (!primary.empty)
                            domSel.extend(head.node, head.offset);
                    }
                    else {
                        var range = document.createRange();
                        if (primary.anchor > primary.head)
                            _a = [head, anchor], anchor = _a[0], head = _a[1];
                        range.setEnd(head.node, head.offset);
                        range.setStart(anchor.node, anchor.offset);
                        domSel.removeAllRanges();
                        domSel.addRange(range);
                    }
                });
            }
            this.impreciseAnchor = anchor.precise ? null : new contentview.DOMPos(domSel.anchorNode, domSel.anchorOffset);
            this.impreciseHead = head.precise ? null : new contentview.DOMPos(domSel.focusNode, domSel.focusOffset);
        };
        DocView.prototype.lineAt = function (pos, editorTop) {
            if (editorTop == null)
                editorTop = this.dom.getBoundingClientRect().top;
            return this.heightMap.lineAt(pos, 0 /* ByPos */, this.state.doc, editorTop + this.paddingTop, 0);
        };
        DocView.prototype.lineAtHeight = function (height, editorTop) {
            if (editorTop == null)
                editorTop = this.dom.getBoundingClientRect().top;
            return this.heightMap.lineAt(height, 1 /* ByHeight */, this.state.doc, editorTop + this.paddingTop, 0);
        };
        DocView.prototype.blockAtHeight = function (height, editorTop) {
            if (editorTop == null)
                editorTop = this.dom.getBoundingClientRect().top;
            return this.heightMap.blockAt(height, this.state.doc, editorTop + this.paddingTop, 0);
        };
        DocView.prototype.forEachLine = function (from, to, f, editorTop) {
            if (editorTop == null)
                editorTop = this.dom.getBoundingClientRect().top;
            return this.heightMap.forEachLine(from, to, this.state.doc, editorTop + this.paddingTop, 0, f);
        };
        // Compute the new viewport and set of decorations, while giving
        // plugin views the opportunity to respond to state and viewport
        // changes. Might require more than one iteration to become stable.
        DocView.prototype.computeUpdate = function (state, update, initializing, contentChanges, viewportBias, scrollIntoView) {
            for (var i = 0;; i++) {
                var viewport = this.viewportState.getViewport(state.doc, this.heightMap, viewportBias, scrollIntoView);
                var viewportChange = this.viewport ? !viewport.eq(this.viewport) : true;
                // When the viewport is stable and no more iterations are needed, return
                if (!viewportChange && !update && !initializing)
                    return contentChanges;
                // After 5 tries, or 
                if (i == 5) {
                    console.warn("Viewport and decorations failed to converge");
                    return contentChanges;
                }
                var prevState = this.state || state;
                if (initializing)
                    this.view.initInner(state, viewport);
                else
                    this.view.updateInner(update || new extension$1.ViewUpdate(this.view), viewport);
                // For the composition decoration, use none on init, recompute
                // when handling transactions, and use the previous value
                // otherwise.
                if (!this.view.inputState.composing)
                    this.compositionDeco = decoration.Decoration.none;
                else if (update && update.transactions.length)
                    this.compositionDeco = computeCompositionDeco(this.view, contentChanges);
                var decorations = this.view.getEffect(extension$1.ViewField.decorationEffect).concat(this.compositionDeco);
                // If the decorations are stable, stop.
                if (!update && !initializing && sameArray(decorations, this.decorations))
                    return contentChanges;
                // Compare the decorations (between document changes)
                var _a = decoChanges(update ? contentChanges : none, decorations, this.decorations, prevState.doc.length), content = _a.content, height = _a.height;
                this.decorations = decorations;
                // Update the heightmap with these changes. If this is the first
                // iteration and the document changed, also include decorations
                // for inserted ranges.
                var heightChanges = extendWithRanges(none, height);
                if (update)
                    heightChanges = extendWithRanges(heightChanges, decoration.heightRelevantDecorations(decorations, contentChanges));
                this.heightMap = this.heightMap.applyChanges(decorations, this.state.doc, this.heightOracle, heightChanges);
                // Accumulate content changes so that they can be redrawn
                contentChanges = extendWithRanges(contentChanges, content);
                // Make sure only one iteration is marked as required / state changing
                update = null;
                initializing = false;
            }
        };
        DocView.prototype.focus = function () {
            this.updateSelection(true);
        };
        DocView.prototype.cancelLayoutCheck = function () {
            if (this.layoutCheckScheduled > -1) {
                cancelAnimationFrame(this.layoutCheckScheduled);
                this.layoutCheckScheduled = -1;
            }
        };
        DocView.prototype.forceLayout = function () {
            if (this.layoutCheckScheduled > -1 && !this.view.updating)
                this.checkLayout();
        };
        DocView.prototype.checkLayout = function (forceFull) {
            var _this = this;
            if (forceFull === void 0) { forceFull = false; }
            this.cancelLayoutCheck();
            this.measureVerticalPadding();
            var scrollIntoView = Math.min(this.scrollIntoView, this.state.doc.length);
            this.scrollIntoView = -1;
            var scrollBias = 0;
            if (forceFull)
                this.viewportState.coverEverything();
            else
                scrollBias = this.viewportState.updateFromDOM(this.dom, this.paddingTop);
            if (this.viewportState.top >= this.viewportState.bottom)
                return; // We're invisible!
            var lineHeights = this.measureVisibleLineHeights(), refresh = false;
            if (this.heightOracle.mustRefresh(lineHeights)) {
                var _a = this.measureTextSize(), lineHeight = _a.lineHeight, charWidth = _a.charWidth;
                refresh = this.heightOracle.refresh(getComputedStyle(this.dom).whiteSpace, lineHeight, charWidth, (this.dom).clientWidth / charWidth, lineHeights);
                if (refresh)
                    this.minWidth = 0;
            }
            if (scrollIntoView > -1)
                this.scrollPosIntoView(scrollIntoView);
            this.view.withUpdating(function () {
                var update = null;
                for (var i = 0;; i++) {
                    _this.heightOracle.heightChanged = false;
                    _this.heightMap = _this.heightMap.updateHeight(_this.heightOracle, 0, refresh, new heightmap.MeasuredHeights(_this.viewport.from, lineHeights || _this.measureVisibleLineHeights()));
                    var covered = _this.viewportState.coveredBy(_this.state.doc, _this.viewport, _this.heightMap, scrollBias);
                    if (covered && !_this.heightOracle.heightChanged)
                        break;
                    if (!update)
                        update = new extension$1.ViewUpdate(_this.view);
                    if (i > 10)
                        throw new Error("Layout failed to converge");
                    var contentChanges = covered ? none : _this.computeUpdate(_this.state, null, false, none, scrollBias, -1);
                    _this.updateInner(contentChanges, _this.length);
                    lineHeights = null;
                    refresh = false;
                    scrollBias = 0;
                    _this.viewportState.updateFromDOM(_this.dom, _this.paddingTop);
                }
                if (update) {
                    _this.observer.listenForScroll();
                    _this.view.updatePlugins(update);
                }
            });
        };
        DocView.prototype.scrollPosIntoView = function (pos) {
            var rect = this.coordsAt(pos);
            if (rect)
                dom.scrollRectIntoView(this.dom, rect);
        };
        DocView.prototype.nearest = function (dom) {
            for (var cur = dom; cur;) {
                var domView = cur.cmView;
                if (domView && domView.rootView == this)
                    return domView;
                cur = cur.parentNode;
            }
            return null;
        };
        DocView.prototype.posFromDOM = function (node, offset) {
            var view = this.nearest(node);
            if (!view)
                throw new RangeError("Trying to find position for a DOM position outside of the document");
            return view.localPosFromDOM(node, offset) + view.posAtStart;
        };
        DocView.prototype.domAtPos = function (pos) {
            var _a = this.childCursor().findPos(pos, -1), i = _a.i, off = _a.off;
            for (; i < this.children.length - 1;) {
                var child = this.children[i];
                if (off < child.length || child instanceof blockview.LineView)
                    break;
                i++;
                off = 0;
            }
            return this.children[i].domAtPos(off);
        };
        DocView.prototype.coordsAt = function (pos) {
            for (var off = this.length, i = this.children.length - 1;; i--) {
                var child = this.children[i], start = off - child.breakAfter - child.length;
                if (pos >= start && child.type != 2 /* WidgetAfter */)
                    return child.coordsAt(pos - start);
                off = start;
            }
        };
        DocView.prototype.measureVisibleLineHeights = function () {
            var result = [], _a = this.viewport, from = _a.from, to = _a.to;
            var minWidth = Math.max(this.dom.clientWidth, this.minWidth) + 1;
            for (var pos = 0, i = 0; i < this.children.length; i++) {
                var child = this.children[i], end = pos + child.length;
                if (end > to)
                    break;
                if (pos >= from) {
                    result.push(child.dom.getBoundingClientRect().height);
                    var width = child.dom.scrollWidth;
                    if (width > minWidth) {
                        this.minWidth = minWidth = width;
                        this.minWidthFrom = pos;
                        this.minWidthTo = end;
                    }
                }
                pos = end + child.breakAfter;
            }
            return result;
        };
        DocView.prototype.measureVerticalPadding = function () {
            var style = window.getComputedStyle(this.dom);
            this.paddingTop = parseInt(style.paddingTop) || 0;
            this.paddingBottom = parseInt(style.paddingBottom) || 0;
        };
        DocView.prototype.measureTextSize = function () {
            var _this = this;
            for (var _i = 0, _a = this.children; _i < _a.length; _i++) {
                var child = _a[_i];
                if (child instanceof blockview.LineView) {
                    var measure = child.measureTextSize();
                    if (measure)
                        return measure;
                }
            }
            // If no workable line exists, force a layout of a measurable element
            var dummy = document.createElement("div"), lineHeight, charWidth;
            dummy.style.cssText = "contain: strict";
            dummy.textContent = "abc def ghi jkl mno pqr stu";
            this.observer.ignore(function () {
                _this.dom.appendChild(dummy);
                var rect = dom.clientRectsFor(dummy.firstChild)[0];
                lineHeight = dummy.getBoundingClientRect().height;
                charWidth = rect ? rect.width / 27 : 7;
                dummy.remove();
            });
            return { lineHeight: lineHeight, charWidth: charWidth };
        };
        DocView.prototype.destroy = function () {
            cancelAnimationFrame(this.layoutCheckScheduled);
            this.observer.destroy();
        };
        DocView.prototype.clearSelectionDirty = function () {
            if (this.selectionDirty != null) {
                cancelAnimationFrame(this.selectionDirty);
                this.selectionDirty = null;
            }
        };
        DocView.prototype.setSelectionDirty = function () {
            var _this = this;
            this.observer.clearSelection();
            if (this.selectionDirty == null)
                this.selectionDirty = requestAnimationFrame(function () { return _this.updateSelection(); });
        };
        DocView.prototype.childCursor = function (pos, i) {
            if (pos === void 0) { pos = this.length; }
            if (i === void 0) { i = this.children.length; }
            return new contentview.DocChildCursor(this.children, pos, i);
        };
        DocView.prototype.computeGapDeco = function (viewports, docLength) {
            var deco = [];
            for (var pos = 0, i = 0;; i++) {
                var next = i == viewports.length ? null : viewports[i];
                var end = next ? next.from - 1 : docLength;
                if (end > pos) {
                    var height = this.lineAt(end, 0).bottom - this.lineAt(pos, 0).top;
                    deco.push(decoration.Decoration.replace(pos, end, { widget: new GapWidget(height), block: true, inclusive: true }));
                }
                if (!next)
                    break;
                pos = next.to + 1;
            }
            return decoration.Decoration.set(deco);
        };
        return DocView;
    }(contentview.ContentView));
    exports.DocView = DocView;
    // Browsers appear to reserve a fixed amount of bits for height
    // styles, and ignore or clip heights above that. For Chrome and
    // Firefox, this is in the 20 million range, so we try to stay below
    // that.
    var MAX_NODE_HEIGHT = 1e7;
    var GapWidget = /** @class */ (function (_super) {
        __extends(GapWidget, _super);
        function GapWidget() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        GapWidget.prototype.toDOM = function () {
            var elt = document.createElement("div");
            this.updateDOM(elt);
            return elt;
        };
        GapWidget.prototype.updateDOM = function (elt) {
            if (this.value < MAX_NODE_HEIGHT) {
                while (elt.lastChild)
                    elt.lastChild.remove();
                elt.style.height = this.value + "px";
            }
            else {
                elt.style.height = "";
                for (var remaining = this.value; remaining > 0; remaining -= MAX_NODE_HEIGHT) {
                    var fill = elt.appendChild(document.createElement("div"));
                    fill.style.height = Math.min(remaining, MAX_NODE_HEIGHT) + "px";
                }
            }
            return true;
        };
        Object.defineProperty(GapWidget.prototype, "estimatedHeight", {
            get: function () { return this.value; },
            enumerable: true,
            configurable: true
        });
        return GapWidget;
    }(decoration.WidgetType));
    function decoChanges(diff, decorations, oldDecorations, oldLength) {
        var contentRanges = [], heightRanges = [];
        for (var i = decorations.length - 1; i >= 0; i--) {
            var deco = decorations[i], oldDeco = i < oldDecorations.length ? oldDecorations[i] : decoration.Decoration.none;
            if (deco.size == 0 && oldDeco.size == 0)
                continue;
            var newRanges = decoration.findChangedRanges(oldDeco, deco, diff, oldLength);
            contentRanges = decoration.joinRanges(contentRanges, newRanges.content);
            heightRanges = decoration.joinRanges(heightRanges, newRanges.height);
        }
        return { content: contentRanges, height: heightRanges };
    }
    function extendWithRanges(diff, ranges) {
        if (ranges.length == 0)
            return diff;
        var result = [];
        for (var dI = 0, rI = 0, posA = 0, posB = 0;; dI++) {
            var next = dI == diff.length ? null : diff[dI], off = posA - posB;
            var end = next ? next.fromB : 1e9;
            while (rI < ranges.length && ranges[rI] < end) {
                var from = ranges[rI], to = ranges[rI + 1];
                var fromB = Math.max(posB, from), toB = Math.min(end, to);
                if (fromB <= toB)
                    new src$1.ChangedRange(fromB + off, toB + off, fromB, toB).addToSet(result);
                if (to > end)
                    break;
                else
                    rI += 2;
            }
            if (!next)
                return result;
            new src$1.ChangedRange(next.fromA, next.toA, next.fromB, next.toB).addToSet(result);
            posA = next.toA;
            posB = next.toB;
        }
    }
    function sameArray(a, b) {
        if (a.length != b.length)
            return false;
        for (var i = 0; i < a.length; i++)
            if (a[i] !== b[i])
                return false;
        return true;
    }
    function computeCompositionDeco(view, changes) {
        var sel = view.root.getSelection();
        var textNode = sel.focusNode && nearbyTextNode(sel.focusNode, sel.focusOffset);
        if (!textNode)
            return decoration.Decoration.none;
        var cView = view.docView.nearest(textNode);
        var from, to, topNode = textNode;
        if (cView instanceof inlineview.InlineView) {
            from = cView.posAtStart;
            to = from + cView.length;
            topNode = cView.dom;
        }
        else if (cView instanceof blockview.LineView) {
            while (topNode.parentNode != cView.dom)
                topNode = topNode.parentNode;
            var prev = topNode.previousSibling;
            while (prev && !prev.cmView)
                prev = prev.previousSibling;
            from = to = prev ? prev.cmView.posAtEnd : cView.posAtStart;
        }
        else {
            return decoration.Decoration.none;
        }
        var newFrom = src$1.ChangedRange.mapPos(from, 1, changes), newTo = Math.max(newFrom, src$1.ChangedRange.mapPos(to, -1, changes));
        var text = textNode.nodeValue, doc = view.state.doc;
        if (newTo - newFrom < text.length) {
            if (doc.slice(newFrom, Math.min(doc.length, newFrom + text.length)) == text)
                newTo = newFrom + text.length;
            else if (doc.slice(Math.max(0, newTo - text.length), newTo) == text)
                newFrom = newTo - text.length;
            else
                return decoration.Decoration.none;
        }
        else if (doc.slice(newFrom, newTo) != text) {
            return decoration.Decoration.none;
        }
        return decoration.Decoration.set(decoration.Decoration.replace(newFrom, newTo, {
            widget: new CompositionWidget({ top: topNode, text: textNode })
        }));
    }
    exports.computeCompositionDeco = computeCompositionDeco;
    var CompositionWidget = /** @class */ (function (_super) {
        __extends(CompositionWidget, _super);
        function CompositionWidget() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        CompositionWidget.prototype.eq = function (value) { return this.value.top == value.top && this.value.text == value.text; };
        CompositionWidget.prototype.toDOM = function () { return this.value.top; };
        CompositionWidget.prototype.ignoreEvent = function () { return false; };
        Object.defineProperty(CompositionWidget.prototype, "customView", {
            get: function () { return inlineview.CompositionView; },
            enumerable: true,
            configurable: true
        });
        return CompositionWidget;
    }(decoration.WidgetType));
    function nearbyTextNode(node, offset) {
        for (;;) {
            if (node.nodeType == 3)
                return node;
            if (node.nodeType == 1 && offset > 0) {
                node = node.childNodes[offset - 1];
                offset = dom.maxOffset(node);
            }
            else if (node.nodeType == 1 && offset < node.childNodes.length) {
                node = node.childNodes[offset];
                offset = 0;
            }
            else {
                return null;
            }
        }
    }
    });

    unwrapExports(docview);
    var docview_1 = docview.DocView;
    var docview_2 = docview.computeCompositionDeco;

    var cursor = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });






    // FIXME rename "word" to something more descriptive of what it actually does?
    function movePos(view, start, direction, granularity, action) {
        if (granularity === void 0) { granularity = "character"; }
        var sel = view.root.getSelection();
        var context = LineContext.get(view, start);
        var dir = direction == "forward" || direction == "right" ? 1 : -1;
        // Can only query native behavior when Selection.modify is
        // supported, the cursor is well inside the rendered viewport, and
        // we're not doing by-line motion on Gecko (which will mess up goal
        // column motion)
        if (sel.modify && context && !context.nearViewportEnd(view) && view.hasFocus() &&
            granularity != "word" &&
            !(granularity == "line" && (browser$1.default.gecko || view.state.selection.ranges.length > 1))) {
            return view.docView.observer.ignore(function () {
                var prepared = context.prepareForQuery(view, start);
                var startDOM = view.docView.domAtPos(start);
                var equiv = (!browser$1.default.chrome || prepared.lines.length == 0) &&
                    dom.isEquivalentPosition(startDOM.node, startDOM.offset, sel.focusNode, sel.focusOffset) && false;
                // Firefox skips an extra character ahead when extending across
                // an uneditable element (but not when moving)
                if (prepared.atWidget && browser$1.default.gecko && action == "extend")
                    action = "move";
                if (action == "move" && !(equiv && sel.isCollapsed))
                    sel.collapse(startDOM.node, startDOM.offset);
                else if (action == "extend" && !equiv)
                    sel.extend(startDOM.node, startDOM.offset);
                sel.modify(action, direction, granularity);
                view.docView.setSelectionDirty();
                var result = view.docView.posFromDOM(sel.focusNode, sel.focusOffset);
                context.undoQueryPreparation(view, prepared);
                return result;
            });
        }
        else if (granularity == "character") {
            return moveCharacterSimple(start, dir, context, view.state.doc);
        }
        else if (granularity == "lineboundary") {
            if (context)
                return context.start + (dir < 0 ? 0 : context.line.length);
            var line = view.state.doc.lineAt(start);
            return dir < 0 ? line.start : line.end;
        }
        else if (granularity == "line") {
            if (context && !context.nearViewportEnd(view, dir)) {
                var startCoords = view.docView.coordsAt(start);
                var goal = getGoalColumn(view, start, startCoords.left);
                for (var startY = dir < 0 ? startCoords.top : startCoords.bottom, dist = 5; dist < 50; dist += 10) {
                    var pos = posAtCoords(view, { x: goal.column, y: startY + dist * dir }, dir);
                    if (pos < 0)
                        break;
                    if (pos != start) {
                        goal.pos = pos;
                        return pos;
                    }
                }
            }
            // Can't do a precise one based on DOM positions, fall back to per-column
            return moveLineByColumn(view.state.doc, view.state.tabSize, start, dir);
        }
        else if (granularity == "word") {
            return moveWord(view, start, direction);
        }
        else {
            throw new RangeError("Invalid move granularity: " + granularity);
        }
    }
    exports.movePos = movePos;
    function moveLineByColumn(doc, tabSize, pos, dir) {
        var line = doc.lineAt(pos);
        // FIXME also needs goal column?
        var col = 0;
        for (var iter = doc.iterRange(line.start, pos); !iter.next().done;)
            col = src.countColumn(iter.value, col, tabSize);
        if (dir < 0 && line.start == 0)
            return 0;
        else if (dir > 0 && line.end == doc.length)
            return line.end;
        var otherLine = doc.line(line.number + dir);
        var result = otherLine.start;
        var seen = 0;
        for (var iter = doc.iterRange(otherLine.start, otherLine.end); seen >= col && !iter.next().done;) {
            var _a = src.findColumn(iter.value, seen, col, tabSize), offset = _a.offset, leftOver = _a.leftOver;
            seen = col - leftOver;
            result += offset;
        }
        return result;
    }
    function moveCharacterSimple(start, dir, context, doc) {
        if (context == null) {
            for (var pos = start;; pos += dir) {
                if (pos == 0 || pos == doc.length)
                    return pos;
                if (!src.isExtendingChar((dir < 0 ? doc.slice(pos - 1, pos) : doc.slice(pos, pos + 1)))) {
                    if (dir < 0)
                        return pos - 1;
                    else if (pos != start)
                        return pos;
                }
            }
        }
        for (var _a = context.line.childPos(start - context.start), i = _a.i, off = _a.off, children = context.line.children, pos = start;;) {
            if (off == (dir < 0 || i == children.length ? 0 : children[i].length)) {
                i += dir;
                if (i < 0 || i >= children.length) // End/start of line
                    return Math.max(0, Math.min(doc.length, pos + (start == pos ? dir : 0)));
                off = dir < 0 ? children[i].length : 0;
            }
            var inline = children[i];
            if (inline instanceof inlineview.TextView) {
                if (!src.isExtendingChar(inline.text.charAt(off - (dir < 0 ? 1 : 0)))) {
                    if (dir < 0)
                        return pos - 1;
                    else if (pos != start)
                        return pos;
                }
                off += dir;
                pos += dir;
            }
            else if (inline.length > 0) {
                return pos - off + (dir < 0 ? 0 : inline.length);
            }
        }
    }
    function moveWord(view, start, direction) {
        var doc = view.state.doc;
        for (var pos = start, i = 0;; i++) {
            var next = movePos(view, pos, direction, "character", "move");
            if (next == pos)
                return pos; // End of document
            if (doc.sliceLines(Math.min(next, pos), Math.max(next, pos)).length > 1)
                return next; // Crossed a line boundary
            var group = src$1.SelectionRange.groupAt(view.state, next, next > pos ? -1 : 1);
            var away = pos < group.from && pos > group.to;
            // If the group is away from its start position, we jumped over a
            // bidi boundary, and should take the side closest (in index
            // coordinates) to the start position
            var start_1 = away ? pos < group.head : group.from == pos ? false : group.to == pos ? true : next < pos;
            pos = start_1 ? group.from : group.to;
            if (i > 0 || /\S/.test(doc.slice(group.from, group.to)))
                return pos;
            next = Math.max(0, Math.min(doc.length, pos + (start_1 ? -1 : 1)));
        }
    }
    function getGoalColumn(view, pos, column) {
        for (var _i = 0, _a = view.inputState.goalColumns; _i < _a.length; _i++) {
            var goal_1 = _a[_i];
            if (goal_1.pos == pos)
                return goal_1;
        }
        var goal = { pos: 0, column: column };
        view.inputState.goalColumns.push(goal);
        return goal;
    }
    var LineContext = /** @class */ (function () {
        function LineContext(line, start, index) {
            this.line = line;
            this.start = start;
            this.index = index;
        }
        LineContext.get = function (view, pos) {
            for (var i = 0, off = 0;; i++) {
                var line = view.docView.children[i], end = off + line.length;
                if (end >= pos) {
                    if (line instanceof blockview.LineView)
                        return new LineContext(line, off, i);
                    if (line.length)
                        return null;
                }
                off = end + 1;
            }
        };
        LineContext.prototype.nearViewportEnd = function (view, side) {
            if (side === void 0) { side = 0; }
            for (var _i = 0, _a = view.docView.viewports; _i < _a.length; _i++) {
                var _b = _a[_i], from = _b.from, to = _b.to;
                if (from > 0 && from == this.start && side <= 0 ||
                    to < view.state.doc.length && to == this.start + this.line.length && side >= 0)
                    return true;
            }
            return false;
        };
        // FIXME limit the amount of work in character motion in non-bidi
        // context? or not worth it?
        LineContext.prototype.prepareForQuery = function (view, pos) {
            var linesToSync = [], atWidget = false;
            function maybeHide(view) {
                if (!(view instanceof inlineview.TextView))
                    atWidget = true;
                if (view.length > 0)
                    return false;
                view.dom.remove();
                if (linesToSync.indexOf(view.parent) < 0)
                    linesToSync.push(view.parent);
                return true;
            }
            var _a = this.line.childPos(pos - this.start), i = _a.i, off = _a.off;
            if (off == 0) {
                for (var j = i; j < this.line.children.length; j++)
                    if (!maybeHide(this.line.children[j]))
                        break;
                for (var j = i; j > 0; j--)
                    if (!maybeHide(this.line.children[j - 1]))
                        break;
            }
            function addForLine(line, omit) {
                if (omit === void 0) { omit = -1; }
                if (line.children.length == 0)
                    return;
                for (var i_1 = 0, off_1 = 0; i_1 <= line.children.length; i_1++) {
                    var next = i_1 == line.children.length ? null : line.children[i_1];
                    if ((!next || !(next instanceof inlineview.TextView)) && off_1 != omit &&
                        (i_1 == 0 || !(line.children[i_1 - 1] instanceof inlineview.TextView))) {
                        line.dom.insertBefore(document.createTextNode("\u200b"), next ? next.dom : null);
                        if (linesToSync.indexOf(line) < 0)
                            linesToSync.push(line);
                    }
                    if (next)
                        off_1 += next.length;
                }
            }
            if (this.index > 0)
                addForLine(this.line.parent.children[this.index - 1]);
            addForLine(this.line, pos - this.start);
            if (this.index < this.line.parent.children.length - 1)
                addForLine(this.line.parent.children[this.index + 1]);
            return { lines: linesToSync, atWidget: atWidget };
        };
        LineContext.prototype.undoQueryPreparation = function (view, toSync) {
            for (var _i = 0, _a = toSync.lines; _i < _a.length; _i++) {
                var line = _a[_i];
                line.dirty = 2 /* Node */;
                line.sync();
            }
        };
        return LineContext;
    }());
    exports.LineContext = LineContext;
    // Search the DOM for the {node, offset} position closest to the given
    // coordinates. Very inefficient and crude, but can usually be avoided
    // by calling caret(Position|Range)FromPoint instead.
    // FIXME holding arrow-up/down at the end of the viewport is a rather
    // common use case that will repeatedly trigger this code. Maybe
    // introduce some element of binary search after all?
    function getdx(x, rect) {
        return rect.left > x ? rect.left - x : Math.max(0, x - rect.right);
    }
    function getdy(y, rect) {
        return rect.top > y ? rect.top - y : Math.max(0, y - rect.bottom);
    }
    function yOverlap(a, b) {
        return a.top < b.bottom - 1 && a.bottom > b.top + 1;
    }
    function upTop(rect, top) {
        return top < rect.top ? { top: top, left: rect.left, right: rect.right, bottom: rect.bottom } : rect;
    }
    function upBot(rect, bottom) {
        return bottom > rect.bottom ? { top: rect.top, left: rect.left, right: rect.right, bottom: bottom } : rect;
    }
    function domPosAtCoords(parent, x, y) {
        var closest, closestRect, closestX, closestY;
        var above, below, aboveRect, belowRect;
        for (var child = parent.firstChild; child; child = child.nextSibling) {
            var rects = dom.clientRectsFor(child);
            for (var i = 0; i < rects.length; i++) {
                var rect = rects[i];
                if (closestRect && yOverlap(closestRect, rect))
                    rect = upTop(upBot(rect, closestRect.bottom), closestRect.top);
                var dx = getdx(x, rect), dy = getdy(y, rect);
                if (dx == 0 && dy == 0)
                    return child.nodeType == 3 ? domPosInText(child, x, y) : domPosAtCoords(child, x, y);
                if (!closest || closestY > dy || closestY == dy && closestX > dx) {
                    closest = child;
                    closestRect = rect;
                    closestX = dx;
                    closestY = dy;
                }
                if (dx == 0) {
                    if (y > rect.bottom && (!aboveRect || aboveRect.bottom < rect.bottom)) {
                        above = child;
                        aboveRect = rect;
                    }
                    else if (y < rect.top && (!belowRect || belowRect.top > rect.top)) {
                        below = child;
                        belowRect = rect;
                    }
                }
                else if (aboveRect && yOverlap(aboveRect, rect)) {
                    aboveRect = upBot(aboveRect, rect.bottom);
                }
                else if (belowRect && yOverlap(belowRect, rect)) {
                    belowRect = upTop(belowRect, rect.top);
                }
            }
        }
        if (aboveRect && aboveRect.bottom >= y) {
            closest = above;
            closestRect = aboveRect;
        }
        else if (belowRect && belowRect.top <= y) {
            closest = below;
            closestRect = belowRect;
        }
        if (!closest)
            return { node: parent, offset: 0 };
        var clipX = Math.max(closestRect.left, Math.min(closestRect.right, x));
        if (closest.nodeType == 3)
            return domPosInText(closest, clipX, y);
        if (!closestX && closest.contentEditable == "true")
            domPosAtCoords(closest, clipX, y);
        var offset = Array.prototype.indexOf.call(parent.childNodes, closest) +
            (x >= (closestRect.left + closestRect.right) / 2 ? 1 : 0);
        return { node: parent, offset: offset };
    }
    function domPosInText(node, x, y) {
        var len = node.nodeValue.length, range = document.createRange();
        for (var i = 0; i < len; i++) {
            range.setEnd(node, i + 1);
            range.setStart(node, i);
            var rects = range.getClientRects();
            for (var j = 0; j < rects.length; j++) {
                var rect = rects[j];
                if (rect.top == rect.bottom)
                    continue;
                if (rect.left - 1 <= x && rect.right + 1 >= x &&
                    rect.top - 1 <= y && rect.bottom + 1 >= y) {
                    var right = x >= (rect.left + rect.right) / 2, after = right;
                    if (browser$1.default.chrome || browser$1.default.gecko) {
                        // Check for RTL on browsers that support getting client
                        // rects for empty ranges.
                        range.setEnd(node, i);
                        var rectBefore = range.getBoundingClientRect();
                        if (rectBefore.left == rect.right)
                            after = !right;
                    }
                    return { node: node, offset: i + (after ? 1 : 0) };
                }
            }
        }
        return { node: node, offset: 0 };
    }
    function posAtCoords(view, _a, bias) {
        var _b;
        var x = _a.x, y = _a.y;
        if (bias === void 0) { bias = -1; }
        var content = view.contentDOM.getBoundingClientRect(), block;
        var halfLine = view.defaultLineHeight / 2;
        for (var bounced = false;;) {
            block = view.blockAtHeight(y, content.top);
            if (block.top > y || block.bottom < y) {
                bias = block.top > y ? -1 : 1;
                y = Math.min(block.bottom - halfLine, Math.max(block.top + halfLine, y));
                if (bounced)
                    return -1;
                else
                    bounced = true;
            }
            if (block.type == 0 /* Text */)
                break;
            y = bias > 0 ? block.bottom + halfLine : block.top - halfLine;
        }
        var lineStart = block.from;
        // If this is outside of the rendered viewport, we can't determine a position
        if (lineStart < view.viewport.from)
            return view.viewport.from == 0 ? 0 : -1;
        if (lineStart > view.viewport.to)
            return view.viewport.to == view.state.doc.length ? view.state.doc.length : -1;
        // Clip x to the viewport sides
        x = Math.max(content.left + 1, Math.min(content.right - 1, x));
        var root = view.root, element = root.elementFromPoint(x, y);
        // There's visible editor content under the point, so we can try
        // using caret(Position|Range)FromPoint as a shortcut
        var node, offset = -1;
        if (element && view.contentDOM.contains(element) && !(view.docView.nearest(element) instanceof inlineview.WidgetView)) {
            if (root.caretPositionFromPoint) {
                var pos = root.caretPositionFromPoint(x, y);
                if (pos)
                    (node = pos.offsetNode, offset = pos.offset);
            }
            else if (root.caretRangeFromPoint) {
                var range = root.caretRangeFromPoint(x, y);
                if (range)
                    (node = range.startContainer, offset = range.startOffset);
            }
        }
        // No luck, do our own (potentially expensive) search
        if (!node) {
            var line = LineContext.get(view, lineStart).line;
            (_b = domPosAtCoords(line.dom, x, y), node = _b.node, offset = _b.offset);
        }
        return view.docView.posFromDOM(node, offset);
    }
    exports.posAtCoords = posAtCoords;
    });

    unwrapExports(cursor);
    var cursor_1 = cursor.movePos;
    var cursor_2 = cursor.LineContext;
    var cursor_3 = cursor.posAtCoords;

    var input = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });





    // This will also be where dragging info and such goes
    var InputState = /** @class */ (function () {
        function InputState(view) {
            var _this = this;
            this.lastKeyCode = 0;
            this.lastKeyTime = 0;
            this.lastSelectionOrigin = null;
            this.lastSelectionTime = 0;
            this.registeredEvents = [];
            this.composing = false;
            this.goalColumns = [];
            this.mouseSelection = null;
            var _loop_1 = function (type) {
                var handler = handlers[type];
                view.contentDOM.addEventListener(type, function (event) {
                    if (!eventBelongsToEditor(view, event))
                        return;
                    if (_this.runCustomHandlers(type, view, event))
                        event.preventDefault();
                    else
                        handler(view, event);
                });
                this_1.registeredEvents.push(type);
            };
            var this_1 = this;
            for (var type in handlers) {
                _loop_1(type);
            }
            // Must always run, even if a custom handler handled the event
            view.contentDOM.addEventListener("keydown", function (event) {
                view.inputState.lastKeyCode = event.keyCode;
                view.inputState.lastKeyTime = Date.now();
            });
            if (view.root.activeElement == view.contentDOM)
                view.dom.classList.add("codemirror-focused");
            this.customHandlers = customHandlers(view);
            var _loop_2 = function (type) {
                if (this_2.registeredEvents.indexOf(type) < 0) {
                    this_2.registeredEvents.push(type);
                    view.contentDOM.addEventListener(type, function (event) {
                        if (!eventBelongsToEditor(view, event))
                            return;
                        if (_this.runCustomHandlers(type, view, event))
                            event.preventDefault();
                    });
                }
            };
            var this_2 = this;
            for (var type in this.customHandlers) {
                _loop_2(type);
            }
        }
        InputState.prototype.setSelectionOrigin = function (origin) {
            this.lastSelectionOrigin = origin;
            this.lastSelectionTime = Date.now();
        };
        InputState.prototype.runCustomHandlers = function (type, view, event) {
            var handlers = this.customHandlers[type];
            if (handlers)
                for (var _i = 0, handlers_1 = handlers; _i < handlers_1.length; _i++) {
                    var handler = handlers_1[_i];
                    if (handler(view, event) || event.defaultPrevented)
                        return true;
                }
            return false;
        };
        InputState.prototype.startMouseSelection = function (view, event, update) {
            if (this.mouseSelection)
                this.mouseSelection.destroy();
            this.mouseSelection = new MouseSelection(this, view, event, update);
        };
        InputState.prototype.update = function (update) {
            if (this.mouseSelection)
                this.mouseSelection.map(update.changes);
            this.lastKeyCode = this.lastSelectionTime = 0;
        };
        InputState.prototype.destroy = function () {
            if (this.mouseSelection)
                this.mouseSelection.destroy();
        };
        return InputState;
    }());
    exports.InputState = InputState;
    var MouseSelection = /** @class */ (function () {
        function MouseSelection(inputState, view, event, update) {
            this.inputState = inputState;
            this.view = view;
            this.update = update;
            var doc = view.contentDOM.ownerDocument;
            doc.addEventListener("mousemove", this.move = this.move.bind(this));
            doc.addEventListener("mouseup", this.up = this.up.bind(this));
            this.extend = event.shiftKey;
            this.multiple = view.state.multipleSelections && addsSelectionRange(view, event);
            this.dragMove = dragMovesSelection(view, event);
            this.startSelection = view.state.selection;
            var _a = this.queryPos(event), pos = _a.pos, bias = _a.bias;
            this.startPos = this.curPos = pos;
            this.startBias = this.curBias = bias;
            this.dragging = isInPrimarySelection(view, this.startPos, event) ? null : false;
            // When clicking outside of the selection, immediately apply the
            // effect of starting the selection
            if (this.dragging === false) {
                event.preventDefault();
                this.select();
            }
        }
        MouseSelection.prototype.queryPos = function (event) {
            var pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
            var coords = this.view.coordsAtPos(pos);
            var bias = !coords ? 1 :
                coords.top > event.clientY ? -1 :
                    coords.bottom < event.clientY ? 1 :
                        coords.left > event.clientX ? -1 : 1;
            return { pos: pos, bias: bias };
        };
        MouseSelection.prototype.move = function (event) {
            if (event.buttons == 0)
                return this.destroy();
            if (this.dragging !== false)
                return;
            var _a = this.queryPos(event), pos = _a.pos, bias = _a.bias;
            if (pos == this.curPos && bias == this.curBias)
                return;
            this.curPos = pos;
            this.curBias = bias;
            this.select();
        };
        MouseSelection.prototype.up = function (event) {
            if (this.dragging == null)
                this.select();
            this.destroy();
        };
        MouseSelection.prototype.destroy = function () {
            var doc = this.view.contentDOM.ownerDocument;
            doc.removeEventListener("mousemove", this.move);
            doc.removeEventListener("mouseup", this.up);
            this.inputState.mouseSelection = null;
        };
        MouseSelection.prototype.select = function () {
            var selection = this.update(this.view, this.startSelection, this.startPos, this.startBias, this.curPos, this.curBias, this.extend, this.multiple);
            if (!selection.eq(this.view.state.selection))
                this.view.dispatch(this.view.state.t().setSelection(selection)
                    .addMeta(src$1.Transaction.userEvent("pointer")));
        };
        MouseSelection.prototype.map = function (changes) {
            if (changes.length) {
                this.startSelection = this.startSelection.map(changes);
                this.startPos = changes.mapPos(this.startPos);
                this.curPos = changes.mapPos(this.curPos);
            }
            if (this.dragging)
                this.dragging = this.dragging.map(changes);
        };
        return MouseSelection;
    }());
    function addsSelectionRange(view, event) {
        var behavior = view.behavior.get(extension$1.clickAddsSelectionRange);
        return behavior.length ? behavior[0](event) : browser$1.default.mac ? event.metaKey : event.ctrlKey;
    }
    function dragMovesSelection(view, event) {
        var behavior = view.behavior.get(extension$1.dragMovesSelection);
        return behavior.length ? behavior[0](event) : browser$1.default.mac ? !event.altKey : !event.ctrlKey;
    }
    function isInPrimarySelection(view, pos, event) {
        var primary = view.state.selection.primary;
        if (primary.empty)
            return false;
        if (pos < primary.from || pos > primary.to)
            return false;
        if (pos > primary.from && pos < primary.to)
            return true;
        // On boundary clicks, check whether the coordinates are inside the
        // selection's client rectangles
        var sel = view.root.getSelection();
        if (sel.rangeCount == 0)
            return true;
        var rects = sel.getRangeAt(0).getClientRects();
        for (var i = 0; i < rects.length; i++) {
            var rect = rects[i];
            if (rect.left <= event.clientX && rect.right >= event.clientX &&
                rect.top <= event.clientY && rect.bottom >= event.clientY)
                return true;
        }
        return false;
    }
    function eventBelongsToEditor(view, event) {
        if (!event.bubbles)
            return true;
        if (event.defaultPrevented)
            return false;
        for (var node = event.target; node != view.contentDOM; node = node.parentNode)
            if (!node || node.nodeType == 11 || (node.cmView && node.cmView.ignoreEvent(event)))
                return false;
        return true;
    }
    function customHandlers(view) {
        var result = Object.create(null);
        for (var _i = 0, _a = view.behavior.get(extension$1.handleDOMEvents); _i < _a.length; _i++) {
            var handlers_2 = _a[_i];
            for (var eventType in handlers_2)
                (result[eventType] || (result[eventType] = [])).push(handlers_2[eventType]);
        }
        return result;
    }
    var handlers = Object.create(null);
    // This is very crude, but unfortunately both these browsers _pretend_
    // that they have a clipboard API—all the objects and methods are
    // there, they just don't work, and they are hard to test.
    var brokenClipboardAPI = (browser$1.default.ie && browser$1.default.ie_version < 15) ||
        (browser$1.default.ios && browser$1.default.webkit_version < 604);
    function capturePaste(view) {
        var doc = view.dom.ownerDocument;
        var target = doc.body.appendChild(doc.createElement("textarea"));
        target.style.cssText = "position: fixed; left: -10000px; top: 10px";
        target.focus();
        setTimeout(function () {
            view.focus();
            doc.body.removeChild(target);
            doPaste(view, target.value);
        }, 50);
    }
    function doPaste(view, text) {
        view.dispatch(view.state.t().replaceSelection(text)
            .addMeta(src$1.Transaction.userEvent("paste")).scrollIntoView());
    }
    function mustCapture(event) {
        var mods = (event.ctrlKey ? 1 /* Ctrl */ : 0) | (event.metaKey ? 8 /* Meta */ : 0) |
            (event.altKey ? 2 /* Alt */ : 0) | (event.shiftKey ? 4 /* Shift */ : 0);
        var code = event.keyCode, macCtrl = browser$1.default.mac && mods == 1 /* Ctrl */;
        return code == 8 || (macCtrl && code == 72) || // Backspace, Ctrl-h on Mac
            code == 46 || (macCtrl && code == 68) || // Delete, Ctrl-d on Mac
            code == 27 || // Esc
            (mods == (browser$1.default.mac ? 8 /* Meta */ : 1 /* Ctrl */) && // Ctrl/Cmd-[biyz]
                (code == 66 || code == 73 || code == 89 || code == 90));
    }
    handlers.keydown = function (view, event) {
        if (mustCapture(event))
            event.preventDefault();
        view.inputState.setSelectionOrigin("keyboard");
    };
    handlers.touchdown = handlers.touchmove = function (view, event) {
        view.inputState.setSelectionOrigin("pointer");
    };
    handlers.mousedown = function (view, event) {
        if (event.button == 0)
            view.startMouseSelection(event, updateMouseSelection(event.detail));
    };
    function rangeForClick(view, pos, bias, type) {
        if (type == 1) { // Single click
            return new src$1.SelectionRange(pos);
        }
        else if (type == 2) { // Double click
            return src$1.SelectionRange.groupAt(view.state, pos, bias);
        }
        else { // Triple click
            var context = cursor.LineContext.get(view, pos);
            if (context)
                return new src$1.SelectionRange(context.start + context.line.length, context.start);
            var _a = view.state.doc.lineAt(pos), start = _a.start, end = _a.end;
            return new src$1.SelectionRange(start, end);
        }
    }
    function updateMouseSelection(type) {
        return function (view, startSelection, startPos, startBias, curPos, curBias, extend, multiple) {
            var range = rangeForClick(view, curPos, curBias, type);
            if (startPos != curPos && !extend) {
                var startRange = rangeForClick(view, startPos, startBias, type);
                range = range.extend(Math.min(startRange.from, range.from), Math.max(startRange.to, range.to));
            }
            if (extend)
                return startSelection.replaceRange(startSelection.primary.extend(range.from, range.to));
            else if (multiple)
                return startSelection.addRange(range);
            else
                return src$1.EditorSelection.create([range]);
        };
    }
    handlers.dragstart = function (view, event) {
        var _a = view.state, doc = _a.doc, primary = _a.selection.primary;
        var mouseSelection = view.inputState.mouseSelection;
        if (mouseSelection)
            mouseSelection.dragging = primary;
        if (event.dataTransfer) {
            event.dataTransfer.setData("Text", doc.slice(primary.from, primary.to));
            event.dataTransfer.effectAllowed = "copyMove";
        }
    };
    handlers.drop = function (view, event) {
        if (!event.dataTransfer)
            return;
        var dropPos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        var text = event.dataTransfer.getData("Text");
        if (dropPos < 0 || !text)
            return;
        event.preventDefault();
        var tr = view.state.t();
        var mouseSelection = view.inputState.mouseSelection;
        if (mouseSelection && mouseSelection.dragging && mouseSelection.dragMove) {
            tr.replace(mouseSelection.dragging.from, mouseSelection.dragging.to, "");
            dropPos = tr.changes.mapPos(dropPos);
        }
        var change = new src$1.Change(dropPos, dropPos, view.state.splitLines(text));
        tr.change(change)
            .setSelection(src$1.EditorSelection.single(dropPos, dropPos + change.length))
            .addMeta(src$1.Transaction.userEvent("drop"));
        view.focus();
        view.dispatch(tr);
    };
    handlers.paste = function (view, event) {
        view.docView.observer.flush();
        var data = brokenClipboardAPI ? null : event.clipboardData;
        var text = data && data.getData("text/plain");
        if (text) {
            doPaste(view, text);
            event.preventDefault();
        }
        else {
            capturePaste(view);
        }
    };
    function captureCopy(view, text) {
        // The extra wrapper is somehow necessary on IE/Edge to prevent the
        // content from being mangled when it is put onto the clipboard
        var doc = view.dom.ownerDocument;
        var target = doc.body.appendChild(doc.createElement("textarea"));
        target.style.cssText = "position: fixed; left: -10000px; top: 10px";
        target.value = text;
        target.focus();
        target.selectionEnd = text.length;
        target.selectionStart = 0;
        setTimeout(function () {
            doc.body.removeChild(target);
            view.focus();
        }, 50);
    }
    handlers.copy = handlers.cut = function (view, event) {
        var range = view.state.selection.primary;
        if (range.empty)
            return;
        var data = brokenClipboardAPI ? null : event.clipboardData;
        var text = view.state.joinLines(view.state.doc.sliceLines(range.from, range.to));
        if (data) {
            event.preventDefault();
            data.clearData();
            data.setData("text/plain", text);
        }
        else {
            captureCopy(view, text);
        }
        if (event.type == "cut") {
            view.dispatch(view.state.t().replaceSelection([""]).scrollIntoView().addMeta(src$1.Transaction.userEvent("cut")));
        }
    };
    handlers.focus = function (view) {
        view.update([], [extension$1.focusChange(true)]);
    };
    handlers.blur = function (view) {
        view.update([], [extension$1.focusChange(false)]);
    };
    handlers.beforeprint = function (view) {
        view.docView.checkLayout(true);
    };
    // Dummy slot to force a display update in the absence of other triggers
    var compositionEndSlot = extension.Slot.define();
    function forceClearComposition(view) {
        if (view.docView.compositionDeco.size)
            view.update([], [compositionEndSlot(null)]);
    }
    handlers.compositionstart = handlers.compositionupdate = function (view) {
        if (!view.inputState.composing) {
            if (view.docView.compositionDeco.size) {
                view.docView.observer.flush();
                forceClearComposition(view);
            }
            // FIXME possibly set a timeout to clear it again on Android
            view.inputState.composing = true;
        }
    };
    handlers.compositionend = function (view) {
        view.inputState.composing = false;
        setTimeout(function () {
            if (!view.inputState.composing)
                forceClearComposition(view);
        }, 50);
    };
    });

    unwrapExports(input);
    var input_1 = input.InputState;

    var domchange = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });



    var LINE_SEP = "\ufdda"; // A Unicode 'non-character', used to denote newlines internally
    function applyDOMChange(view, start, end, typeOver) {
        var change, newSel;
        var sel = view.state.selection.primary, bounds;
        if (start > -1 && (bounds = view.docView.domBoundsAround(start, end, 0))) {
            var from = bounds.from, to = bounds.to;
            var selPoints = view.docView.impreciseHead || view.docView.impreciseAnchor ? [] : selectionPoints(view.contentDOM, view.root);
            var reader = new DOMReader(selPoints);
            reader.readRange(bounds.startDOM, bounds.endDOM);
            newSel = selectionFromPoints(selPoints, from);
            var preferredPos = sel.from, preferredSide = null;
            // Prefer anchoring to end when Backspace is pressed
            if (view.inputState.lastKeyCode === 8 && view.inputState.lastKeyTime > Date.now() - 100) {
                preferredPos = sel.to;
                preferredSide = "end";
            }
            var diff = findDiff(view.state.doc.slice(from, to, LINE_SEP), reader.text, preferredPos - from, preferredSide);
            if (diff)
                change = new src$1.Change(from + diff.from, from + diff.toA, reader.text.slice(diff.from, diff.toB).split(LINE_SEP));
        }
        else if (view.hasFocus()) {
            var domSel = view.root.getSelection();
            var _a = view.docView, iHead = _a.impreciseHead, iAnchor = _a.impreciseAnchor;
            var head = iHead && iHead.node == domSel.focusNode && iHead.offset == domSel.focusOffset ? view.state.selection.primary.head
                : view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset);
            var anchor = iAnchor && iAnchor.node == domSel.anchorNode && iAnchor.offset == domSel.anchorOffset ? view.state.selection.primary.anchor
                : dom.selectionCollapsed(domSel) ? head : view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset);
            if (head != sel.head || anchor != sel.anchor)
                newSel = src$1.EditorSelection.single(anchor, head);
        }
        if (!change && !newSel)
            return false;
        // Heuristic to notice typing over a selected character
        if (!change && typeOver && !sel.empty && newSel && newSel.primary.empty)
            change = new src$1.Change(sel.from, sel.to, view.state.doc.sliceLines(sel.from, sel.to));
        if (change) {
            var startState = view.state;
            // Android browsers don't fire reasonable key events for enter,
            // backspace, or delete. So this detects changes that look like
            // they're caused by those keys, and reinterprets them as key
            // events.
            if (browser$1.default.android &&
                ((change.from == sel.from && change.to == sel.to &&
                    change.length == 1 && change.text.length == 2 &&
                    dispatchKey(view, "Enter", 10)) ||
                    (change.from == sel.from - 1 && change.to == sel.to && change.length == 0 &&
                        dispatchKey(view, "Backspace", 8)) ||
                    (change.from == sel.from && change.to == sel.to + 1 && change.length == 0 &&
                        dispatchKey(view, "Delete", 46))))
                return view.state != startState;
            var tr = startState.t();
            if (change.from >= sel.from && change.to <= sel.to && change.to - change.from >= (sel.to - sel.from) / 3) {
                var before = sel.from < change.from ? startState.doc.slice(sel.from, change.from, LINE_SEP) : "";
                var after = sel.to > change.to ? startState.doc.slice(change.to, sel.to, LINE_SEP) : "";
                tr.replaceSelection((before + change.text.join(LINE_SEP) + after).split(LINE_SEP));
            }
            else {
                tr.change(change);
                if (newSel && !tr.selection.primary.eq(newSel.primary))
                    tr.setSelection(tr.selection.replaceRange(newSel.primary));
            }
            view.dispatch(tr.scrollIntoView());
            return true;
        }
        else if (newSel && !newSel.primary.eq(sel)) {
            var tr = view.state.t().setSelection(newSel);
            if (view.inputState.lastSelectionTime > Date.now() - 50) {
                if (view.inputState.lastSelectionOrigin == "keyboard")
                    tr.scrollIntoView();
                else
                    tr.addMeta(src$1.Transaction.userEvent(view.inputState.lastSelectionOrigin));
            }
            view.dispatch(tr);
            return true;
        }
        return false;
    }
    exports.applyDOMChange = applyDOMChange;
    function findDiff(a, b, preferredPos, preferredSide) {
        var minLen = Math.min(a.length, b.length);
        var from = 0;
        while (from < minLen && a.charCodeAt(from) == b.charCodeAt(from))
            from++;
        if (from == minLen && a.length == b.length)
            return null;
        var toA = a.length, toB = b.length;
        while (toA > 0 && toB > 0 && a.charCodeAt(toA - 1) == b.charCodeAt(toB - 1)) {
            toA--;
            toB--;
        }
        if (preferredSide == "end") {
            var adjust = Math.max(0, from - Math.min(toA, toB));
            preferredPos -= toA + adjust - from;
        }
        if (toA < from && a.length < b.length) {
            var move = preferredPos <= from && preferredPos >= toA ? from - preferredPos : 0;
            from -= move;
            toB = from + (toB - toA);
            toA = from;
        }
        else if (toB < from) {
            var move = preferredPos <= from && preferredPos >= toB ? from - preferredPos : 0;
            from -= move;
            toA = from + (toA - toB);
            toB = from;
        }
        return { from: from, toA: toA, toB: toB };
    }
    var DOMReader = /** @class */ (function () {
        function DOMReader(points) {
            this.points = points;
            this.text = "";
        }
        DOMReader.prototype.readRange = function (start, end) {
            if (!start)
                return;
            var parent = start.parentNode;
            for (var cur = start;;) {
                this.findPointBefore(parent, cur);
                this.readNode(cur);
                var next = cur.nextSibling;
                if (next == end)
                    break;
                var view = cur.cmView;
                if ((view ? view.breakAfter : isBlockNode(cur)) ||
                    (isBlockNode(next) && cur.nodeName != "BR"))
                    this.text += LINE_SEP;
                cur = next;
            }
            this.findPointBefore(parent, end);
        };
        DOMReader.prototype.readNode = function (node) {
            if (node.cmIgnore)
                return;
            var view = node.cmView;
            var fromView = view && view.overrideDOMText;
            var text;
            if (fromView != null)
                text = fromView.join(LINE_SEP);
            else if (node.nodeType == 3)
                text = node.nodeValue;
            else if (node.nodeName == "BR")
                text = node.nextSibling ? LINE_SEP : "";
            else if (node.nodeType == 1)
                this.readRange(node.firstChild, null);
            if (text != null) {
                this.findPointIn(node, text.length);
                this.text += text;
            }
        };
        DOMReader.prototype.findPointBefore = function (node, next) {
            for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
                var point = _a[_i];
                if (point.node == node && node.childNodes[point.offset] == next)
                    point.pos = this.text.length;
            }
        };
        DOMReader.prototype.findPointIn = function (node, maxLen) {
            for (var _i = 0, _a = this.points; _i < _a.length; _i++) {
                var point = _a[_i];
                if (point.node == node)
                    point.pos = this.text.length + Math.min(point.offset, maxLen);
            }
        };
        return DOMReader;
    }());
    function isBlockNode(node) {
        return node.nodeType == 1 && /^(DIV|P|LI|UL|OL|BLOCKQUOTE|DD|DT|H\d|SECTION|PRE)$/.test(node.nodeName);
    }
    var DOMPoint = /** @class */ (function () {
        function DOMPoint(node, offset) {
            this.node = node;
            this.offset = offset;
            this.pos = -1;
        }
        return DOMPoint;
    }());
    function selectionPoints(dom, root) {
        var result = [];
        if (root.activeElement != dom)
            return result;
        var _a = root.getSelection(), anchorNode = _a.anchorNode, anchorOffset = _a.anchorOffset, focusNode = _a.focusNode, focusOffset = _a.focusOffset;
        if (anchorNode) {
            result.push(new DOMPoint(anchorNode, anchorOffset));
            if (focusNode != anchorNode || focusOffset != anchorOffset)
                result.push(new DOMPoint(focusNode, focusOffset));
        }
        return result;
    }
    function selectionFromPoints(points, base) {
        if (points.length == 0)
            return null;
        var anchor = points[0].pos, head = points.length == 2 ? points[1].pos : anchor;
        return anchor > -1 && head > -1 ? src$1.EditorSelection.single(anchor + base, head + base) : null;
    }
    function dispatchKey(view, name, code) {
        var options = { key: name, code: name, keyCode: code, which: code, cancelable: true };
        var down = new KeyboardEvent("keydown", options);
        view.contentDOM.dispatchEvent(down);
        var up = new KeyboardEvent("keyup", options);
        view.contentDOM.dispatchEvent(up);
        return down.defaultPrevented || up.defaultPrevented;
    }
    });

    unwrapExports(domchange);
    var domchange_1 = domchange.applyDOMChange;

    var editorview = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });









    var EditorView = /** @class */ (function () {
        function EditorView(config) {
            var _this = this;
            this.plugins = [];
            // @internal
            this.updating = false;
            this.contentDOM = document.createElement("div");
            var tabSizeStyle = this.contentDOM.style.tabSize != null ? "tab-size: " : "-moz-tab-size: ";
            this.contentAttrs = new AttrsFor(extension$1.ViewField.contentAttributeEffect, this.contentDOM, function () { return ({
                spellcheck: "false",
                contenteditable: "true",
                class: "codemirror-content " + exports.styles.content,
                style: tabSizeStyle + _this.state.tabSize
            }); });
            this.dom = document.createElement("div");
            this.dom.appendChild(this.contentDOM);
            this.editorAttrs = new AttrsFor(extension$1.ViewField.editorAttributeEffect, this.dom, function (view) { return ({
                class: "codemirror " + exports.styles.wrapper + (view.hasFocus() ? " codemirror-focused" : "")
            }); });
            this.dispatch = config.dispatch || (function (tr) { return _this.update([tr]); });
            this.root = (config.root || document);
            this.docView = new docview.DocView(this, function (start, end, typeOver) { return domchange.applyDOMChange(_this, start, end, typeOver); });
            this.setState(config.state, config.extensions);
        }
        EditorView.prototype.setState = function (state, extensions) {
            var _this = this;
            if (extensions === void 0) { extensions = []; }
            for (var _i = 0, _a = this.plugins; _i < _a.length; _i++) {
                var plugin = _a[_i];
                if (plugin.destroy)
                    plugin.destroy();
            }
            this.withUpdating(function () {
                _this.behavior = extension$1.ViewExtension.resolve(extensions.concat(state.behavior.foreign));
                _this.fields = _this.behavior.get(extension$1.viewField);
                styleMod.StyleModule.mount(_this.root, exports.styles);
                for (var _i = 0, _a = _this.behavior.get(extension$1.styleModule); _i < _a.length; _i++) {
                    var s = _a[_i];
                    styleMod.StyleModule.mount(_this.root, s);
                }
                if (_this.behavior.foreign.length)
                    throw new Error("Non-ViewExtension extensions found when setting view state");
                _this.inputState = new input.InputState(_this);
                _this.docView.init(state);
                _this.plugins = _this.behavior.get(extension$1.viewPlugin).map(function (spec) { return spec(_this); });
                _this.contentAttrs.update(_this);
                _this.editorAttrs.update(_this);
            });
        };
        EditorView.prototype.update = function (transactions, metadata) {
            var _this = this;
            if (transactions === void 0) { transactions = []; }
            if (metadata === void 0) { metadata = []; }
            var state = this.state;
            for (var _i = 0, transactions_1 = transactions; _i < transactions_1.length; _i++) {
                var tr = transactions_1[_i];
                if (tr.startState != state)
                    throw new RangeError("Trying to update state with a transaction that doesn't start from the current state.");
                state = tr.apply();
            }
            this.withUpdating(function () {
                var update = transactions.length > 0 || metadata.length > 0 ? new extension$1.ViewUpdate(_this, transactions, metadata) : null;
                if (state.doc != _this.state.doc || transactions.some(function (tr) { return tr.selectionSet && !tr.getMeta(src$1.Transaction.preserveGoalColumn); }))
                    _this.inputState.goalColumns.length = 0;
                _this.docView.update(update, transactions.some(function (tr) { return tr.scrolledIntoView; }) ? state.selection.primary.head : -1);
                if (update) {
                    _this.inputState.update(update);
                    _this.updatePlugins(update);
                    _this.contentAttrs.update(_this);
                    _this.editorAttrs.update(_this);
                }
            });
        };
        // @internal
        EditorView.prototype.updatePlugins = function (update) {
            for (var _i = 0, _a = this.plugins; _i < _a.length; _i++) {
                var plugin = _a[_i];
                if (plugin.update)
                    plugin.update(update);
            }
        };
        // @internal
        EditorView.prototype.initInner = function (state, viewport) {
            this.viewport = viewport;
            this.state = state;
            this.fieldValues = [];
            for (var _i = 0, _a = this.fields; _i < _a.length; _i++) {
                var field = _a[_i];
                this.fieldValues.push(field.create(this));
            }
        };
        // @internal
        EditorView.prototype.updateInner = function (update, viewport) {
            this.viewport = viewport;
            this.state = update.state;
            this.fieldValues = [];
            for (var i = 0; i < this.fields.length; i++)
                this.fieldValues.push(this.fields[i].update(update.prevFieldValues[i], update));
        };
        // @internal
        EditorView.prototype.withUpdating = function (f) {
            if (this.updating)
                throw new Error("Calls to EditorView.update or EditorView.setState are not allowed in extension update or create methods");
            this.updating = true;
            try {
                f();
            }
            finally {
                this.updating = false;
            }
        };
        EditorView.prototype.getField = function (field, defaultValue) {
            return extension$1.getField(field, this.fields, this.fieldValues, defaultValue);
        };
        EditorView.prototype.getEffect = function (type) {
            var result = [];
            for (var i = 0; i < this.fieldValues.length; i++) {
                var accessor = extension.Slot.get(type, this.fields[i].effects);
                if (accessor)
                    result.push(accessor(this.fieldValues[i]));
            }
            return result;
        };
        EditorView.prototype.domAtPos = function (pos) {
            return this.docView.domAtPos(pos);
        };
        EditorView.prototype.blockAtHeight = function (height, editorTop) {
            this.docView.forceLayout();
            return this.docView.blockAtHeight(height, editorTop);
        };
        EditorView.prototype.lineAtHeight = function (height, editorTop) {
            this.docView.forceLayout();
            return this.docView.lineAtHeight(height, editorTop);
        };
        EditorView.prototype.lineAt = function (pos, editorTop) {
            this.docView.forceLayout();
            return this.docView.lineAt(pos, editorTop);
        };
        EditorView.prototype.viewportLines = function (f, editorTop) {
            var _a = this.viewport, from = _a.from, to = _a.to;
            this.docView.forEachLine(from, to, f, editorTop);
        };
        Object.defineProperty(EditorView.prototype, "contentHeight", {
            get: function () {
                return this.docView.heightMap.height + this.docView.paddingTop + this.docView.paddingBottom;
            },
            enumerable: true,
            configurable: true
        });
        EditorView.prototype.movePos = function (start, direction, granularity, action) {
            if (granularity === void 0) { granularity = "character"; }
            if (action === void 0) { action = "move"; }
            return cursor.movePos(this, start, direction, granularity, action);
        };
        EditorView.prototype.posAtCoords = function (coords) {
            this.docView.forceLayout();
            return cursor.posAtCoords(this, coords);
        };
        EditorView.prototype.coordsAtPos = function (pos) { return this.docView.coordsAt(pos); };
        Object.defineProperty(EditorView.prototype, "defaultCharacterWidth", {
            get: function () { return this.docView.heightOracle.charWidth; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(EditorView.prototype, "defaultLineHeight", {
            get: function () { return this.docView.heightOracle.lineHeight; },
            enumerable: true,
            configurable: true
        });
        EditorView.prototype.startMouseSelection = function (event, update) {
            this.focus();
            this.inputState.startMouseSelection(this, event, update);
        };
        EditorView.prototype.hasFocus = function () {
            return this.root.activeElement == this.contentDOM;
        };
        EditorView.prototype.focus = function () {
            this.docView.focus();
        };
        EditorView.prototype.destroy = function () {
            for (var _i = 0, _a = this.plugins; _i < _a.length; _i++) {
                var plugin = _a[_i];
                if (plugin.destroy)
                    plugin.destroy();
            }
            this.inputState.destroy();
            this.dom.remove();
            this.docView.destroy();
        };
        return EditorView;
    }());
    exports.EditorView = EditorView;
    var AttrsFor = /** @class */ (function () {
        function AttrsFor(effect, dom, deflt) {
            this.effect = effect;
            this.dom = dom;
            this.deflt = deflt;
            this.attrs = null;
        }
        AttrsFor.prototype.update = function (view) {
            var attrs = this.deflt(view);
            for (var _i = 0, _a = view.getEffect(this.effect); _i < _a.length; _i++) {
                var spec = _a[_i];
                if (spec)
                    attrs = attributes.combineAttrs(spec, attrs);
            }
            attributes.updateAttrs(this.dom, this.attrs, attrs);
            this.attrs = attrs;
        };
        return AttrsFor;
    }());
    exports.styles = new styleMod.StyleModule({
        wrapper: {
            position: "relative !important",
            display: "flex !important",
            alignItems: "flex-start !important",
            fontFamily: "monospace",
            lineHeight: 1.4,
            "&.codemirror-focused": {
                // FIXME it would be great if we could directly use the browser's
                // default focus outline, but it appears we can't, so this tries to
                // approximate that
                outline_fallback: "1px dotted #212121",
                outline: "5px auto -webkit-focus-ring-color"
            }
        },
        content: {
            margin: 0,
            flexGrow: 2,
            minHeight: "100%",
            display: "block",
            whiteSpace: "pre",
            boxSizing: "border-box",
            padding: "4px 0",
            outline: "none",
            caretColor: "black",
        },
        line: {
            display: "block",
            padding: "0 2px 0 4px"
        }
    }, { priority: 0 });
    });

    unwrapExports(editorview);
    var editorview_1 = editorview.EditorView;
    var editorview_2 = editorview.styles;

    var src$2 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    exports.EditorView = editorview.EditorView;

    exports.ViewExtension = extension$1.ViewExtension;
    exports.ViewField = extension$1.ViewField;
    exports.handleDOMEvents = extension$1.handleDOMEvents;
    exports.viewPlugin = extension$1.viewPlugin;
    exports.styleModule = extension$1.styleModule;
    exports.focusChange = extension$1.focusChange;
    exports.ViewUpdate = extension$1.ViewUpdate;
    exports.clickAddsSelectionRange = extension$1.clickAddsSelectionRange;
    exports.dragMovesSelection = extension$1.dragMovesSelection;

    exports.Viewport = viewport.Viewport;

    exports.Decoration = decoration.Decoration;
    exports.WidgetType = decoration.WidgetType;

    exports.BlockInfo = heightmap.BlockInfo;

    exports.DOMPos = contentview.DOMPos;

    exports.Slot = extension.Slot;
    });

    unwrapExports(src$2);
    var src_1$2 = src$2.EditorView;
    var src_2$2 = src$2.ViewExtension;
    var src_3$2 = src$2.ViewField;
    var src_4$2 = src$2.handleDOMEvents;
    var src_5$2 = src$2.viewPlugin;
    var src_6$2 = src$2.styleModule;
    var src_7$2 = src$2.focusChange;
    var src_8$2 = src$2.ViewUpdate;
    var src_9$2 = src$2.clickAddsSelectionRange;
    var src_10$2 = src$2.dragMovesSelection;
    var src_11$1 = src$2.Viewport;
    var src_12$1 = src$2.Decoration;
    var src_13 = src$2.WidgetType;
    var src_14 = src$2.BlockInfo;
    var src_15 = src$2.DOMPos;
    var src_16 = src$2.Slot;

    var misc = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    // Counts the column offset in a string, taking tabs into account.
    // Used mostly to find indentation.
    function countColumn(string, end, tabSize, startIndex, startValue) {
        if (end == null) {
            end = string.search(/[^\s\u00a0]/);
            if (end == -1)
                end = string.length;
        }
        for (var i = startIndex || 0, n = startValue || 0;;) {
            var nextTab = string.indexOf("\t", i);
            if (nextTab < 0 || nextTab >= end)
                return n + (end - i);
            n += nextTab - i;
            n += tabSize - (n % tabSize);
            i = nextTab + 1;
        }
    }
    exports.countColumn = countColumn;
    });

    unwrapExports(misc);
    var misc_1 = misc.countColumn;

    var stringstream = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    // STRING STREAM
    // Fed to the mode parsers, provides helper functions to make
    // parsers more succinct.
    var StringStream = /** @class */ (function () {
        function StringStream(string, tabSize, lineOracle) {
            this.string = string;
            this.tabSize = tabSize;
            this.lineOracle = lineOracle;
            this.pos = this.start = 0;
            this.string = string;
            this.tabSize = tabSize || 8;
            this.lastColumnPos = this.lastColumnValue = 0;
            this.lineStart = 0;
            this.lineOracle = lineOracle;
        }
        StringStream.prototype.eol = function () { return this.pos >= this.string.length; };
        StringStream.prototype.sol = function () { return this.pos == this.lineStart; };
        StringStream.prototype.peek = function () { return this.string.charAt(this.pos) || undefined; };
        StringStream.prototype.next = function () {
            if (this.pos < this.string.length)
                return this.string.charAt(this.pos++);
        };
        StringStream.prototype.eat = function (match) {
            var ch = this.string.charAt(this.pos);
            var ok;
            if (typeof match == "string")
                ok = ch == match;
            else
                ok = ch && (match instanceof RegExp ? match.test(ch) : match(ch));
            if (ok) {
                ++this.pos;
                return ch;
            }
        };
        StringStream.prototype.eatWhile = function (match) {
            var start = this.pos;
            while (this.eat(match)) { }
            return this.pos > start;
        };
        StringStream.prototype.eatSpace = function () {
            var start = this.pos;
            while (/[\s\u00a0]/.test(this.string.charAt(this.pos)))
                ++this.pos;
            return this.pos > start;
        };
        StringStream.prototype.skipToEnd = function () { this.pos = this.string.length; };
        StringStream.prototype.skipTo = function (ch) {
            var found = this.string.indexOf(ch, this.pos);
            if (found > -1) {
                this.pos = found;
                return true;
            }
        };
        StringStream.prototype.backUp = function (n) { this.pos -= n; };
        StringStream.prototype.column = function () {
            if (this.lastColumnPos < this.start) {
                this.lastColumnValue = misc.countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
                this.lastColumnPos = this.start;
            }
            return this.lastColumnValue - (this.lineStart ? misc.countColumn(this.string, this.lineStart, this.tabSize) : 0);
        };
        StringStream.prototype.indentation = function () {
            return misc.countColumn(this.string, null, this.tabSize) -
                (this.lineStart ? misc.countColumn(this.string, this.lineStart, this.tabSize) : 0);
        };
        StringStream.prototype.match = function (pattern, consume, caseInsensitive) {
            if (typeof pattern == "string") {
                var cased = function (str) { return caseInsensitive ? str.toLowerCase() : str; };
                var substr = this.string.substr(this.pos, pattern.length);
                if (cased(substr) == cased(pattern)) {
                    if (consume !== false)
                        this.pos += pattern.length;
                    return true;
                }
                else
                    return null;
            }
            else {
                var match = this.string.slice(this.pos).match(pattern);
                if (match && match.index > 0)
                    return null;
                if (match && consume !== false)
                    this.pos += match[0].length;
                return match;
            }
        };
        StringStream.prototype.current = function () { return this.string.slice(this.start, this.pos); };
        StringStream.prototype.hideFirstChars = function (n, inner) {
            this.lineStart += n;
            try {
                return inner();
            }
            finally {
                this.lineStart -= n;
            }
        };
        StringStream.prototype.lookAhead = function (n) {
            var oracle = this.lineOracle;
            return oracle && oracle.lookAhead(n);
        };
        StringStream.prototype.baseToken = function () {
            var oracle = this.lineOracle;
            return oracle && oracle.baseToken(this.pos);
        };
        return StringStream;
    }());
    exports.StringStream = StringStream;
    });

    unwrapExports(stringstream);
    var stringstream_1 = stringstream.StringStream;

    var stringstreamcursor = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });

    var StringStreamCursor = /** @class */ (function () {
        function StringStreamCursor(text, offset, tabSize) {
            if (tabSize === void 0) { tabSize = 4; }
            this.offset = offset;
            this.tabSize = tabSize;
            this.iter = text.iterLines(offset);
            this.curLineEnd = this.offset - 1;
        }
        StringStreamCursor.prototype.next = function () {
            var _a = this.iter.next(), value = _a.value, done = _a.done;
            if (done)
                throw new RangeError("Reached end of document");
            var res = new stringstream.StringStream(value, this.tabSize, null);
            this.offset = this.curLineEnd + 1;
            this.curLineEnd += value.length + 1;
            return res;
        };
        return StringStreamCursor;
    }());
    exports.StringStreamCursor = StringStreamCursor;
    });

    unwrapExports(stringstreamcursor);
    var stringstreamcursor_1 = stringstreamcursor.StringStreamCursor;

    var util = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });
    function readToken(mode, stream, state) {
        for (var i = 0; i < 10; i++) {
            //if (inner) inner[0] = innerMode(mode, state).mode
            var style = mode.token(stream, state);
            if (stream.pos > stream.start)
                return style;
        }
        throw new Error("Mode " + mode.name + " failed to advance stream.");
    }
    exports.readToken = readToken;
    function copyState(mode, state) {
        if (state === true)
            return state;
        if (mode.copyState)
            return mode.copyState(state);
        var nstate = {};
        for (var n in state) {
            var val = state[n];
            if (val instanceof Array)
                val = val.concat([]);
            nstate[n] = val;
        }
        return nstate;
    }
    exports.copyState = copyState;
    });

    unwrapExports(util);
    var util_1 = util.readToken;
    var util_2 = util.copyState;

    var src$3 = createCommonjsModule(function (module, exports) {
    Object.defineProperty(exports, "__esModule", { value: true });





    var CachedState = /** @class */ (function () {
        function CachedState(state, pos) {
            this.state = state;
            this.pos = pos;
        }
        CachedState.prototype.copy = function (mode) { return new CachedState(util.copyState(mode, this.state), this.pos); };
        return CachedState;
    }());
    var MAX_SCAN_DIST = 20000;
    function cutDecoratedRange(range, at) {
        if (!range || at <= range.from)
            return null;
        return { from: range.from, to: Math.min(at, range.to), decorations: range.decorations.filter(function (_a) {
                var to = _a.to;
                return to <= at;
            }) };
    }
    var StateCache = /** @class */ (function () {
        function StateCache(states, frontier, lastDecorations) {
            this.states = states;
            this.frontier = frontier;
            this.lastDecorations = lastDecorations;
        }
        StateCache.prototype.advanceFrontier = function (editorState, to, mode, sleepTime, maxWorkTime) {
            var _this = this;
            if (this.frontier >= to)
                return Promise.reject();
            clearTimeout(this.timeout);
            return new Promise(function (resolve) {
                var f = function () {
                    var endTime = +new Date + maxWorkTime;
                    do {
                        var target = Math.min(to, _this.frontier + MAX_SCAN_DIST / 2);
                        _this.getState(editorState, target, mode);
                        if (_this.frontier >= to)
                            return resolve();
                    } while (+new Date < endTime);
                    _this.timeout = setTimeout(f, sleepTime);
                };
                _this.timeout = setTimeout(f, sleepTime);
            });
        };
        StateCache.prototype.calculateDecorations = function (editorState, from, to, mode) {
            var state = this.getState(editorState, from, mode);
            var cursor = new stringstreamcursor.StringStreamCursor(editorState.doc, from, editorState.tabSize);
            var states = [], decorations = [], stream = cursor.next();
            for (var i = 0; cursor.offset + stream.start < to;) {
                if (stream.eol()) {
                    stream = cursor.next();
                    if (++i % 5 == 0)
                        states.push(new CachedState(util.copyState(mode, state), cursor.offset));
                }
                else {
                    var style = util.readToken(mode, stream, state);
                    if (style)
                        decorations.push(decoration.Decoration.mark(cursor.offset + stream.start, cursor.offset + stream.pos, { class: 'cm-' + style.replace(/ /g, ' cm-') }));
                    stream.start = stream.pos;
                }
            }
            this.storeStates(from, to, states);
            return decorations;
        };
        StateCache.prototype.getDecorations = function (editorState, from, to, mode) {
            var upto = from, decorations = [];
            if (this.lastDecorations) {
                if (from < this.lastDecorations.from) {
                    upto = Math.min(to, this.lastDecorations.from);
                    decorations = this.calculateDecorations(editorState, from, upto, mode);
                }
                if (upto < to && this.lastDecorations.to > upto) {
                    upto = this.lastDecorations.to;
                    decorations = decorations.concat(this.lastDecorations.decorations);
                }
            }
            if (upto < to) {
                decorations = decorations.concat(this.calculateDecorations(editorState, upto, to, mode));
            }
            this.lastDecorations = { from: from, to: to, decorations: decorations };
            return decorations;
        };
        StateCache.prototype.storeStates = function (from, to, states) {
            var _a;
            var start = this.findIndex(from), end = this.findIndex(to);
            (_a = this.states).splice.apply(_a, [start, end - start].concat(states));
            if (from <= this.frontier)
                this.frontier = Math.max(this.frontier, to);
        };
        // Return the first index for which all cached states after it have
        // a position >= pos
        StateCache.prototype.findIndex = function (pos) {
            // FIXME could be binary search
            var i = 0;
            while (i < this.states.length && this.states[i].pos < pos)
                i++;
            return i;
        };
        StateCache.prototype.stateBefore = function (pos, mode) {
            if (pos > this.frontier && pos - this.frontier < MAX_SCAN_DIST)
                pos = this.frontier;
            var index = this.findIndex(pos);
            if (index < this.states.length && this.states[index].pos == pos)
                index++;
            return index == 0 ? new CachedState(mode.startState(), 0) : this.states[index - 1].copy(mode);
        };
        StateCache.prototype.getState = function (editorState, pos, mode) {
            var _a = this.stateBefore(pos, mode), statePos = _a.pos, state = _a.state;
            if (statePos < pos - MAX_SCAN_DIST) {
                statePos = pos;
                state = mode.startState();
            }
            else if (this.lastDecorations && (statePos < this.lastDecorations.from && this.lastDecorations.from <= pos))
                // If we are calculating a correct state for a position that is after the
                // beginning of the cached decorations (which suggests that the cached
                // decorations were rendered based on an approximate state), clear that cache
                this.lastDecorations = null;
            if (statePos < pos) {
                var cursor = new stringstreamcursor.StringStreamCursor(editorState.doc, statePos, editorState.tabSize);
                var stream = cursor.next();
                var start = statePos, i = 0, states = [];
                while (statePos < pos) {
                    if (stream.eol()) {
                        stream = cursor.next();
                        statePos++;
                        if (++i % 50)
                            states.push(new CachedState(util.copyState(mode, state), statePos));
                    }
                    else {
                        util.readToken(mode, stream, state);
                        statePos += stream.pos - stream.start;
                        stream.start = stream.pos;
                    }
                }
                this.storeStates(start, pos, states);
            }
            return state;
        };
        StateCache.prototype.apply = function (transaction) {
            if (transaction.changes.length == 0)
                return this;
            var start = transaction.doc.lineAt(transaction.changes.changes.reduce(function (m, ch) { return Math.min(m, ch.from); }, 1e9)).start;
            var states = [];
            for (var _i = 0, _a = this.states; _i < _a.length; _i++) {
                var cached = _a[_i];
                var mapped = transaction.changes.mapPos(cached.pos, -1, src$1.MapMode.TrackDel);
                if (mapped > 0)
                    states.push(mapped == cached.pos ? cached : new CachedState(cached.state, mapped));
            }
            return new StateCache(states, Math.min(start, this.frontier), cutDecoratedRange(this.lastDecorations, start));
        };
        return StateCache;
    }());
    exports.legacyMode = function (config) {
        var field = new src$1.StateField({
            init: function (state) { return new StateCache([], 0, null); },
            apply: function (tr, cache) { return cache.apply(tr); }
        });
        return src$1.StateExtension.all(field.extension, src$2.ViewField.decorations(decoSpec(field, config)), src$1.StateExtension.indentation(function (state, pos) {
            if (!config.mode.indent)
                return -1;
            var modeState = state.getField(field).getState(state, pos, config.mode);
            var line = state.doc.lineAt(pos);
            return config.mode.indent(modeState, line.slice(0, Math.min(line.length, 100)).match(/^\s*(.*)/)[1]);
        })
        // FIXME add a token-retrieving behavior
        );
    };
    function decoSpec(field, config) {
        var _a = config.sleepTime, sleepTime = _a === void 0 ? 100 : _a, _b = config.maxWorkTime, maxWorkTime = _b === void 0 ? 100 : _b, mode = config.mode;
        var decorations = decoration.Decoration.none, from = -1, to = -1;
        function update(view, force) {
            var viewport = view.viewport, state = view.state;
            if (force || viewport.from < from || viewport.to > to) {
                (from = viewport.from, to = viewport.to);
                var stateCache = state.getField(field);
                decorations = decoration.Decoration.set(stateCache.getDecorations(state, from, to, mode));
                stateCache.advanceFrontier(state, from, mode, sleepTime, maxWorkTime).then(function () {
                    update(view, true);
                    view.update([]); // FIXME maybe add a specific EditorView method for this
                }, function () { });
            }
            return decorations;
        }
        return {
            create: function (view) { return update(view, false); },
            update: function (_, u) { return update(u.view, u.docChanged); }
        };
    }
    });

    unwrapExports(src$3);
    var src_3$3 = src$3.legacyMode;

    /// A syntax tree node prop used to associate indentation strategies
    /// with node types. Such a strategy is a function from an indentation
    /// context to a number. That number may be -1, to indicate that no
    /// definitive indentation can be determined, or a column number to
    /// which the given line should be indented.
    const indentNodeProp = new tree_2();
    function syntaxIndentation(syntax) {
        return EditorState.indentation((state, pos) => {
            let tree = syntax.getPartialTree(state, pos, pos);
            return computeIndentation(state, tree, pos);
        });
    }
    // Compute the indentation for a given position from the syntax tree.
    function computeIndentation(state, ast, pos) {
        let tree = ast.resolve(pos);
        // Enter previous nodes that end in empty error terms, which means
        // they were broken off by error recovery, so that indentation
        // works even if the constructs haven't been finished.
        for (let scan = tree, scanPos = pos;;) {
            let last = scan.childBefore(scanPos);
            if (!last)
                break;
            if (last.type.prop(tree_2.error) && last.start == last.end) {
                tree = scan;
                scanPos = last.start;
            }
            else {
                scan = last;
                scanPos = scan.end + 1;
            }
        }
        for (; tree; tree = tree.parent) {
            let strategy = indentStrategy(tree.type) || (tree.parent == null ? topIndent : null);
            if (strategy)
                return strategy(new IndentContext(state, pos, tree));
        }
        return -1;
    }
    function indentStrategy(type) {
        let strategy = type.prop(indentNodeProp);
        if (!strategy) {
            let delim = type.prop(tree_2.delim);
            if (delim)
                return delimitedIndent({ closing: delim.split(" ")[1] });
        }
        return strategy;
    }
    function topIndent() { return 0; }
    /// Objects of this type provide context information and helper
    /// methods to indentation functions.
    class IndentContext {
        /// @internal
        constructor(
        /// The editor state.
        state, 
        /// The position at which indentation is being computed.
        pos, 
        /// The syntax tree node for which the indentation strategy is
        /// registered.
        node) {
            this.state = state;
            this.pos = pos;
            this.node = node;
        }
        /// The indent unit (number of spaces per indentation level).
        get unit() { return this.state.indentUnit; }
        /// Get the text directly after `this.pos`, either the entire line
        /// or the next 50 characters, whichever is shorter.
        get textAfter() {
            return this.state.doc.slice(this.pos, Math.min(this.pos + 50, this.state.doc.lineAt(this.pos).end)).match(/^\s*(.*)/)[1];
        }
        /// find the column position (taking tabs into account) of the given
        /// position in the given string.
        countColumn(line, pos) {
            // FIXME use extending character information
            if (pos < 0)
                pos = line.length;
            let tab = this.state.tabSize;
            for (var i = 0, n = 0;;) {
                let nextTab = line.indexOf("\t", i);
                if (nextTab < 0 || nextTab >= pos)
                    return n + (pos - i);
                n += nextTab - i;
                n += tab - (n % tab);
                i = nextTab + 1;
            }
        }
        /// Find the indentation column of the given document line.
        lineIndent(line) {
            let text = line.slice(0, Math.min(50, line.length, this.node.start > line.start ? this.node.start - line.start : 1e8));
            return this.countColumn(text, text.search(/\S/));
        }
        /// Get the indentation at the reference line for `this.tree`, which
        /// is the line on which it starts, unless there is a node that is
        /// _not_ a parent of this node covering the start of that line. If
        /// so, the line at the start of that node is tried, again skipping
        /// on if it is covered by another such node.
        get baseIndent() {
            let line = this.state.doc.lineAt(this.node.start);
            // Skip line starts that are covered by a sibling (or cousin, etc)
            for (;;) {
                let atBreak = this.node.resolve(line.start);
                while (atBreak.parent && atBreak.parent.start == atBreak.start)
                    atBreak = atBreak.parent;
                if (isParent(atBreak, this.node))
                    break;
                line = this.state.doc.lineAt(atBreak.start);
            }
            return this.lineIndent(line);
        }
        /// Find the column for the given position.
        column(pos) {
            let line = this.state.doc.lineAt(pos);
            return this.countColumn(line.slice(0, pos - line.start), pos - line.start);
        }
    }
    function isParent(parent, of) {
        for (let cur = of; cur; cur = cur.parent)
            if (parent == cur)
                return true;
        return false;
    }
    // Check whether a delimited node is aligned (meaning there are
    // non-skipped nodes on the same line as the opening delimiter). And
    // if so, return the opening token.
    function bracketedAligned(context) {
        let tree = context.node;
        let openToken = tree.childAfter(tree.start);
        if (!openToken)
            return null;
        let openLine = context.state.doc.lineAt(openToken.start);
        for (let pos = openToken.end;;) {
            let next = tree.childAfter(pos);
            if (!next)
                return null;
            if (!next.type.prop(tree_2.skipped))
                return next.start < openLine.end ? openToken : null;
            pos = next.end;
        }
    }
    /// An indentation strategy for delimited (usually bracketed) nodes.
    /// Will, by default, indent one unit more than the parent's base
    /// indent unless the line starts with a closing token. When `align`
    /// is true and there are non-skipped nodes on the node's opening
    /// line, the content of the node will be aligned with the end of the
    /// opening node, like this:
    ///
    ///     foo(bar,
    ///         baz)
    function delimitedIndent({ closing, align = true, units = 1 }) {
        return (context) => {
            let closed = context.textAfter.slice(0, closing.length) == closing;
            let aligned = align ? bracketedAligned(context) : null;
            if (aligned)
                return closed ? context.column(aligned.start) : context.column(aligned.end);
            return context.baseIndent + (closed ? 0 : context.unit * units);
        };
    }
    /// An indentation strategy that aligns a node content to its base
    /// indentation.
    const flatIndent = (context) => context.baseIndent;
    /// Creates an indentation strategy that, by default, indents
    /// continued lines one unit more than the node's base indentation.
    /// You can provide `except` to prevent indentation of lines that
    /// match a pattern (for example `/^else\b/` in `if`/`else`
    /// constructs), and you can change the amount of units used with the
    /// `units` option.
    function continuedIndent({ except, units = 1 } = {}) {
        return (context) => {
            let matchExcept = except && except.test(context.textAfter);
            return context.baseIndent + (matchExcept ? 0 : units * context.unit);
        };
    }

    /// This node prop is used to associate folding information with node
    /// types. Given a subtree, it should check whether that tree is
    /// foldable and return the range that can be collapsed when it is.
    const foldNodeProp = new tree_2();
    function syntaxFolding(syntax) {
        return EditorState.foldable((state, start, end) => {
            let tree = syntax.getPartialTree(state, start, Math.min(state.doc.length, end + 100));
            let inner = tree.resolve(end);
            let found = null;
            for (let cur = inner; cur; cur = cur.parent) {
                if (cur.start < start || cur.end <= end)
                    continue;
                let prop = cur.type.prop(foldNodeProp);
                if (prop) {
                    let value = prop(cur);
                    if (value && value.to > end)
                        found = value;
                }
            }
            return found;
        });
    }

    /// A [syntax provider](#state.Syntax) based on a
    /// [Lezer](https://lezer.codemirror.net) parser.
    class LezerSyntax {
        /// Create a syntax instance for the given parser. You'll usually
        /// want to use the
        /// [`withProps`](https://lezer.codemirror.net/docs/ref/#lezer.Parser.withProps)
        /// method to register CodeMirror-specific syntax node props in the
        /// parser, before passing it to this constructor.
        constructor(parser) {
            this.parser = parser;
            this.field = new StateField({
                init() { return new SyntaxState(tree_7.empty); },
                apply(tr, value) { return value.apply(tr); }
            });
            this.extension = [EditorState.syntax(this), this.field.extension, syntaxIndentation(this), syntaxFolding(this)];
        }
        tryGetTree(state, from, to) {
            let field = state.field(this.field);
            return field.updateTree(this.parser, state.doc, from, to, false) ? field.tree : null;
        }
        getTree(state, from, to) {
            let field = state.field(this.field);
            let rest = field.updateTree(this.parser, state.doc, from, to, true);
            return { tree: field.tree, rest: rest === true ? null : rest };
        }
        getPartialTree(state, from, to) {
            let field = state.field(this.field);
            field.updateTree(this.parser, state.doc, from, to, false);
            return field.tree;
        }
        languageDataAt(state, pos) {
            let type = this.parser.group.types[1];
            if (this.parser.hasNested) {
                let tree = this.getPartialTree(state, pos, pos);
                let target = tree.resolve(pos);
                while (target) {
                    if (target.type.prop(tree_2.top)) {
                        type = target.type;
                        break;
                    }
                    target = target.parent;
                }
            }
            return (type.prop(languageData) || nothing);
        }
    }
    const nothing = {};
    class DocStream {
        constructor(doc, length = doc.length) {
            this.doc = doc;
            this.length = length;
            this.cursorPos = 0;
            this.string = "";
            this.cursor = doc.iter();
        }
        get(pos) {
            if (pos >= this.length)
                return -1;
            let stringStart = this.cursorPos - this.string.length;
            if (pos < stringStart || pos >= this.cursorPos) {
                if (pos < this.cursorPos) { // Reset the cursor if we have to go back
                    this.cursor = this.doc.iter();
                    this.cursorPos = 0;
                }
                this.string = this.cursor.next(pos - this.cursorPos).value;
                this.cursorPos = pos + this.string.length;
                stringStart = this.cursorPos - this.string.length;
            }
            return this.string.charCodeAt(pos - stringStart);
        }
        read(from, to) {
            let stringStart = this.cursorPos - this.string.length;
            if (from < stringStart || to >= this.cursorPos)
                return this.doc.slice(from, to);
            else
                return this.string.slice(from - stringStart, to - stringStart);
        }
        clip(at) {
            return new DocStream(this.doc, at);
        }
    }
    class RequestInfo {
        constructor(upto) {
            this.upto = upto;
            this.promise = new Promise(r => this.resolve = r);
            this.promise.canceled = false;
        }
    }
    class SyntaxState {
        constructor(tree) {
            this.tree = tree;
            this.parsedTo = 0;
            this.parse = null;
            this.working = -1;
            this.requests = [];
        }
        apply(tr) {
            return tr.docChanged ? new SyntaxState(this.tree.applyChanges(tr.changes.changedRanges())) : this;
        }
        // FIXME implement clearing out parts of the tree when it is too big
        updateTree(parser, doc, from, to, rest) {
            if (to <= this.parsedTo)
                return true;
            if (!this.parse) {
                this.parse = parser.startParse(new DocStream(doc), { cache: this.tree });
                this.continueParse(to);
            }
            if (this.parsedTo >= to)
                return true;
            if (!rest)
                return false;
            this.scheduleWork();
            let req = this.requests.find(r => r.upto == to && !r.promise.canceled);
            if (!req)
                this.requests.push(req = new RequestInfo(to));
            return req.promise;
        }
        continueParse(to) {
            let endTime = Date.now() + 100 /* Slice */;
            for (let i = 0;; i++) {
                let done = this.parse.advance();
                if (done) {
                    this.parsedTo = 1e9;
                    this.parse = null;
                    this.tree = done;
                    return;
                }
                if (i == 1000) {
                    i = 0;
                    if (Date.now() > endTime)
                        break;
                }
            }
            this.parsedTo = this.parse.pos;
            // FIXME somehow avoid rebuilding all the nodes that are already
            // in this.tree when this happens repeatedly
            this.tree = this.parse.forceFinish();
            if (this.parsedTo >= to)
                this.parse = null;
        }
        scheduleWork() {
            if (this.working != -1)
                return;
            this.working = setTimeout(() => this.work(), 200 /* Pause */);
        }
        work() {
            this.working = -1;
            let to = this.requests.reduce((max, req) => req.promise.canceled ? max : Math.max(max, req.upto), 0);
            if (to > this.parsedTo)
                this.continueParse(to);
            this.requests = this.requests.filter(req => {
                if (!req.promise.canceled && req.upto > this.parsedTo)
                    return true;
                if (!req.promise.canceled)
                    req.resolve(this.tree);
                return false;
            });
            if (this.requests.length)
                this.scheduleWork();
        }
    }

    function mkMatchProp() { return new tree_2({ deserialize(str) { return str.split(" "); } }); }
    /// A node prop that encodes information about which other nodes match
    /// this node as delimiters. Should hold a space-separated list of
    /// node names of the closing nodes that match this node.
    const openNodeProp = mkMatchProp();
    /// Like `openNodeProp`, but for closing nodes. Should hold a
    /// space-separated list of opening node names that match this closing
    /// delimiter.
    const closeNodeProp = mkMatchProp();

    const defaultStyles = new StyleModule({
        matchingBracket: { color: "#0b0" },
        nonmatchingBracket: { color: "#a22" }
    });
    const DEFAULT_SCAN_DIST = 10000, DEFAULT_BRACKETS = "()[]{}";
    /// Create an extension that enables bracket matching. Whenever the
    /// cursor is next to a bracket, that bracket and the one it matches
    /// are highlighted. Or, when no matching bracket is found, another
    /// highlighting style is used to indicate this.
    const bracketMatching = EditorView.extend.unique((configs) => {
        let config = combineConfig(configs, {
            afterCursor: true,
            brackets: DEFAULT_BRACKETS,
            maxScanDistance: DEFAULT_SCAN_DIST
        });
        return [
            EditorView.extend.fallback(EditorView.styleModule(defaultStyles)),
            ViewPlugin.decoration({
                create() { return Decoration.none; },
                update(deco, update) {
                    if (!update.transactions.length)
                        return deco;
                    let { state } = update, decorations = [];
                    for (let range of state.selection.ranges) {
                        if (!range.empty)
                            continue;
                        let match = matchBrackets(state, range.head, -1, config)
                            || (range.head > 0 && matchBrackets(state, range.head - 1, 1, config))
                            || (config.afterCursor &&
                                (matchBrackets(state, range.head, 1, config) ||
                                    (range.head < state.doc.length && matchBrackets(state, range.head + 1, -1, config))));
                        if (!match)
                            continue;
                        let styleName = match.matched ? "matchingBracket" : "nonmatchingBracket";
                        let style = update.view.cssClass(styleName) + " " + defaultStyles[styleName];
                        decorations.push(Decoration.mark(match.start.from, match.start.to, { class: style }));
                        if (match.end)
                            decorations.push(Decoration.mark(match.end.from, match.end.to, { class: style }));
                    }
                    return Decoration.set(decorations);
                }
            })
        ];
    }, {});
    function getTree(state, pos, dir, maxScanDistance) {
        for (let syntax of state.behavior(EditorState.syntax)) {
            return syntax.getPartialTree(state, dir < 0 ? Math.max(0, pos - maxScanDistance) : pos, dir < 0 ? pos : Math.min(state.doc.length, pos + maxScanDistance));
        }
        return tree_7.empty;
    }
    function matchingNodes(node, dir, brackets) {
        let byProp = node.prop(dir < 0 ? closeNodeProp : openNodeProp);
        if (byProp)
            return byProp;
        if (node.name.length == 1) {
            let index = brackets.indexOf(node.name);
            if (index > -1 && index % 2 == (dir < 0 ? 1 : 0))
                return [brackets[index + dir]];
        }
        return null;
    }
    /// Find the matching bracket for the token at `pos`, scanning
    /// direction `dir`. Only the `brackets` and `maxScanDistance`
    /// properties are used from `config`, if given. Returns null if no
    /// bracket was found at `pos`, or a match result otherwise.
    function matchBrackets(state, pos, dir, config = {}) {
        let maxScanDistance = config.maxScanDistance || DEFAULT_SCAN_DIST, brackets = config.brackets || DEFAULT_BRACKETS;
        let tree = getTree(state, pos, dir, maxScanDistance);
        let sub = tree.resolve(pos, dir), matches;
        if (matches = matchingNodes(sub.type, dir, brackets))
            return matchMarkedBrackets(state, pos, dir, sub, matches, brackets);
        else
            return matchPlainBrackets(state, pos, dir, tree, sub.type, maxScanDistance, brackets);
    }
    function matchMarkedBrackets(state, pos, dir, token, matching, brackets) {
        let parent = token.parent, firstToken = { from: token.start, to: token.end };
        let depth = 0;
        return (parent && parent.iterate({
            from: dir < 0 ? token.start : token.end,
            to: dir < 0 ? parent.start : parent.end,
            enter(type, from, to) {
                if (dir < 0 ? to > token.start : from < token.end)
                    return undefined;
                if (depth == 0 && matching.indexOf(type.name) > -1) {
                    return { start: firstToken, end: { from, to }, matched: true };
                }
                else if (matchingNodes(type, dir, brackets)) {
                    depth++;
                }
                else if (matchingNodes(type, -dir, brackets)) {
                    depth--;
                    if (depth == 0)
                        return { start: firstToken, end: { from, to }, matched: false };
                }
                return false;
            }
        })) || { start: firstToken, matched: false };
    }
    function matchPlainBrackets(state, pos, dir, tree, tokenType, maxScanDistance, brackets) {
        let startCh = dir < 0 ? state.doc.slice(pos - 1, pos) : state.doc.slice(pos, pos + 1);
        let bracket = brackets.indexOf(startCh);
        if (bracket < 0 || (bracket % 2 == 0) != (dir > 0))
            return null;
        let startToken = { from: dir < 0 ? pos - 1 : pos, to: dir > 0 ? pos + 1 : pos };
        let iter = state.doc.iterRange(pos, dir > 0 ? state.doc.length : 0), depth = 0;
        for (let distance = 0; !(iter.next()).done && distance <= maxScanDistance;) {
            let text = iter.value;
            if (dir < 0)
                distance += text.length;
            let basePos = pos + distance * dir;
            for (let pos = dir > 0 ? 0 : text.length - 1, end = dir > 0 ? text.length : -1; pos != end; pos += dir) {
                let found = brackets.indexOf(text[pos]);
                if (found < 0 || tree.resolve(basePos + pos, 1).type != tokenType)
                    continue;
                if ((found % 2 == 0) == (dir > 0)) {
                    depth++;
                }
                else if (depth == 1) { // Closing
                    return { start: startToken, end: { from: basePos + pos, to: basePos + pos + 1 }, matched: (found >> 1) == (bracket >> 1) };
                }
                else {
                    depth--;
                }
            }
            if (dir > 0)
                distance += text.length;
        }
        return iter.done ? { start: startToken, matched: false } : null;
    }

    var dist = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, '__esModule', { value: true });



    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    var Badness;
    (function (Badness) {
        // Amount to add for a single recover action
        Badness[Badness["Unit"] = 100] = "Unit";
        // Badness at which we disallow adding a stack if another stack
        // shares its top state and position.
        Badness[Badness["Deduplicate"] = 200] = "Deduplicate";
        // The maximum amount of active stacks at which recovery actions are
        // applied
        Badness[Badness["MaxRecoverStacks"] = 25] = "MaxRecoverStacks";
        // If badness reaches this level (and there are sibling stacks),
        // don't recover.
        Badness[Badness["TooBadToRecover"] = 500] = "TooBadToRecover";
        // If the best sibling is this amount better than the current stack,
        // don't apply recovery.
        Badness[Badness["RecoverSiblingFactor"] = 3] = "RecoverSiblingFactor";
        // Constant used to prune stacks that run error-free alongside each
        // other for too long
        Badness[Badness["MaxParallelBufferLength"] = 800] = "MaxParallelBufferLength";
    })(Badness || (Badness = {}));
    // Badness is a measure of how off-the-rails a given parse is. It is
    // bumped when a recovery strategy is applied, and then reduced (by
    // multiplication with a constant < 1) for every successful (real)
    // token shifted.
    //
    // Stacks with a low badness are relatively credible parses that have
    // shifts matching the input in their recent history. Stacks with a
    // high badness are deeply in the weeds and likely wrong. In either of
    // these situations, we prune agressively by dropping stacks when
    // another stack at the same position is looking better.
    //
    // For those in the `Badness.Stabilizing` to `Badness.Wild` range, we
    // assume that they are in the process of trying to recover and allow
    // a bunch of them to continue alongside each other to see which one
    // works out better.
    //
    // Stacks with the same low badness score are likely to be valid GLR
    // parsing branches, so in that case it's often a good idea to let
    // both continue.
    //
    // When a stack fails to find an advancing action, recovery is only
    // applied when its badness is < `Badness.Wild`, or no better parse
    // exists at that point.
    /// A parse stack. These are used internally by the parser to track
    /// parsing progress. They also provide some properties and methods
    /// that external code such as a tokenizer can use to get information
    /// about the parse state.
    var Stack = /** @class */ (function () {
        /// @internal
        function Stack(
        // A group of values that the stack will share with all
        // split instances
        ///@internal
        cx, 
        // Holds state, pos, value stack pos (15 bits array index, 15 bits
        // buffer index) triplets for all but the top state
        /// @internal
        stack, 
        // The current parse state
        /// @internal
        state, 
        // The position at which the next reduce should take place. This
        // can be less than `this.pos` when skipped expressions have been
        // added to the stack (which should be moved outside of the next
        // reduction)
        /// @internal
        reducePos, 
        // The input position up to which this stack has parsed.
        pos, 
        // A measure of the amount of error-recovery that recently
        // happened on this stack
        /// @internal
        badness, 
        // The output buffer. Holds (type, start, end, size) quads
        // representing nodes created by the parser, where `size` is
        // amount of buffer array entries covered by this node.
        /// @internal
        buffer, 
        // The base offset of the buffer. When stacks are split, the split
        // instance shared the buffer history with its parent up to
        // `bufferBase`, which is the absolute offset (including the
        // offset of previous splits) into the buffer at which this stack
        // starts writing.
        /// @internal
        bufferBase, 
        // A parent stack from which this was split off, if any. This is
        // set up so that it always points to a stack that has some
        // additional buffer content, never to a stack with an equal
        // `bufferBase`.
        /// @internal
        parent) {
            this.cx = cx;
            this.stack = stack;
            this.state = state;
            this.reducePos = reducePos;
            this.pos = pos;
            this.badness = badness;
            this.buffer = buffer;
            this.bufferBase = bufferBase;
            this.parent = parent;
        }
        /// @internal
        Stack.prototype.toString = function () {
            return "[" + this.stack.filter(function (_, i) { return i % 3 == 0; }).concat(this.state).join(",") + "]";
        };
        // Start an empty stack
        /// @internal
        Stack.start = function (cx, pos) {
            if (pos === void 0) { pos = 0; }
            return new Stack(cx, [], cx.parser.states[0], pos, pos, 0, [], 0, null);
        };
        // Push a state onto the stack, tracking its start position as well
        // as the buffer base at that point.
        /// @internal
        Stack.prototype.pushState = function (state, start) {
            this.stack.push(this.state, start, this.bufferBase + this.buffer.length);
            this.state = state;
        };
        // Apply a reduce action
        /// @internal
        Stack.prototype.reduce = function (action) {
            var depth = action >> 19 /* ReduceDepthShift */, type = action & 65535 /* ValueMask */;
            var parser = this.cx.parser;
            if (depth == 0) {
                // Zero-depth reductions are a special case—they add stuff to
                // the stack without popping anything off.
                if (type <= parser.maxNode)
                    this.storeNode(type, this.reducePos, this.reducePos, 4, true);
                this.pushState(parser.getGoto(this.state, type, true), this.reducePos);
                return;
            }
            // Find the base index into `this.stack`, content after which will
            // be dropped. Note that with `StayFlag` reductions we need to
            // consume two extra frames (the dummy parent node for the skipped
            // expression and the state that we'll be staying in, which should
            // be moved to `this.state`).
            var base = this.stack.length - ((depth - 1) * 3) - (action & 262144 /* StayFlag */ ? 6 : 0);
            var start = this.stack[base - 2];
            var bufferBase = this.stack[base - 1], count = this.bufferBase + this.buffer.length - bufferBase;
            if (type <= parser.maxNode && ((action & 131072 /* RepeatFlag */) || !parser.group.types[type].prop(tree.NodeProp.repeated))) {
                var pos = parser.stateFlag(this.state, 1 /* Skipped */) ? this.pos : this.reducePos;
                this.storeNode(type, start, pos, count + 4, true);
            }
            if (action & 262144 /* StayFlag */) {
                this.state = this.stack[base];
            }
            else {
                var baseStateID = this.stack[base - 3];
                this.state = parser.getGoto(baseStateID, type, true);
            }
            while (this.stack.length > base)
                this.stack.pop();
        };
        // Shift a value into the buffer
        /// @internal
        Stack.prototype.storeNode = function (term, start, end, size, isReduce) {
            if (size === void 0) { size = 4; }
            if (isReduce === void 0) { isReduce = false; }
            if (term == 0 /* Err */) { // Try to omit/merge adjacent error nodes
                var cur = this, top = this.buffer.length;
                if (top == 0 && cur.parent) {
                    top = cur.bufferBase - cur.parent.bufferBase;
                    cur = cur.parent;
                }
                if (top > 0 && cur.buffer[top - 4] == 0 /* Err */ && cur.buffer[top - 1] > -1) {
                    if (start == end)
                        return;
                    if (cur.buffer[top - 2] >= start) {
                        cur.buffer[top - 2] = end;
                        return;
                    }
                }
            }
            if (!isReduce || this.pos == end) { // Simple case, just append
                this.buffer.push(term, start, end, size);
            }
            else { // There may be skipped nodes that have to be moved forward
                var index = this.buffer.length;
                if (index > 0 && this.buffer[index - 4] != 0 /* Err */)
                    while (index > 0 && this.buffer[index - 2] > end) {
                        // Move this record forward
                        this.buffer[index] = this.buffer[index - 4];
                        this.buffer[index + 1] = this.buffer[index - 3];
                        this.buffer[index + 2] = this.buffer[index - 2];
                        this.buffer[index + 3] = this.buffer[index - 1];
                        index -= 4;
                        if (size > 4)
                            size -= 4;
                    }
                this.buffer[index] = term;
                this.buffer[index + 1] = start;
                this.buffer[index + 2] = end;
                this.buffer[index + 3] = size;
            }
        };
        // Apply a shift action
        /// @internal
        Stack.prototype.shift = function (action, next, nextEnd) {
            if (action & 131072 /* GotoFlag */) {
                this.pushState(action & 65535 /* ValueMask */, this.pos);
            }
            else if ((action & 262144 /* StayFlag */) == 0) { // Regular shift
                var start = this.pos, nextState = action, parser = this.cx.parser;
                if (nextEnd > this.pos)
                    this.badness = (this.badness >> 1) + (this.badness >> 2); // (* 0.75)
                if (nextEnd > this.pos || next <= parser.maxNode) {
                    this.pos = nextEnd;
                    if (!parser.stateFlag(nextState, 1 /* Skipped */))
                        this.reducePos = nextEnd;
                }
                this.pushState(nextState, start);
                if (next <= parser.maxNode)
                    this.buffer.push(next, start, nextEnd, 4);
            }
            else { // Shift-and-stay, which means this is a skipped token
                if (next <= this.cx.parser.maxNode)
                    this.buffer.push(next, this.pos, nextEnd, 4);
                this.pos = nextEnd;
            }
        };
        // Apply an action
        /// @internal
        Stack.prototype.apply = function (action, next, nextEnd) {
            if (action & 65536 /* ReduceFlag */)
                this.reduce(action);
            else
                this.shift(action, next, nextEnd);
        };
        // Add a prebuilt node into the buffer. This may be a reused node or
        // the result of running a nested parser.
        /// @internal
        Stack.prototype.useNode = function (value, next) {
            var index = this.cx.reused.length - 1;
            if (index < 0 || this.cx.reused[index] != value) {
                this.cx.reused.push(value);
                index++;
            }
            var start = this.pos;
            this.reducePos = this.pos = start + value.length;
            this.pushState(next, start);
            this.badness >>= 2; // (* 0.25)
            this.buffer.push(index, start, this.reducePos, -1 /* size < 0 means this is a reused value */);
        };
        // Split the stack. Due to the buffer sharing and the fact
        // that `this.stack` tends to stay quite shallow, this isn't very
        // expensive.
        /// @internal
        Stack.prototype.split = function () {
            var parent = this;
            var off = parent.buffer.length;
            // Because the top of the buffer (after this.pos) may be mutated
            // to reorder reductions and skipped tokens, and shared buffers
            // should be immutable, this copies any outstanding skipped tokens
            // to the new buffer, and puts the base pointer before them.
            while (off > 0 && parent.buffer[off - 2] > parent.reducePos)
                off -= 4;
            var buffer = parent.buffer.slice(off), base = parent.bufferBase + off;
            // Make sure parent points to an actual parent with content, if there is such a parent.
            while (parent && base == parent.bufferBase)
                parent = parent.parent;
            return new Stack(this.cx, this.stack.slice(), this.state, this.reducePos, this.pos, this.badness, buffer, base, parent);
        };
        // Try to recover from an error by 'deleting' (ignoring) one token.
        /// @internal
        Stack.prototype.recoverByDelete = function (next, nextEnd) {
            var isNode = next <= this.cx.parser.maxNode;
            if (isNode)
                this.storeNode(next, this.pos, nextEnd);
            this.storeNode(0 /* Err */, this.pos, nextEnd, isNode ? 8 : 4);
            this.pos = this.reducePos = nextEnd;
            this.badness += 100 /* Unit */;
        };
        /// Check if the given term would be able to be shifted (optionally
        /// after some reductions) on this stack. This can be useful for
        /// external tokenizers that want to make sure they only provide a
        /// given token when it applies.
        Stack.prototype.canShift = function (term) {
            for (var sim = new SimulatedStack(this);;) {
                var action = this.cx.parser.stateSlot(sim.top, 4 /* DefaultReduce */) || this.cx.parser.hasAction(sim.top, term);
                if ((action & 65536 /* ReduceFlag */) == 0)
                    return true;
                if (action == 0)
                    return false;
                sim.reduce(action);
            }
        };
        Object.defineProperty(Stack.prototype, "ruleStart", {
            /// Find the start position of the rule that is currently being parsed.
            get: function () {
                var force = this.cx.parser.stateSlot(this.state, 5 /* ForcedReduce */);
                if (!(force & 65536 /* ReduceFlag */))
                    return 0;
                var base = this.stack.length - (3 * (force >> 19 /* ReduceDepthShift */));
                return this.stack[base + 1];
            },
            enumerable: true,
            configurable: true
        });
        /// Find the start position of the innermost instance of any of the
        /// given term types, or return `-1` when none of them are found.
        ///
        /// **Note:** this is only reliable when there is at least some
        /// state that unambiguously matches the given rule on the stack.
        /// I.e. if you have a grammar like this, where the difference
        /// between `a` and `b` is only apparent at the third token:
        ///
        ///     a { b | c }
        ///     b { "x" "y" "x" }
        ///     c { "x" "y" "z" }
        ///
        /// Then a parse state after `"x"` will not reliably tell you that
        /// `b` is on the stack. You _can_ pass `[b, c]` to reliably check
        /// for either of those two rules (assuming that `a` isn't part of
        /// some rule that includes other things starting with `"x"`).
        Stack.prototype.startOf = function (types) {
            for (var frame = this.stack.length - 3; frame >= 0; frame -= 3) {
                var force = this.cx.parser.stateSlot(this.stack[frame], 5 /* ForcedReduce */);
                if (types.includes(force & 65535 /* ValueMask */)) {
                    var base = frame - (3 * (force >> 19 /* ReduceDepthShift */));
                    return this.stack[base + 1];
                }
            }
            return -1;
        };
        // Apply up to Recover.MaxNext recovery actions that conceptually
        // inserts some missing token or rule.
        /// @internal
        Stack.prototype.recoverByInsert = function (next) {
            var _this = this;
            var nextStates = this.cx.parser.nextStates(this.state);
            if (nextStates.length > 4 /* MaxNext */) {
                var best = nextStates.filter(function (s) { return s != _this.state && _this.cx.parser.hasAction(s, next); });
                for (var i = 0; best.length < 4 /* MaxNext */ && i < nextStates.length; i++)
                    if (!best.includes(nextStates[i]))
                        best.push(nextStates[i]);
                nextStates = best;
            }
            var result = [];
            for (var i = 0; i < nextStates.length && result.length < 4 /* MaxNext */; i++) {
                if (nextStates[i] == this.state)
                    continue;
                var stack = this.split();
                stack.storeNode(0 /* Err */, stack.pos, stack.pos, 4, true);
                stack.pushState(nextStates[i], this.pos);
                stack.badness += 100 /* Unit */;
                result.push(stack);
            }
            return result;
        };
        // Force a reduce, if possible. Return false if that can't
        // be done.
        /// @internal
        Stack.prototype.forceReduce = function () {
            var reduce = this.cx.parser.anyReduce(this.state);
            if ((reduce >> 19 /* ReduceDepthShift */) == 0) { // Don't use 0 or a zero-depth reduction
                reduce = this.cx.parser.stateSlot(this.state, 5 /* ForcedReduce */);
                if ((reduce & 65536 /* ReduceFlag */) == 0)
                    return false;
                this.storeNode(0 /* Err */, this.reducePos, this.reducePos, 4, true);
                this.badness += 100 /* Unit */;
            }
            this.reduce(reduce);
            return true;
        };
        // Compare two stacks to get a number that indicates which one is
        // behind or, if they are at the same position, which one has less
        // badness.
        /// @internal
        Stack.prototype.compare = function (other) {
            return this.pos - other.pos || this.badness - other.badness;
        };
        // Convert the stack's buffer to a syntax tree.
        /// @internal
        Stack.prototype.toTree = function () {
            return tree.Tree.build(StackBufferCursor.create(this), this.cx.parser.group, 1 /* Top */, this.cx.maxBufferLength, this.cx.reused);
        };
        return Stack;
    }());
    var Recover;
    (function (Recover) {
        Recover[Recover["MaxNext"] = 4] = "MaxNext";
    })(Recover || (Recover = {}));
    // Used to cheaply run some reductions to scan ahead without mutating
    // an entire stack
    var SimulatedStack = /** @class */ (function () {
        function SimulatedStack(stack) {
            this.stack = stack;
            this.top = stack.state;
            this.rest = stack.stack;
            this.offset = this.rest.length;
        }
        SimulatedStack.prototype.reduce = function (action) {
            var term = action & 65535 /* ValueMask */, depth = action >> 19 /* ReduceDepthShift */;
            if (depth == 0) {
                if (this.rest == this.stack.stack)
                    this.rest = this.rest.slice();
                this.rest.push(this.top, 0, 0);
                this.offset += 3;
            }
            else {
                this.offset -= (depth - 1) * 3;
            }
            var goto = this.stack.cx.parser.getGoto(this.rest[this.offset - 3], term, true);
            this.top = goto;
        };
        return SimulatedStack;
    }());
    // This is given to `Tree.build` to build a buffer, and encapsulates
    // the parent-stack-walking necessary to read the nodes.
    var StackBufferCursor = /** @class */ (function () {
        function StackBufferCursor(stack, pos, index) {
            this.stack = stack;
            this.pos = pos;
            this.index = index;
            this.buffer = stack.buffer;
            if (this.index == 0)
                this.maybeNext();
        }
        StackBufferCursor.create = function (stack) {
            return new StackBufferCursor(stack, stack.bufferBase + stack.buffer.length, stack.buffer.length);
        };
        StackBufferCursor.prototype.maybeNext = function () {
            var next = this.stack.parent;
            if (next != null) {
                this.index = this.stack.bufferBase - next.bufferBase;
                this.stack = next;
                this.buffer = next.buffer;
            }
        };
        Object.defineProperty(StackBufferCursor.prototype, "id", {
            get: function () { return this.buffer[this.index - 4]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StackBufferCursor.prototype, "start", {
            get: function () { return this.buffer[this.index - 3]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StackBufferCursor.prototype, "end", {
            get: function () { return this.buffer[this.index - 2]; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(StackBufferCursor.prototype, "size", {
            get: function () { return this.buffer[this.index - 1]; },
            enumerable: true,
            configurable: true
        });
        StackBufferCursor.prototype.next = function () {
            this.index -= 4;
            this.pos -= 4;
            if (this.index == 0)
                this.maybeNext();
        };
        StackBufferCursor.prototype.fork = function () {
            return new StackBufferCursor(this.stack, this.pos, this.index);
        };
        return StackBufferCursor;
    }());

    /// Tokenizers write the tokens they read into instances of this class.
    var Token = /** @class */ (function () {
        function Token() {
            /// The start of the token. This is set by the parser, and should not
            /// be mutated by the tokenizer.
            this.start = -1;
            /// This starts at -1, and should be updated to a term id when a
            /// matching token is found.
            this.value = -1;
            /// When setting `.value`, you should also set `.end` to the end
            /// position of the token. (You'll usually want to use the `accept`
            /// method.)
            this.end = -1;
        }
        /// Accept a token, setting `value` and `end` to the given values.
        Token.prototype.accept = function (value, end) {
            this.value = value;
            this.end = end;
        };
        return Token;
    }());
    /// An `InputStream` that is backed by a single, flat string.
    var StringStream = /** @class */ (function () {
        function StringStream(string, length) {
            if (length === void 0) { length = string.length; }
            this.string = string;
            this.length = length;
        }
        StringStream.prototype.get = function (pos) {
            return pos < 0 || pos >= this.length ? -1 : this.string.charCodeAt(pos);
        };
        StringStream.prototype.read = function (from, to) { return this.string.slice(from, Math.min(this.length, to)); };
        StringStream.prototype.clip = function (at) { return new StringStream(this.string, at); };
        return StringStream;
    }());
    /// @internal
    var TokenGroup = /** @class */ (function () {
        function TokenGroup(data, id) {
            this.data = data;
            this.id = id;
        }
        TokenGroup.prototype.token = function (input, token, stack) { readToken(this.data, input, token, stack, this.id); };
        return TokenGroup;
    }());
    TokenGroup.prototype.contextual = false;
    var ExternalTokenizer = /** @class */ (function () {
        function ExternalTokenizer(token, options) {
            if (options === void 0) { options = {}; }
            this.token = token;
            this.contextual = options && options.contextual || false;
        }
        return ExternalTokenizer;
    }());
    // Tokenizer data is stored a big uint16 array containing, for each
    // state:
    //
    //  - A group bitmask, indicating what token groups are reachable from
    //    this state, so that paths that can only lead to tokens not in
    //    any of the current groups can be cut off early.
    //
    //  - The position of the end of the state's sequence of accepting
    //    tokens
    //
    //  - The number of outgoing edges for the state
    //
    //  - The accepting tokens, as (token id, group mask) pairs
    //
    //  - The outgoing edges, as (start character, end character, state
    //    index) triples, with end character being exclusive
    //
    // This function interprets that data, running through a stream as
    // long as new states with the a matching group mask can be reached,
    // and updating `token` when it matches a token.
    function readToken(data, input, token, stack, group) {
        var state = 0, groupMask = 1 << group;
        scan: for (var pos = token.start;;) {
            if ((groupMask & data[state]) == 0)
                break;
            var accEnd = data[state + 1];
            // Check whether this state can lead to a token in the current group
            // Accept tokens in this state, possibly overwriting
            // lower-precedence / shorter tokens
            for (var i = state + 3; i < accEnd; i += 2)
                if ((data[i + 1] & groupMask) > 0) {
                    var term = data[i];
                    if (token.value == -1 || token.value == term || stack.cx.parser.overrides(term, token.value)) {
                        token.accept(term, pos);
                        break;
                    }
                }
            var next = input.get(pos++);
            // Do a binary search on the state's edges
            for (var low = 0, high = data[state + 2]; low < high;) {
                var mid = (low + high) >> 1;
                var index = accEnd + mid + (mid << 1);
                var from = data[index], to = data[index + 1];
                if (next < from)
                    high = mid;
                else if (next >= to)
                    low = mid + 1;
                else {
                    state = data[index + 2];
                    continue scan;
                }
            }
            break;
        }
    }

    // See lezer-generator/src/encode.ts for comments about the encoding
    // used here
    function decodeArray(input, Type) {
        if (Type === void 0) { Type = Uint16Array; }
        var array = null;
        for (var pos = 0, out = 0; pos < input.length;) {
            var value = 0;
            for (;;) {
                var next = input.charCodeAt(pos++), stop = false;
                if (next == 126 /* BigValCode */) {
                    value = 65535 /* BigVal */;
                    break;
                }
                if (next >= 92 /* Gap2 */)
                    next--;
                if (next >= 34 /* Gap1 */)
                    next--;
                var digit = next - 32 /* Start */;
                if (digit >= 46 /* Base */) {
                    digit -= 46 /* Base */;
                    stop = true;
                }
                value += digit;
                if (stop)
                    break;
                value *= 46 /* Base */;
            }
            if (array)
                array[out++] = value;
            else
                array = new Type(value);
        }
        return array;
    }

    // Environment variable used to control console output
    var verbose = typeof process != "undefined" && /\bparse\b/.test(process.env.LOG);
    var CacheCursor = /** @class */ (function () {
        function CacheCursor(tree) {
            this.start = [0];
            this.index = [0];
            this.nextStart = 0;
            this.trees = [tree];
        }
        // `pos` must be >= any previously given `pos` for this cursor
        CacheCursor.prototype.nodeAt = function (pos) {
            if (pos < this.nextStart)
                return null;
            for (;;) {
                var last = this.trees.length - 1;
                if (last < 0) { // End of tree
                    this.nextStart = 1e9;
                    return null;
                }
                var top = this.trees[last], index = this.index[last];
                if (index == top.children.length) {
                    this.trees.pop();
                    this.start.pop();
                    this.index.pop();
                    continue;
                }
                var next = top.children[index];
                var start = this.start[last] + top.positions[index];
                if (next instanceof tree.TreeBuffer) {
                    this.index[last]++;
                    this.nextStart = start + next.length;
                }
                else if (start >= pos) {
                    return start == pos ? next : null;
                }
                else {
                    this.index[last]++;
                    if (start + next.length >= pos) { // Enter this node
                        this.trees.push(next);
                        this.start.push(start);
                        this.index.push(0);
                    }
                }
            }
        };
        return CacheCursor;
    }());
    var CachedToken = /** @class */ (function (_super) {
        __extends(CachedToken, _super);
        function CachedToken(tokenizer) {
            var _this = _super.call(this) || this;
            _this.tokenizer = tokenizer;
            _this.extended = -1;
            _this.mask = 0;
            return _this;
        }
        CachedToken.prototype.clear = function (start) {
            this.start = start;
            this.value = this.extended = -1;
        };
        return CachedToken;
    }(Token));
    var dummyToken = new Token;
    var TokenCache = /** @class */ (function () {
        function TokenCache() {
            this.tokens = [];
            this.mainToken = dummyToken;
            this.actions = [];
        }
        TokenCache.prototype.getActions = function (stack, input) {
            var actionIndex = 0;
            var main = null;
            var parser = stack.cx.parser, tokenizers = parser.tokenizers;
            for (var i = 0; i < tokenizers.length; i++) {
                if (((1 << i) & parser.stateSlot(stack.state, 3 /* TokenizerMask */)) == 0)
                    continue;
                var tokenizer = tokenizers[i], token = void 0;
                for (var _i = 0, _a = this.tokens; _i < _a.length; _i++) {
                    var t = _a[_i];
                    if (t.tokenizer == tokenizer) {
                        token = t;
                        break;
                    }
                }
                if (!token)
                    this.tokens.push(token = new CachedToken(tokenizer));
                var mask = parser.stateSlot(stack.state, 3 /* TokenizerMask */);
                if (tokenizer.contextual || token.start != stack.pos || token.mask != mask) {
                    this.updateCachedToken(token, stack, input);
                    token.mask = mask;
                }
                var startIndex = actionIndex;
                if (token.extended > -1)
                    actionIndex = this.addActions(stack, token.extended, token.end, actionIndex);
                actionIndex = this.addActions(stack, token.value, token.end, actionIndex);
                if (actionIndex > startIndex) {
                    main = token;
                    break;
                }
                if (!main || token.value != 0 /* Err */)
                    main = token;
            }
            while (this.actions.length > actionIndex)
                this.actions.pop();
            if (!main) {
                main = dummyToken;
                main.start = stack.pos;
                if (stack.pos == input.length)
                    main.accept(stack.cx.parser.eofTerm, stack.pos);
                else
                    main.accept(0 /* Err */, stack.pos + 1);
            }
            this.mainToken = main;
            return this.actions;
        };
        TokenCache.prototype.updateCachedToken = function (token, stack, input) {
            token.clear(stack.pos);
            token.tokenizer.token(input, token, stack);
            if (token.value > -1) {
                var parser = stack.cx.parser;
                var specIndex = findOffset(parser.data, parser.specializeTable, token.value);
                if (specIndex >= 0) {
                    var found = parser.specializations[specIndex][input.read(token.start, token.end)];
                    if (found != null) {
                        if ((found & 1) == 0 /* Specialize */)
                            token.value = found >> 1;
                        else
                            token.extended = found >> 1;
                    }
                }
            }
            else if (stack.pos == input.length) {
                token.accept(stack.cx.parser.eofTerm, stack.pos);
            }
            else {
                token.accept(0 /* Err */, stack.pos + 1);
            }
        };
        TokenCache.prototype.putAction = function (action, token, end, index) {
            // Don't add duplicate actions
            for (var i = 0; i < index; i += 3)
                if (this.actions[i] == action)
                    return index;
            this.actions[index++] = action;
            this.actions[index++] = token;
            this.actions[index++] = end;
            return index;
        };
        TokenCache.prototype.addActions = function (stack, token, end, index) {
            var state = stack.state, parser = stack.cx.parser, data = parser.data;
            for (var set = 0; set < 2; set++) {
                for (var i = parser.stateSlot(state, set ? 2 /* Skip */ : 1 /* Actions */), next = void 0; (next = data[i]) != 65535 /* End */; i += 3) {
                    if (next == token || (next == 0 /* Err */ && index == 0))
                        index = this.putAction(data[i + 1] | (data[i + 2] << 16), token, end, index);
                }
            }
            return index;
        };
        return TokenCache;
    }());
    var StackContext = /** @class */ (function () {
        function StackContext(parser, maxBufferLength, input, parent, wrapType) {
            if (parent === void 0) { parent = null; }
            if (wrapType === void 0) { wrapType = -1; }
            this.parser = parser;
            this.maxBufferLength = maxBufferLength;
            this.input = input;
            this.parent = parent;
            this.wrapType = wrapType;
            this.reused = [];
            this.tokens = new TokenCache;
        }
        return StackContext;
    }());
    /// A parse context can be used for step-by-step parsing. After
    /// creating it, you repeatedly call `.advance()` until it returns a
    /// tree to indicate it has reached the end of the parse.
    var ParseContext = /** @class */ (function () {
        /// @internal
        function ParseContext(parser, input, _a) {
            var _b = _a === void 0 ? {} : _a, _c = _b.cache, cache = _c === void 0 ? undefined : _c, _d = _b.strict, strict = _d === void 0 ? false : _d, _e = _b.bufferLength, bufferLength = _e === void 0 ? tree.DefaultBufferLength : _e;
            this.stacks = [Stack.start(new StackContext(parser, bufferLength, input))];
            this.strict = strict;
            this.cache = cache ? new CacheCursor(cache) : null;
        }
        ParseContext.prototype.takeStack = function (at) {
            if (at === void 0) { at = 0; }
            // Binary heap pop
            var stacks = this.stacks, elt = stacks[at], replacement = stacks.pop();
            if (stacks.length == 0)
                return elt;
            stacks[at] = replacement;
            for (var index = at;;) {
                var childIndex = (index << 1) + 1;
                if (childIndex >= stacks.length)
                    break;
                var child = stacks[childIndex];
                if (childIndex + 1 < stacks.length && child.compare(stacks[childIndex + 1]) >= 0) {
                    child = stacks[childIndex + 1];
                    childIndex++;
                }
                if (replacement.compare(child) < 0)
                    break;
                stacks[childIndex] = replacement;
                stacks[index] = child;
                index = childIndex;
            }
            return elt;
        };
        ParseContext.prototype.putStack = function (stack) {
            if (stack.badness >= 200 /* Deduplicate */) {
                for (var i = 0; i < this.stacks.length; i++) {
                    var other = this.stacks[i];
                    if (other.state == stack.state && other.pos == stack.pos) {
                        var diff = stack.badness - other.badness || stack.stack.length - other.stack.length;
                        if (diff < 0) {
                            this.stacks[i] = stack;
                            return true;
                        }
                        else if (diff >= 0)
                            return false;
                    }
                }
            }
            else if (stack.badness == 0 && this.stacks.length && stack.buffer.length > 800 /* MaxParallelBufferLength */) {
                // If a stack looks error-free, but isn't the only active one
                // _and_ has a buffer that is long but not the longest, prune
                // it, since this might be a situation where two stacks can
                // continue indefinitely.
                var maxOther = this.stacks.reduce(function (m, s) { return Math.max(m, s.buffer.length); }, 0);
                if (maxOther > stack.buffer.length)
                    return false;
            }
            // Binary heap add
            var index = this.stacks.push(stack) - 1;
            while (index > 0) {
                var parentIndex = index >> 1, parent = this.stacks[parentIndex];
                if (stack.compare(parent) >= 0)
                    break;
                this.stacks[index] = parent;
                this.stacks[parentIndex] = stack;
                index = parentIndex;
            }
            return true;
        };
        /// Execute one parse step. This picks the parse stack that's
        /// currently the least far along, and does the next thing that can
        /// be done with it. This may be:
        ///
        /// - Add a cached node, if a matching one is found.
        /// - Enter a nested grammar.
        /// - Perform all shift or reduce actions that match the current
        ///   token (if there are more than one, this will split the stack)
        /// - Finish the parse
        ///
        /// When the parse is finished, this will return a syntax tree. When
        /// not, it returns `null`.
        ParseContext.prototype.advance = function () {
            var stack = this.takeStack(), start = stack.pos, _a = stack.cx, input = _a.input, parser = _a.parser;
            var base = verbose ? stack + " -> " : "";
            if (this.cache) {
                for (var cached = this.cache.nodeAt(start); cached;) {
                    var match = parser.group.types[cached.type.id] == cached.type ? parser.getGoto(stack.state, cached.type.id) : -1;
                    if (match > -1 && !isFragile(cached)) {
                        stack.useNode(cached, match);
                        if (verbose)
                            console.log(base + stack + (" (via reuse of " + parser.getName(cached.type.id) + ")"));
                        this.putStack(stack);
                        return null;
                    }
                    if (cached.children.length == 0 || cached.positions[0] > 0)
                        break;
                    var inner = cached.children[0];
                    if (inner instanceof tree.Tree)
                        cached = inner;
                    else
                        break;
                }
            }
            var nest = parser.startNested(stack.state);
            maybeNest: if (nest > -1) {
                var _b = parser.nested[nest], grammar = _b.grammar, endToken = _b.end, placeholder = _b.placeholder;
                var filterEnd = undefined, parseNode = null, nested = void 0, wrapType = undefined;
                if (typeof grammar == "function") {
                    var query = grammar(input, stack);
                    if (query.stay)
                        break maybeNest;
                    (parseNode = query.parseNode, nested = query.parser, filterEnd = query.filterEnd, wrapType = query.wrapType);
                }
                else {
                    nested = grammar;
                }
                var end_1 = this.scanForNestEnd(stack, endToken, filterEnd);
                var clippedInput = stack.cx.input.clip(end_1);
                if (parseNode || !nested) {
                    var node = parseNode ? parseNode(clippedInput, stack.pos) : tree.Tree.empty;
                    if (node.length != end_1 - stack.pos)
                        node = new tree.Tree(node.type, node.children, node.positions, end_1 - stack.pos);
                    if (wrapType != null)
                        node = new tree.Tree(parser.group.types[wrapType], [node], [0], node.length);
                    stack.useNode(node, parser.getGoto(stack.state, placeholder, true));
                    this.putStack(stack);
                }
                else {
                    var newStack = Stack.start(new StackContext(nested, stack.cx.maxBufferLength, clippedInput, stack, wrapType), stack.pos);
                    if (verbose)
                        console.log(base + newStack + " (nested)");
                    this.putStack(newStack);
                }
                return null;
            }
            var defaultReduce = parser.stateSlot(stack.state, 4 /* DefaultReduce */);
            if (defaultReduce > 0) {
                stack.reduce(defaultReduce);
                this.putStack(stack);
                if (verbose)
                    console.log(base + stack + (" (via always-reduce " + parser.getName(defaultReduce & 65535 /* ValueMask */) + ")"));
                return null;
            }
            var actions = stack.cx.tokens.getActions(stack, input);
            for (var i = 0; i < actions.length;) {
                var action = actions[i++], term_1 = actions[i++], end_2 = actions[i++];
                var localStack = i == actions.length ? stack : stack.split();
                localStack.apply(action, term_1, end_2);
                if (verbose)
                    console.log(base + localStack + (" (via " + ((action & 65536 /* ReduceFlag */) == 0 ? "shift"
                        : "reduce of " + parser.getName(action & 65535 /* ValueMask */)) + " for " + parser.getName(term_1) + " @ " + start + (localStack == stack ? "" : ", split") + ")"));
                this.putStack(localStack);
            }
            if (actions.length > 0)
                return null;
            // If we're here, the stack failed to advance normally
            if (start == input.length) { // End of file
                if (!parser.stateFlag(stack.state, 2 /* Accepting */) && stack.forceReduce()) {
                    if (verbose)
                        console.log(base + stack + " (via forced reduction at eof)");
                    this.putStack(stack);
                    return null;
                }
                if (stack.cx.parent) {
                    // This is a nested parse—add its result to the parent stack and
                    // continue with that one.
                    this.putStack(this.finishNested(stack));
                    return null;
                }
                else {
                    // Actual end of parse
                    return stack.toTree();
                }
            }
            // Not end of file. See if we should recover.
            var minBad = this.stacks.reduce(function (m, s) { return Math.min(m, s.badness); }, 1e9);
            // If this is not the best stack and its badness is above the
            // TooBadToRecover ceiling or RecoverToSibling times the best
            // stack, don't continue it.
            if (minBad <= stack.badness &&
                (this.stacks.length >= 25 /* MaxRecoverStacks */ ||
                    stack.badness > Math.min(500 /* TooBadToRecover */, minBad * 3 /* RecoverSiblingFactor */)))
                return null;
            var _c = stack.cx.tokens.mainToken, end = _c.end, term = _c.value;
            if (this.strict) {
                if (this.stacks.length)
                    return null;
                throw new SyntaxError("No parse at " + start + " with " + parser.getName(term) + " (stack is " + stack + ")");
            }
            for (var _i = 0, _d = stack.recoverByInsert(term); _i < _d.length; _i++) {
                var insert = _d[_i];
                if (verbose)
                    console.log(base + insert + " (via recover-insert)");
                this.putStack(insert);
            }
            var reduce = stack.split();
            if (reduce.forceReduce()) {
                if (verbose)
                    console.log(base + reduce + " (via force-reduce)");
                this.putStack(reduce);
            }
            if (end == start) {
                if (start == input.length)
                    return null;
                end++;
                term = 0 /* Err */;
            }
            stack.recoverByDelete(term, end);
            if (verbose)
                console.log(base + stack + (" (via recover-delete " + parser.getName(term) + ")"));
            this.putStack(stack);
            return null;
        };
        Object.defineProperty(ParseContext.prototype, "pos", {
            /// The position to which the parse has advanced.
            get: function () { return this.stacks[0].pos; },
            enumerable: true,
            configurable: true
        });
        /// Force the parse to finish, generating a tree containing the nodes
        /// parsed so far.
        ParseContext.prototype.forceFinish = function () {
            var stack = this.stacks[0].split();
            while (!stack.cx.parser.stateFlag(stack.state, 2 /* Accepting */) && stack.forceReduce()) { }
            return stack.toTree();
        };
        ParseContext.prototype.scanForNestEnd = function (stack, endToken, filter) {
            var input = stack.cx.input;
            for (var pos = stack.pos; pos < input.length; pos++) {
                dummyToken.start = pos;
                dummyToken.value = -1;
                endToken.token(input, dummyToken, stack);
                if (dummyToken.value > -1 && (!filter || filter(input.read(pos, dummyToken.end))))
                    return pos;
            }
            return input.length;
        };
        ParseContext.prototype.finishNested = function (stack) {
            var parent = stack.cx.parent, tree$1 = stack.toTree();
            var parentParser = parent.cx.parser, info = parentParser.nested[parentParser.startNested(parent.state)];
            tree$1 = new tree.Tree(tree$1.type, tree$1.children, tree$1.positions.map(function (p) { return p - parent.pos; }), stack.pos - parent.pos);
            if (stack.cx.wrapType > -1)
                tree$1 = new tree.Tree(parentParser.group.types[stack.cx.wrapType], [tree$1], [0], tree$1.length);
            parent.useNode(tree$1, parentParser.getGoto(parent.state, info.placeholder, true));
            if (verbose)
                console.log(parent + (" (via unnest " + (stack.cx.wrapType > -1 ? parentParser.getName(stack.cx.wrapType) : tree$1.type.name) + ")"));
            // Drop any other stack that has the same parent
            for (var i = 0; i < this.stacks.length;) {
                if (this.stacks[i].cx.parent == parent)
                    this.takeStack(i);
                else
                    i++;
            }
            return parent;
        };
        return ParseContext;
    }());
    /// A parser holds the parse tables for a given grammar, as generated
    /// by `lezer-generator`.
    var Parser = /** @class */ (function () {
        /// @internal
        function Parser(
        /// The parse states for this grammar @internal
        states, 
        /// A blob of data that the parse states, as well as some
        /// of `Parser`'s fields, point into @internal
        data, 
        /// The goto table. See `computeGotoTable` in
        /// lezer-generator for details on the format @internal
        goto, 
        /// A node group with the node types used by this parser.
        group, 
        /// The tokenizer objects used by the grammar @internal
        tokenizers, 
        /// Metadata about nested grammars used in this grammar @internal
        nested, 
        /// Points into this.data at an array of token types that
        /// are specialized @internal
        specializeTable, 
        /// For each specialized token type, this holds an object mapping
        /// names to numbers, with the first bit indicating whether the
        /// specialization extends or replaces the original token, and the
        /// rest of the bits holding the specialized token type. @internal
        specializations, 
        /// Points into this.data at an array that holds the
        /// precedence order (higher precedence first) for ambiguous
        /// tokens @internal
        tokenPrecTable, 
        /// An optional object mapping term ids to name strings @internal
        termNames) {
            if (termNames === void 0) { termNames = null; }
            this.states = states;
            this.data = data;
            this.goto = goto;
            this.group = group;
            this.tokenizers = tokenizers;
            this.nested = nested;
            this.specializeTable = specializeTable;
            this.specializations = specializations;
            this.tokenPrecTable = tokenPrecTable;
            this.termNames = termNames;
            this.nextStateCache = [];
            this.maxNode = this.group.types.length - 1;
            for (var i = 0, l = this.states.length / 6 /* Size */; i < l; i++)
                this.nextStateCache[i] = null;
        }
        /// Parse a given string or stream.
        Parser.prototype.parse = function (input, options) {
            if (typeof input == "string")
                input = new StringStream(input);
            var cx = new ParseContext(this, input, options);
            for (;;) {
                var done = cx.advance();
                if (done)
                    return done;
            }
        };
        /// Create a `ParseContext`.
        Parser.prototype.startParse = function (input, options) {
            return new ParseContext(this, input, options);
        };
        /// Get a goto table entry @internal
        Parser.prototype.getGoto = function (state, term, loose) {
            if (loose === void 0) { loose = false; }
            var table = this.goto;
            if (term >= table[0])
                return -1;
            for (var pos = table[term + 1];;) {
                var groupTag = table[pos++], last = groupTag & 1;
                var target = table[pos++];
                if (last && loose)
                    return target;
                for (var end = pos + (groupTag >> 1); pos < end; pos++)
                    if (table[pos] == state)
                        return target;
                if (last)
                    return -1;
            }
        };
        /// Check if this state has an action for a given terminal @internal
        Parser.prototype.hasAction = function (state, terminal) {
            var data = this.data;
            for (var set = 0; set < 2; set++) {
                for (var i = this.stateSlot(state, set ? 2 /* Skip */ : 1 /* Actions */), next = void 0; (next = data[i]) != 65535 /* End */; i += 3) {
                    if (next == terminal || next == 0 /* Err */)
                        return data[i + 1] | (data[i + 2] << 16);
                }
            }
            return 0;
        };
        /// @internal
        Parser.prototype.stateSlot = function (state, slot) {
            return this.states[(state * 6 /* Size */) + slot];
        };
        /// @internal
        Parser.prototype.stateFlag = function (state, flag) {
            return (this.stateSlot(state, 0 /* Flags */) & flag) > 0;
        };
        /// @internal
        Parser.prototype.startNested = function (state) {
            var flags = this.stateSlot(state, 0 /* Flags */);
            return flags & 4 /* StartNest */ ? flags >> 10 /* NestShift */ : -1;
        };
        /// @internal
        Parser.prototype.anyReduce = function (state) {
            var defaultReduce = this.stateSlot(state, 4 /* DefaultReduce */);
            if (defaultReduce > 0)
                return defaultReduce;
            for (var i = this.stateSlot(state, 1 /* Actions */);; i += 3) {
                if (this.data[i] == 65535 /* End */)
                    return 0;
                var top = this.data[i + 2];
                if (top & (65536 /* ReduceFlag */ >> 16))
                    return this.data[i + 1] | (top << 16);
            }
        };
        /// Get the states that can follow this one through shift actions or
        /// goto jumps. @internal
        Parser.prototype.nextStates = function (state) {
            var cached = this.nextStateCache[state];
            if (cached)
                return cached;
            var result = [];
            for (var i = this.stateSlot(state, 1 /* Actions */); this.data[i] != 65535 /* End */; i += 3) {
                if ((this.data[i + 2] & (65536 /* ReduceFlag */ >> 16)) == 0 && !result.includes(this.data[i + 1]))
                    result.push(this.data[i + 1]);
            }
            var table = this.goto, max = table[0];
            for (var term = 0; term < max; term++) {
                for (var pos = table[term + 1];;) {
                    var groupTag = table[pos++], target = table[pos++];
                    for (var end = pos + (groupTag >> 1); pos < end; pos++)
                        if (table[pos] == state && !result.includes(target))
                            result.push(target);
                    if (groupTag & 1)
                        break;
                }
            }
            return this.nextStateCache[state] = result;
        };
        /// @internal
        Parser.prototype.overrides = function (token, prev) {
            var iPrev = findOffset(this.data, this.tokenPrecTable, prev);
            return iPrev < 0 || findOffset(this.data, this.tokenPrecTable, token) < iPrev;
        };
        /// Create a new `Parser` instance with different values for (some
        /// of) the nested grammars. This can be used to, for example, swap
        /// in a different language for a nested grammar or fill in a nested
        /// grammar that was left blank by the original grammar.
        Parser.prototype.withNested = function (spec) {
            return new Parser(this.states, this.data, this.goto, this.group, this.tokenizers, this.nested.map(function (obj) {
                if (!Object.prototype.hasOwnProperty.call(spec, obj.name))
                    return obj;
                return { name: obj.name, grammar: spec[obj.name], end: obj.end, placeholder: obj.placeholder };
            }), this.specializeTable, this.specializations, this.tokenPrecTable, this.termNames);
        };
        /// Create a new `Parser` instance whose node types have the given
        /// props added. You should use [`NodeProp.add`](#tree.NodeProp.add)
        /// to create the arguments to this method.
        Parser.prototype.withProps = function () {
            var _a;
            var props = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                props[_i] = arguments[_i];
            }
            return new Parser(this.states, this.data, this.goto, (_a = this.group).extend.apply(_a, props), this.tokenizers, this.nested, this.specializeTable, this.specializations, this.tokenPrecTable, this.termNames);
        };
        /// Returns the name associated with a given term. This will only
        /// work for all terms when the parser was generated with the
        /// `--names` option. By default, only the names of tagged terms are
        /// stored.
        Parser.prototype.getName = function (term) {
            return this.termNames ? this.termNames[term] : String(term <= this.maxNode && this.group.types[term].name || term);
        };
        Object.defineProperty(Parser.prototype, "eofTerm", {
            /// The eof term id is always allocated directly after the node
            /// types. @internal
            get: function () { return this.maxNode + 1; },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Parser.prototype, "hasNested", {
            /// Tells you whether this grammar has any nested grammars.
            get: function () { return this.nested.length > 0; },
            enumerable: true,
            configurable: true
        });
        /// (Used by the output of the parser generator) @internal
        Parser.deserialize = function (spec) {
            var tokenArray = decodeArray(spec.tokenData);
            var nodeNames = spec.nodeNames.split(" ");
            for (var i = 0; i < spec.repeatNodeCount; i++)
                nodeNames.push("");
            var nodeProps = [];
            for (var i = 0; i < nodeNames.length; i++)
                nodeProps.push(noProps);
            function setProp(nodeID, prop, value) {
                if (nodeProps[nodeID] == noProps)
                    nodeProps[nodeID] = Object.create(null);
                prop.set(nodeProps[nodeID], prop.deserialize(value));
            }
            setProp(0, tree.NodeProp.error, "");
            for (var i = nodeProps.length - spec.repeatNodeCount; i < nodeProps.length; i++)
                setProp(i, tree.NodeProp.repeated, "");
            if (spec.nodeProps)
                for (var _i = 0, _a = spec.nodeProps; _i < _a.length; _i++) {
                    var propSpec = _a[_i];
                    var prop = propSpec[0];
                    for (var i = 1; i < propSpec.length; i += 2)
                        setProp(propSpec[i], prop, propSpec[i + 1]);
                }
            var group = new tree.NodeGroup(nodeNames.map(function (name, i) { return new tree.NodeType(name, nodeProps[i], i); }));
            return new Parser(decodeArray(spec.states, Uint32Array), decodeArray(spec.stateData), decodeArray(spec.goto), group, spec.tokenizers.map(function (value) { return typeof value == "number" ? new TokenGroup(tokenArray, value) : value; }), (spec.nested || []).map(function (_a) {
                var name = _a[0], grammar = _a[1], endToken = _a[2], placeholder = _a[3];
                return ({ name: name, grammar: grammar, end: new TokenGroup(decodeArray(endToken), 0), placeholder: placeholder });
            }), spec.specializeTable, (spec.specializations || []).map(withoutPrototype), spec.tokenPrec, spec.termNames);
        };
        return Parser;
    }());
    var noProps = Object.create(null);
    function findOffset(data, start, term) {
        for (var i = start, next = void 0; (next = data[i]) != 65535 /* End */; i++)
            if (next == term)
                return i - start;
        return -1;
    }
    // Strip the prototypes from objects, so that they can safely be
    // accessed as maps.
    function withoutPrototype(obj) {
        if (!(obj instanceof Object))
            return obj;
        var result = Object.create(null);
        for (var prop in obj)
            if (Object.prototype.hasOwnProperty.call(obj, prop))
                result[prop] = obj[prop];
        return result;
    }
    // Checks whether a node starts or ends with an error node, in which
    // case we shouldn't reuse it.
    function isFragile(node) {
        var doneStart = false, doneEnd = false, fragile = node.type.id == 0 /* Err */;
        if (!fragile)
            node.iterate({
                enter: function (type) {
                    return doneStart || (type.id == 0 /* Err */ ? fragile = doneStart = true : undefined);
                },
                leave: function (type) { doneStart = true; }
            });
        if (!fragile)
            node.iterate({
                from: node.length,
                to: 0,
                enter: function (type) {
                    return doneEnd || (type.id == 0 /* Err */ ? fragile = doneEnd = true : undefined);
                },
                leave: function (type) { doneEnd = true; }
            });
        return fragile;
    }

    exports.NodeGroup = tree.NodeGroup;
    exports.NodeProp = tree.NodeProp;
    exports.NodeType = tree.NodeType;
    exports.Subtree = tree.Subtree;
    exports.Tree = tree.Tree;
    exports.ExternalTokenizer = ExternalTokenizer;
    exports.ParseContext = ParseContext;
    exports.Parser = Parser;
    exports.Stack = Stack;
    exports.Token = Token;
    exports.TokenGroup = TokenGroup;

    });

    unwrapExports(dist);
    var dist_1 = dist.NodeGroup;
    var dist_2 = dist.NodeProp;
    var dist_3 = dist.NodeType;
    var dist_4 = dist.Subtree;
    var dist_5 = dist.Tree;
    var dist_6 = dist.ExternalTokenizer;
    var dist_7 = dist.ParseContext;
    var dist_8 = dist.Parser;
    var dist_9 = dist.Stack;
    var dist_10 = dist.Token;
    var dist_11 = dist.TokenGroup;

    var dist$1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, '__esModule', { value: true });



    // This file was generated by lezer-generator. You probably shouldn't edit it.
    const 
      noSemi = 163,
      PostfixOp = 2,
      insertSemi = 164,
      templateContent = 165,
      templateDollarBrace = 166,
      templateEnd = 167;

    /* Hand-written tokenizers for JavaScript tokens that can't be
       expressed by lezer's built-in tokenizer. */

    const newline = [10, 13, 8232, 8233];
    const space = [9, 11, 12, 32, 133, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8239, 8287, 12288];

    const braceR = 125, braceL = 123, semicolon = 59, slash = 47, star = 42,
          plus = 43, minus = 45, dollar = 36, backtick = 96, backslash = 92;

    // FIXME this should technically enter block comments
    function newlineBefore(input, pos) {
      for (let i = pos - 1; i >= 0; i--) {
        let prev = input.get(i);
        if (newline.includes(prev)) return true
        if (!space.includes(prev)) break
      }
      return false
    }

    const insertSemicolon = new dist.ExternalTokenizer((input, token, stack) => {
      let pos = token.start, next = input.get(pos);
      if ((next == braceR || next == -1 || newlineBefore(input, pos)) && stack.canShift(insertSemi))
        token.accept(insertSemi, token.start);
    }, {contextual: true});

    const noSemicolon = new dist.ExternalTokenizer((input, token, stack) => {
      let pos = token.start, next = input.get(pos++);
      if (space.includes(next) || newline.includes(next)) return
      if (next == slash) {
        let after = input.get(pos++);
        if (after == slash || after == star) return
      }
      if (next != braceR && next != semicolon && next != -1 && !newlineBefore(input, token.start) &&
          stack.canShift(noSemi))
        token.accept(noSemi, token.start);
    }, {contextual: true});

    const postfix = new dist.ExternalTokenizer((input, token, stack) => {
      let pos = token.start, next = input.get(pos++);
      if ((next == plus || next == minus) && next == input.get(pos++) &&
          !newlineBefore(input, token.start) && stack.canShift(PostfixOp))
        token.accept(PostfixOp, pos);
    }, {contextual: true});

    const template = new dist.ExternalTokenizer((input, token) => {
      let pos = token.start, afterDollar = false;
      for (;;) {
        let next = input.get(pos++);
        if (next < 0) {
          if (pos - 1 > token.start) token.accept(templateContent, pos - 1);
          break
        } else if (next == backtick) {
          if (pos == token.start + 1) token.accept(templateEnd, pos);
          else token.accept(templateContent, pos - 1);
          break
        } else if (next == braceL && afterDollar) {
          if (pos == token.start + 2) token.accept(templateDollarBrace, pos);
          else token.accept(templateContent, pos - 2);
          break
        } else if (next == 10 /* "\n" */ && pos > token.start + 1) {
          // Break up template strings on lines, to avoid huge tokens
          token.accept(templateContent, pos);
          break
        } else if (next == backslash && pos != input.length) {
          pos++;
        }
        afterDollar = next == dollar;
      }
    });

    // This file was generated by lezer-generator. You probably shouldn't edit it.
    const parser = dist.Parser.deserialize({
      states: "!2UOYOSOOO$QO!lO'#F^O%yOSO'#DSO'uO!lO'#GZOXOS'#GZ'#GZO)qX#tO'#CyO){OSO'#DZO,vOSO'#DaO.fOSO'#DkOXOS'#Dt'#DtO0[OSO'#DsO0`O!lO'#GVO2bOSO'#E[OXOW'#GV'#GVOXOS'#Gh'#GhO2fOSO'#FcO2jO!fO'#FdOXOS'#F|'#F|OXOS(3Cw(3CwQYOSOOO,vOSO'#D]O2qOSO'#EaO2uOSO'#ChO3POSO'#ChO3ZOSO'#EbO3eOSO'#CaO4ROSO'#EjO4cOSO'#EmO4jOSO'#EsO4jOSO'#EuOYOSO'#EwO4jOSO'#EyO4jOSO'#E|O4nOSO'#FSO4rO!gO'#FWO,vOSO'#FYO4|O!gO'#F[O5WO!gO'#F_O2jO!fO'#FaO5bO!lO'#C|O7vOSO,59ZO7zOSO'#G^O8ROSO(3CzO9wOYO'#G]OXOS'#G]'#G]O;aOSO,59nO;hO`O'#DTO<[OSO'#DtO<oOSO'#E[O<|O!fO'#GRO3ZOSO'#GQO=aOSO'#GQO=kOSO'#DlO2uOSO'#DrO3SOSO'#DsO,vOSO'#FgO=uO!fO,59fO>]OSO'#D_O@RO`O,5:bO,vOSO,5:bO,vOSO,5:dO,vOSO,5:dO,vOSO,5:dO,vOSO,5:dO,vOSO,5:dO,vOSO,5:dO,vOSO,5:dO,vOSO,5:dO,vOSO,5:dO,vOSO,5:dO,vOSO,5:dO@VOSO,5:sOXOW,5:x,5:xOXOW,5:y,5:yOXOW,5:z,5:zOAuX#tO'#GXO,vOSO'#GYOXXO(3Cx(3CxOBPX#tO,59eOBTOSO'#GaOXOS(3C{(3C{OEOOSO,59uOESO!lO,59{OGOOSO,5:VOGSOSO,59WOGWOSO,5:_O,vOSO,5:vOYOSO,5;}OXOS'#GP'#GPOXOS,5<O,5<OOXOS,5<P,5<POHvO!lO,59wOXOS'#Ck'#CkOJrOSO,5:{OXOS'#Cc'#CcOJyOSO'#ClO4nOSO,59SOKZOSO,59SO3SOSO,59SOK_OSO,5:_O2uOSO,59SOKcOSO'#CoOKsO`O'#CrOXOS'#GS'#GSOLTO!fO,5:|OL_OSO'#EfOLfOSO'#ChOLjOSO,58{OLnOSO,58{OXOS,58{,58{ON^O!fO,58{ONhOSO'#ElONoOSO'#GlONvOSO,5;UONzOSO,5;UO2jO!fO,5;UO! OOSO'#EoOXOS'#Ep'#EpOXOS'#Eq'#EqOYOSO,5;XO!!zOSO,5;XO,vOSO'#DkOYOSO,5;_OYOSO,5;aO!#OOSO,5;cOYOSO,5;eO!#SOSO,5;hO!#WOSO,5;nOXOS,5;r,5;rO,vOSO,5;rO2jO!fO,5;tOXOS,5;v,5;vO!&eOSO,5;vOXOS,5;y,5;yO!&eOSO,5;yOXOS,5;{,5;{OXOS1G.u1G.uOXOS,5<S,5<SO!&iOYO-E9fOXOS,5<w,5<wOXOW1G/Y1G/YO!(ROSO'#CuOXOS'#G`'#G`O,vOSO'#G`O!(lOSO'#G`O!)VOSO'#DUO!)dO`O'#DUO@VOSO'#DUO!)qOSO'#G_O!)xOSO,59oO!*POSO'#CtO!*^OSO'#GTO!*eOSO,59^O!*iO`O'#DUO,vOSO,5<mO=aOSO,5<lO!+POSO'#GgO!+ZOSO(3DQOXOS,5<l,5<lO!+qO`O'#DoOXOW,5:W,5:WO,vOSO,5:WO!,[OSO,5:WO4nOSO,5:^OKZOSO,5:^O3SOSO,5:^O!,cO!lO-E9eOXOS,5<R,5<RO!._OYO'#GcO,vOSO'#GcO!/wOSO,59yOXOW'#Cu'#CuOXOW1G/|1G/|O!/{OSO1G/|O!0PO!lO1G0OO!1{O!lO1G0OO!3wO!lO1G0OO!5sO!lO1G0OO!7oO!lO1G0OO!9kO!lO1G0OO!;gO!lO1G0OO!=cO!lO1G0OO!?_O!lO1G0OO!AZO!lO1G0OO!CVO!lO1G0OO!EROrO'#C|O@VOSO'#DaO!GQOSO'#DsO!GUOrO1G0_O!HkOrO'#GVO!J^OSO'#E[O@VOSO'#D]OXXO,5<Q,5<QO!JbOWO,5<tOXOW1G/P1G/POXOS,5<T,5<TOXOS1G/a1G/aOXOW1G/q1G/qOXOS1G.r1G.rOXOW1G/y1G/yO!JfO!lO1G0bOXOS1G1i1G1iOXOW1G/c1G/cOXOS1G0g1G0gO,vOSO1G0gOXOS1G.n1G.nO4nOSO1G.nOKZOSO1G.nOGWOSO1G/yO3SOSO1G.nO3ZOSO'#CtO!LbO!fO'#GiO3ZOSO'#FoO2jO!fO1G0hOXOS'#C|'#C|O!LlOSO'#GjO!LvOSO,5;QO!LzOSO1G.gOXOS1G.g1G.gO2jO!fO1G.gO!MOOSO'#CkO!MYOSO'#GmO!MaOSO,5;WO!MeOSO'#GmO!MiOSO'#GoO!MpOSO(3DUOXOS,5=W,5=WO2qOSO1G0pO!M}OSO1G0pOXOS1G0p1G0pO!NROYO,5=[O# tOSO,5=[O#!OOSO,5;ZO##qOSO,5;ZO3ZOSO,5=[OXOS1G0s1G0sOYOSO1G0sOXOS1G0y1G0yOXOS1G0{1G0{O4jOSO1G0}O##uOSO1G1PO#&|OSO'#FOOXOS1G1S1G1SO4nOSO1G1YO#)}OSO1G1YO2jO!fO1G1^OXOS1G1`1G1`OXOS'#F^'#F^O2jO!fO1G1bO2jO!fO1G1eO#*UOSO,5<zO@VOSO,59`O3ZOSO,59`O4nOSO,59pO@VOSO,59pOXOS'#DY'#DYOKZOSO,59pO#*YOrO,59pO#+rOSO'#E[OXOS,59`,59`O#+|OSO'#GRO#,WOSO'#GbO#,_O`O(3C|OXOS,5<y,5<yOXOW1G/Z1G/ZO#-ROSO'#GfO#-YO`O(3DPOXOS,5<o,5<oOXOS1G.x1G.xO!)dO`O,59pO#-mO!lO1G2XOXOS1G2W1G2WOXOS,5<Y,5<YO3ZOSO,5<YOXOS-E9l-E9lO#/`O`O'#GeOKZOSO'#DpO!)mO`O'#DpOXO`(3DO(3DOO#/yOSO,5:ZO#/}O`O'#DpO#0[O`O'#DpO#0lOSO1G/rOXOW1G/r1G/rO,vOSO1G/rOXOW1G/x1G/xO4nOSO1G/xOKZOSO1G/xO#0pOSO'#GdO#0wOSO(3C}OXOS,5<},5<}O!._OYO,5<}OXOW1G/e1G/eOXOW7+%h7+%hO#2pOrO,59{O#4]OSO,5:_O@VOSO,5:dO@VOSO,5:dO@VOSO,5:dO@VOSO,5:dO@VOSO,5:dO@VOSO,5:dO@VOSO,5:dO@VOSO,5:dO@VOSO,5:dO@VOSO,5:dO@VOSO,5:dO,vOSO7+%yO@VOSO,5:vO#5{OrO,59wO#7hOSO,5:_O#7lO!lO,59fOXXO1G2`1G2`O#0lOSO7+&ROXOS7+$Y7+$YO4nOSO7+$YOXOW7+%e7+%eOKZOSO7+$YOXOS,5<Z,5<ZOXOS-E9m-E9mOXOS7+&S7+&SO#9hOSO'#GkO#9oOSO(3DSOXOS,5=U,5=UO#9yO`O,5=UOXOS1G0l1G0lO2jO!fO7+$ROXOS7+$R7+$RO#9}OSO'#GnO#:UOSO(3DTOXOS,5=X,5=XOXOS1G0r1G0rO2qOSO,5=XOXOS,5<^,5<^OXOS-E9p-E9pO#:`OSO7+&[O2jO!fO7+&[O,vOSO1G2vO,vOSO1G2wO#:dOSO1G0uO#<VOSO1G0uO#<ZOSO1G0uO#=|O!fO1G2vOXOS7+&_7+&_O2jO!fO7+&iOYOSO7+&kO#>aOSO'#GrOXOS'#Gs'#GsOXOS(3DV(3DVO#AbOSO,5;jO,vOSO'#FPO#AfOSO'#FROXOS7+&t7+&tO#AjOSO7+&tO3ZOSO7+&tOXOS7+&x7+&xOXOS7+&|7+&|OXOS7+'P7+'POXOS1G2f1G2fO#DtOrO1G.zO#F^OSO1G.zOXOS1G/[1G/[O#FhOrO1G/[O4nOSO1G/[O@VOSO,5<mOXOS,5<U,5<UO@VOSO'#DUOXOS-E9h-E9hOXOS,5<X,5<XOXOS-E9k-E9kOKZOSO1G/[OXOS3)/W3)/WOXO`,5<W,5<WO4nOSO,5:[OKZOSO,5:[OXOW1G/u1G/uO!)mO`O,5:[O#HQO`O,5:[OXOW7+%^7+%^O#0lOSO7+%^OXOW7+%d7+%dO4nOSO7+%dOXOS,5<V,5<VO#H_OYO-E9iO,vOSO,5<VOXOS1G2i1G2iO#IwOrO'#GZO#KdOrO1G0OO#MPOrO1G0OO#NlOrO1G0OO$!XOrO1G0OO$#tOrO1G0OO$%aOrO1G0OO$&|OrO1G0OO$(iOrO1G0OO$*UOrO1G0OO$+qOrO1G0OO$-^OrO1G0OO$.yOrO1G0_O$0`O!lO<<IeO$2[OrO1G0bO#4]OSO1G/yOXOS<<Im<<ImOXOS<<Gt<<GtO4nOSO<<GtOXOS,5<[,5<[O$3wOSO-E9nOXOS'#Eh'#EhO$4ROSO1G2pOXOS<<Gm<<GmOXOS,5<],5<]OXOS-E9o-E9oO$4YOSO,5<]O!MYOSO1G2sO$4^OSO<<IvOXOS<<Iv<<IvO$4bOSO7+(bO$4fOSO7+(cOXOS7+&a7+&aO$4jOSO7+&aO$4nOSO7+&aO$6aOSO7+&aO,vOSO7+(bO,vOSO7+(cOXOS<<JT<<JTOXOS<<JV<<JVOXOS,5<_,5<_OXOS1G1U1G1UO$6eOSO,5;kOXOS,5;m,5;mO4nOSO<<J`O$6iOSO<<J`O@VOSO7+$fOXOS7+$v7+$vO$6mOrO1G2XO4nOSO7+$vOXO`1G/v1G/vO4nOSO1G/vOKZOSO1G/vO!)mO`O1G/vOXOW<<Hx<<HxOXOW<<IO<<IOO$8VOYO3)/TO@VOSO'#FgO$9oOrO,59fO@VOSO7+%yOXOSAN=`AN=`O$;[O`O1G1vOXOS7+([7+([O2qOSO1G1wOXOS7+(_7+(_O2jO!fOAN?bOXOS<<K|<<K|OXOS<<K}<<K}OXOS<<I{<<I{O$;`OSO<<I{O$;dOSO<<I{O$=VOSO<<K|O$=ZOSO<<K}OXOS1G1V1G1VOXOSAN?zAN?zO4nOSOAN?zO$=_OrO<<HQOXOS<<Hb<<HbOXO`7+%b7+%bO4nOSO7+%bOKZOSO7+%bO$>wOrO-E9eO$@dOrO<<IeOXOS'#Ei'#EiOXOS8;$t8;$tOXOS8;$u8;$uOXOSG24|G24|OXOSAN?gAN?gO$BPOSOAN?gOXOSANAhANAhOXOSANAiANAiO$BTOSOG25fOXO`<<H|<<H|O4nOSO<<H|OXOSG25RG25RO4nOSOLD+QOXO`AN>hAN>hOXOS!$'Nl!$'Nl",
      stateData: "$EjROSSOS$oOS~UiOX]OYaO]gO^fOaWOdQOgUOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!aeO#VhO#WhO#XhO#_jO#bkO#hlO#jmO#lnO#noO#qpO#wqO#{rO#}sO$PtO$SuO$UvO$qPO$zTO~QpXYpXapXdpXk$QXlpXopX!^pX!i_X!kpX!mpX!npX!opX!ppX!qpX!rpX!spX!tpX!upX!vpX!wpX!xpX!ypX!zpX!|pX#PpX$jpX$zpX~X]O]!WO^!VOaWOb!SOdQOg!OOj]OozOq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTOe$tPe%QP~Q!jOa!ZOd!]Oo!XO!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO!|!iO$zTOY$}X$j$}X!S$}Xe$}X%O$}Xg$}Xk$}X~$k!oO$l!nO$m${P~UiOX]OYaO]gO^fOaWOdQOgUOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!aeO#VhO#WhO#XhO#_jO#bkO#hlO#jmO#lnO#noO#qpO#wqO#{rO#}sO$PtO$SuO$UvO$qPO$zTO!O%TP~X]O]!WO^!VOaWOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTO~X]O]!WO^!VOaWOb!SOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTO!S$tP~!i!wO~l!xO#P!xOQ$yXY$yXa$yXd$yXo$yX!^$yX!k$yX!m$yX!n$yX!o$yX!p$yX!q$yX!r$yX!s$yX!t$yX!u$yX!v$yX!w$yX!x$yX!y$yX!z$yX!|$yX$j$yX$z$yXe$yX!S$yX%O$yXg$yXk$yX~l!xO~k!yO~Y!zO$j!zO~$q#OO~a#RO$q#OO$r#QO~^#WOa#RO$q#OO~d#XOg#YO$q#OO~Z#`O]#^O^fOg#]O!aeO#VhO#WhO#XhO$r#QO~X#gOg#cO$q#OO$r#QOW%`P~a#hO!U#lO~a#mO~gUO~Y!zO$i#uO$j!zO~Y!zO$i#xO$j!zO~Y!zO$i#zO$j!zO~QpXapXdpXe_XepXl_XlpXo_XopX!^pX!i_X!kpX!mpX!npX!opX!ppX!qpX!rpX!spX!tpX!upX!vpX!wpX!xpX!ypX!zpX!|pX#PpX$zpXYpX$jpX!S_X!SpX%OpX#fpXgpXkpX~e#|O~ozOe%QX~X]O]!WO^!VOaWOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTOe$[Zo$[Z~Q!jOa!ZOd!]OozO!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO!|!iO$zTOe%QP~e$QOe$QO~X$UOb$XOd$TOj$UOy$_Oz$WO{$WO$r#QO$x$RO!O$wP!O%RP~e$vXl$vXo$vX!i!hX!S$vX!O$vX~l!xOe$vXo$vX!S$vX~l$`Oe$uXo$uX!S$uXY$uX$j$uX~o$cOe%ZP!S%ZP~g$eO!b$gO$q#OO~o!XOYna$jna!Snaenagnakna~X]O]!WO^!VOaWOb$oOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTO!S%VP~$x$qO~X]O]!WO^!VOaWOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!Q%VO!U%QO!V%QO!W%QO!X%QO!Y%QO!Z%QO![%QO!]%QO!^%QO!a!UO$q%PO$zTO~$k!oO$l!nO$m${X~$m%YO~UiOX]OYaO]gO^fOaWOdQOgUOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!aeO#VhO#WhO#XhO#_jO#bkO#hlO#jmO#lnO#noO#qpO#wqO#{rO#}sO$PtO$SuO$UvO$qPO$zTO!O%TX~!O%[O~a!ZOd!]O!k![O$zTOQ!TaY!Tao!Ta!^!Ta!m!Ta!n!Ta!o!Ta!p!Ta!q!Ta!r!Ta!s!Ta!t!Ta!u!Ta!v!Ta!w!Ta!x!Ta!y!Ta!z!Ta!|!Ta$j!Tae!Ta!S!Ta%O!Tag!Tak!Ta~!S%]O~!S%^O~X]O]!WO^!VOaWOdQOgUOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTO~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO!|!iO$zTOY!Pao!Pa$j!Pae!Pa!S!Pa%O!Pag!Pak!Pa~g$eO!b%dO~b!SOd#XOg#YO$q#OO!S$tP~a#RO~!i%hO~b!SOd#XOg#YO$q#OOe$tP~X$[Ob%jOj$[O$x$qO!O$wP~o%lOY%]P$j%]P~$q%nO!O%^P~^#WO~W%qO~X]O]gO^fOaWOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!aeO$qwO$zTO~W%qOY!zO$j!zO~$q%tO!O%aP~o%yOW%cP~#Z%{O~W%|O~X]OY&QO]!WO^!VOaWOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO#V&SO#W&SO#X&SO$qwO$zTO~a#hO~#h&XO~g&ZO~#x&^O#y&]OU#vaX#vaY#va]#va^#vaa#vad#vag#vaj#vaq#var#vas#vat#vau#va!Q#va!U#va!V#va!W#va!X#va!Y#va!Z#va![#va!]#va!^#va!a#va#V#va#W#va#X#va#_#va#b#va#h#va#j#va#l#va#n#va#q#va#w#va#{#va#}#va$P#va$S#va$U#va$h#va$q#va$z#va!O#va#o#vaZ#va#t#va~$q&aO~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO!|!iO$zTOe$[co$[c~a|XkiXk|XliXoiXo|X!OiX!O|X~k&fOl&eOa%SXk%SXohXo%SX!OhX!O%SX~a#ROk&hOoxX!OxX~X$SOd$TOj$SO$x&iO~o&pO!O%UP~!O&rO!O&rO~k&fOl&eOohX!OhX~o&tO!O%YP~!O&vO~X$SOd$TOj$SOz&wO{&wO$r#QO$x&iO~o$cOe%ZX!S%ZX~b&{Od#XOg#YO$q#OOe$bZo$bZ!S$bZ~Y'QOy'SOz'PO{'PO!e'TO$r#QO$x&iO!O%XP~g$eO!b'WO~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO!|!iO$zTOY$Zco$Zc$j$Zc!S$Zce$Zc%O$Zcg$Zck$Zc~Q!jOa!ZOd!]Oo']O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO!|!iO$zTO!S%WP~!S'`O~e'aO~Q!jOa!ZOd!]O!k![O$zTOY!lio!li!^!li!m!li!n!li!o!li!p!li!q!li!r!li!s!li!t!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~Q!jOa!ZOd!]O!k![O!m!^O$zTOY!lio!li!^!li!n!li!o!li!p!li!q!li!r!li!s!li!t!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~Q!jOa!ZOd!]O!k![O!m!^O!n!_O!o!_O!p!_O$zTOY!lio!li!^!li!q!li!r!li!s!li!t!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O$zTOY!lio!li!q!li!r!li!s!li!t!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO$zTOY!lio!li!r!li!s!li!t!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO$zTOY!lio!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO$zTOY!lio!li!v!li!w!li!x!li!y!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO$zTOY!lio!li!w!li!x!li!y!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO$zTOY!lio!li!x!li!y!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO$zTOY!lio!li!y!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO$zTOY!lio!li!z!li!|!li$j!lie!li!S!li%O!lig!lik!li~QpXapXdpXlpX!^pX!i_X!kpX!mpX!npX!opX!ppX!qpX!rpX!spX!tpX!upX!vpX!wpX!xpX!ypX!zpX!|pX!}pX#PpX$zpXl_Xo_XopX!O_X!OpX~!i'cO~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO!}'oO$zTO~l'pO#P'pOQ$yXa$yXd$yX!^$yX!k$yX!m$yX!n$yX!o$yX!p$yX!q$yX!r$yX!s$yX!t$yX!u$yX!v$yX!w$yX!x$yX!y$yX!z$yX!|$yX!}$yX$z$yXo$yX!O$yX~l'pO~%O'tO~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO!|!iO$zTOY#Oio#Oi$j#Oie#Oi!S#Oi%O#Oig#Oik#Oi~o%lOY%]X$j%]X~o(OO#Z(QO!O%_P~!O(RO~X(SO~o_X!O_X#ZpX~o(VO!O%bP~!O(XO~#Z(YO~o%yOW%cX~g#cO$q#OOW$fZo$fZ~X(^O~l!xO!s(_O#P!xO#f(`OQ$yXY$yXa$yXd$yXo$yX!^$yX!k$yX!m$yX!n$yX!o$yX!p$yX!q$yX!r$yX!t$yX!u$yX!v$yX!w$yX!x$yX!y$yX!z$yX!|$yX$z$yX~l!xO!s(_O#f(`O~X]OY(aO]!WO^!VOaWOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTO~Y(cO~#o(gOU#miX#miY#mi]#mi^#mia#mid#mig#mij#miq#mir#mis#mit#miu#mi!Q#mi!U#mi!V#mi!W#mi!X#mi!Y#mi!Z#mi![#mi!]#mi!^#mi!a#mi#V#mi#W#mi#X#mi#_#mi#b#mi#h#mi#j#mi#l#mi#n#mi#q#mi#w#mi#{#mi#}#mi$P#mi$S#mi$U#mi$h#mi$q#mi$z#mi!O#miZ#mi#t#mi~UiOX]OYaOZ(mO]gO^fOaWOdQOgUOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!aeO#VhO#WhO#XhO#_jO#bkO#hlO#jmO#lnO#noO#qpO#t(lO#wqO#{rO#}sO$PtO$SuO$UvO$qPO$zTO!O%fP~a(pOgUO~e(tO~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO$zTOoxa!Oxa~l'pOo$vX!O$vX~l(zOo$uX!O$uX~o&pO!O%UX~X$SOb(|Od$TOj$SOy$_Oz$WO{$WO$r#QO$x&iOo$^Z!O$^Z~o&tO!O%YX~X$[Ob%jOj$[O$x$qOo$aZ!O$aZ~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO!|!iO$zTOe$uio$ui!S$uiY$ui$j$ui~Y'QOy'SOz'PO{'PO!e'TO$r#QO$x&iO!O%XX~!O)VO~z)WO{)WO$r#QO$x&iO~y)XOz)WO{)WO$r#QO$x&iO~g$eO~o']O!S%WX~X]O]!WO^!VOaWOb)`OdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTOo$_Z!S$_Z~a!ZOd!]O!k![O$zTOQ!Ta!^!Ta!m!Ta!n!Ta!o!Ta!p!Ta!q!Ta!r!Ta!s!Ta!t!Ta!u!Ta!v!Ta!w!Ta!x!Ta!y!Ta!z!Ta!|!Ta!}!Tao!Ta!O!Ta~X]O]!WO^!VOaWOdQOgUOj]Oq]Or]Os]Ot]Ou]O!Q%VO!U%QO!V%QO!W%QO!X%QO!Y%QO!Z%QO![%QO!]%QO!^%QO!a!UO$q%PO$zTO~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO$zTO!}!Pao!Pa!O!Pa~!i)qO~o!XO%OnaQnaYnaanadna!^na!kna!mna!nna!ona!pna!qna!rna!sna!tna!una!vna!wna!xna!yna!zna!|na$jna$znaena!Snagnakna~o(OO!O%_X~$q%nOo$dZ!O$dZ~$x)wO~o(VO!O%bX~$q%tOo$eZ!O$eZ~W*OO~X]O]!WO^!VOaWOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!S*SO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTO~Y*UO~X]OY*UO]!WO^!VOaWOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTO~l$`O!s*WO#f*XOY$uXo$uX$j$uX~UiOX]OYaOZ(mO]gO^fOaWOdQOgUOj]Oq]Or]Os]Ot]Ou]O!QdO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!aeO#VhO#WhO#XhO#_jO#bkO#hlO#jmO#lnO#noO#qpO#t(lO#wqO#{rO#}sO$PtO$SuO$UvO$qPO$zTO!O%fX~!O*]O~k*_O~#y*`OU#vqX#vqY#vq]#vq^#vqa#vqd#vqg#vqj#vqq#vqr#vqs#vqt#vqu#vq!Q#vq!U#vq!V#vq!W#vq!X#vq!Y#vq!Z#vq![#vq!]#vq!^#vq!a#vq#V#vq#W#vq#X#vq#_#vq#b#vq#h#vq#j#vq#l#vq#n#vq#q#vq#w#vq#{#vq#}#vq$P#vq$S#vq$U#vq$h#vq$q#vq$z#vq!O#vq#o#vqZ#vq#t#vq~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO$zTOohi!Ohi~l*bOohi!Ohi~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO$zTOoxi!Oxi~z*iO{*iO$r#QO$x&iO~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO!|!iO$zTOo$_c!S$_c~Q!jOa!ZOd!]Oo*mO!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO$zTO!}$}X!O$}X~Q!jOa!ZOd!]O!k![O$zTO!^!li!m!li!n!li!o!li!p!li!q!li!r!li!s!li!t!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!k![O!m'dO$zTO!^!li!n!li!o!li!p!li!q!li!r!li!s!li!t!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!k![O!m'dO!n'eO!o'eO!p'eO$zTO!^!li!q!li!r!li!s!li!t!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO$zTO!q!li!r!li!s!li!t!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO$zTO!r!li!s!li!t!li!u!li!v!li!w!li!x!li!y!li!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO$zTO!u!li!v!li!w!li!x!li!y!li!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO$zTO!v!li!w!li!x!li!y!li!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO$zTO!w!li!x!li!y!li!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO$zTO!x!li!y!li!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO$zTO!y!li!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO$zTO!z!li!|!li!}!lio!li!O!li~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO!}*oO$zTO~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO$zTOY!{yo!{y!|!{y$j!{ye!{y!S!{y%O!{yg!{yk!{y~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO$zTO!}#Oio#Oi!O#Oi~#Z*qOo$dc!O$dc~o(OO!O%_P~#Z*sO~X*uO~!S*vO~!S*wO~!S*xO~X]O]!WO^!VOaWOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!S*xO!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTO~Y*zO~k*}O~!S+PO~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO$zTOo$ui!O$ui~Q!jOa!ZOd!]O!^!`O!k![O!m!^O!n!_O!o!_O!p!_O!q!aO!r!bO!s!bO!t!bO!u!cO!v!dO!w!eO!x!fO!y!gO!z!hO!|!iO$zTOo$_k!S$_k~o*mOQnaanadna!^na!kna!mna!nna!ona!pna!qna!rna!sna!tna!una!vna!wna!xna!yna!zna!|na!}na$zna!Ona~$x+XO~!S+]O~X]O]!WO^!VOaWOdQOg!OOj]Oq]Or]Os]Ot]Ou]O!QdO!S+]O!UVO!VVO!WVO!XVO!YVO!ZVO![VO!]VO!^VO!a!UO$qwO$zTO~!S+_O~!S+`O~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO$zTOohy!Ohy~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO!|!iO$zTOo$Zc!}$Zc!O$Zc~Q!jOa!ZOd!]O!^'fO!k![O!m'dO!n'eO!o'eO!p'eO!q'gO!r'hO!s'hO!t'hO!u'iO!v'jO!w'kO!x'lO!y'mO!z'nO$zTO!|!{y!}!{yo!{y!O!{y~!S+dO~#y+eOU#v!ZX#v!ZY#v!Z]#v!Z^#v!Za#v!Zd#v!Zg#v!Zj#v!Zq#v!Zr#v!Zs#v!Zt#v!Zu#v!Z!Q#v!Z!U#v!Z!V#v!Z!W#v!Z!X#v!Z!Y#v!Z!Z#v!Z![#v!Z!]#v!Z!^#v!Z!a#v!Z#V#v!Z#W#v!Z#X#v!Z#_#v!Z#b#v!Z#h#v!Z#j#v!Z#l#v!Z#n#v!Z#q#v!Z#w#v!Z#{#v!Z#}#v!Z$P#v!Z$S#v!Z$U#v!Z$h#v!Z$q#v!Z$z#v!Z!O#v!Z#o#v!ZZ#v!Z#t#v!Z~S$xR$q$o!nu~$q$x~",
      goto: "!#s%hPPPPP%iP%yPPPP&lPP'Q*[PP-^PP-^P/o/vPPP0O3OP3zPPPPP6W6W8SPPP8Y8qP6WP:iP6WPPPPPPPPP;o6WPP=z>^P6W6W>bP@dP6WPPPPPPPPPPPPPP6WPP6WP6W6W6W&lBdPPPBxPB{CO%iPCR%iPCXCXCXP%iP%iP%iP%iPP%iPC_CbPCb%iPPP%iP%iP%iPCf%iP%iP%i%iC|DSDYDeDlDrDxEPEVE]EdEjEqExFOPPPPPPPPFUPPFzHPHXHsI]PIaPM]M`MdP! `! c! i! l! w! z! }!!Q!!W!!Z!!^!!d!!w!!z!!}!#T!#W!#Z!#a!#d!#h!#l!#omaOUcn!q!y#k#n#o#q&U&Z(g(hQ#UfQ#_iQ#ejS$W!O&pQ$k!VQ%i#WQ&w$_S'P$e&}S)W'S'TR*i)Xn^OUcin!q!y#k#n#o#q&U&Z(g(hR%r#`$pXOUVcdgnsz!W!X!Z!]!^!_!`!a!b!c!d!e!f!g!h!i!n!q!w!x!y#`#h#k#m#n#o#q#u$T$`$g$o%Q%V%d%h&Q&U&Z&e&h'W']'c'd'e'f'g'h'i'j'k'l'm'n'o'p(_(`(a(c(g(h(l(z(|)`)q*U*W*X*b*m*o*zU!PQW$XQ#PeQ#Tff#Zh!S#R#X$c%j%l&S&f&{(pQ#djQ$h!UQ$j!VS%g#U#WQ%u#cQ'Z$kQ'y%iQ([%yQ(]%{Q){(VQ)}(YR+Z*s#nYOQUVWcdnsz!X!Z!]!^!_!`!a!b!c!d!e!f!g!h!n!q!w!x!y#`#h#k#m#n#o#q#u$T$`$g$o%d%h&Q&U&Z'W']'o(_(`(a(c(g(h(l)`*U*W*X*zQ#SfS#Vg!WQ$i!V!S%R!i$X%Q%V&e&h'c'd'e'f'g'h'i'j'k'l'm'n'p(z(|)q*b*m*oU%f#T#U#WQ&g$VS'Y$j$kS'w%g%iQ(y&jQ)T'OQ)]'ZQ)t'yQ*e)QQ*g)UQ+T*hR+c+U#h[OUVcdnsz!X!Z!]!^!_!`!a!b!c!d!e!f!g!h!n!q!w!x!y#`#k#m#n#o#q#u$T$`$g$o%d%h&Q&U&Z'W']'o(_(`(a(c(g(h(l)`*U*W*X*zS!QQWf#Zh!S#R#X$c%j%l&S&f&{(p!Q%U!i%Q%V&e&h'c'd'e'f'g'h'i'j'k'l'm'n'p(z(|)q*b*m*oQ&P#hR&l$XS$]!O#YR)P&tU$[!O#Y&tR$r![$r]OQUVWcdnsz!X!Z!]!^!_!`!a!b!c!d!e!f!g!h!i!n!q!w!x!y#`#h#k#m#n#o#q#u$T$X$`$g$o%Q%V%d%h&Q&U&Z&e&h'W']'c'd'e'f'g'h'i'j'k'l'm'n'o'p(_(`(a(c(g(h(l(z(|)`)q*U*W*X*b*m*o*z#T!lR{!t!}$O$l$n$t$u$v$w$x$y$z${$|$}%O%S%`&k&x'_'b'q(u(x)_)b)c)d)e)f)g)h)i)j)k)l)m)n)o)p*d*l+Q+V+W!sSOUWcns!]!n!q!w!y#`#h#k#m#n#o#q#u$T$g%d%h&Q&U&Z'W'c(_(`(a(c(g(h(l)q*U*W*X*z#lZOQUVWcdnsz!X!Z!]!^!_!`!a!b!c!d!e!f!g!h!n!q!w!x!y#`#k#m#n#o#q#u$T$`$g$o%d%h&Q&U&Z'W']'o(_(`(a(c(g(h(l)`*U*W*X*z!S%T!i$X%Q%V&e&h'c'd'e'f'g'h'i'j'k'l'm'n'p(z(|)q*b*m*oQ%o#]Q%w#cQ&O#hQ)v(OR)|(V$s]OQUVWcdnsz!X!Z!]!^!_!`!a!b!c!d!e!f!g!h!i!n!q!w!x!y#`#h#k#m#n#o#q#u$T$X$`$g$o%Q%V%d%h&Q&U&Z&e&h'W']'c'd'e'f'g'h'i'j'k'l'm'n'o'p(_(`(a(c(g(h(l(z(|)`)q*U*W*X*b*m*o*zQ$Y!OR(}&pY$S!O$W$_&p&wS'O$e&}U)U'P'S'TS*h)W)XR+U*ilaOUcn!q!y#k#n#o#q&U&Z(g(hQ#sqS%_!w'cQ%e#SQ'X$iQ'v%fS'x%h)qQ(n&]Q(o&^Q(w&gQ)['YQ)s'wQ*c(yQ*f)TQ*k)]Q*p)tQ+O*`Q+R*eQ+S*gQ+a+PQ+b+TQ+f+cR+g+e#O!kR{!t$O$l$n$t$u$v$w$x$y$z${$|$}%O%S%`&k&x'_'b(u(x)_)b)c)d)e)f)g)h)i)j)k)l)m)n)o)p*d*l+Q+V+WT%b!}'q$r]OQUVWcdnsz!X!Z!]!^!_!`!a!b!c!d!e!f!g!h!i!n!q!w!x!y#`#h#k#m#n#o#q#u$T$X$`$g$o%Q%V%d%h&Q&U&Z&e&h'W']'c'd'e'f'g'h'i'j'k'l'm'n'o'p(_(`(a(c(g(h(l(z(|)`)q*U*W*X*b*m*o*zQ#nlQ#omQ#qoQ#rpR(f&XQ$f!UQ%c#PQ'V$hQ)Y'UQ)r'uR*j)ZT'Q$e&}#nYOQUVWcdnsz!X!Z!]!^!_!`!a!b!c!d!e!f!g!h!n!q!w!x!y#`#h#k#m#n#o#q#u$T$`$g$o%d%h&Q&U&Z'W']'o(_(`(a(c(g(h(l)`*U*W*X*zS#Vg!W!T%R!i$X%Q%V&e&h'c'd'e'f'g'h'i'j'k'l'm'n'p(z(|)q*b*m*o#lZOQUVWcdnsz!X!Z!]!^!_!`!a!b!c!d!e!f!g!h!n!q!w!x!y#`#k#m#n#o#q#u$T$`$g$o%d%h&Q&U&Z'W']'o(_(`(a(c(g(h(l)`*U*W*X*z!S%T!i$X%Q%V&e&h'c'd'e'f'g'h'i'j'k'l'm'n'p(z(|)q*b*m*oR&O#hn^OUcin!q!y#k#n#o#q&U&Z(g(hR&Q#hR#biR)x(QR+Y*qQ#djR([%yQ#kkR&U#lR&[#rT(i&Z(hl_OUcn!q!y#k#n#o#q&U&Z(g(hQ&b#xR&c#zQcOR!|cQ!mTR%W!mQ!YRU$m!Y's*nR*n)bSyQ{R#}yQ!qUR%Z!qQ&o$YR({&oS'[$n'_R)^'[Q&}$eR)S&}Q&s$]R)O&sS$b!T$aR&z$bQ%k#[R'z%kS'}%o)xR)u'}S(U%u)}R)z(UQ%x#dR(Z%xQ(h&ZR*[(hSbOcS!rU!qQ#pnQ%a!yQ&T#kQ&V#nQ&W#oQ&Y#qQ(e&US(i&Z(hR*Z(gQ!{`Q#trQ#wtQ#yuQ#{vQ%r#bQ%}#gQ&`#vQ'|%mQ(T%sQ(q&_Q(r&bQ(s&cQ)y(SQ*P(^Q*Y(fR+[*uSxQ#XT!vW#RW!TQW#R#XS#[h&SQ$a!SS&m$X%jQ&|$cQ'{%lR)R&{b!RQWh!S#R#X$c%l&{S&n$X%jQ(d&SQ(v&fR*a(pT$^!O#Y!nROUWcns!]!n!q!w!y#`#h#k#m#n#o#q#u$T$g%d%h&Q&U&Z'W(_(`(a(c(g(h(l*U*W*X*zQ{QQ!tVQ!}dQ$OzQ$l!XQ$n!ZQ$t!^Q$u!_Q$v!`Q$w!aQ$x!bQ$y!cQ$z!dQ${!eQ$|!fQ$}!gQ%O!hQ%S!iQ%`!xS&k$X(|Q&x$`Q'_$oQ'b%QQ'q%VQ(u&eQ(x&hQ)_']S)b'c)qQ)c'dQ)d'eQ)e'fQ)f'gQ)g'hQ)h'iQ)i'jQ)j'kQ)k'lQ)l'mQ)m'nQ)o'oQ)p'pQ*d(zQ*l)`Q+Q*bQ+V*mR+W*oR!pTT!oT!ml`OUcn!q!y#k#n#o#q&U&Z(g(hS!uW#mQ#vsQ$s!]Q%X!nS%_!w'cQ%s#`Q&R#hQ&_#uQ&d$TQ'U$gQ'u%dS'x%h)qQ(b&QQ)Z'WQ*Q(_Q*R(`Q*T(aQ*V(cQ*^(lQ*y*UQ*{*WQ*|*XR+^*zR}QQ|QR$P{R$Z!OS$V!O&pS&j$W$_R)Q&wR!sUR&q$YR$p!ZQ'^$nR)a'_R'R$eR&u$]Q$d!TR&y$alaOUcn!q!y#k#n#o#q&U&Z(g(hR#aiR%m#[R%p#]Q(P%oR*r)xR#fjR%v#cQ(W%uR*t)}R%z#dT#ik#lT#jk#lR(k&ZT(j&Z(h",
      nodeNames: "⚠ Script PostfixOp LineComment BlockComment ExportDeclaration export Star from String ; default FunctionDeclaration async function VariableDefinition ParamList ( Spread ArrayPattern [ ] ObjectPattern { PatternProperty PropertyName Number : Equals TemplateString SequenceExpression , VariableName BooleanLiteral this null super RegExp ArrayExpression ObjectExpression Property async get set PropertyNameDefinition Block } NewExpression new ArgList ) UnaryExpression await yield void typeof delete LogicOp BitOp ArithOp ArithOp ParenthesizedExpression ClassExpression class extends ClassBody MethodDeclaration static FunctionExpression ArrowFunction ParamList Arrow MemberExpression . BinaryExpression ArithOp ArithOp ArithOp ArithOp BitOp CompareOp in instanceof CompareOp BitOp BitOp BitOp LogicOp LogicOp ConditionalExpression LogicOp LogicOp AssignmentExpression UpdateOp PostfixExpression CallExpression TaggedTemplatExpression ClassDeclaration VariableDeclaration let var const ExportGroup as VariableName VariableName ImportDeclaration import ImportGroup ForStatement for ForSpec ForInSpec ForOfSpec of WhileStatement while WithStatement with DoStatement do IfStatement if else SwitchStatement switch SwitchBody CaseLabel case DefaultLabel TryStatement try catch finally ReturnStatement return ThrowStatement throw BreakStatement break Label ContinueStatement continue DebuggerStatement debugger LabeledStatement ExpressionStatement",
      nodeProps: [
        [dist.NodeProp.top, 1,true],
        [dist.NodeProp.delim, 16,"( )",19,"[ ]",22,"{ }",38,"[ ]",39,"{ }",45,"{ }",49,"( )",61,"( )",65,"{ }",102,"{ }",108,"{ }",111,"( )",126,"{ }"]
      ],
      repeatNodeCount: 15,
      tokenData: "<v~R!SX^$_pq$_qr%Srs%itu&]uv&vvw'Twx'exy(Syz(Xz{(^{|(s|})T}!O)Y!O!P)e!P!Q*u!Q!R5i!R![6c![!]8S!]!^8Z!^!_8`!_!`8x!`!a9b!a!b9x!c!}&]!}#O9}#P#Q:S#Q#R:X#R#S&]#S#T:a#T#o&]#o#p:f#p#q:k#q#r:{#r#s;S#y#z$_$f$g$_$g#BY&]#BY#BZ;X#BZ$IS&]$IS$I_;X$I_$I|&]$I|$JO;X$JO$JT&]$JT$JU;X$JU$KV&]$KV$KW;X$KW&FU&]&FU&FV;X&FV~&]~$dY$o~X^$_pq$_#y#z$_$f$g$_#BY#BZ$_$IS$I_$_$I|$JO$_$JT$JU$_$KV$KW$_&FU&FV$_~%XP!Z~!_!`%[~%aP!u~!_!`%d~%iO!u~~%nUX~OY%iZr%irs&Qs#O%i#O#P&V#P~%i~&VOX~~&YPO~%i_&dU$xS$qZtu&]!Q![&]!c!}&]#R#S&]#T#o&]$g~&]~&{P!o~!_!`'OY'TO#PY~'YQ!x~vw'`!_!`'O~'eO!y~~'jUX~OY'eZw'ewx&Qx#O'e#O#P'|#P~'e~(PPO~'e~(XOa~~(^O!S~~(eQ$rT!pYz{(k!_!`'O~(pP!m~!_!`'O~(xQ!^~{|)O!_!`'O~)TO!]~~)YOo~~)_Q!^~}!O)O!_!`'O~)jQ!kY!O!P)p!Q![){~)sP!O!P)v~){Ob~T*QRjT!Q![){!g!h*Z#X#Y*ZT*^R{|*g}!O*g!Q![*mT*jP!Q![*mT*rPjT!Q![*m~*zZ!nYOY+mZz+mz{-f{!P+m!P!Q3z!Q!_+m!_!`4V!`!}+m!}#O4s#O#P5`#P~+mP+rVuPOY+mZ!P+m!P!Q,X!Q!}+m!}#O,p#O#P-]#P~+mP,^UuP#Z#[,X#]#^,X#a#b,X#g#h,X#i#j,X#m#n,XP,sTOY,pZ#O,p#O#P-S#P#Q+m#Q~,pP-VQOY,pZ~,pP-`QOY+mZ~+m~-kYuPOY-fYZ.ZZz-fz{/O{!P-f!P!Q2v!Q!}-f!}#O0^#O#P2d#P~-f~.^ROz.Zz{.g{~.Z~.jTOz.Zz{.g{!P.Z!P!Q.y!Q~.Z~/OOS~~/TYuPOY-fYZ.ZZz-fz{/O{!P-f!P!Q/s!Q!}-f!}#O0^#O#P2d#P~-f~/zUS~uP#Z#[,X#]#^,X#a#b,X#g#h,X#i#j,X#m#n,X~0aWOY0^YZ.ZZz0^z{0y{#O0^#O#P2Q#P#Q-f#Q~0^~0|YOY0^YZ.ZZz0^z{0y{!P0^!P!Q1l!Q#O0^#O#P2Q#P#Q-f#Q~0^~1qTS~OY,pZ#O,p#O#P-S#P#Q+m#Q~,p~2TTOY0^YZ.ZZz0^z{0y{~0^~2gTOY-fYZ.ZZz-fz{/O{~-f~2{_uPOz.Zz{.g{#Z.Z#Z#[2v#[#].Z#]#^2v#^#a.Z#a#b2v#b#g.Z#g#h2v#h#i.Z#i#j2v#j#m.Z#m#n2v#n~.Z~4PQR~OY3zZ~3zZ4^V#PYuPOY+mZ!P+m!P!Q,X!Q!}+m!}#O,p#O#P-]#P~+mP4vTOY4sZ#O4s#O#P5V#P#Q+m#Q~4sP5YQOY4sZ~4sP5cQOY+mZ~+mT5nVjT!O!P6T!Q![6c!g!h*Z#U#V6t#X#Y*Z#c#d7Y#l#m7hT6YRjT!Q![6T!g!h*Z#X#Y*ZT6hSjT!O!P6T!Q![6c!g!h*Z#X#Y*ZT6wQ!Q!R6}!R!S6}T7SQjT!Q!R6}!R!S6}T7]P!Q!Y7`T7ePjT!Q!Y7`T7kR!Q![7t!c!i7t#T#Z7tT7yRjT!Q![7t!c!i7t#T#Z7tZ8ZOkR!}W~8`OY~~8eQ!r~!^!_8k!_!`8s~8pP!q~!_!`'O~8xO!r~~8}Ql~!_!`9T!`!a9]~9YP!u~!_!`%d~9bO!i~~9gQ!r~!_!`8s!`!a9m~9rQ!q~!_!`'O!`!a8k~9}O!|~~:SOd~~:XOe~~:^P!w~!_!`'O~:fO$z~~:kOg~~:pQ!v~!_!`'O#p#q:v~:{O!z~_;SO!O]%OQ~;XO![~~;bf$xS$qZ$o~X^$_pq$_tu&]!Q![&]!c!}&]#R#S&]#T#o&]#y#z$_$f$g$_$g#BY&]#BY#BZ;X#BZ$IS&]$IS$I_;X$I_$I|&]$I|$JO;X$JO$JT&]$JT$JU;X$JU$KV&]$KV$KW;X$KW&FU&]&FU&FV;X&FV~&]",
      tokenizers: [noSemicolon, postfix, 0, 1, 2, 3, insertSemicolon, template],
      specializeTable: 8027,
      specializations: [{export:12, from:17, default:22, async:27, function:28, true:66, false:66, this:68, null:70, super:72, new:96, await:105, yield:107, void:108, typeof:110, delete:112, class:126, extends:128, in:162, instanceof:164, let:198, var:200, const:202, as:207, import:214, for:220, of:229, while:232, with:236, do:240, if:244, else:246, switch:250, case:256, try:262, catch:264, finally:266, return:270, throw:274, break:278, continue:284, debugger:288},
       {async:83, get:85, set:87, static:135}],
      tokenPrec: 8019
    });

    exports.parser = parser;
    });

    unwrapExports(dist$1);
    var dist_1$1 = dist$1.parser;

    const Inherit = 1;
    /// A tag system defines a set of node (token) tags used for
    /// highlighting. You'll usually want to use the
    /// [default](#highlight.defaultTags) set, but it is possible to
    /// define your own custom system when that doesn't fit your use case.
    class TagSystem {
        /// Define a tag system. Each tag identifies a type of syntactic
        /// element, which can have a single type and any number of flags.
        /// The `flags` argument should be an array of flag names, and the
        /// `types` argument an array of type names. Type names may have a
        /// `"name=parentName"` format to specify that this type is an
        /// instance of some other type, which means that, if no styling for
        /// the type itself is provided, it'll fall back to the parent
        /// type's styling.
        constructor(options) {
            /// @internal
            this.typeNames = [""];
            /// A [node
            /// prop](https://lezer.codemirror.net/docs/ref#tree.NodeProp) used
            /// to associate styling tag information with syntax tree nodes.
            this.prop = new tree_2();
            this.flags = options.flags;
            this.types = options.types;
            this.flagMask = Math.pow(2, this.flags.length) - 1;
            this.typeShift = this.flags.length + 1;
            let parentNames = [undefined];
            for (let type of options.types) {
                let match = /^([\w\-]+)(?:=([\w-]+))?$/.exec(type);
                if (!match)
                    throw new RangeError("Invalid type name " + type);
                this.typeNames.push(match[1]);
                parentNames.push(match[2]);
            }
            this.parents = parentNames.map(name => {
                if (name == null)
                    return 0;
                let id = this.typeNames.indexOf(name);
                if (id < 0)
                    throw new RangeError(`Unknown parent type '${name}' specified`);
                return id;
            });
            if (this.flags.length > 29 || this.typeNames.length > Math.pow(2, 29 - this.flags.length))
                throw new RangeError("Too many style tag flags to fit in a 30-bit integer");
        }
        /// Parse a tag name into a numeric ID. Only necessary if you are
        /// manually defining [node properties](#highlight.TagSystem.prop)
        /// for this system.
        get(name) {
            let value = name.charCodeAt(0) == 43 ? 1 : 0; // Check for leading '+'
            for (let part of (value ? name.slice(1) : name).split(" "))
                if (part) {
                    let flag = this.flags.indexOf(part);
                    if (flag > -1) {
                        value += 1 << (flag + 1);
                    }
                    else {
                        let typeID = this.typeNames.indexOf(part);
                        if (typeID < 0)
                            throw new RangeError(`Unknown tag type '${part}'`);
                        if (value >> this.typeShift)
                            throw new RangeError(`Multiple tag types specified in '${name}'`);
                        value += typeID << this.typeShift;
                    }
                }
            return value;
        }
        /// Create a
        /// [`PropSource`](https://lezer.codemirror.net/docs/ref#tree.PropSource)
        /// that adds node properties for this system. `tags` should map
        /// node type
        /// [selectors](https://lezer.codemirror.net/docs/ref#tree.NodeType^match)
        /// to tag names.
        add(tags) {
            let match = tree_4.match(tags);
            return this.prop.add((type) => {
                let found = match(type);
                return found == null ? undefined : this.get(found);
            });
        }
        /// Create a highlighter extension for this system, styling the
        /// given tags using the given CSS objects.
        highlighter(spec) {
            let styling = new Styling(this, spec);
            let plugin = ViewPlugin.create(view => new Highlighter(view, this.prop, styling))
                .decorations(h => h.decorations);
            return [plugin.extension, EditorView.styleModule(styling.module)];
        }
        /// @internal
        specificity(tag) {
            let flags = tag & this.flagMask, spec = 0;
            for (let i = 1; i <= this.flags.length; i++)
                if (flags & (1 << i))
                    spec++;
            for (let type = tag >> (this.flags.length + 1); type; type = this.parents[type])
                spec += 1000;
            return spec;
        }
    }
    /// The set of highlighting tags used by regular language packages and
    /// themes.
    const defaultTags = new TagSystem({
        flags: ["invalid", "meta", "type2", "type3", "type4",
            "link", "strong", "emphasis", "heading", "list", "quote",
            "changed", "inserted", "deleted",
            "definition", "constant", "control"],
        types: [
            "comment",
            "lineComment=comment",
            "blockComment=comment",
            "name",
            "variableName=name",
            "typeName=name",
            "propertyName=name",
            "className=name",
            "labelName=name",
            "namespace=name",
            "literal",
            "string=literal",
            "character=string",
            "number=literal",
            "integer=number",
            "float=number",
            "regexp=literal",
            "escape=literal",
            "color=literal",
            "content",
            "keyword",
            "self=keyword",
            "null=keyword",
            "atom=keyword",
            "unit=keyword",
            "modifier=keyword",
            "operatorKeyword=keyword",
            "operator",
            "derefOperator=operator",
            "arithmeticOperator=operator",
            "logicOperator=operator",
            "bitwiseOperator=operator",
            "compareOperator=operator",
            "updateOperator=operator",
            "typeOperator=operator",
            "punctuation",
            "separator=punctuation",
            "bracket=punctuation",
            "angleBracket=bracket",
            "squareBracket=bracket",
            "paren=bracket",
            "brace=bracket"
        ]
    });
    /// Used to add a set of tags to a language syntax via
    /// [`Parser.withProps`](https://lezer.codemirror.net/docs/ref#lezer.Parser.withProps).
    /// The argument object can use syntax node selectors (see
    /// [`NodeType.match`](https://lezer.codemirror.net/docs/ref#tree.NodeType^match))
    /// as property names, and tag names (in the [default tag
    /// system](#highlight.defaultTags)) as values.
    const styleTags = (tags) => defaultTags.add(tags);
    /// Create a highlighter theme that adds the given styles to the given
    /// tags. The spec's property names must be tag names, and the values
    /// [`style-mod`](https://github.com/marijnh/style-mod#documentation)
    /// style objects that define the CSS for that tag.
    const highlighter = (spec) => defaultTags.highlighter(spec);
    class StyleRule {
        constructor(type, flags, specificity, cls) {
            this.type = type;
            this.flags = flags;
            this.specificity = specificity;
            this.cls = cls;
        }
    }
    class Styling {
        constructor(tags, spec) {
            this.tags = tags;
            this.cache = Object.create(null);
            let modSpec = Object.create(null);
            let nextCls = 0;
            let rules = [];
            for (let prop in spec) {
                let tag = tags.get(prop);
                let cls = "c" + nextCls++;
                modSpec[cls] = spec[prop];
                rules.push(new StyleRule(tag >> tags.typeShift, tag & tags.flagMask, tags.specificity(tag), cls));
            }
            this.rules = rules.sort((a, b) => b.specificity - a.specificity);
            this.module = new StyleModule(modSpec);
        }
        match(tag) {
            let known = this.cache[tag];
            if (known != null)
                return known;
            let result = "";
            let type = tag >> this.tags.typeShift, flags = tag & this.tags.flagMask;
            for (;;) {
                for (let rule of this.rules) {
                    if (rule.type == type && (rule.flags & flags) == rule.flags) {
                        if (result)
                            result += " ";
                        result += this.module[rule.cls];
                        flags &= ~rule.flags;
                        if (type)
                            break;
                    }
                }
                if (type)
                    type = this.tags.parents[type];
                else
                    break;
            }
            return this.cache[tag] = result;
        }
    }
    class Highlighter {
        constructor(view, prop, styling) {
            this.prop = prop;
            this.styling = styling;
            this.partialDeco = false;
            this.syntax = null;
            this.decorations = Decoration.none;
            for (let s of view.state.behavior(EditorState.syntax)) {
                this.syntax = s;
                break;
            }
            this.buildDeco(view);
        }
        update(update) {
            if (this.partialDeco || update.docChanged || update.viewportChanged)
                this.buildDeco(update.view);
        }
        buildDeco(view) {
            if (!this.syntax)
                return;
            let { from, to } = view.viewport;
            let { tree, rest } = this.syntax.getTree(view.state, from, to);
            this.partialDeco = !!rest;
            if (rest)
                view.waitFor(rest);
            let tokens = [];
            let start = from;
            function flush(pos, style) {
                if (pos > start && style)
                    tokens.push(Decoration.mark(start, pos, { class: style }));
                start = pos;
            }
            // The current node's own classes
            let curClass = "";
            let context = [];
            let inherited = [];
            tree.iterate({
                from, to,
                enter: (type, start) => {
                    let inheritedClass = inherited.length ? inherited[inherited.length - 1] : "";
                    let cls = inheritedClass;
                    let style = type.prop(this.prop);
                    if (style != null) {
                        let val = this.styling.match(style);
                        if (val) {
                            if (cls)
                                cls += " ";
                            cls += val;
                        }
                        if (style & Inherit)
                            inheritedClass = cls;
                    }
                    context.push(cls);
                    if (inheritedClass)
                        inherited.push(inheritedClass);
                    if (cls != curClass) {
                        flush(start, curClass);
                        curClass = cls;
                    }
                },
                leave: (_t, _s, end) => {
                    context.pop();
                    inherited.pop();
                    let backTo = context.length ? context[context.length - 1] : "";
                    if (backTo != curClass) {
                        flush(Math.min(to, end), curClass);
                        curClass = backTo;
                    }
                }
            });
            this.decorations = Decoration.set(tokens);
        }
    }
    /// A default highlighter (works well with light themes).
    const defaultHighlighter = highlighter({
        invalid: { color: "#f00" },
        keyword: { color: "#708" },
        atom: { color: "#219" },
        number: { color: "#164" },
        string: { color: "#a11" },
        character: { color: "#a11" },
        regexp: { color: "#e40" },
        escape: { color: "#e40" },
        "variableName definition": { color: "#00f" },
        typeName: { color: "#085" },
        "propertyName definition": { color: "#00c" },
        comment: { color: "#940" },
        meta: { color: "#555" }
    });

    const statementIndent = continuedIndent({ except: /^{/ });
    /// A syntax provider based on the [Lezer JavaScript
    /// parser](https://github.com/lezer-parser/javascript), extended with
    /// highlighting and indentation information.
    const javascriptSyntax = new LezerSyntax(dist_1$1.withProps(indentNodeProp.add(type => {
        if (type.name == "IfStatement")
            return continuedIndent({ except: /^({|else\b)/ });
        if (type.name == "TryStatement")
            return continuedIndent({ except: /^({|catch|finally)\b/ });
        if (type.name == "LabeledStatement")
            return flatIndent;
        if (type.name == "SwitchBody")
            return context => {
                let after = context.textAfter, closed = after[0] == "}", isCase = /^(case|default)\b/.test(after);
                return context.baseIndent + (closed ? 0 : isCase ? 1 : 2) * context.unit;
            };
        if (type.name == "TemplateString" || type.name == "BlockComment")
            return () => -1;
        if (/(Statement|Declaration)$/.test(type.name) || type.name == "Property")
            return statementIndent;
        return undefined;
    }), foldNodeProp.add({
        Block(tree) { return { from: tree.start + 1, to: tree.end - 1 }; }
    }), languageData.add({
        Script: { closeBrackets: ["(", "[", "{", "'", '"', "`"] }
    }), styleTags({
        "get set async static": "modifier",
        "for while do if else switch try catch finally return throw break continue default case": "keyword control",
        "in of await yield void typeof delete instanceof": "operatorKeyword",
        "export import let var const function class extends": "keyword definition",
        "with debugger from as": "keyword",
        TemplateString: "string type2",
        "BooleanLiteral Super": "atom",
        This: "self",
        Null: "null",
        Star: "modifier",
        VariableName: "variableName",
        VariableDefinition: "variableName definition",
        Label: "labelName",
        PropertyName: "propertyName",
        PropertyNameDefinition: "propertyName definition",
        "PostfixOp UpdateOp": "updateOperator",
        LineComment: "lineComment",
        BlockComment: "blockComment",
        Number: "number",
        String: "string",
        ArithOp: "arithmeticOperator",
        LogicOp: "logicOperator",
        BitOp: "bitwiseOperator",
        CompareOp: "compareOperator",
        RegExp: "regexp",
        Equals: "operator definition",
        Spread: "punctuation",
        "Arrow :": "punctuation definition",
        "( )": "paren",
        "[ ]": "squareBracket",
        "{ }": "brace",
        ".": "derefOperator",
        ", ;": "separator"
    })));

    /// Returns an extension that installs highlighting of special
    /// characters.
    const specialChars = EditorView.extend.unique((configs) => {
        // FIXME make configurations compose properly
        let config = combineConfig(configs, {
            render: null,
            specialChars: SPECIALS,
            addSpecialChars: null
        });
        let styles = document.body.style;
        config.replaceTabs = (styles.tabSize || styles.MozTabSize) == null;
        if (config.replaceTabs)
            config.specialChars = new RegExp("\t|" + config.specialChars.source, "gu");
        let plugin = ViewPlugin.create(view => new SpecialCharPlugin(view, config))
            .decorations(plugin => plugin.decorations);
        return config.replaceTabs ? [plugin.extension, EditorView.styleModule(style)] : plugin.extension;
    }, {});
    const JOIN_GAP = 10;
    class SpecialCharPlugin {
        constructor(view, options) {
            this.view = view;
            this.options = options;
            this.from = 0;
            this.to = 0;
            this.decorations = Decoration.none;
            this.specials = options.specialChars;
            if (options.addSpecialChars)
                this.specials = new RegExp(this.specials.source + "|" + options.addSpecialChars.source, "gu");
            this.updateForViewport();
        }
        update(update) {
            if (update.changes.length) {
                this.decorations = this.decorations.map(update.changes);
                this.from = update.changes.mapPos(this.from, 1);
                this.to = update.changes.mapPos(this.to, -1);
                this.closeHoles(update.changes.changedRanges());
            }
            this.updateForViewport();
        }
        closeHoles(ranges) {
            let decorations = [], vp = this.view.viewport, replaced = [];
            for (let i = 0; i < ranges.length; i++) {
                let { fromB: from, toB: to } = ranges[i];
                // Must redraw all tabs further on the line
                if (this.options.replaceTabs)
                    to = this.view.state.doc.lineAt(to).end;
                while (i < ranges.length - 1 && ranges[i + 1].fromB < to + JOIN_GAP)
                    to = Math.max(to, ranges[++i].toB);
                // Clip to current viewport, to avoid doing work for invisible text
                from = Math.max(vp.from, from);
                to = Math.min(vp.to, to);
                if (from >= to)
                    continue;
                this.getDecorationsFor(from, to, decorations);
                replaced.push(from, to);
            }
            if (decorations.length)
                this.decorations = this.decorations.update(decorations, pos => {
                    for (let i = 0; i < replaced.length; i += 2)
                        if (pos >= replaced[i] && pos < replaced[i + 1])
                            return false;
                    return true;
                }, replaced[0], replaced[replaced.length - 1]);
        }
        updateForViewport() {
            let vp = this.view.viewport;
            // Viewports match, don't do anything
            if (this.from == vp.from && this.to == vp.to)
                return;
            let decorations = [];
            if (this.from >= vp.to || this.to <= vp.from) {
                this.getDecorationsFor(vp.from, vp.to, decorations);
                this.decorations = Decoration.set(decorations);
            }
            else {
                if (vp.from < this.from)
                    this.getDecorationsFor(vp.from, this.from, decorations);
                if (this.to < vp.to)
                    this.getDecorationsFor(this.to, vp.to, decorations);
                this.decorations = this.decorations.update(decorations, (from, to) => from >= vp.from && to <= vp.to);
            }
            this.from = vp.from;
            this.to = vp.to;
        }
        getDecorationsFor(from, to, target) {
            let { doc } = this.view.state;
            for (let pos = from, cursor = doc.iterRange(from, to), m; !cursor.next().done;) {
                if (!cursor.lineBreak) {
                    while (m = this.specials.exec(cursor.value)) {
                        let code = m[0].codePointAt ? m[0].codePointAt(0) : m[0].charCodeAt(0), widget;
                        if (code == null)
                            continue;
                        if (code == 9) {
                            let line = doc.lineAt(pos + m.index);
                            let size = this.view.state.tabSize, col = countColumn(doc.slice(line.start, pos + m.index), 0, size);
                            widget = new TabWidget((size - (col % size)) * this.view.defaultCharacterWidth);
                        }
                        else {
                            widget = new SpecialCharWidget(this.options, code);
                        }
                        target.push(Decoration.replace(pos + m.index, pos + m.index + m[0].length, { widget }));
                    }
                }
                pos += cursor.value.length;
            }
        }
    }
    const SPECIALS = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/gu;
    const NAMES = {
        0: "null",
        7: "bell",
        8: "backspace",
        10: "newline",
        11: "vertical tab",
        13: "carriage return",
        27: "escape",
        8203: "zero width space",
        8204: "zero width non-joiner",
        8205: "zero width joiner",
        8206: "left-to-right mark",
        8207: "right-to-left mark",
        8232: "line separator",
        8233: "paragraph separator",
        65279: "zero width no-break space",
        65532: "object replacement"
    };
    // Assigns placeholder characters from the Control Pictures block to
    // ASCII control characters
    function placeHolder(code) {
        if (code >= 32)
            return null;
        if (code == 10)
            return "\u2424";
        return String.fromCharCode(9216 + code);
    }
    const DEFAULT_PLACEHOLDER = "\u2022";
    class SpecialCharWidget extends WidgetType {
        constructor(options, code) {
            super(code);
            this.options = options;
        }
        toDOM() {
            let ph = placeHolder(this.value) || DEFAULT_PLACEHOLDER;
            let desc = "Control character " + (NAMES[this.value] || this.value);
            let custom = this.options.render && this.options.render(this.value, desc, ph);
            if (custom)
                return custom;
            let span = document.createElement("span");
            span.textContent = ph;
            span.title = desc;
            span.setAttribute("aria-label", desc);
            span.style.color = "red";
            return span;
        }
        ignoreEvent() { return false; }
    }
    class TabWidget extends WidgetType {
        toDOM() {
            let span = document.createElement("span");
            span.textContent = "\t";
            span.className = style.tab;
            span.style.width = this.value + "px";
            return span;
        }
        ignoreEvent() { return false; }
    }
    const style = new StyleModule({
        tab: {
            display: "inline-block",
            overflow: "hidden",
            verticalAlign: "bottom"
        }
    });

    /// Returns an extension that enables multiple selections for the
    /// editor. Secondary cursors and selected ranges are drawn with
    /// simple decorations, and might look the same as the primary native
    /// selection.
    const multipleSelections = EditorState.extend.unique(() => {
        let rangeConfig = { class: styles$1.secondarySelection };
        return [
            EditorState.allowMultipleSelections(true),
            ViewPlugin.decoration({
                create(view) { return decorateSelections(view.state, rangeConfig); },
                update(deco, { prevState, state }) {
                    return prevState.doc == state.doc && prevState.selection.eq(state.selection)
                        ? deco : decorateSelections(state, rangeConfig);
                }
            }),
            EditorView.styleModule(styles$1)
        ];
    }, {});
    class CursorWidget extends WidgetType {
        toDOM() {
            let span = document.createElement("span");
            span.className = styles$1.secondaryCursor;
            return span;
        }
    }
    function decorateSelections(state, rangeConfig) {
        let { ranges, primaryIndex } = state.selection;
        if (ranges.length == 1)
            return Decoration.none;
        let deco = [];
        for (let i = 0; i < ranges.length; i++)
            if (i != primaryIndex) {
                let range = ranges[i];
                deco.push(range.empty ? Decoration.widget(range.from, { widget: new CursorWidget(null) })
                    : Decoration.mark(ranges[i].from, ranges[i].to, rangeConfig));
            }
        return Decoration.set(deco);
    }
    const styles$1 = new StyleModule({
        secondarySelection: {
            backgroundColor_fallback: "#3297FD",
            color_fallback: "white !important",
            backgroundColor: "Highlight",
            color: "HighlightText !important"
        },
        secondaryCursor: {
            display: "inline-block",
            verticalAlign: "text-top",
            borderLeft: "1px solid #555",
            width: 0,
            height: "1.15em",
            margin: "0 -0.5px -.5em"
        }
    });

    function levenshtein(s, t) {
        if (s === t) {
            return 0;
        }
        const n = s.length;
        const m = t.length;
        if (n === 0 || m === 0) {
            return n + m;
        }
        let x = 0;
        let y;
        let a;
        let b;
        let c;
        let d;
        let g;
        let h;
        let k;
        const p = new Array(n);
        for (y = 0; y < n;) {
            p[y] = ++y;
        }

        for (; (x + 3) < m; x += 4) {
            const e1 = t.charCodeAt(x);
            const e2 = t.charCodeAt(x + 1);
            const e3 = t.charCodeAt(x + 2);
            const e4 = t.charCodeAt(x + 3);
            c = x;
            b = x + 1;
            d = x + 2;
            g = x + 3;
            h = x + 4;
            for (y = 0; y < n; y++) {
                k = s.charCodeAt(y);
                a = p[y];
                if (a < c || b < c) {
                    c = (a > b ? b + 1 : a + 1);
                }
                else {
                    if (e1 !== k) {
                        c++;
                    }
                }

                if (c < b || d < b) {
                    b = (c > d ? d + 1 : c + 1);
                }
                else {
                    if (e2 !== k) {
                        b++;
                    }
                }

                if (b < d || g < d) {
                    d = (b > g ? g + 1 : b + 1);
                }
                else {
                    if (e3 !== k) {
                        d++;
                    }
                }

                if (d < g || h < g) {
                    g = (d > h ? h + 1 : d + 1);
                }
                else {
                    if (e4 !== k) {
                        g++;
                    }
                }
                p[y] = h = g;
                g = d;
                d = b;
                b = c;
                c = a;
            }
        }

        for (; x < m;) {
            const e = t.charCodeAt(x);
            c = x;
            d = ++x;
            for (y = 0; y < n; y++) {
                a = p[y];
                if (a < c || d < c) {
                    d = (a > d ? d + 1 : a + 1);
                }
                else {
                    if (e !== s.charCodeAt(y)) {
                        d = c + 1;
                    }
                    else {
                        d = c;
                    }
                }
                p[y] = d;
                c = a;
            }
            h = d;
        }

        return h;
    }

    class Completion {
    	constructor(value = "") {
    		this.tokenize(value).then(tokens => {
    			tokens.filter(a => a != "");
    			this.set = new Set(tokens);
    		});
    	}
    	tokenize(str) {
    		return new Promise((resolve, reject) => {
    			resolve(str.replace(/[^\w\d\s]/g, " ")
    				.replace(/\s{2,}/g, " ")
    				.split("\n")
    				.join(" ")
    				.split(" "));
    		});
    	}
    	appendToSet(content) {
    		this.tokenize(content).then(tokens => {
    			tokens.forEach(token => {
    				if (token != "") {
    					this.set.add(token);
    				}
    			});
    		});
    	}
    	getSuggestions(currentWord, content) {
    		if (typeof content != "undefined" && this.set.size < 3 && content != "") {
    			this.appendToSet(content);
    		}
    		currentWord = currentWord.trim();
    		let scores = [
    			["", Number.MAX_SAFE_INTEGER],
    			["", Number.MAX_SAFE_INTEGER],
    			["", Number.MAX_SAFE_INTEGER]
    		];
    		this.set.forEach(token => {
    			if (token == "") return
    			const length = currentWord.length;
    			const truncated = token.substring(0, length);
    			const score = levenshtein(truncated, currentWord);
    			scores.push([token, score]);
    		});
    		scores.sort((a, b) => a[1] - b[1]);
    		return scores.slice(0, 3).map(x => x[0])
    	}

    	getLastToken() {
    		if (window.view.state.doc.toString() == "") return ""
    		const index = window.view.state.selection.ranges[0].anchor;
    		const content = window.view.state.doc.toString();

    		let out = "";
    		for (let i = 1; true; i++) {
    			const newI = index - i;

    			if (newI == 0) break
    			if (newI < 0) {
    				newI = content.length - 1;
    			}
    			const letter = content[newI];

    			if (/[^\w\d\s]/g.test(letter) == true) break
    			if (typeof letter != "undefined") {
    				out += letter;
    			}
    		}
    		return [out.split("").reverse().join("").trim(), newI]
    	}

    	getContent({
    		length
    	}, lastI) {
    		const content = window.view.state.doc.toString();

    		return content.slice(0, lastI) + content.slice(lastI + length, content.length);
    	}
    }

    class StudIOPlugin {
    	constructor(type) {
    		this.sCallbacks = [];
    		this.type = type;
    		this.init();
    	}
    	init() {

    	}
    	get Type() {
    		return this.type
    	}
    	get EditorView() {
    		return window.view
    	}
    	get state() {
    		return window.view.state
    	}
    	onStateChange(f) {
    		this.sCallbacks.push(f);
    	}
    	setState(state) {
    		window.view.setState(state);
    		this.sCallbacks.forEach(f => {
    			try {
    				f(state);
    			} catch(error) {
    				console.log(error);
    			}
    		});
    	}
    }

    class StudIOAutocomplete extends StudIOPlugin {
    	get cursorIndex() {
    		return window.view.state.selection.ranges[0].anchor
    	}
    	get viewContent() {
    		return window.view.state.doc.toString()
    	}
    	get suggestion() {
    		return "STUDIOAUTOCOMPLETE"
    	}
    	getSuggestions() {
    		return []
    	}

    	getLastToken() {
    		if (window.view.state.doc.toString() == "") return ""
    		const index = window.view.state.selection.ranges[0].anchor;
    		const content = window.view.state.doc.toString();

    		let out = "";
    		for (let i = 1; true; i++) {
    			const newI = index - i;

    			if (newI == 0) break
    			if (newI < 0) {
    				newI = content.length - 1;
    			}
    			const letter = content[newI];

    			if (/[^\w\d\s]/g.test(letter) == true) break
    			if (typeof letter != "undefined") {
    				out += letter;
    			}
    		}
    		return [out.split("").reverse().join("").trim(), newI]
    	}

    	getSmartKeys() {
    		return ["{", "}", this.suggestion, this.suggestion, this.suggestion]
    	}

    	getContent(lastToken, lastI) {
    		const content = window.view.state.doc.toString();

    		return content.slice(0, lastI) + content.slice(lastI + lastToken.length, content.length)
    	}
    }

    /* Copyright Arthur Guiot 2019, BroadcastJS */
    class BroadcastJSNotification {
    	constructor(name, object = null) {
    		this.name = name;
    		this.object = object;
    	}
    }
    class Center {
    	constructor() {
    		this.observers = [];
    	}
    	get default() {
    		const exportGlobal = (name, object) => {
    			if (typeof(global) !== "undefined") {
    				// Node.js
    				global[name] = object;
    			} else if (typeof(window) !== "undefined") {
    				// JS with GUI (usually browser)
    				window[name] = object;
    			} else {
    				throw new Error("Unkown run-time environment. Currently only browsers and Node.js are supported.");
    			}
    		};

    		if (typeof BroadcastJS_Shared_Instance == "undefined") {
    			exportGlobal("BroadcastJS_Shared_Instance", new Center());
    		}
    		return BroadcastJS_Shared_Instance
    	}
    	addObserver(name, callback, reference = null) {
    		this.observers.push([name, callback, reference]);
    	}
    	removeObserver(name, reference = null) {
    		this.observers.forEach((o, i) => {
    			if (o[0] == name && o[2] == reference) {
    				this.observers.splice(i, 1);
    			}
    		});
    	}
    	post(notification) {
    		const name = notification.name;
    		this.observers.forEach((o, i) => {
    			if (o[0] == name) {
    				o[1](notification.object);
    			}
    		});
    	}
    }

    const NotificationCenter = new Center();
    const Notification = BroadcastJSNotification;

    class BufferCenter {
    	constructor() {
    		this.buffers = [];
    	}
    	get default() {
    		const exportGlobal = (name, object) => {
    			if (typeof(global) !== "undefined") {
    				// Node.js
    				global[name] = object;
    			} else if (typeof(window) !== "undefined") {
    				// JS with GUI (usually browser)
    				window[name] = object;
    			} else {
    				throw new Error("Unkown run-time environment. Currently only browsers and Node.js are supported.");
    			}
    		};

    		if (typeof Buffer_Shared_Instance == "undefined") {
    			exportGlobal("Buffer_Shared_Instance", new BufferCenter());
    		}
    		return Buffer_Shared_Instance
    	}
    	addTask() {
    		this.buffers.push([...arguments]);
    	}
    	execute(ctx) {
    		this.buffers.forEach(task => {
    			let args = task.slice().splice(1, 2);
    			ctx[task[0]](...args);
    		});
    		this.buffers = [];
    	}
    }

    var BufferCenter$1 = new BufferCenter();

    // import libCM from "./libBin.js"

    class editor {
    	constructor(ext, value, settings) {
    		settings = typeof settings != "undefined" ? settings : {};
    		this.plugins = [];

    		this.EditorSettings = settings;

    		// Notifications

    		NotificationCenter.default.addObserver("registerPlugin", this.registerPlugin.bind(this));
    		NotificationCenter.default.addObserver("fontSize", this.fontSize.bind(this));

    		// Clearing view
    		this.clear();
    		if (ext == null && value == null) {
    			document.addEventListener("DOMContentLoaded", function() {
    				// Do something...
    			});
    		} else {
    			let mode = CodeMirror.findModeByExtension(ext);
    			if (typeof mode == "undefined" || typeof mode.mode == "undefined") {
    				mode = CodeMirror.findModeByExtension("md"); // Using markdown for undefined var
    			}

    			const script = document.createElement('script');
    			script.onload = function() {
    				var m = null;
    				try {
    					m = ExportedMode({
    						indentUnit: 2
    					});
    				} catch(e) {
    					if (typeof ExportedMode != "undefined") {
    						m = ExportedMode({
    							indentUnit: 2
    						}, {});
    					}
    				}

    				let mode = src_3$3({
    					mode: m
    				});
    				this.mode = mode;

    				let isMac = /Mac/.test(navigator.platform);
    				try {
    					this.cm = EditorState.create({
    						doc: atobUTF8(value),
    						extensions: [
    							lineNumbers(),
    							history(),
    							specialChars(),
    							multipleSelections(),
    							mode,
    							// matchBrackets(),
    							keymap({
    								"Mod-z": undo,
    								"Mod-Shift-z": redo,
    								"Mod-u": function(view) { return undoSelection(view) || true },
    								[isMac ? "Mod-Shift-u" : "Alt-u"]: redoSelection,
    								"Ctrl-y": isMac ? undefined : redo,
    								"Shift-Tab": indentSelection
    							}),
    							keymap(baseKeymap),
    						]
    					});

    					window.view = new EditorView({
    						state: this.cm
    					});
    				} catch {
    					this.cm = EditorState.create({
    						doc: atobUTF8(value),
    						extensions: [
    							lineNumbers(),
    							history(),
    							specialChars(),
    							multipleSelections(),
    							// mode,
    							// matchBrackets(),
    							keymap({
    								"Mod-z": undo,
    								"Mod-Shift-z": redo,
    								"Mod-u": function(view) { return undoSelection(view) || true },
    								[isMac ? "Mod-Shift-u" : "Alt-u"]: redoSelection,
    								"Ctrl-y": isMac ? undefined : redo,
    								"Shift-Tab": indentSelection
    							}),
    							keymap(baseKeymap),
    						]
    					});

    					window.view = new EditorView({
    						state: this.cm
    					});
    				}
    				
    				let view = window.view;

    				this.clear();

    				document.querySelector("#editor").appendChild(view.dom);
    				document.querySelector(".tip").style.display = "none";
    				this.listenForAutomcompletion();
    				const restricted = ["MD", "TXT", "RTF"];
    				if (restricted.indexOf(ext) == -1) {
    					this.disableCompletion();
    				}

    				BufferCenter$1.default.execute(window.e);
    				NotificationCenter.default.post(new Notification("fontSize", window.EditorSettings.fontSize));
    			}.bind(this);
    			script.src = `mode/${mode.mode}/${mode.mode}.js`;

    			document.head.appendChild(script);
    		}
    	}
    	disableCompletion() {
    		const content = document.querySelector(".codemirror-content");
    		content.setAttribute("autocorrect", "off");
    		content.setAttribute("autocapitalize", "off");
    	}

    	settings() {
    		try {
    			this.lineWrapping = this.EditorSettings.lineWrapping == true; // boolean convert
    			this.theme = this.EditorSettings.theme;
    		} catch (e) {
    			console.warn(e);
    		}
    		if (typeof this.theme != "undefined") {
    			this.loadTheme(this.theme);
    		}
    	}
    	loadTheme(theme) {
    		const link = document.createElement("link");
    		link.setAttribute("rel", "stylesheet");
    		link.setAttribute("href", `theme/${theme}.css`);
    		document.head.appendChild(link);
    		if (typeof this.cm != "undefined") ;
    	}
    	fontSize(v) {
    		if (v > 0) {
    			document.querySelector("#editor").style["font-size"] = `${v}px`;
    		}
    	}

    	clear() {
    		document.body.innerHTML = "<div class=\"tip\">Open a document</div><div id=\"editor\"></div>";
    	}
    	load(file) {
    		this.clear();
    		if (typeof this.cm == "undefined") {
    			setTimeout(function() {
    				this.load(file);
    			}.bind(this), 16); // Waiting 16ms (~ 1 frame) before rendering for letting WKWebView parse and process everything. Otherwise, we do it again and again.
    		} else {
    			const str = atobUTF8(file);

    			const doc = text.of(str, "\n");
    			window.view.state.doc = doc;
    			window.view.setState(window.view.state);
    		}
    	}
    	save() {
    		return btoaUTF8(window.view.state.doc.toString())
    	}
    	getLangName() {
    		return this.mode.name
    	}

    	insertSnippet(snippet, replaceLine) {
    		replaceLine = typeof replaceLine != "undefined" ? replaceLine : false;
    		const str = atobUTF8(snippet);
    		document.querySelector(".codemirror-content").focus();
    		if (replaceLine === true) {
    			for (var i = 0; i < this.c.getLastToken()[0].length; i++) {
    				document.execCommand('delete');
    			}
    		}
    		document.execCommand('insertText', false, str);
    	}
    	moveLineDown() {
    		if (window.view.state.doc.toString() == "") return ""
    		const index = window.view.state.selection.ranges[0].anchor;
    		let line = view.state.doc.lineAt(index);
    		const content = line.content;
    		let nextLine = view.state.doc.lineAt(line.end + 1);
    		const transaction1 = view.state.t().replace(line.start, line.end, nextLine.content);
    		const midstate = transaction1.apply();
    		line = midstate.doc.lineAt(line.start);
    		nextLine = midstate.doc.lineAt(line.end + 1);
    		const transaction2 = midstate.t().replace(nextLine.start, nextLine.end, content);
    		window.view.setState(transaction2.apply());
    	}
    	moveLineUp() {
    		if (window.view.state.doc.toString() == "") return ""
    		const index = window.view.state.selection.ranges[0].anchor;
    		let line = view.state.doc.lineAt(index);
    		const content = line.content;
    		let nextLine = view.state.doc.lineAt(line.start - 1);
    		const transaction1 = view.state.t().replace(line.start, line.end, nextLine.content);
    		const midstate = transaction1.apply();
    		line = midstate.doc.lineAt(line.start);
    		nextLine = midstate.doc.lineAt(line.start - 1);
    		const transaction2 = midstate.t().replace(nextLine.start, nextLine.end, content);
    		window.view.setState(transaction2.apply());
    	}

    	listenForAutomcompletion() {
    		if (typeof this.c == "undefined") {
    			this.c = new Completion(window.view.state.doc.toString());
    		} else if (typeof this.c.init != "undefined"){
    			this.c.init(window.view.state.doc.toString());
    		}
    		const parseAndPropose = async function() {
    			const currentWord = this.c.getLastToken();
    			const suggestions = this.c.getSuggestions(currentWord[0], this.c.getContent(currentWord[0], currentWord[1]));
    			this.setCompletion(...suggestions);
    		}.bind(this);
    		document.querySelector(".codemirror-content").addEventListener("input", () => parseAndPropose());
    	}
    	setCompletion(a, b, c) {
    		window.webkit.messageHandlers.completion.postMessage([a, b, c]);
    	}

    	registerPlugin({ obj, type }) {
    		this.plugins.push(new obj(type));
    		if (type == "hint") {
    			this.c = this.plugins[this.plugins.length - 1];
    			window.webkit.messageHandlers.setKeys.postMessage(this.c.getSmartKeys());
    		}
    	}
    	execute(f) {
    		f();
    	}
    }
    var lib = {
    	editor: editor,
    	Text: src_8,
    	Completion: Completion,
    	add: function(obj, type) {
    		BufferCenter$1.default.addTask("execute", () => {
    			const plugin = new Notification("registerPlugin", {
    				obj: obj,
    				type: type
    			});

    			NotificationCenter.default.post(plugin);
    		});
    	},
    	plugin: StudIOPlugin,
    	autocomplete: StudIOAutocomplete,
    	BufferCenter: BufferCenter$1
    };

    return lib;

}));
