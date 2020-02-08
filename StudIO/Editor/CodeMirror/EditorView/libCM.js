(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global = global || self, global.StudIO = factory());
}(this, function () { 'use strict';

	var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

	function unwrapExports (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x.default : x;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

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

	var text = createCommonjsModule(function (module, exports) {
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

	unwrapExports(text);
	var text_1 = text.Text;
	var text_2 = text.splitLines;
	var text_3 = text.joinLines;
	var text_4 = text.Line;

	var src = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });

	exports.isExtendingChar = char_1.isExtendingChar;
	exports.isWordChar = char_1.isWordChar;
	exports.charType = char_1.charType;
	exports.CharType = char_1.CharType;

	exports.countColumn = column.countColumn;
	exports.findColumn = column.findColumn;

	exports.Line = text.Line;
	exports.Text = text.Text;
	exports.splitLines = text.splitLines;
	exports.joinLines = text.joinLines;
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

	function sym(name, random) {
	  return typeof Symbol == "undefined"
	    ? "__" + name + (random ? Math.floor(Math.random() * 1e8) : "")
	    : random ? Symbol(name) : Symbol.for(name)
	}

	var COUNT = sym("\u037c"), SET = sym("styleSet", 1), RULES = sym("rules", 1);
	var top = typeof global == "undefined" ? window : global;

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
	  for (var name in spec) {
	    var style = spec[name], specificity = style.specificity || 0;
	    var id = "\u037c" + (top[COUNT]++).toString(36);
	    var selector = "." + id, className = id;
	    for (var i = 0; i < specificity; i++) {
	      var name = "\u037c_" + (i ? i.toString(36) : "");
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
	    var target = root.head || root;
	    target.insertBefore(this.styleTag, target.firstChild);
	    this.modules = [];
	  }

	  mount(modules) {
	    var sheet = this.styleTag.sheet, reset = !sheet;
	    var pos = 0 /* Current rule offset */, j = 0; /* Index into this.modules */
	    for (var i = 0; i < modules.length; i++) {
	      var mod = modules[i], index = this.modules.indexOf(mod);
	      if (index < j && index > -1) { // Ordering conflict
	        this.modules.splice(index, 1);
	        j--;
	        index = -1;
	      }
	      if (index == -1) {
	        this.modules.splice(j++, 0, mod);
	        if (!reset) for (var k = 0; k < mod[RULES].length; k++)
	          sheet.insertRule(mod[RULES][k], pos++);
	      } else {
	        while (j < index) pos += this.modules[j++][RULES].length;
	        pos += mod[RULES].length;
	        j++;
	      }
	    }

	    if (reset) {
	      var text = "";
	      for (var i = 0; i < this.modules.length; i++)
	        text += this.modules[i][RULES].join("\n") + "\n";
	      this.styleTag.textContent = text;
	    }
	  }
	}

	function renderStyle(selector, spec, output) {
	  if (typeof spec != "object") throw new RangeError("Expected style object, got " + JSON.stringify(spec))
	  var props = [];
	  for (var prop in spec) {
	    if (/^@/.test(prop)) {
	      var local = [];
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

	var browser = createCommonjsModule(function (module, exports) {
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

	unwrapExports(browser);

	var dom = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });

	// Work around Chrome issue https://bugs.chromium.org/p/chromium/issues/detail?id=447523
	// (isCollapsed inappropriately returns true in shadow dom)
	function selectionCollapsed(domSel) {
	    var collapsed = domSel.isCollapsed;
	    if (collapsed && browser.default.chrome && domSel.rangeCount && !domSel.getRangeAt(0).collapsed)
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
	    if (browser.default.chrome || browser.default.gecko) {
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
	var useCharData = browser.default.ie && browser.default.ie_version <= 11;
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
	        if (browser.default.chrome && !this.compositionDeco.size && update && update.changes.changes.some(function (ch) { return ch.text.length > 1; }))
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
	        !(granularity == "line" && (browser.default.gecko || view.state.selection.ranges.length > 1))) {
	        return view.docView.observer.ignore(function () {
	            var prepared = context.prepareForQuery(view, start);
	            var startDOM = view.docView.domAtPos(start);
	            var equiv = (!browser.default.chrome || prepared.lines.length == 0) &&
	                dom.isEquivalentPosition(startDOM.node, startDOM.offset, sel.focusNode, sel.focusOffset) && false;
	            // Firefox skips an extra character ahead when extending across
	            // an uneditable element (but not when moving)
	            if (prepared.atWidget && browser.default.gecko && action == "extend")
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
	                if (browser.default.chrome || browser.default.gecko) {
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
	    return behavior.length ? behavior[0](event) : browser.default.mac ? event.metaKey : event.ctrlKey;
	}
	function dragMovesSelection(view, event) {
	    var behavior = view.behavior.get(extension$1.dragMovesSelection);
	    return behavior.length ? behavior[0](event) : browser.default.mac ? !event.altKey : !event.ctrlKey;
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
	var brokenClipboardAPI = (browser.default.ie && browser.default.ie_version < 15) ||
	    (browser.default.ios && browser.default.webkit_version < 604);
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
	    var code = event.keyCode, macCtrl = browser.default.mac && mods == 1 /* Ctrl */;
	    return code == 8 || (macCtrl && code == 72) || // Backspace, Ctrl-h on Mac
	        code == 46 || (macCtrl && code == 68) || // Delete, Ctrl-d on Mac
	        code == 27 || // Esc
	        (mods == (browser.default.mac ? 8 /* Meta */ : 1 /* Ctrl */) && // Ctrl/Cmd-[biyz]
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
	        if (browser.default.android &&
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
	var shift_1 = shift;

	var chrome = typeof navigator != "undefined" && /Chrome\/(\d+)/.exec(navigator.userAgent);
	var safari = typeof navigator != "undefined" && /Apple Computer/.test(navigator.vendor);
	var gecko = typeof navigator != "undefined" && /Gecko\/\d+/.test(navigator.userAgent);
	var mac = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
	var ie = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
	var brokenModifierNames = chrome && (mac || +chrome[1] < 57) || gecko && mac;

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
	    (safari || ie) && event.shiftKey && event.key && event.key.length == 1;
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

	var w3cKeyname = {
		base: base_1,
		shift: shift_1,
		keyName: keyName
	};

	var keymap = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });


	var mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false;
	function normalizeKeyName(name) {
	    var parts = name.split(/-(?!$)/);
	    var result = parts[parts.length - 1];
	    if (result == "Space")
	        result = " ";
	    var alt, ctrl, shift, meta;
	    for (var i = 0; i < parts.length - 1; ++i) {
	        var mod = parts[i];
	        if (/^(cmd|meta|m)$/i.test(mod))
	            meta = true;
	        else if (/^a(lt)?$/i.test(mod))
	            alt = true;
	        else if (/^(c|ctrl|control)$/i.test(mod))
	            ctrl = true;
	        else if (/^s(hift)?$/i.test(mod))
	            shift = true;
	        else if (/^mod$/i.test(mod)) {
	            if (mac)
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
	function normalize(map) {
	    var copy = Object.create(null);
	    for (var prop in map)
	        copy[normalizeKeyName(prop)] = map[prop];
	    return copy;
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
	// Behavior for defining keymaps
	//
	// Specs are objects that map key names to command-style functions,
	// which will be called with an editor view and should return true
	// when they've handled the key.
	//
	// Key names may be strings like `"Shift-Ctrl-Enter"`—a key identifier
	// prefixed with zero or more modifiers. Key identifiers are based on
	// the strings that can appear in
	// [`KeyEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key).
	// Use lowercase letters to refer to letter keys (or uppercase letters
	// if you want shift to be held). You may use `"Space"` as an alias
	// for the `" "` name.
	//
	// Modifiers can be given in any order. `Shift-` (or `s-`), `Alt-` (or
	// `a-`), `Ctrl-` (or `c-` or `Control-`) and `Cmd-` (or `m-` or
	// `Meta-`) are recognized.
	//
	// You can use `Mod-` as a shorthand for `Cmd-` on Mac and `Ctrl-` on
	// other platforms.
	//
	// You can add multiple keymap behaviors to an editor. Their
	// priorities determine their precedence (the ones specified early or
	// with high priority get to dispatch first).
	exports.keymap = function (map) { return src$2.handleDOMEvents({
	    keydown: keydownHandler(normalize(map))
	}); };
	function keydownHandler(map) {
	    return function (view, event) {
	        var name = w3cKeyname.keyName(event), isChar = name.length == 1 && name != " ";
	        var direct = map[modifiers(name, event, !isChar)];
	        var baseName;
	        if (direct && direct(view))
	            return true;
	        if (isChar && (event.shiftKey || event.altKey || event.metaKey) &&
	            (baseName = w3cKeyname.base[event.keyCode]) && baseName != name) {
	            var fromCode = map[modifiers(baseName, event, true)];
	            if (fromCode && fromCode(view))
	                return true;
	        }
	        return false;
	    };
	}
	});

	unwrapExports(keymap);
	var keymap_1 = keymap.keymap;

	var core = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });

	var Item = /** @class */ (function () {
	    function Item(map, inverted, selection) {
	        if (inverted === void 0) { inverted = null; }
	        if (selection === void 0) { selection = null; }
	        this.map = map;
	        this.inverted = inverted;
	        this.selection = selection;
	    }
	    Object.defineProperty(Item.prototype, "isChange", {
	        get: function () { return this.inverted != null; },
	        enumerable: true,
	        configurable: true
	    });
	    return Item;
	}());
	function updateBranch(branch, to, maxLen, newItem) {
	    var start = to + 1 > maxLen + 20 ? to - maxLen - 1 : 0;
	    var newBranch = branch.slice(start, to);
	    newBranch.push(newItem);
	    return newBranch;
	}
	function isAdjacent(prev, cur) {
	    return !!prev && cur.from <= prev.mapPos(prev.to, 1) && cur.to >= prev.mapPos(prev.from);
	}
	function addChanges(branch, changes, inverted, selectionBefore, maxLen, mayMerge) {
	    if (branch.length) {
	        var lastItem = branch[branch.length - 1];
	        if (lastItem.selection && lastItem.isChange == Boolean(inverted) && mayMerge(lastItem))
	            return inverted ? updateBranch(branch, branch.length - 1, maxLen, new Item(lastItem.map.appendSet(changes.desc), inverted.appendSet(lastItem.inverted), lastItem.selection)) : branch;
	    }
	    return updateBranch(branch, branch.length, maxLen, new Item(changes.desc, inverted, selectionBefore));
	}
	function popChanges(branch, only) {
	    var map = null;
	    var idx = branch.length - 1;
	    for (;; idx--) {
	        if (idx < 0)
	            throw new RangeError("popChanges called on empty branch");
	        var entry = branch[idx];
	        if (entry.isChange || (only == 1 /* Any */ && entry.selection))
	            break;
	        map = map ? entry.map.appendSet(map) : entry.map;
	    }
	    var changeItem = branch[idx];
	    var newBranch = branch.slice(0, idx), changes = changeItem.inverted || src$1.ChangeSet.empty, selection = changeItem.selection;
	    if (map) {
	        var startIndex = changeItem.map.length;
	        map = changeItem.map.appendSet(map);
	        var mappedChanges = [];
	        for (var i = 0; i < changes.length; i++) {
	            var mapped = changes.changes[i].map(map.partialMapping(startIndex - i));
	            if (mapped) {
	                map = map.append(mapped.desc);
	                mappedChanges.push(mapped);
	            }
	        }
	        newBranch.push(new Item(map));
	        changes = new src$1.ChangeSet(mappedChanges); // FIXME preserve mirror data?
	        selection = selection.map(map);
	    }
	    return { changes: changes, branch: newBranch, selection: selection };
	}
	function nope() { return false; }
	function eqSelectionShape(a, b) {
	    return a.ranges.length == b.ranges.length &&
	        a.ranges.filter(function (r, i) { return r.empty != b.ranges[i].empty; }).length === 0;
	}
	var HistoryState = /** @class */ (function () {
	    function HistoryState(done, undone, prevTime, prevUserEvent) {
	        if (prevTime === void 0) { prevTime = null; }
	        if (prevUserEvent === void 0) { prevUserEvent = undefined; }
	        this.done = done;
	        this.undone = undone;
	        this.prevTime = prevTime;
	        this.prevUserEvent = prevUserEvent;
	    }
	    HistoryState.prototype.resetTime = function () {
	        return new HistoryState(this.done, this.undone);
	    };
	    HistoryState.prototype.addChanges = function (changes, inverted, selection, time, userEvent, newGroupDelay, maxLen) {
	        var mayMerge = nope;
	        if (this.prevTime !== null && time - this.prevTime < newGroupDelay &&
	            (inverted || (this.prevUserEvent == userEvent && userEvent == "keyboard")))
	            mayMerge = inverted
	                ? function (prev) { return isAdjacent(prev.map.changes[prev.map.length - 1], changes.changes[0]); }
	                : function (prev) { return eqSelectionShape(prev.selection, selection); };
	        return new HistoryState(addChanges(this.done, changes, inverted, selection, maxLen, mayMerge), this.undone, time, userEvent);
	    };
	    HistoryState.prototype.addMapping = function (map, maxLen) {
	        if (this.done.length == 0)
	            return this;
	        return new HistoryState(updateBranch(this.done, this.done.length, maxLen, new Item(map)), this.undone);
	    };
	    HistoryState.prototype.canPop = function (done, only) {
	        var target = done == 0 /* Done */ ? this.done : this.undone;
	        for (var _i = 0, target_1 = target; _i < target_1.length; _i++) {
	            var _a = target_1[_i], isChange = _a.isChange, selection = _a.selection;
	            if (isChange || (only == 1 /* Any */ && selection))
	                return true;
	        }
	        return false;
	    };
	    HistoryState.prototype.pop = function (done, only, transaction, maxLen) {
	        var _a = popChanges(done == 0 /* Done */ ? this.done : this.undone, only), changes = _a.changes, branch = _a.branch, selection = _a.selection;
	        var oldSelection = transaction.selection;
	        for (var _i = 0, _b = changes.changes; _i < _b.length; _i++) {
	            var change = _b[_i];
	            transaction.change(change);
	        }
	        transaction.setSelection(selection);
	        var otherBranch = (done == 0 /* Done */ ? this.undone : this.done);
	        otherBranch = addChanges(otherBranch, transaction.changes, transaction.changes.length > 0 ? transaction.invertedChanges() : null, oldSelection, maxLen, nope);
	        return { transaction: transaction, state: new HistoryState(done == 0 /* Done */ ? branch : otherBranch, done == 0 /* Done */ ? otherBranch : branch) };
	    };
	    HistoryState.prototype.eventCount = function (done, only) {
	        var count = 0, branch = done == 0 /* Done */ ? this.done : this.undone;
	        for (var _i = 0, branch_1 = branch; _i < branch_1.length; _i++) {
	            var _a = branch_1[_i], isChange = _a.isChange, selection = _a.selection;
	            if (isChange || (only == 1 /* Any */ && selection))
	                ++count;
	        }
	        return count;
	    };
	    HistoryState.empty = new HistoryState([], []);
	    return HistoryState;
	}());
	exports.HistoryState = HistoryState;
	});

	unwrapExports(core);
	var core_1 = core.HistoryState;

	var history = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });



	var historyStateSlot = extension.Slot.define();
	exports.closeHistorySlot = extension.Slot.define();
	function historyField(_a) {
	    var minDepth = _a.minDepth, newGroupDelay = _a.newGroupDelay;
	    return new src$1.StateField({
	        init: function (editorState) {
	            return core.HistoryState.empty;
	        },
	        apply: function (tr, state, editorState) {
	            var fromMeta = tr.getMeta(historyStateSlot);
	            if (fromMeta)
	                return fromMeta;
	            if (tr.getMeta(exports.closeHistorySlot))
	                state = state.resetTime();
	            if (!tr.changes.length && !tr.selectionSet)
	                return state;
	            if (tr.getMeta(src$1.Transaction.addToHistory) !== false)
	                return state.addChanges(tr.changes, tr.changes.length ? tr.invertedChanges() : null, tr.startState.selection, tr.getMeta(src$1.Transaction.time), tr.getMeta(src$1.Transaction.userEvent), newGroupDelay, minDepth);
	            return state.addMapping(tr.changes.desc, minDepth);
	        }
	    });
	}
	var HistoryContext = /** @class */ (function () {
	    function HistoryContext(field, config) {
	        this.field = field;
	        this.config = config;
	    }
	    return HistoryContext;
	}());
	var historyBehavior = src$1.StateExtension.defineBehavior();
	exports.history = src$1.StateExtension.unique(function (configs) {
	    var config = extension.combineConfig(configs, {
	        minDepth: 100,
	        newGroupDelay: 500
	    }, { minDepth: Math.max });
	    var field = historyField(config);
	    return src$1.StateExtension.all(field.extension, historyBehavior(new HistoryContext(field, config)));
	}, {});
	function cmd(target, only) {
	    return function (_a) {
	        var state = _a.state, dispatch = _a.dispatch;
	        var hist = state.behavior.get(historyBehavior);
	        if (!hist.length)
	            return false;
	        var _b = hist[0], field = _b.field, config = _b.config;
	        var historyState = state.getField(field);
	        if (!historyState.canPop(target, only))
	            return false;
	        var _c = historyState.pop(target, only, state.t(), config.minDepth), transaction = _c.transaction, newState = _c.state;
	        dispatch(transaction.addMeta(historyStateSlot(newState)));
	        return true;
	    };
	}
	exports.undo = cmd(0 /* Done */, 0 /* OnlyChanges */);
	exports.redo = cmd(1 /* Undone */, 0 /* OnlyChanges */);
	exports.undoSelection = cmd(0 /* Done */, 1 /* Any */);
	exports.redoSelection = cmd(1 /* Undone */, 1 /* Any */);
	// Set a flag on the given transaction that will prevent further steps
	// from being appended to an existing history event (so that they
	// require a separate undo command to undo).
	function closeHistory(tr) {
	    return tr.addMeta(exports.closeHistorySlot(true));
	}
	exports.closeHistory = closeHistory;
	function depth(target, only) {
	    return function (state) {
	        var hist = state.behavior.get(historyBehavior);
	        if (hist.length == 0)
	            return 0;
	        var field = hist[0].field;
	        return state.getField(field).eventCount(target, only);
	    };
	}
	// The amount of undoable change events available in a given state.
	exports.undoDepth = depth(0 /* Done */, 0 /* OnlyChanges */);
	// The amount of redoable change events available in a given state.
	exports.redoDepth = depth(1 /* Undone */, 0 /* OnlyChanges */);
	// The amount of undoable events available in a given state.
	exports.redoSelectionDepth = depth(0 /* Done */, 1 /* Any */);
	// The amount of redoable events available in a given state.
	exports.undoSelectionDepth = depth(1 /* Undone */, 1 /* Any */);
	});

	unwrapExports(history);
	var history_1 = history.closeHistorySlot;
	var history_2 = history.history;
	var history_3 = history.undo;
	var history_4 = history.redo;
	var history_5 = history.undoSelection;
	var history_6 = history.redoSelection;
	var history_7 = history.closeHistory;
	var history_8 = history.undoDepth;
	var history_9 = history.redoDepth;
	var history_10 = history.redoSelectionDepth;
	var history_11 = history.undoSelectionDepth;

	var src$3 = createCommonjsModule(function (module, exports) {
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





	var GutterMarker = /** @class */ (function (_super) {
	    __extends(GutterMarker, _super);
	    function GutterMarker(value) {
	        var _this = _super.call(this) || this;
	        _this.value = value;
	        return _this;
	    }
	    GutterMarker.prototype.eq = function (other) {
	        return this == other || this.constructor == other.constructor && this.value === other.value;
	    };
	    GutterMarker.prototype.map = function (mapping, pos) {
	        pos = mapping.mapPos(pos, -1, src$1.MapMode.TrackBefore);
	        return pos < 0 ? null : new rangeset.Range(pos, pos, this);
	    };
	    GutterMarker.prototype.toDOM = function () { return null; };
	    GutterMarker.create = function (pos, value) {
	        return new rangeset.Range(pos, pos, new this(value));
	    };
	    GutterMarker.set = function (of) {
	        return rangeset.RangeSet.of(of);
	    };
	    return GutterMarker;
	}(rangeset.RangeValue));
	exports.GutterMarker = GutterMarker;
	GutterMarker.prototype.elementClass = null;
	var defaults = {
	    fixed: true,
	    renderEmptyElements: false,
	    elementClass: "",
	    initialMarkers: function () { return rangeset.RangeSet.empty; },
	    updateMarkers: function (markers) { return markers; },
	    lineMarker: function () { return null; },
	    initialSpacer: null,
	    updateSpacer: null
	};
	function gutter(config) {
	    var conf = extension.fillConfig(config, defaults);
	    return src$2.ViewExtension.all(src$2.viewPlugin(function (view) { return new GutterView(view, conf); }), src$2.styleModule(styles));
	}
	exports.gutter = gutter;
	var GutterView = /** @class */ (function () {
	    function GutterView(view, config) {
	        this.view = view;
	        this.config = config;
	        this.elements = [];
	        this.spacer = null;
	        this.dom = document.createElement("div");
	        this.dom.className = "codemirror-gutter " + config.class + " " + styles.gutter;
	        this.dom.setAttribute("aria-hidden", "true");
	        if (config.fixed) {
	            // FIXME IE11 fallback, which doesn't support position: sticky,
	            // by using position: relative + event handlers that realign the
	            // gutter (or just force fixed=false on IE11?)
	            this.dom.style.position = "sticky";
	        }
	        view.dom.insertBefore(this.dom, view.contentDOM);
	        this.markers = config.initialMarkers(view);
	        if (config.initialSpacer) {
	            this.spacer = new GutterElement(0, 0, [config.initialSpacer(view)], this.config.elementClass);
	            this.dom.appendChild(this.spacer.dom);
	            this.spacer.dom.style.cssText += "visibility: hidden; pointer-events: none";
	        }
	        this.updateGutter();
	    }
	    GutterView.prototype.update = function (update) {
	        this.markers = this.config.updateMarkers(this.markers.map(update.changes), update);
	        if (this.spacer && this.config.updateSpacer) {
	            var updated = this.config.updateSpacer(this.spacer.markers[0], update);
	            if (updated != this.spacer.markers[0])
	                this.spacer.update(0, 0, [updated], this.config.elementClass);
	        }
	        // FIXME would be nice to be able to recognize updates that didn't redraw
	        this.updateGutter();
	    };
	    GutterView.prototype.updateGutter = function () {
	        var _this = this;
	        var i = 0, height = 0;
	        var markers = this.markers.iter(this.view.viewport.from, this.view.viewport.to);
	        var localMarkers = [], nextMarker = markers.next();
	        this.view.viewportLines(function (line) {
	            var text;
	            if (Array.isArray(line.type))
	                text = line.type.find(function (b) { return b.type == 0 /* Text */; });
	            else
	                text = line.type == 0 /* Text */ ? line : undefined;
	            if (!text)
	                return;
	            while (nextMarker && nextMarker.from <= text.from) {
	                if (nextMarker.from == text.from)
	                    localMarkers.push(nextMarker.value);
	                nextMarker = markers.next();
	            }
	            var forLine = _this.config.lineMarker(_this.view, text, localMarkers);
	            if (forLine)
	                localMarkers.unshift(forLine);
	            if (localMarkers.length || _this.config.renderEmptyElements) {
	                var above = text.top - height;
	                if (i == _this.elements.length) {
	                    var newElt = new GutterElement(text.height, above, localMarkers, _this.config.elementClass);
	                    _this.elements.push(newElt);
	                    _this.dom.appendChild(newElt.dom);
	                }
	                else {
	                    var markers_1 = localMarkers, elt = _this.elements[i];
	                    if (sameMarkers(markers_1, elt.markers)) {
	                        markers_1 = elt.markers;
	                        localMarkers.length = 0;
	                    }
	                    elt.update(text.height, above, markers_1, _this.config.elementClass);
	                }
	                height = text.bottom;
	                i++;
	                if (localMarkers.length)
	                    localMarkers = [];
	            }
	        }, 0);
	        while (this.elements.length > i)
	            this.dom.removeChild(this.elements.pop().dom);
	        this.dom.style.minHeight = this.view.contentHeight + "px";
	    };
	    GutterView.prototype.destroy = function () {
	        this.dom.remove();
	    };
	    Object.defineProperty(GutterView.prototype, "styles", {
	        get: function () { return styles; },
	        enumerable: true,
	        configurable: true
	    });
	    return GutterView;
	}());
	var GutterElement = /** @class */ (function () {
	    function GutterElement(height, above, markers, eltClass) {
	        this.height = -1;
	        this.above = 0;
	        this.dom = document.createElement("div");
	        this.update(height, above, markers, eltClass);
	    }
	    GutterElement.prototype.update = function (height, above, markers, eltClass) {
	        if (this.height != height)
	            this.dom.style.height = (this.height = height) + "px";
	        if (this.above != above)
	            this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
	        if (this.markers != markers) {
	            this.markers = markers;
	            for (var ch = void 0; ch = this.dom.lastChild;)
	                ch.remove();
	            var cls = "codemirror-gutter-element " + styles.gutterElement;
	            if (eltClass)
	                cls += " " + eltClass;
	            for (var _i = 0, markers_2 = markers; _i < markers_2.length; _i++) {
	                var m = markers_2[_i];
	                var dom = m.toDOM();
	                if (dom)
	                    this.dom.appendChild(dom);
	                var c = m.elementClass;
	                if (c)
	                    cls += " " + c;
	            }
	            this.dom.className = cls;
	        }
	    };
	    return GutterElement;
	}());
	function sameMarkers(a, b) {
	    if (a.length != b.length)
	        return false;
	    for (var i = 0; i < a.length; i++)
	        if (!a[i].eq(b[i]))
	            return false;
	    return true;
	}
	exports.lineNumberMarkers = extension.Slot.define();
	exports.lineNumbers = src$2.ViewExtension.unique(function (configs) {
	    var config = extension.combineConfig(configs, {
	        fixed: true,
	        formatNumber: String
	    });
	    var NumberMarker = /** @class */ (function (_super) {
	        __extends(NumberMarker, _super);
	        function NumberMarker() {
	            return _super !== null && _super.apply(this, arguments) || this;
	        }
	        NumberMarker.prototype.toDOM = function () {
	            return document.createTextNode(config.formatNumber(this.value));
	        };
	        return NumberMarker;
	    }(GutterMarker));
	    return gutter({
	        class: "codemirror-line-numbers " + styles.lineNumberGutter,
	        fixed: config.fixed,
	        elementClass: styles.lineNumberGutterElement,
	        updateMarkers: function (markers, update) {
	            var slot = update.getMeta(exports.lineNumberMarkers);
	            if (slot)
	                markers = markers.update(slot.add || [], slot.filter || null);
	            return markers;
	        },
	        lineMarker: function (view, line, others) {
	            if (others.length)
	                return null;
	            // FIXME try to make the line number queries cheaper?
	            return new NumberMarker(view.state.doc.lineAt(line.from).number);
	        },
	        initialSpacer: function (view) {
	            return new NumberMarker(maxLineNumber(view.state.doc.lines));
	        },
	        updateSpacer: function (spacer, update) {
	            var max = maxLineNumber(update.view.state.doc.lines);
	            return max == spacer.value ? spacer : new NumberMarker(max);
	        }
	    });
	}, {});
	function maxLineNumber(lines) {
	    var last = 9;
	    while (last < lines)
	        last = last * 10 + 9;
	    return last;
	}
	var styles = new styleMod.StyleModule({
	    gutter: {
	        display: "flex !important",
	        flexDirection: "column",
	        flexShrink: 0,
	        left: 0,
	        boxSizing: "border-box",
	        height: "100%",
	        overflow: "hidden"
	    },
	    gutterElement: {
	        boxSizing: "border-box"
	    },
	    lineNumberGutter: {
	        background: "#f5f5f5",
	        borderRight: "1px solid silver"
	    },
	    lineNumberGutterElement: {
	        padding: "0 3px 0 5px",
	        minWidth: "20px",
	        textAlign: "right",
	        color: "#999",
	        whiteSpace: "nowrap"
	    }
	});
	});

	unwrapExports(src$3);
	var src_3$3 = src$3.GutterMarker;
	var src_4$3 = src$3.gutter;
	var src_5$3 = src$3.lineNumberMarkers;
	var src_6$3 = src$3.lineNumbers;

	var commands = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });

	function moveSelection(view, dir, granularity) {
	    var transaction = view.state.t().forEachRange(function (range) {
	        if (!range.empty && granularity != "lineboundary")
	            return new src$1.SelectionRange(dir == "left" || dir == "backward" ? range.from : range.to);
	        return new src$1.SelectionRange(view.movePos(range.head, dir, granularity, "move"));
	    });
	    if (transaction.selection.eq(view.state.selection))
	        return false;
	    if (granularity == "line")
	        transaction.addMeta(src$1.Transaction.preserveGoalColumn(true));
	    view.dispatch(transaction.scrollIntoView());
	    return true;
	}
	exports.moveCharLeft = function (view) { return moveSelection(view, "left", "character"); };
	exports.moveCharRight = function (view) { return moveSelection(view, "right", "character"); };
	exports.moveWordLeft = function (view) { return moveSelection(view, "left", "word"); };
	exports.moveWordRight = function (view) { return moveSelection(view, "right", "word"); };
	exports.moveLineUp = function (view) { return moveSelection(view, "backward", "line"); };
	exports.moveLineDown = function (view) { return moveSelection(view, "forward", "line"); };
	exports.moveLineStart = function (view) { return moveSelection(view, "backward", "lineboundary"); };
	exports.moveLineEnd = function (view) { return moveSelection(view, "forward", "lineboundary"); };
	function extendSelection(view, dir, granularity) {
	    var transaction = view.state.t().forEachRange(function (range) {
	        return new src$1.SelectionRange(range.anchor, view.movePos(range.head, dir, granularity, "extend"));
	    });
	    if (transaction.selection.eq(view.state.selection))
	        return false;
	    if (granularity == "line")
	        transaction.addMeta(src$1.Transaction.preserveGoalColumn(true));
	    view.dispatch(transaction.scrollIntoView());
	    return true;
	}
	exports.extendCharLeft = function (view) { return extendSelection(view, "left", "character"); };
	exports.extendCharRight = function (view) { return extendSelection(view, "right", "character"); };
	exports.extendWordLeft = function (view) { return extendSelection(view, "left", "word"); };
	exports.extendWordRight = function (view) { return extendSelection(view, "right", "word"); };
	exports.extendLineUp = function (view) { return extendSelection(view, "backward", "line"); };
	exports.extendLineDown = function (view) { return extendSelection(view, "forward", "line"); };
	exports.extendLineStart = function (view) { return extendSelection(view, "backward", "lineboundary"); };
	exports.extendLineEnd = function (view) { return extendSelection(view, "forward", "lineboundary"); };
	exports.selectDocStart = function (_a) {
	    var state = _a.state, dispatch = _a.dispatch;
	    dispatch(state.t().setSelection(src$1.EditorSelection.single(0)).scrollIntoView());
	    return true;
	};
	exports.selectDocEnd = function (_a) {
	    var state = _a.state, dispatch = _a.dispatch;
	    dispatch(state.t().setSelection(src$1.EditorSelection.single(state.doc.length)).scrollIntoView());
	    return true;
	};
	exports.selectAll = function (_a) {
	    var state = _a.state, dispatch = _a.dispatch;
	    dispatch(state.t().setSelection(src$1.EditorSelection.single(0, state.doc.length)));
	    return true;
	};
	function deleteText(view, dir) {
	    var transaction = view.state.t().forEachRange(function (range, transaction) {
	        var from = range.from, to = range.to;
	        if (from == to) {
	            var target = view.movePos(range.head, dir, "character", "move");
	            from = Math.min(from, target);
	            to = Math.max(to, target);
	        }
	        if (from == to)
	            return range;
	        transaction.replace(from, to, "");
	        return new src$1.SelectionRange(from);
	    });
	    if (!transaction.docChanged)
	        return false;
	    view.dispatch(transaction.scrollIntoView());
	    return true;
	}
	exports.deleteCharBackward = function (view) { return deleteText(view, "backward"); };
	exports.deleteCharForward = function (view) { return deleteText(view, "forward"); };
	// FIXME support indenting by tab, configurable indent units
	function space(n) {
	    var result = "";
	    for (var i = 0; i < n; i++)
	        result += " ";
	    return result;
	}
	function getIndentation(state, pos) {
	    for (var _i = 0, _a = state.behavior.get(src$1.StateExtension.indentation); _i < _a.length; _i++) {
	        var f = _a[_i];
	        var result = f(state, pos);
	        if (result > -1)
	            return result;
	    }
	    return -1;
	}
	function insertNewlineAndIndent(_a) {
	    var state = _a.state, dispatch = _a.dispatch;
	    var i = 0, indentation = state.selection.ranges.map(function (r) {
	        var indent = getIndentation(state, r.from);
	        return indent > -1 ? indent : /^\s*/.exec(state.doc.lineAt(r.from).slice(0, 50))[0].length;
	    });
	    dispatch(state.t().forEachRange(function (range, tr) {
	        var indent = indentation[i++];
	        tr.replace(range.from, range.to, ["", space(indent)]);
	        return new src$1.SelectionRange(range.from + indent + 1);
	    }).scrollIntoView());
	    return true;
	}
	exports.insertNewlineAndIndent = insertNewlineAndIndent;
	function indentSelection(_a) {
	    var _b;
	    var state = _a.state, dispatch = _a.dispatch;
	    var lastLine = -1, positions = [];
	    for (var _i = 0, _c = state.selection.ranges; _i < _c.length; _i++) {
	        var range = _c[_i];
	        for (var _d = state.doc.lineAt(range.from), start = _d.start, end = _d.end;;) {
	            if (start != lastLine) {
	                lastLine = start;
	                var indent = getIndentation(state, start), current = void 0;
	                if (indent > -1 &&
	                    indent != (current = /^\s*/.exec(state.doc.slice(start, Math.min(end, start + 100)))[0].length))
	                    positions.push({ pos: start, current: current, indent: indent });
	            }
	            if (end + 1 > range.to)
	                break;
	            (_b = state.doc.lineAt(end + 1), start = _b.start, end = _b.end);
	        }
	    }
	    if (positions.length > 0) {
	        var tr = state.t();
	        for (var _e = 0, positions_1 = positions; _e < positions_1.length; _e++) {
	            var _f = positions_1[_e], pos = _f.pos, current = _f.current, indent = _f.indent;
	            var start = tr.changes.mapPos(pos);
	            tr.replace(start, start + current, space(indent));
	        }
	        dispatch(tr);
	    }
	    return true;
	}
	exports.indentSelection = indentSelection;
	exports.pcBaseKeymap = {
	    "ArrowLeft": exports.moveCharLeft,
	    "ArrowRight": exports.moveCharRight,
	    "Shift-ArrowLeft": exports.extendCharLeft,
	    "Shift-ArrowRight": exports.extendCharRight,
	    "Mod-ArrowLeft": exports.moveWordLeft,
	    "Mod-ArrowRight": exports.moveWordRight,
	    "Shift-Mod-ArrowLeft": exports.extendWordLeft,
	    "Shift-Mod-ArrowRight": exports.extendWordRight,
	    "ArrowUp": exports.moveLineUp,
	    "ArrowDown": exports.moveLineDown,
	    "Shift-ArrowUp": exports.extendLineUp,
	    "Shift-ArrowDown": exports.extendLineDown,
	    "Home": exports.moveLineStart,
	    "End": exports.moveLineEnd,
	    "Shift-Home": exports.extendLineStart,
	    "Shift-End": exports.extendLineEnd,
	    "Mod-Home": exports.selectDocStart,
	    "Mod-End": exports.selectDocEnd,
	    "Mod-a": exports.selectAll,
	    "Backspace": exports.deleteCharBackward,
	    "Delete": exports.deleteCharForward,
	    "Enter": insertNewlineAndIndent
	};
	exports.macBaseKeymap = {
	    "Control-b": exports.moveCharLeft,
	    "Control-f": exports.moveCharRight,
	    "Shift-Control-b": exports.extendCharLeft,
	    "Shift-Control-f": exports.extendCharRight,
	    "Control-p": exports.moveLineUp,
	    "Control-n": exports.moveLineDown,
	    "Shift-Control-p": exports.extendLineUp,
	    "Shift-Control-n": exports.extendLineDown,
	    "Control-a": exports.moveLineStart,
	    "Control-e": exports.moveLineEnd,
	    "Shift-Control-a": exports.extendLineStart,
	    "Shift-Control-e": exports.extendLineEnd,
	    "Cmd-ArrowUp": exports.selectDocStart,
	    "Cmd-ArrowDown": exports.selectDocEnd,
	    "Control-d": exports.deleteCharForward,
	    "Control-h": exports.deleteCharBackward
	};
	for (var key in exports.pcBaseKeymap)
	    exports.macBaseKeymap[key] = exports.pcBaseKeymap[key];
	var mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform)
	    : typeof os != "undefined" ? os.platform() == "darwin" : false;
	exports.baseKeymap = mac ? exports.macBaseKeymap : exports.pcBaseKeymap;
	});

	unwrapExports(commands);
	var commands_1 = commands.moveCharLeft;
	var commands_2 = commands.moveCharRight;
	var commands_3 = commands.moveWordLeft;
	var commands_4 = commands.moveWordRight;
	var commands_5 = commands.moveLineUp;
	var commands_6 = commands.moveLineDown;
	var commands_7 = commands.moveLineStart;
	var commands_8 = commands.moveLineEnd;
	var commands_9 = commands.extendCharLeft;
	var commands_10 = commands.extendCharRight;
	var commands_11 = commands.extendWordLeft;
	var commands_12 = commands.extendWordRight;
	var commands_13 = commands.extendLineUp;
	var commands_14 = commands.extendLineDown;
	var commands_15 = commands.extendLineStart;
	var commands_16 = commands.extendLineEnd;
	var commands_17 = commands.selectDocStart;
	var commands_18 = commands.selectDocEnd;
	var commands_19 = commands.selectAll;
	var commands_20 = commands.deleteCharBackward;
	var commands_21 = commands.deleteCharForward;
	var commands_22 = commands.insertNewlineAndIndent;
	var commands_23 = commands.indentSelection;
	var commands_24 = commands.pcBaseKeymap;
	var commands_25 = commands.macBaseKeymap;
	var commands_26 = commands.baseKeymap;

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

	var src$4 = createCommonjsModule(function (module, exports) {
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

	unwrapExports(src$4);
	var src_3$4 = src$4.legacyMode;

	var matchbrackets = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });




	var matching = {
	    "(": ")>",
	    ")": "(<",
	    "[": "]>",
	    "]": "[<",
	    "{": "}>",
	    "}": "{<"
	};
	function findMatchingBracket(doc, where, config) {
	    var pos = where - 1;
	    // A cursor is defined as between two characters, but in in vim command mode
	    // (i.e. not insert mode), the cursor is visually represented as a
	    // highlighted box on top of the 2nd character. Otherwise, we allow matches
	    // from before or after the cursor.
	    var match = (!config.afterCursor && pos >= 0 && matching[doc.slice(pos, pos + 1)]) ||
	        matching[doc.slice(++pos, pos + 1)];
	    if (!match)
	        return null;
	    var dir = match[1] == ">" ? 1 : -1;
	    if (config.strict && (dir > 0) != (pos == where))
	        return null;
	    var found = scanForBracket(doc, pos + (dir > 0 ? 1 : 0), dir, config);
	    if (found == null)
	        return null;
	    return { from: pos, to: found ? found.pos : null,
	        match: found && found.ch == match.charAt(0), forward: dir > 0 };
	}
	// bracketRegex is used to specify which type of bracket to scan
	// should be a regexp, e.g. /[[\]]/
	//
	// Note: If "where" is on an open bracket, then this bracket is ignored.
	//
	// Returns false when no bracket was found, null when it reached
	// maxScanDistance and gave up
	function scanForBracket(doc, where, dir, config) {
	    var maxScanDistance = config.maxScanDistance;
	    var re = config.bracketRegex;
	    var stack = [];
	    var iter = doc.iterRange(where, dir > 0 ? doc.length : 0);
	    for (var distance = 0; !iter.done && distance <= maxScanDistance;) {
	        iter.next();
	        var text = iter.value;
	        if (dir < 0)
	            distance += text.length;
	        var basePos = where + distance * dir;
	        for (var pos = dir > 0 ? 0 : text.length - 1, end = dir > 0 ? text.length : -1; pos != end; pos += dir) {
	            var ch = text.charAt(pos);
	            if (re.test(ch)) {
	                var match = matching[ch];
	                if ((match.charAt(1) == ">") == (dir > 0))
	                    stack.push(ch);
	                else if (!stack.length)
	                    return { pos: basePos + pos, ch: ch };
	                else
	                    stack.pop();
	            }
	        }
	        if (dir > 0)
	            distance += text.length;
	    }
	    return iter.done ? false : null;
	}
	exports.scanForBracket = scanForBracket;
	function doMatchBrackets(state, config) {
	    var decorations = [];
	    for (var _i = 0, _a = state.selection.ranges; _i < _a.length; _i++) {
	        var range = _a[_i];
	        if (!range.empty)
	            continue;
	        var match = findMatchingBracket(state.doc, range.head, config);
	        if (!match)
	            continue;
	        var style = match.match ? matchingClass : nonmatchingClass;
	        decorations.push(decoration.Decoration.mark(match.from, match.from + 1, { class: style }));
	        if (match.to)
	            decorations.push(decoration.Decoration.mark(match.to, match.to + 1, { class: style }));
	    }
	    return decoration.Decoration.set(decorations);
	}
	exports.matchBrackets = src$2.ViewExtension.unique(function (configs) {
	    var config = extension.combineConfig(configs, {
	        afterCursor: false,
	        bracketRegex: /[(){}[\]]/,
	        maxScanDistance: 10000,
	        strict: false
	    });
	    return src$2.ViewExtension.all(src$2.ViewField.decorations({
	        create: function () { return decoration.Decoration.none; },
	        update: function (deco, update) {
	            // FIXME make this use a tokenizer behavior exported by the highlighter
	            return update.transactions.length ? doMatchBrackets(update.state, config) : deco;
	        }
	    }), src$2.styleModule(defaultStyles));
	}, {});
	var defaultStyles = new styleMod.StyleModule({
	    matching: { color: "#0b0" },
	    nonmatching: { color: "#a22" }
	});
	var matchingClass = "codemirror-matching-bracket " + defaultStyles.matching;
	var nonmatchingClass = "codemirror-nonmatching-bracket " + defaultStyles.nonmatching;
	});

	unwrapExports(matchbrackets);
	var matchbrackets_1 = matchbrackets.scanForBracket;
	var matchbrackets_2 = matchbrackets.matchBrackets;

	// CodeMirror, copyright (c) by Marijn Haverbeke and others

	function javascript_1(config, parserConfig) {
	  var indentUnit = config.indentUnit;
	  var statementIndent = parserConfig.statementIndent;
	  var jsonldMode = parserConfig.jsonld;
	  var jsonMode = parserConfig.json || jsonldMode;
	  var isTS = parserConfig.typescript;
	  var wordRE = parserConfig.wordCharacters || /[\w$\xa1-\uffff]/;

	  // Tokenizer

	  var keywords = function(){
	    function kw(type) {return {type: type, style: "keyword"};}
	    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c"), D = kw("keyword d");
	    var operator = kw("operator"), atom = {type: "atom", style: "atom"};

	    return {
	      "if": kw("if"), "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
	      "return": D, "break": D, "continue": D, "new": kw("new"), "delete": C, "void": C, "throw": C,
	      "debugger": kw("debugger"), "var": kw("var"), "const": kw("var"), "let": kw("var"),
	      "function": kw("function"), "catch": kw("catch"),
	      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
	      "in": operator, "typeof": operator, "instanceof": operator,
	      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom,
	      "this": kw("this"), "class": kw("class"), "super": kw("atom"),
	      "yield": C, "export": kw("export"), "import": kw("import"), "extends": C,
	      "await": C
	    };
	  }();

	  var isOperatorChar = /[+\-*&%=<>!?|~^@]/;
	  var isJsonldKeyword = /^@(context|id|value|language|type|container|list|set|reverse|index|base|vocab|graph)"/;

	  function readRegexp(stream) {
	    var escaped = false, next, inSet = false;
	    while ((next = stream.next()) != null) {
	      if (!escaped) {
	        if (next == "/" && !inSet) return;
	        if (next == "[") inSet = true;
	        else if (inSet && next == "]") inSet = false;
	      }
	      escaped = !escaped && next == "\\";
	    }
	  }

	  // Used as scratch variables to communicate multiple values without
	  // consing up tons of objects.
	  var type, content;
	  function ret(tp, style, cont) {
	    type = tp; content = cont;
	    return style;
	  }
	  function tokenBase(stream, state) {
	    var ch = stream.next();
	    if (ch == '"' || ch == "'") {
	      state.tokenize = tokenString(ch);
	      return state.tokenize(stream, state);
	    } else if (ch == "." && stream.match(/^\d+(?:[eE][+\-]?\d+)?/)) {
	      return ret("number", "number");
	    } else if (ch == "." && stream.match("..")) {
	      return ret("spread", "meta");
	    } else if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
	      return ret(ch);
	    } else if (ch == "=" && stream.eat(">")) {
	      return ret("=>", "operator");
	    } else if (ch == "0" && stream.eat(/x/i)) {
	      stream.eatWhile(/[\da-f]/i);
	      return ret("number", "number");
	    } else if (ch == "0" && stream.eat(/o/i)) {
	      stream.eatWhile(/[0-7]/i);
	      return ret("number", "number");
	    } else if (ch == "0" && stream.eat(/b/i)) {
	      stream.eatWhile(/[01]/i);
	      return ret("number", "number");
	    } else if (/\d/.test(ch)) {
	      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
	      return ret("number", "number");
	    } else if (ch == "/") {
	      if (stream.eat("*")) {
	        state.tokenize = tokenComment;
	        return tokenComment(stream, state);
	      } else if (stream.eat("/")) {
	        stream.skipToEnd();
	        return ret("comment", "comment");
	      } else if (expressionAllowed(stream, state, 1)) {
	        readRegexp(stream);
	        stream.match(/^\b(([gimyu])(?![gimyu]*\2))+\b/);
	        return ret("regexp", "string-2");
	      } else {
	        stream.eat("=");
	        return ret("operator", "operator", stream.current());
	      }
	    } else if (ch == "`") {
	      state.tokenize = tokenQuasi;
	      return tokenQuasi(stream, state);
	    } else if (ch == "#") {
	      stream.skipToEnd();
	      return ret("error", "error");
	    } else if (isOperatorChar.test(ch)) {
	      if (ch != ">" || !state.lexical || state.lexical.type != ">") {
	        if (stream.eat("=")) {
	          if (ch == "!" || ch == "=") stream.eat("=");
	        } else if (/[<>*+\-]/.test(ch)) {
	          stream.eat(ch);
	          if (ch == ">") stream.eat(ch);
	        }
	      }
	      return ret("operator", "operator", stream.current());
	    } else if (wordRE.test(ch)) {
	      stream.eatWhile(wordRE);
	      var word = stream.current();
	      if (state.lastType != ".") {
	        if (keywords.propertyIsEnumerable(word)) {
	          var kw = keywords[word];
	          return ret(kw.type, kw.style, word)
	        }
	        if (word == "async" && stream.match(/^(\s|\/\*.*?\*\/)*[\(\w]/, false))
	          return ret("async", "keyword", word)
	      }
	      return ret("variable", "variable", word)
	    }
	  }

	  function tokenString(quote) {
	    return function(stream, state) {
	      var escaped = false, next;
	      if (jsonldMode && stream.peek() == "@" && stream.match(isJsonldKeyword)){
	        state.tokenize = tokenBase;
	        return ret("jsonld-keyword", "meta");
	      }
	      while ((next = stream.next()) != null) {
	        if (next == quote && !escaped) break;
	        escaped = !escaped && next == "\\";
	      }
	      if (!escaped) state.tokenize = tokenBase;
	      return ret("string", "string");
	    };
	  }

	  function tokenComment(stream, state) {
	    var maybeEnd = false, ch;
	    while (ch = stream.next()) {
	      if (ch == "/" && maybeEnd) {
	        state.tokenize = tokenBase;
	        break;
	      }
	      maybeEnd = (ch == "*");
	    }
	    return ret("comment", "comment");
	  }

	  function tokenQuasi(stream, state) {
	    var escaped = false, next;
	    while ((next = stream.next()) != null) {
	      if (!escaped && (next == "`" || next == "$" && stream.eat("{"))) {
	        state.tokenize = tokenBase;
	        break;
	      }
	      escaped = !escaped && next == "\\";
	    }
	    return ret("quasi", "string-2", stream.current());
	  }

	  var brackets = "([{}])";
	  // This is a crude lookahead trick to try and notice that we're
	  // parsing the argument patterns for a fat-arrow function before we
	  // actually hit the arrow token. It only works if the arrow is on
	  // the same line as the arguments and there's no strange noise
	  // (comments) in between. Fallback is to only notice when we hit the
	  // arrow, and not declare the arguments as locals for the arrow
	  // body.
	  function findFatArrow(stream, state) {
	    if (state.fatArrowAt) state.fatArrowAt = null;
	    var arrow = stream.string.indexOf("=>", stream.start);
	    if (arrow < 0) return;

	    if (isTS) { // Try to skip TypeScript return type declarations after the arguments
	      var m = /:\s*(?:\w+(?:<[^>]*>|\[\])?|\{[^}]*\})\s*$/.exec(stream.string.slice(stream.start, arrow));
	      if (m) arrow = m.index;
	    }

	    var depth = 0, sawSomething = false;
	    for (var pos = arrow - 1; pos >= 0; --pos) {
	      var ch = stream.string.charAt(pos);
	      var bracket = brackets.indexOf(ch);
	      if (bracket >= 0 && bracket < 3) {
	        if (!depth) { ++pos; break; }
	        if (--depth == 0) { if (ch == "(") sawSomething = true; break; }
	      } else if (bracket >= 3 && bracket < 6) {
	        ++depth;
	      } else if (wordRE.test(ch)) {
	        sawSomething = true;
	      } else if (/["'\/]/.test(ch)) {
	        return;
	      } else if (sawSomething && !depth) {
	        ++pos;
	        break;
	      }
	    }
	    if (sawSomething && !depth) state.fatArrowAt = pos;
	  }

	  // Parser

	  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true, "this": true, "jsonld-keyword": true};

	  function JSLexical(indented, column, type, align, prev, info) {
	    this.indented = indented;
	    this.column = column;
	    this.type = type;
	    this.prev = prev;
	    this.info = info;
	    if (align != null) this.align = align;
	  }

	  function inScope(state, varname) {
	    for (var v = state.localVars; v; v = v.next)
	      if (v.name == varname) return true;
	    for (var cx = state.context; cx; cx = cx.prev) {
	      for (var v = cx.vars; v; v = v.next)
	        if (v.name == varname) return true;
	    }
	  }

	  function parseJS(state, style, type, content, stream) {
	    var cc = state.cc;
	    // Communicate our context to the combinators.
	    // (Less wasteful than consing up a hundred closures on every call.)
	    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc; cx.style = style;

	    if (!state.lexical.hasOwnProperty("align"))
	      state.lexical.align = true;

	    while(true) {
	      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
	      if (combinator(type, content)) {
	        while(cc.length && cc[cc.length - 1].lex)
	          cc.pop()();
	        if (cx.marked) return cx.marked;
	        if (type == "variable" && inScope(state, content)) return "variable-2";
	        return style;
	      }
	    }
	  }

	  // Combinator utils

	  var cx = {state: null, column: null, marked: null, cc: null};
	  function pass() {
	    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
	  }
	  function cont() {
	    pass.apply(null, arguments);
	    return true;
	  }
	  function register(varname) {
	    function inList(list) {
	      for (var v = list; v; v = v.next)
	        if (v.name == varname) return true;
	      return false;
	    }
	    var state = cx.state;
	    cx.marked = "def";
	    if (state.context) {
	      if (inList(state.localVars)) return;
	      state.localVars = {name: varname, next: state.localVars};
	    } else {
	      if (inList(state.globalVars)) return;
	      if (parserConfig.globalVars)
	        state.globalVars = {name: varname, next: state.globalVars};
	    }
	  }

	  function isModifier(name) {
	    return name == "public" || name == "private" || name == "protected" || name == "abstract" || name == "readonly"
	  }

	  // Combinators

	  var defaultVars = {name: "this", next: {name: "arguments"}};
	  function pushcontext() {
	    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
	    cx.state.localVars = defaultVars;
	  }
	  function popcontext() {
	    cx.state.localVars = cx.state.context.vars;
	    cx.state.context = cx.state.context.prev;
	  }
	  function pushlex(type, info) {
	    var result = function() {
	      var state = cx.state, indent = state.indented;
	      if (state.lexical.type == "stat") indent = state.lexical.indented;
	      else for (var outer = state.lexical; outer && outer.type == ")" && outer.align; outer = outer.prev)
	        indent = outer.indented;
	      state.lexical = new JSLexical(indent, cx.stream.column(), type, null, state.lexical, info);
	    };
	    result.lex = true;
	    return result;
	  }
	  function poplex() {
	    var state = cx.state;
	    if (state.lexical.prev) {
	      if (state.lexical.type == ")")
	        state.indented = state.lexical.indented;
	      state.lexical = state.lexical.prev;
	    }
	  }
	  poplex.lex = true;

	  function expect(wanted) {
	    function exp(type) {
	      if (type == wanted) return cont();
	      else if (wanted == ";") return pass();
	      else return cont(exp);
	    }    return exp;
	  }

	  function statement(type, value) {
	    if (type == "var") return cont(pushlex("vardef", value.length), vardef, expect(";"), poplex);
	    if (type == "keyword a") return cont(pushlex("form"), parenExpr, statement, poplex);
	    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
	    if (type == "keyword d") return cx.stream.match(/^\s*$/, false) ? cont() : cont(pushlex("stat"), maybeexpression, expect(";"), poplex);
	    if (type == "debugger") return cont(expect(";"));
	    if (type == "{") return cont(pushlex("}"), block, poplex);
	    if (type == ";") return cont();
	    if (type == "if") {
	      if (cx.state.lexical.info == "else" && cx.state.cc[cx.state.cc.length - 1] == poplex)
	        cx.state.cc.pop()();
	      return cont(pushlex("form"), parenExpr, statement, poplex, maybeelse);
	    }
	    if (type == "function") return cont(functiondef);
	    if (type == "for") return cont(pushlex("form"), forspec, statement, poplex);
	    if (type == "class" || (isTS && value == "interface")) { cx.marked = "keyword"; return cont(pushlex("form"), className, poplex); }
	    if (type == "variable") {
	      if (isTS && value == "declare") {
	        cx.marked = "keyword";
	        return cont(statement)
	      } else if (isTS && (value == "module" || value == "enum" || value == "type") && cx.stream.match(/^\s*\w/, false)) {
	        cx.marked = "keyword";
	        if (value == "enum") return cont(enumdef);
	        else if (value == "type") return cont(typeexpr, expect("operator"), typeexpr, expect(";"));
	        else return cont(pushlex("form"), pattern, expect("{"), pushlex("}"), block, poplex, poplex)
	      } else if (isTS && value == "namespace") {
	        cx.marked = "keyword";
	        return cont(pushlex("form"), expression, block, poplex)
	      } else if (isTS && value == "abstract") {
	        cx.marked = "keyword";
	        return cont(statement)
	      } else {
	        return cont(pushlex("stat"), maybelabel);
	      }
	    }
	    if (type == "switch") return cont(pushlex("form"), parenExpr, expect("{"), pushlex("}", "switch"),
	                                      block, poplex, poplex);
	    if (type == "case") return cont(expression, expect(":"));
	    if (type == "default") return cont(expect(":"));
	    if (type == "catch") return cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"),
	                                     statement, poplex, popcontext);
	    if (type == "export") return cont(pushlex("stat"), afterExport, poplex);
	    if (type == "import") return cont(pushlex("stat"), afterImport, poplex);
	    if (type == "async") return cont(statement)
	    if (value == "@") return cont(expression, statement)
	    return pass(pushlex("stat"), expression, expect(";"), poplex);
	  }
	  function expression(type, value) {
	    return expressionInner(type, value, false);
	  }
	  function expressionNoComma(type, value) {
	    return expressionInner(type, value, true);
	  }
	  function parenExpr(type) {
	    if (type != "(") return pass()
	    return cont(pushlex(")"), expression, expect(")"), poplex)
	  }
	  function expressionInner(type, value, noComma) {
	    if (cx.state.fatArrowAt == cx.stream.start) {
	      var body = noComma ? arrowBodyNoComma : arrowBody;
	      if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, expect("=>"), body, popcontext);
	      else if (type == "variable") return pass(pushcontext, pattern, expect("=>"), body, popcontext);
	    }

	    var maybeop = noComma ? maybeoperatorNoComma : maybeoperatorComma;
	    if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
	    if (type == "function") return cont(functiondef, maybeop);
	    if (type == "class" || (isTS && value == "interface")) { cx.marked = "keyword"; return cont(pushlex("form"), classExpression, poplex); }
	    if (type == "keyword c" || type == "async") return cont(noComma ? expressionNoComma : expression);
	    if (type == "(") return cont(pushlex(")"), maybeexpression, expect(")"), poplex, maybeop);
	    if (type == "operator" || type == "spread") return cont(noComma ? expressionNoComma : expression);
	    if (type == "[") return cont(pushlex("]"), arrayLiteral, poplex, maybeop);
	    if (type == "{") return contCommasep(objprop, "}", null, maybeop);
	    if (type == "quasi") return pass(quasi, maybeop);
	    if (type == "new") return cont(maybeTarget(noComma));
	    if (type == "import") return cont(expression);
	    return cont();
	  }
	  function maybeexpression(type) {
	    if (type.match(/[;\}\)\],]/)) return pass();
	    return pass(expression);
	  }

	  function maybeoperatorComma(type, value) {
	    if (type == ",") return cont(expression);
	    return maybeoperatorNoComma(type, value, false);
	  }
	  function maybeoperatorNoComma(type, value, noComma) {
	    var me = noComma == false ? maybeoperatorComma : maybeoperatorNoComma;
	    var expr = noComma == false ? expression : expressionNoComma;
	    if (type == "=>") return cont(pushcontext, noComma ? arrowBodyNoComma : arrowBody, popcontext);
	    if (type == "operator") {
	      if (/\+\+|--/.test(value) || isTS && value == "!") return cont(me);
	      if (isTS && value == "<" && cx.stream.match(/^([^>]|<.*?>)*>\s*\(/, false))
	        return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, me);
	      if (value == "?") return cont(expression, expect(":"), expr);
	      return cont(expr);
	    }
	    if (type == "quasi") { return pass(quasi, me); }
	    if (type == ";") return;
	    if (type == "(") return contCommasep(expressionNoComma, ")", "call", me);
	    if (type == ".") return cont(property, me);
	    if (type == "[") return cont(pushlex("]"), maybeexpression, expect("]"), poplex, me);
	    if (isTS && value == "as") { cx.marked = "keyword"; return cont(typeexpr, me) }
	    if (type == "regexp") {
	      cx.state.lastType = cx.marked = "operator";
	      cx.stream.backUp(cx.stream.pos - cx.stream.start - 1);
	      return cont(expr)
	    }
	  }
	  function quasi(type, value) {
	    if (type != "quasi") return pass();
	    if (value.slice(value.length - 2) != "${") return cont(quasi);
	    return cont(expression, continueQuasi);
	  }
	  function continueQuasi(type) {
	    if (type == "}") {
	      cx.marked = "string-2";
	      cx.state.tokenize = tokenQuasi;
	      return cont(quasi);
	    }
	  }
	  function arrowBody(type) {
	    findFatArrow(cx.stream, cx.state);
	    return pass(type == "{" ? statement : expression);
	  }
	  function arrowBodyNoComma(type) {
	    findFatArrow(cx.stream, cx.state);
	    return pass(type == "{" ? statement : expressionNoComma);
	  }
	  function maybeTarget(noComma) {
	    return function(type) {
	      if (type == ".") return cont(noComma ? targetNoComma : target);
	      else if (type == "variable" && isTS) return cont(maybeTypeArgs, noComma ? maybeoperatorNoComma : maybeoperatorComma)
	      else return pass(noComma ? expressionNoComma : expression);
	    };
	  }
	  function target(_, value) {
	    if (value == "target") { cx.marked = "keyword"; return cont(maybeoperatorComma); }
	  }
	  function targetNoComma(_, value) {
	    if (value == "target") { cx.marked = "keyword"; return cont(maybeoperatorNoComma); }
	  }
	  function maybelabel(type) {
	    if (type == ":") return cont(poplex, statement);
	    return pass(maybeoperatorComma, expect(";"), poplex);
	  }
	  function property(type) {
	    if (type == "variable") {cx.marked = "property"; return cont();}
	  }
	  function objprop(type, value) {
	    if (type == "async") {
	      cx.marked = "property";
	      return cont(objprop);
	    } else if (type == "variable" || cx.style == "keyword") {
	      cx.marked = "property";
	      if (value == "get" || value == "set") return cont(getterSetter);
	      var m; // Work around fat-arrow-detection complication for detecting typescript typed arrow params
	      if (isTS && cx.state.fatArrowAt == cx.stream.start && (m = cx.stream.match(/^\s*:\s*/, false)))
	        cx.state.fatArrowAt = cx.stream.pos + m[0].length;
	      return cont(afterprop);
	    } else if (type == "number" || type == "string") {
	      cx.marked = jsonldMode ? "property" : (cx.style + " property");
	      return cont(afterprop);
	    } else if (type == "jsonld-keyword") {
	      return cont(afterprop);
	    } else if (isTS && isModifier(value)) {
	      cx.marked = "keyword";
	      return cont(objprop)
	    } else if (type == "[") {
	      return cont(expression, maybetype, expect("]"), afterprop);
	    } else if (type == "spread") {
	      return cont(expressionNoComma, afterprop);
	    } else if (value == "*") {
	      cx.marked = "keyword";
	      return cont(objprop);
	    } else if (type == ":") {
	      return pass(afterprop)
	    }
	  }
	  function getterSetter(type) {
	    if (type != "variable") return pass(afterprop);
	    cx.marked = "property";
	    return cont(functiondef);
	  }
	  function afterprop(type) {
	    if (type == ":") return cont(expressionNoComma);
	    if (type == "(") return pass(functiondef);
	  }
	  function commasep(what, end, sep) {
	    function proceed(type, value) {
	      if (sep ? sep.indexOf(type) > -1 : type == ",") {
	        var lex = cx.state.lexical;
	        if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
	        return cont(function(type, value) {
	          if (type == end || value == end) return pass()
	          return pass(what)
	        }, proceed);
	      }
	      if (type == end || value == end) return cont();
	      return cont(expect(end));
	    }
	    return function(type, value) {
	      if (type == end || value == end) return cont();
	      return pass(what, proceed);
	    };
	  }
	  function contCommasep(what, end, info) {
	    for (var i = 3; i < arguments.length; i++)
	      cx.cc.push(arguments[i]);
	    return cont(pushlex(end, info), commasep(what, end), poplex);
	  }
	  function block(type) {
	    if (type == "}") return cont();
	    return pass(statement, block);
	  }
	  function maybetype(type, value) {
	    if (isTS) {
	      if (type == ":") return cont(typeexpr);
	      if (value == "?") return cont(maybetype);
	    }
	  }
	  function mayberettype(type) {
	    if (isTS && type == ":") {
	      if (cx.stream.match(/^\s*\w+\s+is\b/, false)) return cont(expression, isKW, typeexpr)
	      else return cont(typeexpr)
	    }
	  }
	  function isKW(_, value) {
	    if (value == "is") {
	      cx.marked = "keyword";
	      return cont()
	    }
	  }
	  function typeexpr(type, value) {
	    if (value == "keyof" || value == "typeof") {
	      cx.marked = "keyword";
	      return cont(value == "keyof" ? typeexpr : expressionNoComma)
	    }
	    if (type == "variable" || value == "void") {
	      cx.marked = "type";
	      return cont(afterType)
	    }
	    if (type == "string" || type == "number" || type == "atom") return cont(afterType);
	    if (type == "[") return cont(pushlex("]"), commasep(typeexpr, "]", ","), poplex, afterType)
	    if (type == "{") return cont(pushlex("}"), commasep(typeprop, "}", ",;"), poplex, afterType)
	    if (type == "(") return cont(commasep(typearg, ")"), maybeReturnType)
	    if (type == "<") return cont(commasep(typeexpr, ">"), typeexpr)
	  }
	  function maybeReturnType(type) {
	    if (type == "=>") return cont(typeexpr)
	  }
	  function typeprop(type, value) {
	    if (type == "variable" || cx.style == "keyword") {
	      cx.marked = "property";
	      return cont(typeprop)
	    } else if (value == "?") {
	      return cont(typeprop)
	    } else if (type == ":") {
	      return cont(typeexpr)
	    } else if (type == "[") {
	      return cont(expression, maybetype, expect("]"), typeprop)
	    }
	  }
	  function typearg(type, value) {
	    if (type == "variable" && cx.stream.match(/^\s*[?:]/, false) || value == "?") return cont(typearg)
	    if (type == ":") return cont(typeexpr)
	    return pass(typeexpr)
	  }
	  function afterType(type, value) {
	    if (value == "<") return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, afterType)
	    if (value == "|" || type == "." || value == "&") return cont(typeexpr)
	    if (type == "[") return cont(expect("]"), afterType)
	    if (value == "extends" || value == "implements") { cx.marked = "keyword"; return cont(typeexpr) }
	  }
	  function maybeTypeArgs(_, value) {
	    if (value == "<") return cont(pushlex(">"), commasep(typeexpr, ">"), poplex, afterType)
	  }
	  function typeparam() {
	    return pass(typeexpr, maybeTypeDefault)
	  }
	  function maybeTypeDefault(_, value) {
	    if (value == "=") return cont(typeexpr)
	  }
	  function vardef(_, value) {
	    if (value == "enum") {cx.marked = "keyword"; return cont(enumdef)}
	    return pass(pattern, maybetype, maybeAssign, vardefCont);
	  }
	  function pattern(type, value) {
	    if (isTS && isModifier(value)) { cx.marked = "keyword"; return cont(pattern) }
	    if (type == "variable") { register(value); return cont(); }
	    if (type == "spread") return cont(pattern);
	    if (type == "[") return contCommasep(pattern, "]");
	    if (type == "{") return contCommasep(proppattern, "}");
	  }
	  function proppattern(type, value) {
	    if (type == "variable" && !cx.stream.match(/^\s*:/, false)) {
	      register(value);
	      return cont(maybeAssign);
	    }
	    if (type == "variable") cx.marked = "property";
	    if (type == "spread") return cont(pattern);
	    if (type == "}") return pass();
	    return cont(expect(":"), pattern, maybeAssign);
	  }
	  function maybeAssign(_type, value) {
	    if (value == "=") return cont(expressionNoComma);
	  }
	  function vardefCont(type) {
	    if (type == ",") return cont(vardef);
	  }
	  function maybeelse(type, value) {
	    if (type == "keyword b" && value == "else") return cont(pushlex("form", "else"), statement, poplex);
	  }
	  function forspec(type, value) {
	    if (value == "await") return cont(forspec);
	    if (type == "(") return cont(pushlex(")"), forspec1, expect(")"), poplex);
	  }
	  function forspec1(type) {
	    if (type == "var") return cont(vardef, expect(";"), forspec2);
	    if (type == ";") return cont(forspec2);
	    if (type == "variable") return cont(formaybeinof);
	    return pass(expression, expect(";"), forspec2);
	  }
	  function formaybeinof(_type, value) {
	    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
	    return cont(maybeoperatorComma, forspec2);
	  }
	  function forspec2(type, value) {
	    if (type == ";") return cont(forspec3);
	    if (value == "in" || value == "of") { cx.marked = "keyword"; return cont(expression); }
	    return pass(expression, expect(";"), forspec3);
	  }
	  function forspec3(type) {
	    if (type != ")") cont(expression);
	  }
	  function functiondef(type, value) {
	    if (value == "*") {cx.marked = "keyword"; return cont(functiondef);}
	    if (type == "variable") {register(value); return cont(functiondef);}
	    if (type == "(") return cont(pushcontext, pushlex(")"), commasep(funarg, ")"), poplex, mayberettype, statement, popcontext);
	    if (isTS && value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, functiondef)
	  }
	  function funarg(type, value) {
	    if (value == "@") cont(expression, funarg);
	    if (type == "spread") return cont(funarg);
	    if (isTS && isModifier(value)) { cx.marked = "keyword"; return cont(funarg); }
	    return pass(pattern, maybetype, maybeAssign);
	  }
	  function classExpression(type, value) {
	    // Class expressions may have an optional name.
	    if (type == "variable") return className(type, value);
	    return classNameAfter(type, value);
	  }
	  function className(type, value) {
	    if (type == "variable") {register(value); return cont(classNameAfter);}
	  }
	  function classNameAfter(type, value) {
	    if (value == "<") return cont(pushlex(">"), commasep(typeparam, ">"), poplex, classNameAfter)
	    if (value == "extends" || value == "implements" || (isTS && type == ",")) {
	      if (value == "implements") cx.marked = "keyword";
	      return cont(isTS ? typeexpr : expression, classNameAfter);
	    }
	    if (type == "{") return cont(pushlex("}"), classBody, poplex);
	  }
	  function classBody(type, value) {
	    if (type == "async" ||
	        (type == "variable" &&
	         (value == "static" || value == "get" || value == "set" || (isTS && isModifier(value))) &&
	         cx.stream.match(/^\s+[\w$\xa1-\uffff]/, false))) {
	      cx.marked = "keyword";
	      return cont(classBody);
	    }
	    if (type == "variable" || cx.style == "keyword") {
	      cx.marked = "property";
	      return cont(isTS ? classfield : functiondef, classBody);
	    }
	    if (type == "[")
	      return cont(expression, maybetype, expect("]"), isTS ? classfield : functiondef, classBody)
	    if (value == "*") {
	      cx.marked = "keyword";
	      return cont(classBody);
	    }
	    if (type == ";") return cont(classBody);
	    if (type == "}") return cont();
	    if (value == "@") return cont(expression, classBody)
	  }
	  function classfield(type, value) {
	    if (value == "?") return cont(classfield)
	    if (type == ":") return cont(typeexpr, maybeAssign)
	    if (value == "=") return cont(expressionNoComma)
	    return pass(functiondef)
	  }
	  function afterExport(type, value) {
	    if (value == "*") { cx.marked = "keyword"; return cont(maybeFrom, expect(";")); }
	    if (value == "default") { cx.marked = "keyword"; return cont(expression, expect(";")); }
	    if (type == "{") return cont(commasep(exportField, "}"), maybeFrom, expect(";"));
	    return pass(statement);
	  }
	  function exportField(type, value) {
	    if (value == "as") { cx.marked = "keyword"; return cont(expect("variable")); }
	    if (type == "variable") return pass(expressionNoComma, exportField);
	  }
	  function afterImport(type) {
	    if (type == "string") return cont();
	    if (type == "(") return pass(expression);
	    return pass(importSpec, maybeMoreImports, maybeFrom);
	  }
	  function importSpec(type, value) {
	    if (type == "{") return contCommasep(importSpec, "}");
	    if (type == "variable") register(value);
	    if (value == "*") cx.marked = "keyword";
	    return cont(maybeAs);
	  }
	  function maybeMoreImports(type) {
	    if (type == ",") return cont(importSpec, maybeMoreImports)
	  }
	  function maybeAs(_type, value) {
	    if (value == "as") { cx.marked = "keyword"; return cont(importSpec); }
	  }
	  function maybeFrom(_type, value) {
	    if (value == "from") { cx.marked = "keyword"; return cont(expression); }
	  }
	  function arrayLiteral(type) {
	    if (type == "]") return cont();
	    return pass(commasep(expressionNoComma, "]"));
	  }
	  function enumdef() {
	    return pass(pushlex("form"), pattern, expect("{"), pushlex("}"), commasep(enummember, "}"), poplex, poplex)
	  }
	  function enummember() {
	    return pass(pattern, maybeAssign);
	  }

	  function isContinuedStatement(state, textAfter) {
	    return state.lastType == "operator" || state.lastType == "," ||
	      isOperatorChar.test(textAfter.charAt(0)) ||
	      /[,.]/.test(textAfter.charAt(0));
	  }

	  function expressionAllowed(stream, state, backUp) {
	    return state.tokenize == tokenBase &&
	      /^(?:operator|sof|keyword [bcd]|case|new|export|default|spread|[\[{}\(,;:]|=>)$/.test(state.lastType) ||
	      (state.lastType == "quasi" && /\{\s*$/.test(stream.string.slice(0, stream.pos - (backUp || 0))))
	  }

	  // Interface

	  return {
	    startState: function(basecolumn) {
	      var state = {
	        tokenize: tokenBase,
	        lastType: "sof",
	        cc: [],
	        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
	        localVars: parserConfig.localVars,
	        context: parserConfig.localVars && {vars: parserConfig.localVars},
	        indented: basecolumn || 0
	      };
	      if (parserConfig.globalVars && typeof parserConfig.globalVars == "object")
	        state.globalVars = parserConfig.globalVars;
	      return state;
	    },

	    token: function(stream, state) {
	      if (stream.sol()) {
	        if (!state.lexical.hasOwnProperty("align"))
	          state.lexical.align = false;
	        state.indented = stream.indentation();
	        findFatArrow(stream, state);
	      }
	      if (state.tokenize != tokenComment && stream.eatSpace()) return null;
	      var style = state.tokenize(stream, state);
	      if (type == "comment") return style;
	      state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
	      return parseJS(state, style, type, content, stream);
	    },

	    indent: function(state, textAfter) {
	      if (state.tokenize == tokenComment) return -1;
	      if (state.tokenize != tokenBase) return 0;
	      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical, top;
	      // Kludge to prevent 'maybeelse' from blocking lexical scope pops
	      if (!/^\s*else\b/.test(textAfter)) for (var i = state.cc.length - 1; i >= 0; --i) {
	        var c = state.cc[i];
	        if (c == poplex) lexical = lexical.prev;
	        else if (c != maybeelse) break;
	      }
	      while ((lexical.type == "stat" || lexical.type == "form") &&
	             (firstChar == "}" || ((top = state.cc[state.cc.length - 1]) &&
	                                   (top == maybeoperatorComma || top == maybeoperatorNoComma) &&
	                                   !/^[,\.=+\-*:?[\(]/.test(textAfter))))
	        lexical = lexical.prev;
	      if (statementIndent && lexical.type == ")" && lexical.prev.type == "stat")
	        lexical = lexical.prev;
	      var type = lexical.type, closing = firstChar == type;

	      if (type == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? lexical.info + 1 : 0);
	      else if (type == "form" && firstChar == "{") return lexical.indented;
	      else if (type == "form") return lexical.indented + indentUnit;
	      else if (type == "stat")
	        return lexical.indented + (isContinuedStatement(state, textAfter) ? statementIndent || indentUnit : 0);
	      else if (lexical.info == "switch" && !closing && parserConfig.doubleIndentSwitch != false)
	        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
	      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
	      else return lexical.indented + (closing ? 0 : indentUnit);
	    },

	    electricInput: /^\s*(?:case .*?:|default:|\{|\})$/,
	    blockCommentStart: jsonMode ? null : "/*",
	    blockCommentEnd: jsonMode ? null : "*/",
	    blockCommentContinue: jsonMode ? null : " * ",
	    lineComment: jsonMode ? null : "//",
	    fold: "brace",
	    closeBrackets: "()[]{}''\"\"``",

	    helperType: jsonMode ? "json" : "javascript",
	    jsonldMode: jsonldMode,
	    jsonMode: jsonMode,

	    expressionAllowed: expressionAllowed,

	    skipExpression: function(state) {
	      var top = state.cc[state.cc.length - 1];
	      if (top == expression || top == expressionNoComma) state.cc.pop();
	    }
	  };
	}

	/*
	CodeMirror.registerHelper("wordChars", "javascript", /[\w$]/);

	CodeMirror.defineMIME("text/javascript", "javascript");
	CodeMirror.defineMIME("text/ecmascript", "javascript");
	CodeMirror.defineMIME("application/javascript", "javascript");
	CodeMirror.defineMIME("application/x-javascript", "javascript");
	CodeMirror.defineMIME("application/ecmascript", "javascript");
	CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
	CodeMirror.defineMIME("application/x-json", {name: "javascript", json: true});
	CodeMirror.defineMIME("application/ld+json", {name: "javascript", jsonld: true});
	CodeMirror.defineMIME("text/typescript", { name: "javascript", typescript: true });
	CodeMirror.defineMIME("application/typescript", { name: "javascript", typescript: true });
	*/

	var specialChars = createCommonjsModule(function (module, exports) {
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





	exports.specialChars = src$2.ViewExtension.unique(function (configs) {
	    // FIXME make configurations compose properly
	    var config = extension.combineConfig(configs, {
	        render: null,
	        specialChars: SPECIALS,
	        addSpecialChars: null
	    });
	    return new src$2.ViewField({
	        create: function (view) { return new SpecialCharHighlighter(view, config); },
	        update: function (self, update) { return self.update(update); },
	        effects: [src$2.ViewField.decorationEffect(function (self) { return self.decorations; })]
	    }).extension;
	}, {});
	var JOIN_GAP = 10;
	var SpecialCharHighlighter = /** @class */ (function () {
	    function SpecialCharHighlighter(view, options) {
	        this.view = view;
	        this.options = options;
	        this.decorations = src$2.Decoration.none;
	        this.from = 0;
	        this.to = 0;
	        this.updateForViewport();
	        this.specials = options.specialChars;
	        if (options.addSpecialChars)
	            this.specials = new RegExp(this.specials.source + "|" + options.addSpecialChars.source, "gu");
	        var styles = document.body.style;
	        if (this.replaceTabs = (styles.tabSize || styles.MozTabSize) == null)
	            this.specials = new RegExp("\t|" + this.specials.source, "gu");
	    }
	    SpecialCharHighlighter.prototype.update = function (update) {
	        if (this.replaceTabs && update.transactions.some(function (tr) { return tr.getMeta(src$1.Transaction.changeTabSize) != null; })) {
	            this.decorations = src$2.Decoration.none;
	            this.from = this.to = 0;
	        }
	        else {
	            if (update.changes.length) {
	                this.decorations = this.decorations.map(update.changes);
	                this.from = update.changes.mapPos(this.from, 1);
	                this.to = update.changes.mapPos(this.to, -1);
	                this.closeHoles(update.changes.changedRanges());
	            }
	        }
	        this.updateForViewport();
	        return this;
	    };
	    SpecialCharHighlighter.prototype.closeHoles = function (ranges) {
	        var decorations = [], vp = this.view.viewport, replaced = [];
	        for (var i = 0; i < ranges.length; i++) {
	            var _a = ranges[i], from = _a.fromB, to = _a.toB;
	            // Must redraw all tabs further on the line
	            if (this.replaceTabs)
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
	            this.decorations = this.decorations.update(decorations, function (pos) {
	                for (var i = 0; i < replaced.length; i += 2)
	                    if (pos >= replaced[i] && pos < replaced[i + 1])
	                        return false;
	                return true;
	            }, replaced[0], replaced[replaced.length - 1]);
	    };
	    SpecialCharHighlighter.prototype.updateForViewport = function () {
	        var vp = this.view.viewport;
	        // Viewports match, don't do anything
	        if (this.from == vp.from && this.to == vp.to)
	            return;
	        var decorations = [];
	        if (this.from >= vp.to || this.to <= vp.from) {
	            this.getDecorationsFor(vp.from, vp.to, decorations);
	            this.decorations = src$2.Decoration.set(decorations);
	        }
	        else {
	            if (vp.from < this.from)
	                this.getDecorationsFor(vp.from, this.from, decorations);
	            if (this.to < vp.to)
	                this.getDecorationsFor(this.to, vp.to, decorations);
	            this.decorations = this.decorations.update(decorations, function (from, to) { return from >= vp.from && to <= vp.to; });
	        }
	        this.from = vp.from;
	        this.to = vp.to;
	    };
	    SpecialCharHighlighter.prototype.getDecorationsFor = function (from, to, target) {
	        var doc = this.view.state.doc;
	        for (var pos = from, cursor = doc.iterRange(from, to), m = void 0; !cursor.next().done;) {
	            if (!cursor.lineBreak) {
	                while (m = SPECIALS.exec(cursor.value)) {
	                    var code = m[0].codePointAt ? m[0].codePointAt(0) : m[0].charCodeAt(0), widget = void 0;
	                    if (code == null)
	                        continue;
	                    if (code == 9) {
	                        var line = doc.lineAt(pos + m.index);
	                        var size = this.view.state.tabSize, col = src.countColumn(doc.slice(line.start, pos + m.index), 0, size);
	                        widget = new TabWidget((size - (col % size)) * this.view.defaultCharacterWidth);
	                    }
	                    else {
	                        widget = new SpecialCharWidget(this.options, code);
	                    }
	                    target.push(src$2.Decoration.replace(pos + m.index, pos + m.index + m[0].length, { widget: widget }));
	                }
	            }
	            pos += cursor.value.length;
	        }
	    };
	    Object.defineProperty(SpecialCharHighlighter.prototype, "styles", {
	        get: function () { return style; },
	        enumerable: true,
	        configurable: true
	    });
	    return SpecialCharHighlighter;
	}());
	// FIXME configurable
	var SPECIALS = /[\u0000-\u0008\u000a-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff]/gu;
	var NAMES = {
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
	    65279: "zero width no-break space"
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
	var DEFAULT_PLACEHOLDER = "\u2022";
	var SpecialCharWidget = /** @class */ (function (_super) {
	    __extends(SpecialCharWidget, _super);
	    function SpecialCharWidget(options, code) {
	        var _this = _super.call(this, code) || this;
	        _this.options = options;
	        return _this;
	    }
	    SpecialCharWidget.prototype.toDOM = function () {
	        var ph = placeHolder(this.value) || DEFAULT_PLACEHOLDER;
	        var desc = "Control character " + (NAMES[this.value] || this.value);
	        var custom = this.options.render && this.options.render(this.value, desc, ph);
	        if (custom)
	            return custom;
	        var span = document.createElement("span");
	        span.textContent = ph;
	        span.title = desc;
	        span.setAttribute("aria-label", desc);
	        span.style.color = "red";
	        return span;
	    };
	    SpecialCharWidget.prototype.ignoreEvent = function () { return false; };
	    return SpecialCharWidget;
	}(src$2.WidgetType));
	var TabWidget = /** @class */ (function (_super) {
	    __extends(TabWidget, _super);
	    function TabWidget() {
	        return _super !== null && _super.apply(this, arguments) || this;
	    }
	    TabWidget.prototype.toDOM = function () {
	        var span = document.createElement("span");
	        span.textContent = "\t";
	        span.className = style.tab;
	        span.style.width = this.value + "px";
	        return span;
	    };
	    TabWidget.prototype.ignoreEvent = function () { return false; };
	    return TabWidget;
	}(src$2.WidgetType));
	var style = new styleMod.StyleModule({
	    tab: {
	        display: "inline-block",
	        overflow: "hidden",
	        verticalAlign: "bottom"
	    }
	});
	});

	unwrapExports(specialChars);
	var specialChars_1 = specialChars.specialChars;

	var multipleSelections = createCommonjsModule(function (module, exports) {
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



	exports.multipleSelections = src$1.StateExtension.unique(function (configs) {
	    var rangeConfig = { class: styles.secondarySelection }; // FIXME configurable?
	    return src$1.StateExtension.all(src$1.StateExtension.allowMultipleSelections(true), src$2.ViewField.decorations({
	        create: function (view) { return decorateSelections(view.state, rangeConfig); },
	        update: function (deco, _a) {
	            var prevState = _a.prevState, state = _a.state;
	            return prevState.doc == state.doc && prevState.selection.eq(state.selection)
	                ? deco : decorateSelections(state, rangeConfig);
	        }
	    }), src$2.styleModule(styles));
	}, {});
	var CursorWidget = /** @class */ (function (_super) {
	    __extends(CursorWidget, _super);
	    function CursorWidget() {
	        return _super !== null && _super.apply(this, arguments) || this;
	    }
	    CursorWidget.prototype.toDOM = function () {
	        var span = document.createElement("span");
	        span.className = styles.secondaryCursor;
	        return span;
	    };
	    return CursorWidget;
	}(src$2.WidgetType));
	function decorateSelections(state, rangeConfig) {
	    var _a = state.selection, ranges = _a.ranges, primaryIndex = _a.primaryIndex;
	    if (ranges.length == 1)
	        return src$2.Decoration.none;
	    var deco = [];
	    for (var i = 0; i < ranges.length; i++)
	        if (i != primaryIndex) {
	            var range = ranges[i];
	            deco.push(range.empty ? src$2.Decoration.widget(range.from, { widget: new CursorWidget(null) })
	                : src$2.Decoration.mark(ranges[i].from, ranges[i].to, rangeConfig));
	        }
	    return src$2.Decoration.set(deco);
	}
	var styles = new styleMod.StyleModule({
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
	});

	unwrapExports(multipleSelections);
	var multipleSelections_1 = multipleSelections.multipleSelections;

	var libBin = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });












	exports.default = {
	    EditorState: src$1.EditorState,
	    EditorView: src$2.EditorView,
	    EditorSelection: src$1.EditorSelection,
	    keymap: keymap.keymap,
	    history: history.history,
	    redo: history.redo,
	    redoSelection: history.redoSelection,
	    undo: history.undo,
	    undoSelection: history.undoSelection,
	    lineNumbers: src$3.lineNumbers,
	    baseKeymap: commands.baseKeymap,
	    indentSelection: commands.indentSelection,
	    legacyMode: src$4.legacyMode,
	    matchBrackets: matchbrackets.matchBrackets,
	    javascript: javascript_1,
	    specialChars: specialChars.specialChars,
	    multipleSelections: multipleSelections.multipleSelections,
	    text: src.Text
	};
	});

	var libCM = unwrapExports(libBin);

	function levenshtein(s, t) {
	    if (s === t) {
	        return 0;
	    }
	    var n = s.length;
	    var m = t.length;
	    if (n === 0 || m === 0) {
	        return n + m;
	    }
	    var x = 0;
	    var y;
	    var a;
	    var b;
	    var c;
	    var d;
	    var g;
	    var h;
	    var k;
	    var p = new Array(n);
	    for (y = 0; y < n;) {
	        p[y] = ++y;
	    }

	    for (; (x + 3) < m; x += 4) {
	        var e1 = t.charCodeAt(x);
	        var e2 = t.charCodeAt(x + 1);
	        var e3 = t.charCodeAt(x + 2);
	        var e4 = t.charCodeAt(x + 3);
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
	        var e = t.charCodeAt(x);
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
			var scores = [
				["", Number.MAX_SAFE_INTEGER],
				["", Number.MAX_SAFE_INTEGER],
				["", Number.MAX_SAFE_INTEGER]
			];
			this.set.forEach(token => {
				if (token == "") return
				var length = currentWord.length;
				var truncated = token.substring(0, length);
				var score = levenshtein(truncated, currentWord);
				scores.push([token, score]);
			});
			scores.sort((a, b) => a[1] - b[1]);
			return scores.slice(0, 3).map(x => x[0])
		}

		getLastToken() {
			if (window.view.state.doc.toString() == "") return ""
			var index = window.view.state.selection.ranges[0].anchor;
			var content = window.view.state.doc.toString();

			var out = "";
			for (var i = 1; true; i++) {
				var newI = index - i;

				if (newI == 0) break
				if (newI < 0) {
					newI = content.length - 1;
				}
				var letter = content[newI];

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
			var content = window.view.state.doc.toString();

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
			var index = window.view.state.selection.ranges[0].anchor;
			var content = window.view.state.doc.toString();

			var out = "";
			for (var i = 1; true; i++) {
				var newI = index - i;

				if (newI == 0) break
				if (newI < 0) {
					newI = content.length - 1;
				}
				var letter = content[newI];

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
			var content = window.view.state.doc.toString();

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
			var exportGlobal = (name, object) => {
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
			var name = notification.name;
			this.observers.forEach((o, i) => {
				if (o[0] == name) {
					o[1](notification.object);
				}
			});
		}
	}

	var NotificationCenter = new Center();
	var Notification = BroadcastJSNotification;

	class BufferCenter {
		constructor() {
			this.buffers = [];
		}
		get default() {
			var exportGlobal = (name, object) => {
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
				var args = task.slice().splice(1, 2);
				ctx[task[0]](...args);
			});
			this.buffers = [];
		}
	}

	var BufferCenter$1 = new BufferCenter();

	/**
	 * Check if given code is a number
	 */
	function isNumber(code) {
	    return code > 47 && code < 58;
	}
	/**
	 * Check if given character code is alpha code (letter through A to Z)
	 */
	function isAlpha(code, from, to) {
	    from = from || 65; // A
	    to = to || 90; // Z
	    code &= ~32; // quick hack to convert any char code to uppercase char code
	    return code >= from && code <= to;
	}
	/**
	 * Check if given character code is a white-space character: a space character
	 * or line breaks
	 */
	function isWhiteSpace(code) {
	    return code === 32 /* space */
	        || code === 9 /* tab */
	        || code === 160; /* non-breaking space */
	}
	/**
	 * Check if given character code is a space character
	 */
	function isSpace(code) {
	    return isWhiteSpace(code)
	        || code === 10 /* LF */
	        || code === 13; /* CR */
	}
	/**
	 * Check if given character code is a quote character
	 */
	function isQuote(code) {
	    return code === 39 /* ' */ || code === 34 /* " */;
	}

	/**
	 * A streaming, character code-based string reader
	 */
	class Scanner {
	    constructor(str, start, end) {
	        if (end == null && typeof str === 'string') {
	            end = str.length;
	        }
	        this.string = str;
	        this.pos = this.start = start || 0;
	        this.end = end || 0;
	    }
	    /**
	     * Returns true only if the stream is at the end of the file.
	     */
	    eof() {
	        return this.pos >= this.end;
	    }
	    /**
	     * Creates a new stream instance which is limited to given `start` and `end`
	     * range. E.g. its `eof()` method will look at `end` property, not actual
	     * stream end
	     */
	    limit(start, end) {
	        return new Scanner(this.string, start, end);
	    }
	    /**
	     * Returns the next character code in the stream without advancing it.
	     * Will return NaN at the end of the file.
	     */
	    peek() {
	        return this.string.charCodeAt(this.pos);
	    }
	    /**
	     * Returns the next character in the stream and advances it.
	     * Also returns <code>undefined</code> when no more characters are available.
	     */
	    next() {
	        if (this.pos < this.string.length) {
	            return this.string.charCodeAt(this.pos++);
	        }
	    }
	    /**
	     * `match` can be a character code or a function that takes a character code
	     * and returns a boolean. If the next character in the stream 'matches'
	     * the given argument, it is consumed and returned.
	     * Otherwise, `false` is returned.
	     */
	    eat(match) {
	        var ch = this.peek();
	        var ok = typeof match === 'function' ? match(ch) : ch === match;
	        if (ok) {
	            this.next();
	        }
	        return ok;
	    }
	    /**
	     * Repeatedly calls <code>eat</code> with the given argument, until it
	     * fails. Returns <code>true</code> if any characters were eaten.
	     */
	    eatWhile(match) {
	        var start = this.pos;
	        while (!this.eof() && this.eat(match)) { /* */ }
	        return this.pos !== start;
	    }
	    /**
	     * Backs up the stream n characters. Backing it up further than the
	     * start of the current token will cause things to break, so be careful.
	     */
	    backUp(n) {
	        this.pos -= (n || 1);
	    }
	    /**
	     * Get the string between the start of the current token and the
	     * current stream position.
	     */
	    current() {
	        return this.substring(this.start, this.pos);
	    }
	    /**
	     * Returns substring for given range
	     */
	    substring(start, end) {
	        return this.string.slice(start, end);
	    }
	    /**
	     * Creates error object with current stream state
	     */
	    error(message, pos = this.pos) {
	        return new ScannerError(`${message} at ${pos + 1}`, pos, this.string);
	    }
	}
	class ScannerError extends Error {
	    constructor(message, pos, str) {
	        super(message);
	        this.pos = pos;
	        this.string = str;
	    }
	}

	function tokenScanner(tokens) {
	    return {
	        tokens,
	        start: 0,
	        pos: 0,
	        size: tokens.length
	    };
	}
	function peek(scanner) {
	    return scanner.tokens[scanner.pos];
	}
	function next(scanner) {
	    return scanner.tokens[scanner.pos++];
	}
	function slice(scanner, from = scanner.start, to = scanner.pos) {
	    return scanner.tokens.slice(from, to);
	}
	function readable(scanner) {
	    return scanner.pos < scanner.size;
	}
	function consume(scanner, test) {
	    var token = peek(scanner);
	    if (token && test(token)) {
	        scanner.pos++;
	        return true;
	    }
	    return false;
	}
	function error(scanner, message, token = peek(scanner)) {
	    if (token && token.start != null) {
	        message += ` at ${token.start}`;
	    }
	    var err = new Error(message);
	    err['pos'] = token && token.start;
	    return err;
	}

	function abbreviation(abbr, options = {}) {
	    var scanner = tokenScanner(abbr);
	    var result = statements(scanner, options);
	    if (readable(scanner)) {
	        throw error(scanner, 'Unexpected character');
	    }
	    return result;
	}
	function statements(scanner, options) {
	    var result = {
	        type: 'TokenGroup',
	        elements: []
	    };
	    var ctx = result;
	    var node;
	    var stack = [];
	    while (readable(scanner)) {
	        if (node = element(scanner, options) || group(scanner, options)) {
	            ctx.elements.push(node);
	            if (consume(scanner, isChildOperator)) {
	                stack.push(ctx);
	                ctx = node;
	            }
	            else if (consume(scanner, isSiblingOperator)) {
	                continue;
	            }
	            else if (consume(scanner, isClimbOperator)) {
	                do {
	                    if (stack.length) {
	                        ctx = stack.pop();
	                    }
	                } while (consume(scanner, isClimbOperator));
	            }
	        }
	        else {
	            break;
	        }
	    }
	    return result;
	}
	/**
	 * Consumes group from given scanner
	 */
	function group(scanner, options) {
	    if (consume(scanner, isGroupStart)) {
	        var result = statements(scanner, options);
	        var token = next(scanner);
	        if (isBracket(token, 'group', false)) {
	            result.repeat = repeater(scanner);
	            return result;
	        }
	        throw error(scanner, 'Expecting )', token);
	    }
	}
	/**
	 * Consumes single element from given scanner
	 */
	function element(scanner, options) {
	    var attr;
	    var elem = {
	        type: 'TokenElement',
	        name: void 0,
	        attributes: void 0,
	        value: void 0,
	        repeat: void 0,
	        selfClose: false,
	        elements: []
	    };
	    if (elementName(scanner, options)) {
	        elem.name = slice(scanner);
	    }
	    while (readable(scanner)) {
	        scanner.start = scanner.pos;
	        if (!elem.repeat && !isEmpty(elem) && consume(scanner, isRepeater)) {
	            elem.repeat = scanner.tokens[scanner.pos - 1];
	        }
	        else if (!elem.value && text$1(scanner)) {
	            elem.value = getText(scanner);
	        }
	        else if (attr = shortAttribute(scanner, 'id', options) || shortAttribute(scanner, 'class', options) || attributeSet(scanner)) {
	            if (!elem.attributes) {
	                elem.attributes = Array.isArray(attr) ? attr.slice() : [attr];
	            }
	            else {
	                elem.attributes = elem.attributes.concat(attr);
	            }
	        }
	        else {
	            if (!isEmpty(elem) && consume(scanner, isCloseOperator)) {
	                elem.selfClose = true;
	                if (!elem.repeat && consume(scanner, isRepeater)) {
	                    elem.repeat = scanner.tokens[scanner.pos - 1];
	                }
	            }
	            break;
	        }
	    }
	    return !isEmpty(elem) ? elem : void 0;
	}
	/**
	 * Consumes attribute set from given scanner
	 */
	function attributeSet(scanner) {
	    if (consume(scanner, isAttributeSetStart)) {
	        var attributes = [];
	        var attr;
	        while (readable(scanner)) {
	            if (attr = attribute(scanner)) {
	                attributes.push(attr);
	            }
	            else if (consume(scanner, isAttributeSetEnd)) {
	                break;
	            }
	            else if (!consume(scanner, isWhiteSpace$1)) {
	                throw error(scanner, `Unexpected "${peek(scanner).type}" token`);
	            }
	        }
	        return attributes;
	    }
	}
	/**
	 * Consumes attribute shorthand (class or id) from given scanner
	 */
	function shortAttribute(scanner, type, options) {
	    if (isOperator(peek(scanner), type)) {
	        scanner.pos++;
	        var attr = {
	            name: [createLiteral(type)]
	        };
	        // Consume expression after shorthand start for React-like components
	        if (options.jsx && text$1(scanner)) {
	            attr.value = getText(scanner);
	            attr.expression = true;
	        }
	        else {
	            attr.value = literal(scanner) ? slice(scanner) : void 0;
	        }
	        return attr;
	    }
	}
	/**
	 * Consumes single attribute from given scanner
	 */
	function attribute(scanner) {
	    if (quoted(scanner)) {
	        // Consumed quoted value: it’s a value for default attribute
	        return {
	            value: slice(scanner)
	        };
	    }
	    if (literal(scanner, true)) {
	        return {
	            name: slice(scanner),
	            value: consume(scanner, isEquals) && (quoted(scanner) || literal(scanner, true))
	                ? slice(scanner)
	                : void 0
	        };
	    }
	}
	function repeater(scanner) {
	    return isRepeater(peek(scanner))
	        ? scanner.tokens[scanner.pos++]
	        : void 0;
	}
	/**
	 * Consumes quoted value from given scanner, if possible
	 */
	function quoted(scanner) {
	    var start = scanner.pos;
	    var quote = peek(scanner);
	    if (isQuote$1(quote)) {
	        scanner.pos++;
	        while (readable(scanner)) {
	            if (isQuote$1(next(scanner), quote.single)) {
	                scanner.start = start;
	                return true;
	            }
	        }
	        throw error(scanner, 'Unclosed quote', quote);
	    }
	    return false;
	}
	/**
	 * Consumes literal (unquoted value) from given scanner
	 */
	function literal(scanner, allowBrackets) {
	    var start = scanner.pos;
	    var brackets = {
	        attribute: 0,
	        expression: 0,
	        group: 0
	    };
	    while (readable(scanner)) {
	        var token = peek(scanner);
	        if (brackets.expression) {
	            // If we’re inside expression, we should consume all content in it
	            if (isBracket(token, 'expression')) {
	                brackets[token.context] += token.open ? 1 : -1;
	            }
	        }
	        else if (isQuote$1(token) || isOperator(token) || isWhiteSpace$1(token) || isRepeater(token)) {
	            break;
	        }
	        else if (isBracket(token)) {
	            if (!allowBrackets) {
	                break;
	            }
	            if (token.open) {
	                brackets[token.context]++;
	            }
	            else if (!brackets[token.context]) {
	                // Stop if found unmatched closing brace: it must be handled
	                // by parent consumer
	                break;
	            }
	            else {
	                brackets[token.context]--;
	            }
	        }
	        scanner.pos++;
	    }
	    if (start !== scanner.pos) {
	        scanner.start = start;
	        return true;
	    }
	    return false;
	}
	/**
	 * Consumes element name from given scanner
	 */
	function elementName(scanner, options) {
	    var start = scanner.pos;
	    if (options.jsx && consume(scanner, isCapitalizedLiteral)) {
	        // Check for edge case: consume immediate capitalized class names
	        // for React-like components, e.g. `Foo.Bar.Baz`
	        while (readable(scanner)) {
	            var { pos } = scanner;
	            if (!consume(scanner, isClassNameOperator) || !consume(scanner, isCapitalizedLiteral)) {
	                scanner.pos = pos;
	                break;
	            }
	        }
	    }
	    while (readable(scanner) && consume(scanner, isElementName)) {
	        // empty
	    }
	    if (scanner.pos !== start) {
	        scanner.start = start;
	        return true;
	    }
	    return false;
	}
	/**
	 * Consumes text value from given scanner
	 */
	function text$1(scanner) {
	    var start = scanner.pos;
	    if (consume(scanner, isTextStart)) {
	        var brackets = 0;
	        while (readable(scanner)) {
	            var token = next(scanner);
	            if (isBracket(token, 'expression')) {
	                if (token.open) {
	                    brackets++;
	                }
	                else if (!brackets) {
	                    break;
	                }
	                else {
	                    brackets--;
	                }
	            }
	        }
	        scanner.start = start;
	        return true;
	    }
	    return false;
	}
	function getText(scanner) {
	    var from = scanner.start;
	    var to = scanner.pos;
	    if (isBracket(scanner.tokens[from], 'expression', true)) {
	        from++;
	    }
	    if (isBracket(scanner.tokens[to - 1], 'expression', false)) {
	        to--;
	    }
	    return slice(scanner, from, to);
	}
	function isBracket(token, context, isOpen) {
	    return Boolean(token && token.type === 'Bracket'
	        && (!context || token.context === context)
	        && (isOpen == null || token.open === isOpen));
	}
	function isOperator(token, type) {
	    return Boolean(token && token.type === 'Operator' && (!type || token.operator === type));
	}
	function isQuote$1(token, isSingle) {
	    return Boolean(token && token.type === 'Quote' && (isSingle == null || token.single === isSingle));
	}
	function isWhiteSpace$1(token) {
	    return Boolean(token && token.type === 'WhiteSpace');
	}
	function isEquals(token) {
	    return isOperator(token, 'equal');
	}
	function isRepeater(token) {
	    return Boolean(token && token.type === 'Repeater');
	}
	function isLiteral(token) {
	    return token.type === 'Literal';
	}
	function isCapitalizedLiteral(token) {
	    if (isLiteral(token)) {
	        var ch = token.value.charCodeAt(0);
	        return ch >= 65 && ch <= 90;
	    }
	    return false;
	}
	function isElementName(token) {
	    return token.type === 'Literal' || token.type === 'RepeaterNumber' || token.type === 'RepeaterPlaceholder';
	}
	function isClassNameOperator(token) {
	    return isOperator(token, 'class');
	}
	function isAttributeSetStart(token) {
	    return isBracket(token, 'attribute', true);
	}
	function isAttributeSetEnd(token) {
	    return isBracket(token, 'attribute', false);
	}
	function isTextStart(token) {
	    return isBracket(token, 'expression', true);
	}
	function isGroupStart(token) {
	    return isBracket(token, 'group', true);
	}
	function createLiteral(value) {
	    return { type: 'Literal', value };
	}
	function isEmpty(elem) {
	    return !elem.name && !elem.value && !elem.attributes;
	}
	function isChildOperator(token) {
	    return isOperator(token, 'child');
	}
	function isSiblingOperator(token) {
	    return isOperator(token, 'sibling');
	}
	function isClimbOperator(token) {
	    return isOperator(token, 'climb');
	}
	function isCloseOperator(token) {
	    return isOperator(token, 'close');
	}

	/**
	 * If consumes escape character, sets current stream range to escaped value
	 */
	function escaped(scanner) {
	    if (scanner.eat(92 /* Escape */)) {
	        if (scanner.eof()) {
	            scanner.start = scanner.pos - 1;
	        }
	        else {
	            scanner.start = scanner.pos++;
	        }
	        return true;
	    }
	    return false;
	}

	function tokenize(source) {
	    var scanner = new Scanner(source);
	    var result = [];
	    var ctx = {
	        group: 0,
	        attribute: 0,
	        expression: 0,
	        quote: 0
	    };
	    var ch = 0;
	    var token;
	    while (!scanner.eof()) {
	        ch = scanner.peek();
	        token = field(scanner, ctx)
	            || repeaterPlaceholder(scanner)
	            || repeaterNumber(scanner)
	            || repeater$1(scanner)
	            || whiteSpace(scanner)
	            || literal$1(scanner, ctx)
	            || operator(scanner)
	            || quote(scanner)
	            || bracket(scanner);
	        if (token) {
	            result.push(token);
	            if (token.type === 'Quote') {
	                ctx.quote = ch === ctx.quote ? 0 : ch;
	            }
	            else if (token.type === 'Bracket') {
	                ctx[token.context] += token.open ? 1 : -1;
	            }
	        }
	        else {
	            throw scanner.error('Unexpected character');
	        }
	    }
	    return result;
	}
	/**
	 * Consumes literal from given scanner
	 */
	function literal$1(scanner, ctx) {
	    var start = scanner.pos;
	    var value = '';
	    while (!scanner.eof()) {
	        var ch = scanner.peek();
	        if (ch === ctx.quote || ch === 36 /* Dollar */ || isAllowedOperator(ch, ctx)) {
	            // 1. Found matching quote
	            // 2. The `$` character has special meaning in every context
	            // 3. Depending on context, some characters should be treated as operators
	            break;
	        }
	        if (ctx.expression && ch === 125 /* CurlyBracketClose */) {
	            break;
	        }
	        if (!ctx.quote && !ctx.expression && (isAllowedSpace(ch, ctx) || isAllowedRepeater(ch, ctx) || isQuote(ch) || bracketType(ch))) {
	            // Stop for characters not allowed in unquoted literal
	            break;
	        }
	        value += escaped(scanner)
	            ? scanner.current()
	            : scanner.string[scanner.pos++];
	    }
	    if (start !== scanner.pos) {
	        scanner.start = start;
	        return {
	            type: 'Literal',
	            value,
	            start,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes white space characters as string literal from given scanner
	 */
	function whiteSpace(scanner) {
	    var start = scanner.pos;
	    if (scanner.eatWhile(isSpace)) {
	        return {
	            type: 'WhiteSpace',
	            start,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes quote from given scanner
	 */
	function quote(scanner) {
	    var ch = scanner.peek();
	    if (isQuote(ch)) {
	        return {
	            type: 'Quote',
	            single: ch === 39 /* SingleQuote */,
	            start: scanner.pos++,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes bracket from given scanner
	 */
	function bracket(scanner) {
	    var ch = scanner.peek();
	    var context = bracketType(ch);
	    if (context) {
	        return {
	            type: 'Bracket',
	            open: isOpenBracket(ch),
	            context,
	            start: scanner.pos++,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes operator from given scanner
	 */
	function operator(scanner) {
	    var op = operatorType(scanner.peek());
	    if (op) {
	        return {
	            type: 'Operator',
	            operator: op,
	            start: scanner.pos++,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes node repeat token from current stream position and returns its
	 * parsed value
	 */
	function repeater$1(scanner) {
	    var start = scanner.pos;
	    if (scanner.eat(42 /* Asterisk */)) {
	        scanner.start = scanner.pos;
	        var count = 1;
	        var implicit = false;
	        if (scanner.eatWhile(isNumber)) {
	            count = Number(scanner.current());
	        }
	        else {
	            implicit = true;
	        }
	        return {
	            type: 'Repeater',
	            count,
	            value: 0,
	            implicit,
	            start,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes repeater placeholder `$#` from given scanner
	 */
	function repeaterPlaceholder(scanner) {
	    var start = scanner.pos;
	    if (scanner.eat(36 /* Dollar */) && scanner.eat(35 /* Hash */)) {
	        return {
	            type: 'RepeaterPlaceholder',
	            value: void 0,
	            start,
	            end: scanner.pos
	        };
	    }
	    scanner.pos = start;
	}
	/**
	 * Consumes numbering token like `$` from given scanner state
	 */
	function repeaterNumber(scanner) {
	    var start = scanner.pos;
	    if (scanner.eatWhile(36 /* Dollar */)) {
	        var size = scanner.pos - start;
	        var reverse = false;
	        var base = 1;
	        var parent = 0;
	        if (scanner.eat(64 /* At */)) {
	            // Consume numbering modifiers
	            while (scanner.eat(94 /* Climb */)) {
	                parent++;
	            }
	            reverse = scanner.eat(45 /* Dash */);
	            scanner.start = scanner.pos;
	            if (scanner.eatWhile(isNumber)) {
	                base = Number(scanner.current());
	            }
	        }
	        scanner.start = start;
	        return {
	            type: 'RepeaterNumber',
	            size,
	            reverse,
	            base,
	            parent,
	            start,
	            end: scanner.pos
	        };
	    }
	}
	function field(scanner, ctx) {
	    var start = scanner.pos;
	    // Fields are allowed inside expressions and attributes
	    if ((ctx.expression || ctx.attribute) && scanner.eat(36 /* Dollar */) && scanner.eat(123 /* CurlyBracketOpen */)) {
	        scanner.start = scanner.pos;
	        var index;
	        var name = '';
	        if (scanner.eatWhile(isNumber)) {
	            // It’s a field
	            index = Number(scanner.current());
	            name = scanner.eat(58 /* Colon */) ? consumePlaceholder(scanner) : '';
	        }
	        else if (isAlpha(scanner.peek())) {
	            // It’s a variable
	            name = consumePlaceholder(scanner);
	        }
	        if (scanner.eat(125 /* CurlyBracketClose */)) {
	            return {
	                type: 'Field',
	                index, name,
	                start,
	                end: scanner.pos
	            };
	        }
	        throw scanner.error('Expecting }');
	    }
	    // If we reached here then there’s no valid field here, revert
	    // back to starting position
	    scanner.pos = start;
	}
	/**
	 * Consumes a placeholder: value right after `:` in field. Could be empty
	 */
	function consumePlaceholder(stream) {
	    var stack = [];
	    stream.start = stream.pos;
	    while (!stream.eof()) {
	        if (stream.eat(123 /* CurlyBracketOpen */)) {
	            stack.push(stream.pos);
	        }
	        else if (stream.eat(125 /* CurlyBracketClose */)) {
	            if (!stack.length) {
	                stream.pos--;
	                break;
	            }
	            stack.pop();
	        }
	        else {
	            stream.pos++;
	        }
	    }
	    if (stack.length) {
	        stream.pos = stack.pop();
	        throw stream.error(`Expecting }`);
	    }
	    return stream.current();
	}
	/**
	 * Check if given character code is an operator and it’s allowed in current context
	 */
	function isAllowedOperator(ch, ctx) {
	    var op = operatorType(ch);
	    if (!op || ctx.quote || ctx.expression) {
	        // No operators inside quoted values or expressions
	        return false;
	    }
	    // Inside attributes, only `equals` is allowed
	    return !ctx.attribute || op === 'equal';
	}
	/**
	 * Check if given character is a space character and is allowed to be consumed
	 * as a space token in current context
	 */
	function isAllowedSpace(ch, ctx) {
	    return isSpace(ch) && !ctx.expression;
	}
	/**
	 * Check if given character can be consumed as repeater in current context
	 */
	function isAllowedRepeater(ch, ctx) {
	    return ch === 42 /* Asterisk */ && !ctx.attribute && !ctx.expression;
	}
	/**
	 * If given character is a bracket, returns it’s type
	 */
	function bracketType(ch) {
	    if (ch === 40 /* RoundBracketOpen */ || ch === 41 /* RoundBracketClose */) {
	        return 'group';
	    }
	    if (ch === 91 /* SquareBracketOpen */ || ch === 93 /* SquareBracketClose */) {
	        return 'attribute';
	    }
	    if (ch === 123 /* CurlyBracketOpen */ || ch === 125 /* CurlyBracketClose */) {
	        return 'expression';
	    }
	}
	/**
	 * If given character is an operator, returns it’s type
	 */
	function operatorType(ch) {
	    return (ch === 62 /* Child */ && 'child')
	        || (ch === 43 /* Sibling */ && 'sibling')
	        || (ch === 94 /* Climb */ && 'climb')
	        || (ch === 46 /* Dot */ && 'class')
	        || (ch === 35 /* Hash */ && 'id')
	        || (ch === 47 /* Slash */ && 'close')
	        || (ch === 61 /* Equals */ && 'equal')
	        || void 0;
	}
	/**
	 * Check if given character is an open bracket
	 */
	function isOpenBracket(ch) {
	    return ch === 123 /* CurlyBracketOpen */
	        || ch === 91 /* SquareBracketOpen */
	        || ch === 40 /* RoundBracketOpen */;
	}

	var operators = {
	    child: '>',
	    class: '.',
	    climb: '^',
	    id: '#',
	    equal: '=',
	    close: '/',
	    sibling: '+'
	};
	var tokenVisitor = {
	    Literal(token) {
	        return token.value;
	    },
	    Quote(token) {
	        return token.single ? '\'' : '"';
	    },
	    Bracket(token) {
	        if (token.context === 'attribute') {
	            return token.open ? '[' : ']';
	        }
	        else if (token.context === 'expression') {
	            return token.open ? '{' : '}';
	        }
	        else {
	            return token.open ? '(' : '}';
	        }
	    },
	    Operator(token) {
	        return operators[token.operator];
	    },
	    Field(token, state) {
	        if (token.index != null) {
	            // It’s a field: by default, return TextMate-compatible field
	            return token.name
	                ? `\${${token.index}:${token.name}}`
	                : `\${${token.index}`;
	        }
	        else if (token.name) {
	            // It’s a variable
	            return state.getVariable(token.name);
	        }
	        return '';
	    },
	    RepeaterPlaceholder(token, state) {
	        // Find closest implicit repeater
	        var repeater;
	        for (var i = state.repeaters.length - 1; i >= 0; i--) {
	            if (state.repeaters[i].implicit) {
	                repeater = state.repeaters[i];
	                break;
	            }
	        }
	        state.inserted = true;
	        return state.getText(repeater && repeater.value);
	    },
	    RepeaterNumber(token, state) {
	        var value = 1;
	        var lastIx = state.repeaters.length - 1;
	        // var repeaterIx = Math.max(0, state.repeaters.length - 1 - token.parent);
	        var repeater = state.repeaters[lastIx];
	        if (repeater) {
	            value = token.reverse
	                ? token.base + repeater.count - repeater.value
	                : token.base + repeater.value;
	            if (token.parent) {
	                var parentIx = Math.max(0, lastIx - token.parent);
	                if (parentIx !== lastIx) {
	                    var parentRepeater = state.repeaters[parentIx];
	                    value += repeater.count * parentRepeater.value;
	                }
	            }
	        }
	        var result = String(value);
	        while (result.length < token.size) {
	            result = '0' + result;
	        }
	        return result;
	    },
	    WhiteSpace() {
	        return ' ';
	    }
	};
	/**
	 * Converts given value token to string
	 */
	function stringify(token, state) {
	    if (!tokenVisitor[token.type]) {
	        throw new Error(`Unknown token ${token.type}`);
	    }
	    return tokenVisitor[token.type](token, state);
	}

	/**
	 * Converts given token-based abbreviation into simplified and unrolled node-based
	 * abbreviation
	 */
	function convert(abbr, options = {}) {
	    var textInserted = false;
	    var result = {
	        type: 'Abbreviation',
	        children: convertGroup(abbr, {
	            inserted: false,
	            repeaters: [],
	            text: options.text,
	            repeatGuard: options.maxRepeat || Number.POSITIVE_INFINITY,
	            getText(pos) {
	                textInserted = true;
	                var value = Array.isArray(options.text)
	                    ? (pos != null ? options.text[pos] : options.text.join('\n'))
	                    : options.text;
	                return value != null ? value : '';
	            },
	            getVariable(name) {
	                var varValue = options.variables && options.variables[name];
	                return varValue != null ? varValue : name;
	            }
	        })
	    };
	    if (options.text != null && !textInserted) {
	        // Text given but no implicitly repeated elements: insert it into
	        // deepest child
	        var deepest = deepestNode(last(result.children));
	        if (deepest) {
	            var text = Array.isArray(options.text) ? options.text.join('\n') : options.text;
	            insertText(deepest, text);
	        }
	    }
	    return result;
	}
	/**
	 * Converts given statement to abbreviation nodes
	 */
	function convertStatement(node, state) {
	    var result = [];
	    if (node.repeat) {
	        // Node is repeated: we should create copies of given node
	        // and supply context token with actual repeater state
	        var original = node.repeat;
	        var repeat = Object.assign({}, original);
	        repeat.count = repeat.implicit && Array.isArray(state.text)
	            ? state.text.length
	            : (repeat.count || 1);
	        var items;
	        state.repeaters.push(repeat);
	        for (var i = 0; i < repeat.count; i++) {
	            repeat.value = i;
	            node.repeat = repeat;
	            items = isGroup(node)
	                ? convertGroup(node, state)
	                : convertElement(node, state);
	            if (repeat.implicit && !state.inserted) {
	                // It’s an implicit repeater but no repeater placeholders found inside,
	                // we should insert text into deepest node
	                var target = last(items);
	                var deepest = target && deepestNode(target);
	                if (deepest) {
	                    insertText(deepest, state.getText(repeat.value));
	                }
	            }
	            result = result.concat(items);
	            // We should output at least one repeated item even if it’s reached
	            // repeat limit
	            if (--state.repeatGuard <= 0) {
	                break;
	            }
	        }
	        state.repeaters.pop();
	        node.repeat = original;
	        if (repeat.implicit) {
	            state.inserted = true;
	        }
	    }
	    else {
	        result = result.concat(isGroup(node) ? convertGroup(node, state) : convertElement(node, state));
	    }
	    return result;
	}
	function convertElement(node, state) {
	    var children = [];
	    var elem = {
	        type: 'AbbreviationNode',
	        name: node.name && stringifyName(node.name, state),
	        value: node.value && stringifyValue(node.value, state),
	        attributes: void 0,
	        children,
	        repeat: node.repeat && Object.assign({}, node.repeat),
	        selfClosing: node.selfClose,
	    };
	    var result = [elem];
	    for (var child of node.elements) {
	        children = children.concat(convertStatement(child, state));
	    }
	    if (node.attributes) {
	        elem.attributes = [];
	        for (var attr of node.attributes) {
	            elem.attributes.push(convertAttribute(attr, state));
	        }
	    }
	    // In case if current node is a text-only snippet without fields, we should
	    // put all children as siblings
	    if (!elem.name && !elem.attributes && elem.value && !elem.value.some(isField)) {
	        // XXX it’s unclear that `children` is not bound to `elem`
	        // due to concat operation
	        result = result.concat(children);
	    }
	    else {
	        elem.children = children;
	    }
	    return result;
	}
	function convertGroup(node, state) {
	    var result = [];
	    for (var child of node.elements) {
	        result = result.concat(convertStatement(child, state));
	    }
	    if (node.repeat) {
	        result = attachRepeater(result, node.repeat);
	    }
	    return result;
	}
	function convertAttribute(node, state) {
	    var implied = false;
	    var isBoolean = false;
	    var valueType = node.expression ? 'expression' : 'raw';
	    var value;
	    var name = node.name && stringifyName(node.name, state);
	    if (name && name[0] === '!') {
	        implied = true;
	    }
	    if (name && name[name.length - 1] === '.') {
	        isBoolean = true;
	    }
	    if (node.value) {
	        var tokens = node.value.slice();
	        if (isQuote$1(tokens[0])) {
	            // It’s a quoted value: remove quotes from output but mark attribute
	            // value as quoted
	            var quote = tokens.shift();
	            if (tokens.length && last(tokens).type === quote.type) {
	                tokens.pop();
	            }
	            valueType = quote.single ? 'singleQuote' : 'doubleQuote';
	        }
	        else if (isBracket(tokens[0], 'expression', true)) {
	            // Value is expression: remove brackets but mark value type
	            valueType = 'expression';
	            tokens.shift();
	            if (isBracket(last(tokens), 'expression', false)) {
	                tokens.pop();
	            }
	        }
	        value = stringifyValue(tokens, state);
	    }
	    return {
	        name: isBoolean || implied
	            ? name.slice(implied ? 1 : 0, isBoolean ? -1 : void 0)
	            : name,
	        value,
	        boolean: isBoolean,
	        implied,
	        valueType
	    };
	}
	/**
	 * Converts given token list to string
	 */
	function stringifyName(tokens, state) {
	    var str = '';
	    for (var i = 0; i < tokens.length; i++) {
	        str += stringify(tokens[i], state);
	    }
	    return str;
	}
	/**
	 * Converts given token list to value list
	 */
	function stringifyValue(tokens, state) {
	    var result = [];
	    var str = '';
	    for (var i = 0, token; i < tokens.length; i++) {
	        token = tokens[i];
	        if (isField(token)) {
	            // We should keep original fields in output since some editors has their
	            // own syntax for field or doesn’t support fields at all so we should
	            // capture actual field location in output stream
	            if (str) {
	                result.push(str);
	                str = '';
	            }
	            result.push(token);
	        }
	        else {
	            str += stringify(token, state);
	        }
	    }
	    if (str) {
	        result.push(str);
	    }
	    return result;
	}
	function isGroup(node) {
	    return node.type === 'TokenGroup';
	}
	function isField(token) {
	    return typeof token === 'object' && token.type === 'Field' && token.index != null;
	}
	function last(arr) {
	    return arr[arr.length - 1];
	}
	function deepestNode(node) {
	    return node.children.length ? deepestNode(last(node.children)) : node;
	}
	function insertText(node, text) {
	    if (node.value) {
	        var lastToken = last(node.value);
	        if (typeof lastToken === 'string') {
	            node.value[node.value.length - 1] += text;
	        }
	        else {
	            node.value.push(text);
	        }
	    }
	    else {
	        node.value = [text];
	    }
	}
	function attachRepeater(items, repeater) {
	    for (var item of items) {
	        if (!item.repeat) {
	            item.repeat = Object.assign({}, repeater);
	        }
	    }
	    return items;
	}

	/**
	 * Parses given abbreviation into node tree
	 */
	function parseAbbreviation(abbr, options) {
	    try {
	        var tokens = typeof abbr === 'string' ? tokenize(abbr) : abbr;
	        return convert(abbreviation(tokens, options), options);
	    }
	    catch (err) {
	        if (err instanceof ScannerError && typeof abbr === 'string') {
	            err.message += `\n${abbr}\n${'-'.repeat(err.pos)}^`;
	        }
	        throw err;
	    }
	}

	/**
	 * Check if given code is a number
	 */
	function isNumber$1(code) {
	    return code > 47 && code < 58;
	}
	/**
	 * Check if given character code is alpha code (letter through A to Z)
	 */
	function isAlpha$1(code, from, to) {
	    from = from || 65; // A
	    to = to || 90; // Z
	    code &= ~32; // quick hack to convert any char code to uppercase char code
	    return code >= from && code <= to;
	}
	function isAlphaNumericWord(code) {
	    return isNumber$1(code) || isAlphaWord(code);
	}
	function isAlphaWord(code) {
	    return code === 95 /* _ */ || isAlpha$1(code);
	}
	/**
	 * Check if given character code is a white-space character: a space character
	 * or line breaks
	 */
	function isWhiteSpace$2(code) {
	    return code === 32 /* space */
	        || code === 9 /* tab */
	        || code === 160; /* non-breaking space */
	}
	/**
	 * Check if given character code is a space character
	 */
	function isSpace$1(code) {
	    return isWhiteSpace$2(code)
	        || code === 10 /* LF */
	        || code === 13; /* CR */
	}
	/**
	 * Check if given character code is a quote character
	 */
	function isQuote$2(code) {
	    return code === 39 /* ' */ || code === 34 /* " */;
	}

	/**
	 * A streaming, character code-based string reader
	 */
	class Scanner$1 {
	    constructor(str, start, end) {
	        if (end == null && typeof str === 'string') {
	            end = str.length;
	        }
	        this.string = str;
	        this.pos = this.start = start || 0;
	        this.end = end || 0;
	    }
	    /**
	     * Returns true only if the stream is at the end of the file.
	     */
	    eof() {
	        return this.pos >= this.end;
	    }
	    /**
	     * Creates a new stream instance which is limited to given `start` and `end`
	     * range. E.g. its `eof()` method will look at `end` property, not actual
	     * stream end
	     */
	    limit(start, end) {
	        return new Scanner$1(this.string, start, end);
	    }
	    /**
	     * Returns the next character code in the stream without advancing it.
	     * Will return NaN at the end of the file.
	     */
	    peek() {
	        return this.string.charCodeAt(this.pos);
	    }
	    /**
	     * Returns the next character in the stream and advances it.
	     * Also returns <code>undefined</code> when no more characters are available.
	     */
	    next() {
	        if (this.pos < this.string.length) {
	            return this.string.charCodeAt(this.pos++);
	        }
	    }
	    /**
	     * `match` can be a character code or a function that takes a character code
	     * and returns a boolean. If the next character in the stream 'matches'
	     * the given argument, it is consumed and returned.
	     * Otherwise, `false` is returned.
	     */
	    eat(match) {
	        var ch = this.peek();
	        var ok = typeof match === 'function' ? match(ch) : ch === match;
	        if (ok) {
	            this.next();
	        }
	        return ok;
	    }
	    /**
	     * Repeatedly calls <code>eat</code> with the given argument, until it
	     * fails. Returns <code>true</code> if any characters were eaten.
	     */
	    eatWhile(match) {
	        var start = this.pos;
	        while (!this.eof() && this.eat(match)) { /* */ }
	        return this.pos !== start;
	    }
	    /**
	     * Backs up the stream n characters. Backing it up further than the
	     * start of the current token will cause things to break, so be careful.
	     */
	    backUp(n) {
	        this.pos -= (n || 1);
	    }
	    /**
	     * Get the string between the start of the current token and the
	     * current stream position.
	     */
	    current() {
	        return this.substring(this.start, this.pos);
	    }
	    /**
	     * Returns substring for given range
	     */
	    substring(start, end) {
	        return this.string.slice(start, end);
	    }
	    /**
	     * Creates error object with current stream state
	     */
	    error(message, pos = this.pos) {
	        return new ScannerError$1(`${message} at ${pos + 1}`, pos, this.string);
	    }
	}
	class ScannerError$1 extends Error {
	    constructor(message, pos, str) {
	        super(message);
	        this.pos = pos;
	        this.string = str;
	    }
	}

	function tokenize$1(abbr, isValue) {
	    var brackets = 0;
	    var token;
	    var scanner = new Scanner$1(abbr);
	    var tokens = [];
	    while (!scanner.eof()) {
	        token = field$1(scanner)
	            || numberValue(scanner)
	            || colorValue(scanner)
	            || stringValue(scanner)
	            || bracket$1(scanner)
	            || operator$1(scanner)
	            || whiteSpace$1(scanner)
	            || literal$2(scanner, brackets === 0 && !isValue)
	            || void 0;
	        if (!token) {
	            throw scanner.error('Unexpected character');
	        }
	        if (token.type === 'Bracket') {
	            if (!brackets && token.open) {
	                mergeTokens(scanner, tokens);
	            }
	            brackets += token.open ? 1 : -1;
	            if (brackets < 0) {
	                throw scanner.error('Unexpected bracket', token.start);
	            }
	        }
	        tokens.push(token);
	        // Forcibly consume next operator after unit-less numeric value or color:
	        // next dash `-` must be used as value delimiter
	        if (shouldConsumeDashAfter(token) && (token = operator$1(scanner))) {
	            tokens.push(token);
	        }
	    }
	    return tokens;
	}
	function field$1(scanner) {
	    var start = scanner.pos;
	    if (scanner.eat(36 /* Dollar */) && scanner.eat(123 /* CurlyBracketOpen */)) {
	        scanner.start = scanner.pos;
	        var index;
	        var name = '';
	        if (scanner.eatWhile(isNumber$1)) {
	            // It’s a field
	            index = Number(scanner.current());
	            name = scanner.eat(58 /* Colon */) ? consumePlaceholder$1(scanner) : '';
	        }
	        else if (isAlpha$1(scanner.peek())) {
	            // It’s a variable
	            name = consumePlaceholder$1(scanner);
	        }
	        if (scanner.eat(125 /* CurlyBracketClose */)) {
	            return {
	                type: 'Field',
	                index, name,
	                start,
	                end: scanner.pos
	            };
	        }
	        throw scanner.error('Expecting }');
	    }
	    // If we reached here then there’s no valid field here, revert
	    // back to starting position
	    scanner.pos = start;
	}
	/**
	 * Consumes a placeholder: value right after `:` in field. Could be empty
	 */
	function consumePlaceholder$1(stream) {
	    var stack = [];
	    stream.start = stream.pos;
	    while (!stream.eof()) {
	        if (stream.eat(123 /* CurlyBracketOpen */)) {
	            stack.push(stream.pos);
	        }
	        else if (stream.eat(125 /* CurlyBracketClose */)) {
	            if (!stack.length) {
	                stream.pos--;
	                break;
	            }
	            stack.pop();
	        }
	        else {
	            stream.pos++;
	        }
	    }
	    if (stack.length) {
	        stream.pos = stack.pop();
	        throw stream.error(`Expecting }`);
	    }
	    return stream.current();
	}
	/**
	 * Consumes literal from given scanner
	 * @param short Use short notation for consuming value.
	 * The difference between “short” and “full” notation is that first one uses
	 * alpha characters only and used for extracting keywords from abbreviation,
	 * while “full” notation also supports numbers and dashes
	 */
	function literal$2(scanner, short) {
	    var start = scanner.pos;
	    if (scanner.eat(isIdentPrefix)) {
	        // SCSS or LESS variable
	        // NB a bit dirty hack: if abbreviation starts with identifier prefix,
	        // consume alpha characters only to allow embedded variables
	        scanner.eatWhile(start ? isKeyword : isLiteral$1);
	    }
	    else if (scanner.eat(isAlphaWord)) {
	        scanner.eatWhile(short ? isLiteral$1 : isKeyword);
	    }
	    else {
	        // Allow dots only at the beginning of literal
	        scanner.eat(46 /* Dot */);
	        scanner.eatWhile(isLiteral$1);
	    }
	    if (start !== scanner.pos) {
	        scanner.start = start;
	        return createLiteral$1(scanner, scanner.start = start);
	    }
	}
	function createLiteral$1(scanner, start = scanner.start, end = scanner.pos) {
	    return {
	        type: 'Literal',
	        value: scanner.substring(start, end),
	        start,
	        end
	    };
	}
	/**
	 * Consumes numeric CSS value (number with optional unit) from current stream,
	 * if possible
	 */
	function numberValue(scanner) {
	    var start = scanner.pos;
	    if (consumeNumber(scanner)) {
	        scanner.start = start;
	        var rawValue = scanner.current();
	        // eat unit, which can be a % or alpha word
	        scanner.start = scanner.pos;
	        scanner.eat(37 /* Percent */) || scanner.eatWhile(isAlphaWord);
	        return {
	            type: 'NumberValue',
	            value: Number(rawValue),
	            rawValue,
	            unit: scanner.current(),
	            start,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes quoted string value from given scanner
	 */
	function stringValue(scanner) {
	    var ch = scanner.peek();
	    var start = scanner.pos;
	    var finished = false;
	    if (isQuote$2(ch)) {
	        scanner.pos++;
	        while (!scanner.eof()) {
	            // Do not throw error on malformed string
	            if (scanner.eat(ch)) {
	                finished = true;
	                break;
	            }
	            else {
	                scanner.pos++;
	            }
	        }
	        scanner.start = start;
	        return {
	            type: 'StringValue',
	            value: scanner.substring(start + 1, scanner.pos - (finished ? 1 : 0)),
	            quote: ch === 39 /* SingleQuote */ ? 'single' : 'double',
	            start,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes a color token from given string
	 */
	function colorValue(scanner) {
	    // supported color variations:
	    // #abc   → #aabbccc
	    // #0     → #000000
	    // #fff.5 → rgba(255, 255, 255, 0.5)
	    // #t     → transparent
	    var start = scanner.pos;
	    if (scanner.eat(35 /* Hash */)) {
	        scanner.start = scanner.pos;
	        scanner.eat(116 /* Transparent */) || scanner.eatWhile(isHex);
	        var color = scanner.current();
	        var alpha;
	        // a hex color can be followed by `.num` alpha value
	        scanner.start = scanner.pos;
	        if (scanner.eat(46 /* Dot */) && scanner.eatWhile(isNumber$1)) {
	            alpha = scanner.current();
	        }
	        var { r, g, b, a } = parseColor(color, alpha);
	        return {
	            type: 'ColorValue',
	            r, g, b, a,
	            raw: scanner.substring(start + 1, scanner.pos),
	            start,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes white space characters as string literal from given scanner
	 */
	function whiteSpace$1(scanner) {
	    var start = scanner.pos;
	    if (scanner.eatWhile(isSpace$1)) {
	        return {
	            type: 'WhiteSpace',
	            start,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes bracket from given scanner
	 */
	function bracket$1(scanner) {
	    var ch = scanner.peek();
	    if (isBracket$1(ch)) {
	        return {
	            type: 'Bracket',
	            open: ch === 40 /* RoundBracketOpen */,
	            start: scanner.pos++,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Consumes operator from given scanner
	 */
	function operator$1(scanner) {
	    var op = operatorType$1(scanner.peek());
	    if (op) {
	        return {
	            type: 'Operator',
	            operator: op,
	            start: scanner.pos++,
	            end: scanner.pos
	        };
	    }
	}
	/**
	 * Eats number value from given stream
	 * @return Returns `true` if number was consumed
	 */
	function consumeNumber(stream) {
	    var start = stream.pos;
	    stream.eat(45 /* Dash */);
	    var afterNegative = stream.pos;
	    var hasDecimal = stream.eatWhile(isNumber$1);
	    var prevPos = stream.pos;
	    if (stream.eat(46 /* Dot */)) {
	        // It’s perfectly valid to have numbers like `1.`, which enforces
	        // value to float unit type
	        var hasFloat = stream.eatWhile(isNumber$1);
	        if (!hasDecimal && !hasFloat) {
	            // Lone dot
	            stream.pos = prevPos;
	        }
	    }
	    // Edge case: consumed dash only: not a number, bail-out
	    if (stream.pos === afterNegative) {
	        stream.pos = start;
	    }
	    return stream.pos !== start;
	}
	function isIdentPrefix(code) {
	    return code === 64 /* At */ || code === 36 /* Dollar */;
	}
	/**
	 * If given character is an operator, returns it’s type
	 */
	function operatorType$1(ch) {
	    return (ch === 43 /* Sibling */ && "+" /* Sibling */)
	        || (ch === 33 /* Excl */ && "!" /* Important */)
	        || (ch === 44 /* Comma */ && "," /* ArgumentDelimiter */)
	        || (ch === 58 /* Colon */ && ":" /* PropertyDelimiter */)
	        || (ch === 45 /* Dash */ && "-" /* ValueDelimiter */)
	        || void 0;
	}
	/**
	 * Check if given code is a hex value (/0-9a-f/)
	 */
	function isHex(code) {
	    return isNumber$1(code) || isAlpha$1(code, 65, 70); // A-F
	}
	function isKeyword(code) {
	    return isAlphaNumericWord(code) || code === 45 /* Dash */;
	}
	function isBracket$1(code) {
	    return code === 40 /* RoundBracketOpen */ || code === 41 /* RoundBracketClose */;
	}
	function isLiteral$1(code) {
	    return isAlphaWord(code) || code === 37 /* Percent */;
	}
	/**
	 * Parses given color value from abbreviation into RGBA format
	 */
	function parseColor(value, alpha) {
	    var r = '0';
	    var g = '0';
	    var b = '0';
	    var a = Number(alpha != null && alpha !== '' ? alpha : 1);
	    if (value === 't') {
	        a = 0;
	    }
	    else {
	        switch (value.length) {
	            case 0:
	                break;
	            case 1:
	                r = g = b = value + value;
	                break;
	            case 2:
	                r = g = b = value;
	                break;
	            case 3:
	                r = value[0] + value[0];
	                g = value[1] + value[1];
	                b = value[2] + value[2];
	                break;
	            default:
	                value += value;
	                r = value.slice(0, 2);
	                g = value.slice(2, 4);
	                b = value.slice(4, 6);
	        }
	    }
	    return {
	        r: parseInt(r, 16),
	        g: parseInt(g, 16),
	        b: parseInt(b, 16),
	        a
	    };
	}
	/**
	 * Check if scanner reader must consume dash after given token.
	 * Used in cases where user must explicitly separate numeric values
	 */
	function shouldConsumeDashAfter(token) {
	    return token.type === 'ColorValue' || (token.type === 'NumberValue' && !token.unit);
	}
	/**
	 * Merges last adjacent tokens into a single literal.
	 * This function is used to overcome edge case when function name was parsed
	 * as a list of separate tokens. For example, a `scale3d()` value will be
	 * parsed as literal and number tokens (`scale` and `3d`) which is a perfectly
	 * valid abbreviation but undesired result. This function will detect last adjacent
	 * literal and number values and combine them into single literal
	 */
	function mergeTokens(scanner, tokens) {
	    var start = 0;
	    var end = 0;
	    while (tokens.length) {
	        var token = last$1(tokens);
	        if (token.type === 'Literal' || token.type === 'NumberValue') {
	            start = token.start;
	            if (!end) {
	                end = token.end;
	            }
	            tokens.pop();
	        }
	        else {
	            break;
	        }
	    }
	    if (start !== end) {
	        tokens.push(createLiteral$1(scanner, start, end));
	    }
	}
	function last$1(arr) {
	    return arr[arr.length - 1];
	}

	function tokenScanner$1(tokens) {
	    return {
	        tokens,
	        start: 0,
	        pos: 0,
	        size: tokens.length
	    };
	}
	function peek$1(scanner) {
	    return scanner.tokens[scanner.pos];
	}
	function readable$1(scanner) {
	    return scanner.pos < scanner.size;
	}
	function consume$1(scanner, test) {
	    if (test(peek$1(scanner))) {
	        scanner.pos++;
	        return true;
	    }
	    return false;
	}
	function error$1(scanner, message, token = peek$1(scanner)) {
	    if (token && token.start != null) {
	        message += ` at ${token.start}`;
	    }
	    var err = new Error(message);
	    err['pos'] = token && token.start;
	    return err;
	}

	function parser(tokens, options = {}) {
	    var scanner = tokenScanner$1(tokens);
	    var result = [];
	    var property;
	    while (readable$1(scanner)) {
	        if (property = consumeProperty(scanner, options)) {
	            result.push(property);
	        }
	        else if (!consume$1(scanner, isSiblingOperator$1)) {
	            throw error$1(scanner, 'Unexpected token');
	        }
	    }
	    return result;
	}
	/**
	 * Consumes single CSS property
	 */
	function consumeProperty(scanner, options) {
	    var name;
	    var important = false;
	    var valueFragment;
	    var value = [];
	    var token = peek$1(scanner);
	    if (!options.value && isLiteral$1$1(token) && !isFunctionStart(scanner)) {
	        scanner.pos++;
	        name = token.value;
	        // Consume any following value delimiter after property name
	        consume$1(scanner, isValueDelimiter);
	    }
	    // Skip whitespace right after property name, if any
	    consume$1(scanner, isWhiteSpace$3);
	    while (readable$1(scanner)) {
	        if (consume$1(scanner, isImportant)) {
	            important = true;
	        }
	        else if (valueFragment = consumeValue(scanner)) {
	            value.push(valueFragment);
	        }
	        else if (!consume$1(scanner, isFragmentDelimiter)) {
	            break;
	        }
	    }
	    if (name || value.length || important) {
	        return { name, value, important };
	    }
	}
	/**
	 * Consumes single value fragment, e.g. all value tokens before comma
	 */
	function consumeValue(scanner) {
	    var result = [];
	    var token;
	    var args;
	    while (readable$1(scanner)) {
	        token = peek$1(scanner);
	        if (isValue(token)) {
	            scanner.pos++;
	            if (isLiteral$1$1(token) && (args = consumeArguments(scanner))) {
	                result.push({
	                    type: 'FunctionCall',
	                    name: token.value,
	                    arguments: args
	                });
	            }
	            else {
	                result.push(token);
	            }
	        }
	        else if (isValueDelimiter(token)) {
	            scanner.pos++;
	        }
	        else {
	            break;
	        }
	    }
	    return result.length
	        ? { type: 'CSSValue', value: result }
	        : void 0;
	}
	function consumeArguments(scanner) {
	    var start = scanner.pos;
	    if (consume$1(scanner, isOpenBracket$1)) {
	        var args = [];
	        var value;
	        while (readable$1(scanner) && !consume$1(scanner, isCloseBracket)) {
	            if (value = consumeValue(scanner)) {
	                args.push(value);
	            }
	            else if (!consume$1(scanner, isWhiteSpace$3) && !consume$1(scanner, isArgumentDelimiter)) {
	                throw error$1(scanner, 'Unexpected token');
	            }
	        }
	        scanner.start = start;
	        return args;
	    }
	}
	function isLiteral$1$1(token) {
	    return token && token.type === 'Literal';
	}
	function isBracket$1$1(token, open) {
	    return token && token.type === 'Bracket' && (open == null || token.open === open);
	}
	function isOpenBracket$1(token) {
	    return isBracket$1$1(token, true);
	}
	function isCloseBracket(token) {
	    return isBracket$1$1(token, false);
	}
	function isWhiteSpace$3(token) {
	    return token && token.type === 'WhiteSpace';
	}
	function isOperator$1(token, operator) {
	    return token && token.type === 'Operator' && (!operator || token.operator === operator);
	}
	function isSiblingOperator$1(token) {
	    return isOperator$1(token, "+" /* Sibling */);
	}
	function isArgumentDelimiter(token) {
	    return isOperator$1(token, "," /* ArgumentDelimiter */);
	}
	function isFragmentDelimiter(token) {
	    return isArgumentDelimiter(token) || isWhiteSpace$3(token);
	}
	function isImportant(token) {
	    return isOperator$1(token, "!" /* Important */);
	}
	function isValue(token) {
	    return token.type === 'StringValue'
	        || token.type === 'ColorValue'
	        || token.type === 'NumberValue'
	        || token.type === 'Literal'
	        || token.type === 'Field';
	}
	function isValueDelimiter(token) {
	    return isWhiteSpace$3(token)
	        || isOperator$1(token, ":" /* PropertyDelimiter */)
	        || isOperator$1(token, "-" /* ValueDelimiter */);
	}
	function isFunctionStart(scanner) {
	    var t1 = scanner.tokens[scanner.pos];
	    var t2 = scanner.tokens[scanner.pos + 1];
	    return t1 && t2 && isLiteral$1$1(t1) && t2.type === 'Bracket';
	}

	/**
	 * Parses given abbreviation into property set
	 */
	function parse(abbr, options) {
	    try {
	        var tokens = typeof abbr === 'string' ? tokenize$1(abbr, options && options.value) : abbr;
	        return parser(tokens, options);
	    }
	    catch (err) {
	        if (err instanceof ScannerError$1 && typeof abbr === 'string') {
	            err.message += `\n${abbr}\n${'-'.repeat(err.pos)}^`;
	        }
	        throw err;
	    }
	}

	/**
	 * Merges attributes in current node: de-duplicates attributes with the same name
	 * and merges class names
	 */
	function mergeAttributes(node, config) {
	    if (!node.attributes) {
	        return;
	    }
	    var attributes = [];
	    var lookup = {};
	    for (var attr of node.attributes) {
	        if (attr.name) {
	            var attrName = attr.name;
	            if (attrName in lookup) {
	                var prev = lookup[attrName];
	                if (attrName === 'class') {
	                    prev.value = mergeValue(prev.value, attr.value, ' ');
	                }
	                else {
	                    mergeDeclarations(prev, attr, config);
	                }
	            }
	            else {
	                // Create new attribute instance so we can safely modify it later
	                attributes.push(lookup[attrName] = Object.assign({}, attr));
	            }
	        }
	        else {
	            attributes.push(attr);
	        }
	    }
	    node.attributes = attributes;
	}
	/**
	 * Merges two token lists into single list. Adjacent strings are merged together
	 */
	function mergeValue(prev, next, glue) {
	    if (prev && next) {
	        if (prev.length && glue) {
	            append(prev, glue);
	        }
	        for (var t of next) {
	            append(prev, t);
	        }
	        return prev;
	    }
	    var result = prev || next;
	    return result && result.slice();
	}
	/**
	 * Merges data from `src` attribute into `dest` and returns it
	 */
	function mergeDeclarations(dest, src, config) {
	    dest.name = src.name;
	    if (!config.options['output.reverseAttributes']) {
	        dest.value = src.value;
	    }
	    // Keep high-priority properties
	    if (!dest.implied) {
	        dest.implied = src.implied;
	    }
	    if (!dest.boolean) {
	        dest.boolean = src.boolean;
	    }
	    if (dest.valueType !== 'expression') {
	        dest.valueType = src.valueType;
	    }
	    return dest;
	}
	function append(tokens, value) {
	    var lastIx = tokens.length - 1;
	    if (typeof tokens[lastIx] === 'string' && typeof value === 'string') {
	        tokens[lastIx] += value;
	    }
	    else {
	        tokens.push(value);
	    }
	}

	/**
	 * Walks over each child node of given markup abbreviation AST node (not including
	 * given one) and invokes `fn` on each node.
	 * The `fn` callback accepts context node, list of ancestor nodes and optional
	 * state object
	 */
	function walk(node, fn, state) {
	    var ancestors = [node];
	    var callback = (ctx) => {
	        fn(ctx, ancestors, state);
	        ancestors.push(ctx);
	        ctx.children.forEach(callback);
	        ancestors.pop();
	    };
	    node.children.forEach(callback);
	}
	/**
	 * Finds node which is the deepest for in current node or node itself.
	 */
	function findDeepest(node) {
	    var parent;
	    while (node.children.length) {
	        parent = node;
	        node = node.children[node.children.length - 1];
	    }
	    return { parent, node };
	}
	function isNode(node) {
	    return node.type === 'AbbreviationNode';
	}

	/**
	 * Finds matching snippet from `registry` and resolves it into a parsed abbreviation.
	 * Resolved node is then updated or replaced with matched abbreviation tree.
	 *
	 * A HTML registry basically contains aliases to another Emmet abbreviations,
	 * e.g. a predefined set of name, attributes and so on, possibly a complex
	 * abbreviation with multiple elements. So we have to get snippet, parse it
	 * and recursively resolve it.
	 */
	function resolveSnippets(abbr, config) {
	    var stack = [];
	    var reversed = config.options['output.reverseAttributes'];
	    var resolve = (child) => {
	        var snippet = child.name && config.snippets[child.name];
	        // A snippet in stack means circular reference.
	        // It can be either a user error or a perfectly valid snippet like
	        // "img": "img[src alt]/", e.g. an element with predefined shape.
	        // In any case, simply stop parsing and keep element as is
	        if (!snippet || stack.includes(snippet)) {
	            return null;
	        }
	        var snippetAbbr = parseAbbreviation(snippet, config);
	        stack.push(snippet);
	        walkResolve(snippetAbbr, resolve);
	        stack.pop();
	        // Add attributes from current node into every top-level node of parsed abbreviation
	        for (var topNode of snippetAbbr.children) {
	            var from = topNode.attributes || [];
	            var to = child.attributes || [];
	            topNode.attributes = reversed ? to.concat(from) : from.concat(to);
	            mergeNodes(child, topNode);
	        }
	        return snippetAbbr;
	    };
	    walkResolve(abbr, resolve);
	    return abbr;
	}
	function walkResolve(node, resolve) {
	    var children = [];
	    for (var child of node.children) {
	        var resolved = resolve(child);
	        if (resolved) {
	            children = children.concat(resolved.children);
	            var deepest = findDeepest(resolved);
	            if (isNode(deepest.node)) {
	                deepest.node.children = deepest.node.children.concat(walkResolve(child, resolve));
	            }
	        }
	        else {
	            children.push(child);
	            child.children = walkResolve(child, resolve);
	        }
	    }
	    return node.children = children;
	}
	/**
	 * Adds data from first node into second node
	 */
	function mergeNodes(from, to) {
	    if (from.selfClosing) {
	        to.selfClosing = true;
	    }
	    if (from.value != null) {
	        to.value = from.value;
	    }
	    if (from.repeat) {
	        to.repeat = from.repeat;
	    }
	}

	function createOutputStream(options, level = 0) {
	    return {
	        options,
	        value: '',
	        level,
	        offset: 0,
	        line: 0,
	        column: 0
	    };
	}
	/**
	 * Pushes plain string into output stream without newline processing
	 */
	function push(stream, text) {
	    var processText = stream.options['output.text'];
	    _push(stream, processText(text, stream.offset, stream.line, stream.column));
	}
	/**
	 * Pushes given string with possible newline formatting into output
	 */
	function pushString(stream, value) {
	    // If given value contains newlines, we should push content line-by-line and
	    // use `pushNewline()` to maintain proper line/column state
	    var lines = splitByLines(value);
	    for (var i = 0, il = lines.length - 1; i <= il; i++) {
	        push(stream, lines[i]);
	        if (i !== il) {
	            pushNewline(stream, true);
	        }
	    }
	}
	/**
	 * Pushes new line into given output stream
	 */
	function pushNewline(stream, indent) {
	    var baseIndent = stream.options['output.baseIndent'];
	    var newline = stream.options['output.newline'];
	    push(stream, newline + baseIndent);
	    stream.line++;
	    stream.column = baseIndent.length;
	    if (indent) {
	        pushIndent(stream, indent === true ? stream.level : indent);
	    }
	}
	/**
	 * Adds indentation of `size` to current output stream
	 */
	function pushIndent(stream, size = stream.level) {
	    var indent = stream.options['output.indent'];
	    push(stream, indent.repeat(Math.max(size, 0)));
	}
	/**
	 * Pushes field/tabstop into output stream
	 */
	function pushField(stream, index, placeholder) {
	    var field = stream.options['output.field'];
	    // NB: use `_push` instead of `push` to skip text processing
	    _push(stream, field(index, placeholder, stream.offset, stream.line, stream.column));
	}
	/**
	 * Returns given tag name formatted according to given config
	 */
	function tagName(name, config) {
	    return strCase(name, config.options['output.tagCase']);
	}
	/**
	 * Returns given attribute name formatted according to given config
	 */
	function attrName(name, config) {
	    return strCase(name, config.options['output.attributeCase']);
	}
	/**
	 * Returns character for quoting value of given attribute
	 */
	function attrQuote(attr, config, isOpen) {
	    if (attr.valueType === 'expression') {
	        return isOpen ? '{' : '}';
	    }
	    return config.options['output.attributeQuotes'] === 'single' ? '\'' : '"';
	}
	/**
	 * Check if given attribute is boolean
	 */
	function isBooleanAttribute(attr, config) {
	    return attr.boolean
	        || config.options['output.booleanAttributes'].includes((attr.name || '').toLowerCase());
	}
	/**
	 * Returns a token for self-closing tag, depending on current options
	 */
	function selfClose(config) {
	    switch (config.options['output.selfClosingStyle']) {
	        case 'xhtml': return ' /';
	        case 'xml': return '/';
	        default: return '';
	    }
	}
	/**
	 * Check if given tag name belongs to inline-level element
	 * @param node Parsed node or tag name
	 */
	function isInline(node, config) {
	    if (typeof node === 'string') {
	        return config.options.inlineElements.includes(node.toLowerCase());
	    }
	    // inline node is a node either with inline-level name or text-only node
	    return node.name ? isInline(node.name, config) : Boolean(node.value && !node.attributes);
	}
	/**
	 * Splits given text by lines
	 */
	function splitByLines(text) {
	    return text.split(/\r\n|\r|\n/g);
	}
	/**
	 * Pushes raw string into output stream without any processing
	 */
	function _push(stream, text) {
	    stream.value += text;
	    stream.offset += text.length;
	    stream.column += text.length;
	}
	function strCase(str, type) {
	    if (type) {
	        return type === 'upper' ? str.toUpperCase() : str.toLowerCase();
	    }
	    return str;
	}

	var elementMap = {
	    p: 'span',
	    ul: 'li',
	    ol: 'li',
	    table: 'tr',
	    tr: 'td',
	    tbody: 'tr',
	    thead: 'tr',
	    tfoot: 'tr',
	    colgroup: 'col',
	    select: 'option',
	    optgroup: 'option',
	    audio: 'source',
	    video: 'source',
	    object: 'param',
	    map: 'area'
	};
	function implicitTag(node, ancestors, config) {
	    if (!node.name && node.attributes) {
	        resolveImplicitTag(node, ancestors, config);
	    }
	}
	function resolveImplicitTag(node, ancestors, config) {
	    var parent = getParentElement(ancestors);
	    var contextName = config.context ? config.context.name : '';
	    var parentName = lowercase(parent ? parent.name : contextName);
	    node.name = elementMap[parentName]
	        || (isInline(parentName, config) ? 'span' : 'div');
	}
	function lowercase(str) {
	    return (str || '').toLowerCase();
	}
	/**
	 * Returns closest element node from given ancestors list
	 */
	function getParentElement(ancestors) {
	    for (var i = ancestors.length - 1; i >= 0; i--) {
	        var elem = ancestors[i];
	        if (isNode(elem)) {
	            return elem;
	        }
	    }
	}

	var latin = {
		"common": ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipisicing", "elit"],
		"words": ["exercitationem", "perferendis", "perspiciatis", "laborum", "eveniet",
			"sunt", "iure", "nam", "nobis", "eum", "cum", "officiis", "excepturi",
			"odio", "consectetur", "quasi", "aut", "quisquam", "vel", "eligendi",
			"itaque", "non", "odit", "tempore", "quaerat", "dignissimos",
			"facilis", "neque", "nihil", "expedita", "vitae", "vero", "ipsum",
			"nisi", "animi", "cumque", "pariatur", "velit", "modi", "natus",
			"iusto", "eaque", "sequi", "illo", "sed", "ex", "et", "voluptatibus",
			"tempora", "veritatis", "ratione", "assumenda", "incidunt", "nostrum",
			"placeat", "aliquid", "fuga", "provident", "praesentium", "rem",
			"necessitatibus", "suscipit", "adipisci", "quidem", "possimus",
			"voluptas", "debitis", "sint", "accusantium", "unde", "sapiente",
			"voluptate", "qui", "aspernatur", "laudantium", "soluta", "amet",
			"quo", "aliquam", "saepe", "culpa", "libero", "ipsa", "dicta",
			"reiciendis", "nesciunt", "doloribus", "autem", "impedit", "minima",
			"maiores", "repudiandae", "ipsam", "obcaecati", "ullam", "enim",
			"totam", "delectus", "ducimus", "quis", "voluptates", "dolores",
			"molestiae", "harum", "dolorem", "quia", "voluptatem", "molestias",
			"magni", "distinctio", "omnis", "illum", "dolorum", "voluptatum", "ea",
			"quas", "quam", "corporis", "quae", "blanditiis", "atque", "deserunt",
			"laboriosam", "earum", "consequuntur", "hic", "cupiditate",
			"quibusdam", "accusamus", "ut", "rerum", "error", "minus", "eius",
			"ab", "ad", "nemo", "fugit", "officia", "at", "in", "id", "quos",
			"reprehenderit", "numquam", "iste", "fugiat", "sit", "inventore",
			"beatae", "repellendus", "magnam", "recusandae", "quod", "explicabo",
			"doloremque", "aperiam", "consequatur", "asperiores", "commodi",
			"optio", "dolor", "labore", "temporibus", "repellat", "veniam",
			"architecto", "est", "esse", "mollitia", "nulla", "a", "similique",
			"eos", "alias", "dolore", "tenetur", "deleniti", "porro", "facere",
			"maxime", "corrupti"]
	};

	var ru = {
		"common": ["далеко-далеко", "за", "словесными", "горами", "в стране", "гласных", "и согласных", "живут", "рыбные", "тексты"],
		"words": ["вдали", "от всех", "они", "буквенных", "домах", "на берегу", "семантика",
			"большого", "языкового", "океана", "маленький", "ручеек", "даль",
			"журчит", "по всей", "обеспечивает", "ее","всеми", "необходимыми",
			"правилами", "эта", "парадигматическая", "страна", "которой", "жаренные",
			"предложения", "залетают", "прямо", "рот", "даже", "всемогущая",
			"пунктуация", "не", "имеет", "власти", "над", "рыбными", "текстами",
			"ведущими", "безорфографичный", "образ", "жизни", "однажды", "одна",
			"маленькая", "строчка","рыбного", "текста", "имени", "lorem", "ipsum",
			"решила", "выйти", "большой", "мир", "грамматики", "великий", "оксмокс",
			"предупреждал", "о", "злых", "запятых", "диких", "знаках", "вопроса",
			"коварных", "точках", "запятой", "но", "текст", "дал", "сбить",
			"себя", "толку", "он", "собрал", "семь", "своих", "заглавных", "букв",
			"подпоясал", "инициал", "за", "пояс", "пустился", "дорогу",
			"взобравшись", "первую", "вершину", "курсивных", "гор", "бросил",
			"последний", "взгляд", "назад", "силуэт", "своего", "родного", "города",
			"буквоград", "заголовок", "деревни", "алфавит", "подзаголовок", "своего",
			"переулка", "грустный", "реторический", "вопрос", "скатился", "его",
			"щеке", "продолжил", "свой", "путь", "дороге", "встретил", "рукопись",
			"она", "предупредила",  "моей", "все", "переписывается", "несколько",
			"раз", "единственное", "что", "меня", "осталось", "это", "приставка",
			"возвращайся", "ты", "лучше", "свою", "безопасную", "страну", "послушавшись",
			"рукописи", "наш", "продолжил", "свой", "путь", "вскоре", "ему",
			"повстречался", "коварный", "составитель", "рекламных", "текстов",
			"напоивший", "языком", "речью", "заманивший", "свое", "агентство",
			"которое", "использовало", "снова", "снова", "своих", "проектах",
			"если", "переписали", "то", "живет", "там", "до", "сих", "пор"]
	};

	var sp = {
		"common": ["mujer", "uno", "dolor", "más", "de", "poder", "mismo", "si"],
		"words": ["ejercicio", "preferencia", "perspicacia", "laboral", "paño",
			"suntuoso", "molde", "namibia", "planeador", "mirar", "demás", "oficinista", "excepción",
			"odio", "consecuencia", "casi", "auto", "chicharra", "velo", "elixir",
			"ataque", "no", "odio", "temporal", "cuórum", "dignísimo",
			"facilismo", "letra", "nihilista", "expedición", "alma", "alveolar", "aparte",
			"león", "animal", "como", "paria", "belleza", "modo", "natividad",
			"justo", "ataque", "séquito", "pillo", "sed", "ex", "y", "voluminoso",
			"temporalidad", "verdades", "racional", "asunción", "incidente", "marejada",
			"placenta", "amanecer", "fuga", "previsor", "presentación", "lejos",
			"necesariamente", "sospechoso", "adiposidad", "quindío", "pócima",
			"voluble", "débito", "sintió", "accesorio", "falda", "sapiencia",
			"volutas", "queso", "permacultura", "laudo", "soluciones", "entero",
			"pan", "litro", "tonelada", "culpa", "libertario", "mosca", "dictado",
			"reincidente", "nascimiento", "dolor", "escolar", "impedimento", "mínima",
			"mayores", "repugnante", "dulce", "obcecado", "montaña", "enigma",
			"total", "deletéreo", "décima", "cábala", "fotografía", "dolores",
			"molesto", "olvido", "paciencia", "resiliencia", "voluntad", "molestias",
			"magnífico", "distinción", "ovni", "marejada", "cerro", "torre", "y",
			"abogada", "manantial", "corporal", "agua", "crepúsculo", "ataque", "desierto",
			"laboriosamente", "angustia", "afortunado", "alma", "encefalograma",
			"materialidad", "cosas", "o", "renuncia", "error", "menos", "conejo",
			"abadía", "analfabeto", "remo", "fugacidad", "oficio", "en", "almácigo", "vos", "pan",
			"represión", "números", "triste", "refugiado", "trote", "inventor",
			"corchea", "repelente", "magma", "recusado", "patrón", "explícito",
			"paloma", "síndrome", "inmune", "autoinmune", "comodidad",
			"ley", "vietnamita", "demonio", "tasmania", "repeler", "apéndice",
			"arquitecto", "columna", "yugo", "computador", "mula", "a", "propósito",
			"fantasía", "alias", "rayo", "tenedor", "deleznable", "ventana", "cara",
			"anemia", "corrupto"]
	};

	var vocabularies = { ru, sp, latin };
	var reLorem = /^lorem([a-z]*)(\d*)(-\d*)?$/i;
	function lorem(node, ancestors, config) {
	    var m;
	    if (node.name && (m = node.name.match(reLorem))) {
	        var db = vocabularies[m[1]] || vocabularies.latin;
	        var minWordCount = m[2] ? Math.max(1, Number(m[2])) : 30;
	        var maxWordCount = m[3] ? Math.max(minWordCount, Number(m[3].slice(1))) : minWordCount;
	        var wordCount = rand(minWordCount, maxWordCount);
	        var repeat = node.repeat || findRepeater(ancestors);
	        node.name = node.attributes = void 0;
	        node.value = [paragraph(db, wordCount, !repeat || repeat.value === 0)];
	        if (node.repeat && ancestors.length > 1) {
	            resolveImplicitTag(node, ancestors, config);
	        }
	    }
	}
	/**
	 * Returns random integer between <code>from</code> and <code>to</code> values
	 */
	function rand(from, to) {
	    return Math.floor(Math.random() * (to - from) + from);
	}
	function sample(arr, count) {
	    var len = arr.length;
	    var iterations = Math.min(len, count);
	    var result = [];
	    while (result.length < iterations) {
	        var str = arr[rand(0, len)];
	        if (!result.includes(str)) {
	            result.push(str);
	        }
	    }
	    return result;
	}
	function choice(val) {
	    return val[rand(0, val.length - 1)];
	}
	function sentence(words, end) {
	    if (words.length) {
	        words = [capitalize(words[0])].concat(words.slice(1));
	    }
	    return words.join(' ') + (end || choice('?!...')); // more dots than question marks
	}
	function capitalize(word) {
	    return word[0].toUpperCase() + word.slice(1);
	}
	/**
	 * Insert commas at randomly selected words. This function modifies values
	 * inside `words` array
	 */
	function insertCommas(words) {
	    if (words.length < 2) {
	        return words;
	    }
	    words = words.slice();
	    var len = words.length;
	    var hasComma = /,$/;
	    var totalCommas = 0;
	    if (len > 3 && len <= 6) {
	        totalCommas = rand(0, 1);
	    }
	    else if (len > 6 && len <= 12) {
	        totalCommas = rand(0, 2);
	    }
	    else {
	        totalCommas = rand(1, 4);
	    }
	    for (var i = 0, pos; i < totalCommas; i++) {
	        pos = rand(0, len - 2);
	        if (!hasComma.test(words[pos])) {
	            words[pos] += ',';
	        }
	    }
	    return words;
	}
	/**
	 * Generate a paragraph of "Lorem ipsum" text
	 * @param dict Words dictionary
	 * @param wordCount Words count in paragraph
	 * @param startWithCommon Should paragraph start with common "lorem ipsum" sentence.
	 */
	function paragraph(dict, wordCount, startWithCommon) {
	    var result = [];
	    var totalWords = 0;
	    var words;
	    if (startWithCommon && dict.common) {
	        words = dict.common.slice(0, wordCount);
	        totalWords += words.length;
	        result.push(sentence(insertCommas(words), '.'));
	    }
	    while (totalWords < wordCount) {
	        words = sample(dict.words, Math.min(rand(2, 30), wordCount - totalWords));
	        totalWords += words.length;
	        result.push(sentence(insertCommas(words)));
	    }
	    return result.join(' ');
	}
	function findRepeater(ancestors) {
	    for (var i = ancestors.length - 1; i >= 0; i--) {
	        var element = ancestors[i];
	        if (element.type === 'AbbreviationNode' && element.repeat) {
	            return element.repeat;
	        }
	    }
	}

	/**
	 * JSX transformer: replaces `class` and `for` attributes with `className` and
	 * `htmlFor` attributes respectively
	 */
	function jsx(node) {
	    if (node.attributes) {
	        node.attributes.forEach(rename);
	    }
	}
	function rename(attr) {
	    if (attr.name === 'class') {
	        attr.name = 'className';
	    }
	    else if (attr.name === 'for') {
	        attr.name = 'htmlFor';
	    }
	}

	/**
	 * XSL transformer: removes `select` attributes from certain nodes that contain
	 * children
	 */
	function xsl(node) {
	    if (matchesName(node.name) && node.attributes && (node.children.length || node.value)) {
	        node.attributes = node.attributes.filter(isAllowed);
	    }
	}
	function isAllowed(attr) {
	    return attr.name !== 'select';
	}
	function matchesName(name) {
	    return name === 'xsl:variable' || name === 'xsl:with-param';
	}

	var reElement = /^(-+)([a-z0-9]+[a-z0-9-]*)/i;
	var reModifier = /^(_+)([a-z0-9]+[a-z0-9-_]*)/i;
	var blockCandidates1 = (className) => /^[a-z]\-/i.test(className);
	var blockCandidates2 = (className) => /^[a-z]/i.test(className);
	function bem(node, ancestors, config) {
	    expandClassNames(node);
	    expandShortNotation(node, ancestors, config);
	}
	/**
	 * Expands existing class names in BEM notation in given `node`.
	 * For example, if node contains `b__el_mod` class name, this method ensures
	 * that element contains `b__el` class as well
	 */
	function expandClassNames(node) {
	    var data = getBEMData(node);
	    var classNames = [];
	    for (var cl of data.classNames) {
	        // remove all modifiers and element prefixes from class name to get a base element name
	        var ix = cl.indexOf('_');
	        if (ix > 0 && !cl.startsWith('-')) {
	            classNames.push(cl.slice(0, ix));
	            classNames.push(cl.slice(ix));
	        }
	        else {
	            classNames.push(cl);
	        }
	    }
	    if (classNames.length) {
	        data.classNames = classNames.filter(uniqueClass);
	        data.block = findBlockName(data.classNames);
	        updateClass(node, data.classNames.join(' '));
	    }
	}
	/**
	 * Expands short BEM notation, e.g. `-element` and `_modifier`
	 */
	function expandShortNotation(node, ancestors, config) {
	    var data = getBEMData(node);
	    var classNames = [];
	    var { options } = config;
	    var path = ancestors.slice(1).concat(node);
	    for (var cl of data.classNames) {
	        var prefix = '';
	        var m;
	        var originalClass = cl;
	        // parse element definition (could be only one)
	        if (m = cl.match(reElement)) {
	            prefix = getBlockName(path, m[1].length, config.context) + options['bem.element'] + m[2];
	            classNames.push(prefix);
	            cl = cl.slice(m[0].length);
	        }
	        // parse modifiers definitions
	        if (m = cl.match(reModifier)) {
	            if (!prefix) {
	                prefix = getBlockName(path, m[1].length);
	                classNames.push(prefix);
	            }
	            classNames.push(`${prefix}${options['bem.modifier']}${m[2]}`);
	            cl = cl.slice(m[0].length);
	        }
	        if (cl === originalClass) {
	            // class name wasn’t modified: it’s not a BEM-specific class,
	            // add it as-is into output
	            classNames.push(originalClass);
	        }
	    }
	    var arrClassNames = classNames.filter(uniqueClass);
	    if (arrClassNames.length) {
	        updateClass(node, arrClassNames.join(' '));
	    }
	}
	/**
	 * Returns BEM data from given abbreviation node
	 */
	function getBEMData(node) {
	    if (!node._bem) {
	        var classValue = '';
	        if (node.attributes) {
	            for (var attr of node.attributes) {
	                if (attr.name === 'class' && attr.value) {
	                    classValue = stringifyValue$1(attr.value);
	                    break;
	                }
	            }
	        }
	        node._bem = parseBEM(classValue);
	    }
	    return node._bem;
	}
	function getBEMDataFromContext(context) {
	    if (!context._bem) {
	        context._bem = parseBEM(context.attributes && context.attributes.class || '');
	    }
	    return context._bem;
	}
	/**
	 * Parses BEM data from given class name
	 */
	function parseBEM(classValue) {
	    var classNames = classValue ? classValue.split(/\s+/) : [];
	    return {
	        classNames,
	        block: findBlockName(classNames)
	    };
	}
	/**
	 * Returns block name for given `node` by `prefix`, which tells the depth of
	 * of parent node lookup
	 */
	function getBlockName(ancestors, depth = 0, context) {
	    var maxParentIx = 0;
	    var parentIx = Math.max(ancestors.length - depth, maxParentIx);
	    do {
	        var parent = ancestors[parentIx];
	        if (parent) {
	            var data = getBEMData(parent);
	            if (data.block) {
	                return data.block;
	            }
	        }
	    } while (maxParentIx < parentIx--);
	    if (context) {
	        var data = getBEMDataFromContext(context);
	        if (data.block) {
	            return data.block;
	        }
	    }
	    return '';
	}
	function findBlockName(classNames) {
	    return find(classNames, blockCandidates1)
	        || find(classNames, blockCandidates2)
	        || void 0;
	}
	/**
	 * Finds class name from given list which may be used as block name
	 */
	function find(classNames, filter) {
	    for (var cl of classNames) {
	        if (reElement.test(cl) || reModifier.test(cl)) {
	            break;
	        }
	        if (filter(cl)) {
	            return cl;
	        }
	    }
	}
	function updateClass(node, value) {
	    for (var attr of node.attributes) {
	        if (attr.name === 'class') {
	            attr.value = [value];
	            break;
	        }
	    }
	}
	function stringifyValue$1(value) {
	    var result = '';
	    for (var t of value) {
	        result += typeof t === 'string' ? t : t.name;
	    }
	    return result;
	}
	function uniqueClass(item, ix, arr) {
	    return !!item && arr.indexOf(item) === ix;
	}

	function walk$1(abbr, visitor, state) {
	    var callback = (ctx, index, items) => {
	        var { parent, current } = state;
	        state.parent = current;
	        state.current = ctx;
	        visitor(ctx, index, items, state, next);
	        state.current = current;
	        state.parent = parent;
	    };
	    var next = (node, index, items) => {
	        state.ancestors.push(state.current);
	        callback(node, index, items);
	        state.ancestors.pop();
	    };
	    abbr.children.forEach(callback);
	}
	function createWalkState(config) {
	    return {
	        // @ts-ignore: Will set value in iterator
	        current: null,
	        parent: void 0,
	        ancestors: [],
	        config,
	        field: 1,
	        out: createOutputStream(config.options)
	    };
	}

	var caret = [{ type: 'Field', index: 0, name: '' }];
	/**
	 * Check if given node is a snippet: a node without name and attributes
	 */
	function isSnippet(node) {
	    return node ? !node.name && !node.attributes : false;
	}
	/**
	 * Check if given node is inline-level element, e.g. element with explicitly
	 * defined node name
	 */
	function isInlineElement(node, config) {
	    return node ? isInline(node, config) : false;
	}
	/**
	 * Check if given value token is a field
	 */
	function isField$1(token) {
	    return typeof token === 'object' && token.type === 'Field';
	}
	function pushTokens(tokens, state) {
	    var { out } = state;
	    var largestIndex = -1;
	    for (var t of tokens) {
	        if (typeof t === 'string') {
	            pushString(out, t);
	        }
	        else {
	            pushField(out, state.field + t.index, t.name);
	            if (t.index > largestIndex) {
	                largestIndex = t.index;
	            }
	        }
	    }
	    if (largestIndex !== -1) {
	        state.field += largestIndex + 1;
	    }
	}
	/**
	 * Splits given value token by lines: returns array where each entry is a token list
	 * for a single line
	 */
	function splitByLines$1(tokens) {
	    var result = [];
	    var line = [];
	    for (var t of tokens) {
	        if (typeof t === 'string') {
	            var lines = t.split(/\r\n?|\n/g);
	            line.push(lines.shift() || '');
	            while (lines.length) {
	                result.push(line);
	                line = [lines.shift() || ''];
	            }
	        }
	        else {
	            line.push(t);
	        }
	    }
	    line.length && result.push(line);
	    return result;
	}
	/**
	 * Check if given attribute should be outputted
	 */
	function shouldOutputAttribute(attr) {
	    // In case if attribute is implied, check if it has a defined value:
	    // either non-empty value or quoted empty value
	    return !attr.implied || attr.valueType !== 'raw' || (!!attr.value && attr.value.length > 0);
	}

	/**
	 * Splits given string into template tokens.
	 * Template is a string which contains placeholders which are uppercase names
	 * between `[` and `]`, for example: `[PLACEHOLDER]`.
	 * Unlike other templates, a placeholder may contain extra characters before and
	 * after name: `[%PLACEHOLDER.]`. If data for `PLACEHOLDER` is defined, it will
	 * be outputted with with these extra character, otherwise will be completely omitted.
	 */
	function template(text) {
	    var tokens = [];
	    var scanner = { pos: 0, text };
	    var placeholder;
	    var offset = scanner.pos;
	    var pos = scanner.pos;
	    while (scanner.pos < scanner.text.length) {
	        pos = scanner.pos;
	        if (placeholder = consumePlaceholder$2(scanner)) {
	            if (offset !== scanner.pos) {
	                tokens.push(text.slice(offset, pos));
	            }
	            tokens.push(placeholder);
	            offset = scanner.pos;
	        }
	        else {
	            scanner.pos++;
	        }
	    }
	    if (offset !== scanner.pos) {
	        tokens.push(text.slice(offset));
	    }
	    return tokens;
	}
	/**
	 * Consumes placeholder like `[#ID]` from given scanner
	 */
	function consumePlaceholder$2(scanner) {
	    if (peek$2(scanner) === 91 /* Start */) {
	        var start = ++scanner.pos;
	        var namePos = start;
	        var afterPos = start;
	        var stack = 1;
	        while (scanner.pos < scanner.text.length) {
	            var code = peek$2(scanner);
	            if (isTokenStart(code)) {
	                namePos = scanner.pos;
	                while (isToken(peek$2(scanner))) {
	                    scanner.pos++;
	                }
	                afterPos = scanner.pos;
	            }
	            else {
	                if (code === 91 /* Start */) {
	                    stack++;
	                }
	                else if (code === 93 /* End */) {
	                    if (--stack === 0) {
	                        return {
	                            before: scanner.text.slice(start, namePos),
	                            after: scanner.text.slice(afterPos, scanner.pos++),
	                            name: scanner.text.slice(namePos, afterPos)
	                        };
	                    }
	                }
	                scanner.pos++;
	            }
	        }
	    }
	}
	function peek$2(scanner, pos = scanner.pos) {
	    return scanner.text.charCodeAt(pos);
	}
	function isTokenStart(code) {
	    return code >= 65 && code <= 90; // A-Z
	}
	function isToken(code) {
	    return isTokenStart(code)
	        || (code > 47 && code < 58) /* 0-9 */
	        || code === 95 /* Underscore */
	        || code === 45 /* Dash */;
	}

	function createCommentState(config) {
	    var { options } = config;
	    return {
	        enabled: options['comment.enabled'],
	        trigger: options['comment.trigger'],
	        before: options['comment.before'] ? template(options['comment.before']) : void 0,
	        after: options['comment.after'] ? template(options['comment.after']) : void 0
	    };
	}
	/**
	 * Adds comment prefix for given node, if required
	 */
	function commentNodeBefore(node, state) {
	    if (shouldComment(node, state) && state.comment.before) {
	        output(node, state.comment.before, state);
	    }
	}
	/**
	 * Adds comment suffix for given node, if required
	 */
	function commentNodeAfter(node, state) {
	    if (shouldComment(node, state) && state.comment.after) {
	        output(node, state.comment.after, state);
	    }
	}
	/**
	 * Check if given node should be commented
	 */
	function shouldComment(node, state) {
	    var { comment } = state;
	    if (!comment.enabled || !comment.trigger || !node.name || !node.attributes) {
	        return false;
	    }
	    for (var attr of node.attributes) {
	        if (attr.name && comment.trigger.includes(attr.name)) {
	            return true;
	        }
	    }
	    return false;
	}
	/**
	 * Pushes given template tokens into output stream
	 */
	function output(node, tokens, state) {
	    var attrs = {};
	    var { out } = state;
	    // Collect attributes payload
	    for (var attr of node.attributes) {
	        if (attr.name && attr.value) {
	            attrs[attr.name.toUpperCase()] = attr.value;
	        }
	    }
	    // Output parsed tokens
	    for (var token of tokens) {
	        if (typeof token === 'string') {
	            pushString(out, token);
	        }
	        else if (attrs[token.name]) {
	            pushString(out, token.before);
	            pushTokens(attrs[token.name], state);
	            pushString(out, token.after);
	        }
	    }
	}

	function html(abbr, config) {
	    var state = createWalkState(config);
	    state.comment = createCommentState(config);
	    walk$1(abbr, element$1, state);
	    return state.out.value;
	}
	/**
	 * Outputs `node` content to output stream of `state`
	 * @param node Context node
	 * @param index Index of `node` in `items`
	 * @param items List of `node`’s siblings
	 * @param state Current walk state
	 */
	function element$1(node, index, items, state, next) {
	    var { out, config } = state;
	    var format = shouldFormat(node, index, items, state);
	    // Pick offset level for current node
	    var level = getIndent(state);
	    out.level += level;
	    format && pushNewline(out, true);
	    if (node.name) {
	        var name = tagName(node.name, config);
	        commentNodeBefore(node, state);
	        pushString(out, `<${name}`);
	        if (node.attributes) {
	            for (var attr of node.attributes) {
	                if (shouldOutputAttribute(attr)) {
	                    pushAttribute(attr, state);
	                }
	            }
	        }
	        if (node.selfClosing && !node.children.length && !node.value) {
	            pushString(out, `${selfClose(config)}>`);
	        }
	        else {
	            pushString(out, '>');
	            if (!pushSnippet(node, state, next)) {
	                if (node.value) {
	                    var innerFormat = node.value.some(hasNewline);
	                    innerFormat && pushNewline(state.out, ++out.level);
	                    pushTokens(node.value, state);
	                    innerFormat && pushNewline(state.out, --out.level);
	                }
	                node.children.forEach(next);
	                if (!node.value && !node.children.length) {
	                    var innerFormat = config.options['output.formatLeafNode']
	                        || config.options['output.formatForce'].includes(node.name);
	                    innerFormat && pushNewline(state.out, ++out.level);
	                    pushTokens(caret, state);
	                    innerFormat && pushNewline(state.out, --out.level);
	                }
	            }
	            pushString(out, `</${name}>`);
	            commentNodeAfter(node, state);
	        }
	    }
	    else if (!pushSnippet(node, state, next) && node.value) {
	        // A text-only node (snippet)
	        pushTokens(node.value, state);
	        node.children.forEach(next);
	    }
	    if (format && index === items.length - 1 && state.parent) {
	        var offset = isSnippet(state.parent) ? 0 : 1;
	        pushNewline(out, out.level - offset);
	    }
	    out.level -= level;
	}
	/**
	 * Outputs given attribute’s content into output stream
	 */
	function pushAttribute(attr, state) {
	    var { out, config } = state;
	    if (attr.name) {
	        var name = attrName(attr.name, config);
	        var lQuote = attrQuote(attr, config, true);
	        var rQuote = attrQuote(attr, config);
	        var value = attr.value;
	        if (isBooleanAttribute(attr, config) && !value) {
	            // If attribute value is omitted and it’s a boolean value, check for
	            // `compactBoolean` option: if it’s disabled, set value to attribute name
	            // (XML style)
	            if (!config.options['output.compactBoolean']) {
	                value = [name];
	            }
	        }
	        else if (!value) {
	            value = caret;
	        }
	        pushString(out, ' ' + name);
	        if (value) {
	            pushString(out, '=' + lQuote);
	            pushTokens(value, state);
	            pushString(out, rQuote);
	        }
	        else if (config.options['output.selfClosingStyle'] !== 'html') {
	            pushString(out, '=' + lQuote + rQuote);
	        }
	    }
	}
	function pushSnippet(node, state, next) {
	    if (node.value && node.children.length) {
	        // We have a value and child nodes. In case if value contains fields,
	        // we should output children as a content of first field
	        var fieldIx = node.value.findIndex(isField$1);
	        if (fieldIx !== -1) {
	            pushTokens(node.value.slice(0, fieldIx), state);
	            var line = state.out.line;
	            var pos = fieldIx + 1;
	            node.children.forEach(next);
	            // If there was a line change, trim leading whitespace for better result
	            if (state.out.line !== line && typeof node.value[pos] === 'string') {
	                pushString(state.out, node.value[pos++].trimLeft());
	            }
	            pushTokens(node.value.slice(pos), state);
	            return true;
	        }
	    }
	    return false;
	}
	/**
	 * Check if given node should be formatted in its parent context
	 */
	function shouldFormat(node, index, items, state) {
	    var { config, parent } = state;
	    if (!config.options['output.format']) {
	        return false;
	    }
	    if (index === 0 && !parent) {
	        // Do not format very first node
	        return false;
	    }
	    // Do not format single child of snippet
	    if (parent && isSnippet(parent) && items.length === 1) {
	        return false;
	    }
	    /**
	     * Adjacent text-only/snippet nodes
	     */
	    if (isSnippet(node)) {
	        // Adjacent text-only/snippet nodes
	        var format = isSnippet(items[index - 1]) || isSnippet(items[index + 1])
	            // Has newlines: looks like wrapping code fragment
	            || node.value.some(hasNewline)
	            // Format as wrapper: contains children which will be outputted as field content
	            || (node.value.some(isField$1) && node.children.length);
	        if (format) {
	            return true;
	        }
	    }
	    if (isInline(node, config)) {
	        // Check if inline node is the next sibling of block-level node
	        if (index === 0) {
	            // First node in parent: format if it’s followed by a block-level element
	            for (var i = 0; i < items.length; i++) {
	                if (!isInline(items[i], config)) {
	                    return true;
	                }
	            }
	        }
	        else if (!isInline(items[index - 1], config)) {
	            // Node is right after block-level element
	            return true;
	        }
	        if (config.options['output.inlineBreak']) {
	            // check for adjacent inline elements before and after current element
	            var adjacentInline = 1;
	            var before = index;
	            var after = index;
	            while (isInlineElement(items[--before], config)) {
	                adjacentInline++;
	            }
	            while (isInlineElement(items[++after], config)) {
	                adjacentInline++;
	            }
	            if (adjacentInline >= config.options['output.inlineBreak']) {
	                return true;
	            }
	        }
	        // Edge case: inline node contains node that should receive formatting
	        for (var i = 0, il = node.children.length; i < il; i++) {
	            if (shouldFormat(node.children[i], i, node.children, state)) {
	                return true;
	            }
	        }
	        return false;
	    }
	    return true;
	}
	/**
	 * Returns indentation offset for given node
	 */
	function getIndent(state) {
	    var { config, parent } = state;
	    if (!parent || isSnippet(parent) || (parent.name && config.options['output.formatSkip'].includes(parent.name))) {
	        return 0;
	    }
	    return 1;
	}
	/**
	 * Check if given node value contains newlines
	 */
	function hasNewline(value) {
	    return typeof value === 'string' && /\r|\n/.test(value);
	}

	function indentFormat(abbr, config, options) {
	    var state = createWalkState(config);
	    state.options = options || {};
	    walk$1(abbr, element$2, state);
	    return state.out.value;
	}
	/**
	 * Outputs `node` content to output stream of `state`
	 * @param node Context node
	 * @param index Index of `node` in `items`
	 * @param items List of `node`’s siblings
	 * @param state Current walk state
	 */
	function element$2(node, index, items, state, next) {
	    var { out, options } = state;
	    var { primary, secondary } = collectAttributes(node);
	    // Pick offset level for current node
	    var level = state.parent ? 1 : 0;
	    out.level += level;
	    // Do not indent top-level elements
	    if (shouldFormat$1(node, index, items, state)) {
	        pushNewline(out, true);
	    }
	    if (node.name && (node.name !== 'div' || !primary.length)) {
	        pushString(out, (options.beforeName || '') + node.name + (options.afterName || ''));
	    }
	    pushPrimaryAttributes(primary, state);
	    pushSecondaryAttributes(secondary.filter(shouldOutputAttribute), state);
	    if (node.selfClosing && !node.value && !node.children.length) {
	        pushString(out, '/');
	    }
	    else {
	        pushValue(node, state);
	        node.children.forEach(next);
	    }
	    out.level -= level;
	}
	/**
	 * From given node, collects all attributes as `primary` (id, class) and
	 * `secondary` (all the rest) lists. In most indent-based syntaxes, primary attribute
	 * has special syntax
	 */
	function collectAttributes(node) {
	    var primary = [];
	    var secondary = [];
	    if (node.attributes) {
	        for (var attr of node.attributes) {
	            if (isPrimaryAttribute(attr)) {
	                primary.push(attr);
	            }
	            else {
	                secondary.push(attr);
	            }
	        }
	    }
	    return { primary, secondary };
	}
	/**
	 * Outputs given attributes as primary into output stream
	 */
	function pushPrimaryAttributes(attrs, state) {
	    for (var attr of attrs) {
	        if (attr.value) {
	            if (attr.name === 'class') {
	                pushString(state.out, '.');
	                // All whitespace characters must be replaced with dots in class names
	                var tokens = attr.value.map(t => typeof t === 'string' ? t.replace(/\s+/g, '.') : t);
	                pushTokens(tokens, state);
	            }
	            else {
	                // ID attribute
	                pushString(state.out, '#');
	                pushTokens(attr.value, state);
	            }
	        }
	    }
	}
	/**
	 * Outputs given attributes as secondary into output stream
	 */
	function pushSecondaryAttributes(attrs, state) {
	    if (attrs.length) {
	        var { out, config, options } = state;
	        options.beforeAttribute && pushString(out, options.beforeAttribute);
	        for (var i = 0; i < attrs.length; i++) {
	            var attr = attrs[i];
	            pushString(out, attrName(attr.name || '', config));
	            if (isBooleanAttribute(attr, config) && !attr.value) {
	                if (!config.options['output.compactBoolean'] && options.booleanValue) {
	                    pushString(out, '=' + options.booleanValue);
	                }
	            }
	            else {
	                pushString(out, '=' + attrQuote(attr, config, true));
	                pushTokens(attr.value || caret, state);
	                pushString(out, attrQuote(attr, config));
	            }
	            if (i !== attrs.length - 1 && options.glueAttribute) {
	                pushString(out, options.glueAttribute);
	            }
	        }
	        options.afterAttribute && pushString(out, options.afterAttribute);
	    }
	}
	/**
	 * Outputs given node value into state output stream
	 */
	function pushValue(node, state) {
	    // We should either output value or add caret but for leaf nodes only (no children)
	    if (!node.value && node.children.length) {
	        return;
	    }
	    var value = node.value || caret;
	    var lines = splitByLines$1(value);
	    var { out, options } = state;
	    if (lines.length === 1) {
	        if (node.name || node.attributes) {
	            push(out, ' ');
	        }
	        pushTokens(value, state);
	    }
	    else {
	        // We should format multi-line value with terminating `|` character
	        // and same line length
	        var lineLengths = [];
	        var maxLength = 0;
	        // Calculate lengths of all lines and max line length
	        for (var line of lines) {
	            var len = valueLength(line);
	            lineLengths.push(len);
	            if (len > maxLength) {
	                maxLength = len;
	            }
	        }
	        // Output each line, padded to max length
	        out.level++;
	        for (var i = 0; i < lines.length; i++) {
	            pushNewline(out, true);
	            options.beforeTextLine && push(out, options.beforeTextLine);
	            pushTokens(lines[i], state);
	            if (options.afterTextLine) {
	                push(out, ' '.repeat(maxLength - lineLengths[i]));
	                push(out, options.afterTextLine);
	            }
	        }
	        out.level--;
	    }
	}
	function isPrimaryAttribute(attr) {
	    return attr.name === 'class' || attr.name === 'id';
	}
	/**
	 * Calculates string length from given tokens
	 */
	function valueLength(tokens) {
	    var len = 0;
	    for (var token of tokens) {
	        len += typeof token === 'string' ? token.length : token.name.length;
	    }
	    return len;
	}
	function shouldFormat$1(node, index, items, state) {
	    // Do not format first top-level element or snippets
	    if (!state.parent && index === 0) {
	        return false;
	    }
	    return !isSnippet(node);
	}

	function haml(abbr, config) {
	    return indentFormat(abbr, config, {
	        beforeName: '%',
	        beforeAttribute: '(',
	        afterAttribute: ')',
	        glueAttribute: ' ',
	        afterTextLine: ' |',
	        booleanValue: 'true'
	    });
	}

	function slim(abbr, config) {
	    return indentFormat(abbr, config, {
	        beforeAttribute: ' ',
	        glueAttribute: ' ',
	        beforeTextLine: '| '
	    });
	}

	function pug(abbr, config) {
	    return indentFormat(abbr, config, {
	        beforeAttribute: '(',
	        afterAttribute: ')',
	        glueAttribute: ', ',
	        beforeTextLine: '| '
	    });
	}

	var formatters = { html, haml, slim, pug };
	/**
	 * Parses given Emmet abbreviation into a final abbreviation tree with all
	 * required transformations applied
	 */
	function parse$1(abbr, config) {
	    if (typeof abbr === 'string') {
	        var parseOpt = config;
	        if (config.options['jsx.enabled']) {
	            parseOpt = Object.assign(Object.assign({}, parseOpt), { jsx: true });
	        }
	        abbr = parseAbbreviation(abbr, parseOpt);
	    }
	    // Run abbreviation resolve in two passes:
	    // 1. Map each node to snippets, which are abbreviations as well. A single snippet
	    // may produce multiple nodes
	    // 2. Transform every resolved node
	    abbr = resolveSnippets(abbr, config);
	    walk(abbr, transform, config);
	    return abbr;
	}
	/**
	 * Converts given abbreviation to string according to provided `config`
	 */
	function stringify$1(abbr, config) {
	    var formatter = formatters[config.syntax] || html;
	    return formatter(abbr, config);
	}
	/**
	 * Modifies given node and prepares it for output
	 */
	function transform(node, ancestors, config) {
	    implicitTag(node, ancestors, config);
	    mergeAttributes(node, config);
	    lorem(node, ancestors, config);
	    if (config.syntax === 'xsl') {
	        xsl(node);
	    }
	    if (config.options['jsx.enabled']) {
	        jsx(node);
	    }
	    if (config.options['bem.enabled']) {
	        bem(node, ancestors, config);
	    }
	}

	var reProperty = /^([a-z-]+)(?:\s*:\s*([^\n\r;]+?);*)?$/;
	var opt = { value: true };
	/**
	 * Creates structure for holding resolved CSS snippet
	 */
	function createSnippet(key, value) {
	    // A snippet could be a raw text snippet (e.g. arbitrary text string) or a
	    // CSS property with possible values separated by `|`.
	    // In latter case, we have to parse snippet as CSS abbreviation
	    var m = value.match(reProperty);
	    if (m) {
	        var keywords = {};
	        var parsed = m[2] ? m[2].split('|').map(parseValue) : [];
	        for (var item of parsed) {
	            for (var cssVal of item) {
	                collectKeywords(cssVal, keywords);
	            }
	        }
	        return {
	            type: "Property" /* Property */,
	            key,
	            property: m[1],
	            value: parsed,
	            keywords,
	            dependencies: []
	        };
	    }
	    return { type: "Raw" /* Raw */, key, value };
	}
	/**
	 * Nests more specific CSS properties into shorthand ones, e.g.
	 * `background-position-x` -> `background-position` -> `background`
	 */
	function nest(snippets) {
	    snippets = snippets.slice().sort(snippetsSort);
	    var stack = [];
	    var prev;
	    // For sorted list of CSS properties, create dependency graph where each
	    // shorthand property contains its more specific one, e.g.
	    // background -> background-position -> background-position-x
	    for (var cur of snippets.filter(isProperty)) {
	        // Check if current property belongs to one from parent stack.
	        // Since `snippets` array is sorted, items are perfectly aligned
	        // from shorthands to more specific variants
	        while (stack.length) {
	            prev = stack[stack.length - 1];
	            if (cur.property.startsWith(prev.property)
	                && cur.property.charCodeAt(prev.property.length) === 45 /* - */) {
	                prev.dependencies.push(cur);
	                stack.push(cur);
	                break;
	            }
	            stack.pop();
	        }
	        if (!stack.length) {
	            stack.push(cur);
	        }
	    }
	    return snippets;
	}
	/**
	 * A sorting function for array of snippets
	 */
	function snippetsSort(a, b) {
	    if (a.key === b.key) {
	        return 0;
	    }
	    return a.key < b.key ? -1 : 1;
	}
	function parseValue(value) {
	    return parse(value.trim(), opt)[0].value;
	}
	function isProperty(snippet) {
	    return snippet.type === "Property" /* Property */;
	}
	function collectKeywords(cssVal, dest) {
	    for (var v of cssVal.value) {
	        if (v.type === 'Literal') {
	            dest[v.value] = v;
	        }
	        else if (v.type === 'FunctionCall') {
	            dest[v.name] = v;
	        }
	        else if (v.type === 'Field') {
	            // Create literal from field, if available
	            var value = v.name.trim();
	            if (value) {
	                dest[value] = { type: 'Literal', value };
	            }
	        }
	    }
	}

	/**
	 * Calculates fuzzy match score of how close `abbr` matches given `string`.
	 * @param abbr Abbreviation to score
	 * @param str String to match
	 * @return Match score
	 */
	function calculateScore(abbr, str) {
	    abbr = abbr.toLowerCase();
	    str = str.toLowerCase();
	    if (abbr === str) {
	        return 1;
	    }
	    // a string MUST start with the same character as abbreviation
	    if (!str || abbr.charCodeAt(0) !== str.charCodeAt(0)) {
	        return 0;
	    }
	    var abbrLength = abbr.length;
	    var stringLength = str.length;
	    var i = 1;
	    var j = 1;
	    var score = stringLength;
	    var ch1;
	    var ch2;
	    var found;
	    var acronym;
	    while (i < abbrLength) {
	        ch1 = abbr.charCodeAt(i);
	        found = false;
	        acronym = false;
	        while (j < stringLength) {
	            ch2 = str.charCodeAt(j);
	            if (ch1 === ch2) {
	                found = true;
	                score += (stringLength - j) * (acronym ? 2 : 1);
	                break;
	            }
	            // add acronym bonus for exactly next match after unmatched `-`
	            acronym = ch2 === 45 /* - */;
	            j++;
	        }
	        if (!found) {
	            break;
	        }
	        i++;
	    }
	    return score && score * (i / abbrLength) / sum(stringLength);
	}
	/**
	 * Calculates sum of first `n` numbers, e.g. 1+2+3+...n
	 */
	function sum(n) {
	    return n * (n + 1) / 2;
	}

	function color(token, shortHex) {
	    if (!token.r && !token.g && !token.b && !token.a) {
	        return 'transparent';
	    }
	    else if (token.a === 1) {
	        return asHex(token, shortHex);
	    }
	    return asRGB(token);
	}
	/**
	 * Output given color as hex value
	 * @param short Produce short value (e.g. #fff instead of #ffffff), if possible
	 */
	function asHex(token, short) {
	    var fn = (short && isShortHex(token.r) && isShortHex(token.g) && isShortHex(token.b))
	        ? toShortHex : toHex;
	    return '#' + fn(token.r) + fn(token.g) + fn(token.b);
	}
	/**
	 * Output current color as `rgba?(...)` CSS color
	 */
	function asRGB(token) {
	    var values = [token.r, token.g, token.b];
	    if (token.a !== 1) {
	        values.push(frac(token.a, 8));
	    }
	    return `${values.length === 3 ? 'rgb' : 'rgba'}(${values.join(', ')})`;
	}
	function frac(num, digits = 4) {
	    return num.toFixed(digits).replace(/\.?0+$/, '');
	}
	function isShortHex(hex) {
	    return !(hex % 17);
	}
	function toShortHex(num) {
	    return (num >> 4).toString(16);
	}
	function toHex(num) {
	    return pad(num.toString(16), 2);
	}
	function pad(value, len) {
	    while (value.length < len) {
	        value = '0' + value;
	    }
	    return value;
	}

	function css(abbr, config) {
	    var out = createOutputStream(config.options);
	    var format = config.options['output.format'];
	    for (var i = 0; i < abbr.length; i++) {
	        if (format && i !== 0) {
	            pushNewline(out, true);
	        }
	        property(abbr[i], out, config);
	    }
	    return out.value;
	}
	/**
	 * Outputs given abbreviation node into output stream
	 */
	function property(node, out, config) {
	    var isJSON = config.options['stylesheet.json'];
	    if (node.name) {
	        // It’s a CSS property
	        var name = isJSON ? toCamelCase(node.name) : node.name;
	        pushString(out, name + config.options['stylesheet.between']);
	        if (node.value.length) {
	            propertyValue(node, out, config);
	        }
	        else {
	            pushField(out, 0, '');
	        }
	        if (isJSON) {
	            // For CSS-in-JS, always finalize property with comma
	            // NB: seems like `important` is not available in CSS-in-JS syntaxes
	            push(out, ',');
	        }
	        else {
	            outputImportant(node, out, true);
	            push(out, config.options['stylesheet.after']);
	        }
	    }
	    else {
	        // It’s a regular snippet, output plain tokens without any additional formatting
	        for (var cssVal of node.value) {
	            for (var v of cssVal.value) {
	                outputToken(v, out, config);
	            }
	        }
	        outputImportant(node, out, node.value.length > 0);
	    }
	}
	function propertyValue(node, out, config) {
	    var isJSON = config.options['stylesheet.json'];
	    var num = isJSON ? getSingleNumeric(node) : null;
	    if (num && (!num.unit || num.unit === 'px')) {
	        // For CSS-in-JS, if property contains single numeric value, output it
	        // as JS number
	        push(out, String(num.value));
	    }
	    else {
	        var quote = getQuote(config);
	        isJSON && push(out, quote);
	        for (var i = 0; i < node.value.length; i++) {
	            if (i !== 0) {
	                push(out, ', ');
	            }
	            outputValue(node.value[i], out, config);
	        }
	        isJSON && push(out, quote);
	    }
	}
	function outputImportant(node, out, separator) {
	    if (node.important) {
	        if (separator) {
	            push(out, ' ');
	        }
	        push(out, '!important');
	    }
	}
	function outputValue(value, out, config) {
	    for (var i = 0; i < value.value.length; i++) {
	        var token = value.value[i];
	        if (i !== 0) {
	            push(out, ' ');
	        }
	        outputToken(token, out, config);
	    }
	}
	function outputToken(token, out, config) {
	    if (token.type === 'ColorValue') {
	        push(out, color(token, config.options['stylesheet.shortHex']));
	    }
	    else if (token.type === 'Literal') {
	        pushString(out, token.value);
	    }
	    else if (token.type === 'NumberValue') {
	        pushString(out, frac(token.value, 4) + token.unit);
	    }
	    else if (token.type === 'StringValue') {
	        var quote = token.quote === 'double' ? '"' : '\'';
	        pushString(out, quote + token.value + quote);
	    }
	    else if (token.type === 'Field') {
	        pushField(out, token.index, token.name);
	    }
	    else if (token.type === 'FunctionCall') {
	        push(out, token.name + '(');
	        for (var i = 0; i < token.arguments.length; i++) {
	            if (i) {
	                push(out, ', ');
	            }
	            outputValue(token.arguments[i], out, config);
	        }
	        push(out, ')');
	    }
	}
	/**
	 * If value of given property is a single numeric value, returns this token
	 */
	function getSingleNumeric(node) {
	    if (node.value.length === 1) {
	        var cssVal = node.value[0];
	        if (cssVal.value.length === 1 && cssVal.value[0].type === 'NumberValue') {
	            return cssVal.value[0];
	        }
	    }
	}
	/**
	 * Converts kebab-case string to camelCase
	 */
	function toCamelCase(str) {
	    return str.replace(/\-(\w)/g, (_, letter) => letter.toUpperCase());
	}
	function getQuote(config) {
	    return config.options['stylesheet.jsonDoubleQuotes'] ? '"' : '\'';
	}

	var gradientName = 'lg';
	/**
	 * Parses given Emmet abbreviation into a final abbreviation tree with all
	 * required transformations applied
	 */
	function parse$2(abbr, config, snippets = convertSnippets(config.snippets)) {
	    if (typeof abbr === 'string') {
	        abbr = parse(abbr, { value: !!config.context });
	    }
	    for (var node of abbr) {
	        resolveNode(node, snippets, config);
	    }
	    return abbr;
	}
	/**
	 * Converts given raw snippets into internal snippets representation
	 */
	function convertSnippets(snippets) {
	    var result = [];
	    for (var key of Object.keys(snippets)) {
	        result.push(createSnippet(key, snippets[key]));
	    }
	    return nest(result);
	}
	/**
	 * Resolves given node: finds matched CSS snippets using fuzzy match and resolves
	 * keyword aliases from node value
	 */
	function resolveNode(node, snippets, config) {
	    if (!resolveGradient(node, config)) {
	        var score = config.options['stylesheet.fuzzySearchMinScore'];
	        if (config.context) {
	            // Resolve as value of given CSS property
	            var propName = config.context.name;
	            var snippet = snippets.find(s => s.type === "Property" /* Property */ && s.property === propName);
	            resolveValueKeywords(node, config, snippet, score);
	        }
	        else if (node.name) {
	            var snippet = findBestMatch(node.name, snippets, score);
	            if (snippet) {
	                if (snippet.type === "Property" /* Property */) {
	                    resolveAsProperty(node, snippet, config);
	                }
	                else {
	                    resolveAsSnippet(node, snippet);
	                }
	            }
	        }
	    }
	    if (node.name || config.context) {
	        // Resolve numeric values for CSS properties only
	        resolveNumericValue(node, config);
	    }
	    return node;
	}
	/**
	 * Resolves CSS gradient shortcut from given property, if possible
	 */
	function resolveGradient(node, config) {
	    var gradientFn = null;
	    var cssVal = node.value.length === 1 ? node.value[0] : null;
	    if (cssVal && cssVal.value.length === 1) {
	        var v = cssVal.value[0];
	        if (v.type === 'FunctionCall' && v.name === gradientName) {
	            gradientFn = v;
	        }
	    }
	    if (gradientFn || node.name === gradientName) {
	        if (!gradientFn) {
	            gradientFn = {
	                type: 'FunctionCall',
	                name: 'linear-gradient',
	                arguments: [cssValue(field$2(0, ''))]
	            };
	        }
	        else {
	            gradientFn = Object.assign(Object.assign({}, gradientFn), { name: 'linear-gradient' });
	        }
	        if (!config.context) {
	            node.name = 'background-image';
	        }
	        node.value = [cssValue(gradientFn)];
	        return true;
	    }
	    return false;
	}
	/**
	 * Resolves given parsed abbreviation node as CSS property
	 */
	function resolveAsProperty(node, snippet, config) {
	    var abbr = node.name;
	    node.name = snippet.property;
	    if (!node.value.length) {
	        // No value defined in abbreviation node, try to resolve unmatched part
	        // as a keyword alias
	        var inlineValue = getUnmatchedPart(abbr, snippet.key);
	        var kw = inlineValue ? resolveKeyword(inlineValue, config, snippet) : null;
	        if (kw) {
	            node.value.push(cssValue(kw));
	        }
	        else if (snippet.value.length) {
	            var defaultValue = snippet.value[0];
	            // https://github.com/emmetio/emmet/issues/558
	            // We should auto-select inserted value only if there’s multiple value
	            // choice
	            node.value = snippet.value.length === 1 || defaultValue.some(hasField)
	                ? defaultValue
	                : defaultValue.map(n => wrapWithField(n, config));
	        }
	    }
	    else {
	        // Replace keyword alias from current abbreviation node with matched keyword
	        resolveValueKeywords(node, config, snippet);
	    }
	    return node;
	}
	function resolveValueKeywords(node, config, snippet, minScore) {
	    for (var cssVal of node.value) {
	        var value = [];
	        for (var token of cssVal.value) {
	            if (token.type === 'Literal') {
	                value.push(resolveKeyword(token.value, config, snippet, minScore) || token);
	            }
	            else if (token.type === 'FunctionCall') {
	                // For function calls, we should find matching function call
	                // and merge arguments
	                var match = resolveKeyword(token.name, config, snippet, minScore);
	                if (match && match.type === 'FunctionCall') {
	                    value.push(Object.assign(Object.assign({}, match), { arguments: token.arguments.concat(match.arguments.slice(token.arguments.length)) }));
	                }
	                else {
	                    value.push(token);
	                }
	            }
	            else {
	                value.push(token);
	            }
	        }
	        cssVal.value = value;
	    }
	}
	/**
	 * Resolves given parsed abbreviation node as a snippet: a plain code chunk
	 */
	function resolveAsSnippet(node, snippet) {
	    // When resolving snippets, we have to do the following:
	    // 1. Replace field placeholders with actual field tokens.
	    // 2. If input values given, put them instead of fields
	    var offset = 0;
	    var m;
	    var reField = /\$\{(\d+)(:[^}]+)?\}/g;
	    var inputValue = node.value[0];
	    var outputValue = [];
	    while (m = reField.exec(snippet.value)) {
	        if (offset !== m.index) {
	            outputValue.push(literal$3(snippet.value.slice(offset, m.index)));
	        }
	        offset = m.index + m[0].length;
	        if (inputValue && inputValue.value.length) {
	            outputValue.push(inputValue.value.shift());
	        }
	        else {
	            outputValue.push(field$2(Number(m[1]), m[2] ? m[2].slice(1) : ''));
	        }
	    }
	    var tail = snippet.value.slice(offset);
	    if (tail) {
	        outputValue.push(literal$3(tail));
	    }
	    node.name = void 0;
	    node.value = [cssValue(...outputValue)];
	    return node;
	}
	/**
	 * Finds best matching item from `items` array
	 * @param abbr  Abbreviation to match
	 * @param items List of items for match
	 * @param minScore The minimum score the best matched item should have to be a valid match.
	 */
	function findBestMatch(abbr, items, minScore = 0) {
	    var matchedItem = null;
	    var maxScore = 0;
	    for (var item of items) {
	        var score = calculateScore(abbr, getScoringPart(item));
	        if (score === 1) {
	            // direct hit, no need to look further
	            return item;
	        }
	        if (score && score >= maxScore) {
	            maxScore = score;
	            matchedItem = item;
	        }
	    }
	    return maxScore >= minScore ? matchedItem : null;
	}
	function getScoringPart(item) {
	    return typeof item === 'string' ? item : item.key;
	}
	/**
	 * Returns a part of `abbr` that wasn’t directly matched against `str`.
	 * For example, if abbreviation `poas` is matched against `position`,
	 * the unmatched part will be `as` since `a` wasn’t found in string stream
	 */
	function getUnmatchedPart(abbr, str) {
	    for (var i = 0, lastPos = 0; i < abbr.length; i++) {
	        lastPos = str.indexOf(abbr[i], lastPos);
	        if (lastPos === -1) {
	            return abbr.slice(i);
	        }
	        lastPos++;
	    }
	    return '';
	}
	/**
	 * Resolves given keyword shorthand into matched snippet keyword or global keyword,
	 * if possible
	 */
	function resolveKeyword(kw, config, snippet, minScore) {
	    var ref;
	    if (snippet) {
	        if (ref = findBestMatch(kw, Object.keys(snippet.keywords), minScore)) {
	            return snippet.keywords[ref];
	        }
	        for (var dep of snippet.dependencies) {
	            if (ref = findBestMatch(kw, Object.keys(dep.keywords), minScore)) {
	                return dep.keywords[ref];
	            }
	        }
	    }
	    if (ref = findBestMatch(kw, config.options['stylesheet.keywords'], minScore)) {
	        return literal$3(ref);
	    }
	    return null;
	}
	/**
	 * Resolves numeric values in given abbreviation node
	 */
	function resolveNumericValue(node, config) {
	    var aliases = config.options['stylesheet.unitAliases'];
	    var unitless = config.options['stylesheet.unitless'];
	    for (var v of node.value) {
	        for (var t of v.value) {
	            if (t.type === 'NumberValue') {
	                if (t.unit) {
	                    t.unit = aliases[t.unit] || t.unit;
	                }
	                else if (t.value !== 0 && !unitless.includes(node.name)) {
	                    t.unit = t.rawValue.includes('.')
	                        ? config.options['stylesheet.floatUnit']
	                        : config.options['stylesheet.intUnit'];
	                }
	            }
	        }
	    }
	}
	/**
	 * Constructs CSS value token
	 */
	function cssValue(...args) {
	    return {
	        type: 'CSSValue',
	        value: args
	    };
	}
	/**
	 * Constructs literal token
	 */
	function literal$3(value) {
	    return { type: 'Literal', value };
	}
	/**
	 * Constructs field token
	 */
	function field$2(index, name) {
	    return { type: 'Field', index, name };
	}
	/**
	 * Check if given value contains fields
	 */
	function hasField(value) {
	    for (var v of value.value) {
	        if (v.type === 'Field' || (v.type === 'FunctionCall' && v.arguments.some(hasField))) {
	            return true;
	        }
	    }
	    return false;
	}
	/**
	 * Wraps tokens of given abbreviation with fields
	 */
	function wrapWithField(node, config, state = { index: 1 }) {
	    var value = [];
	    for (var v of node.value) {
	        switch (v.type) {
	            case 'ColorValue':
	                value.push(field$2(state.index++, color(v, config.options['stylesheet.shortHex'])));
	                break;
	            case 'Literal':
	                value.push(field$2(state.index++, v.value));
	                break;
	            case 'NumberValue':
	                value.push(field$2(state.index++, `${v.value}${v.unit}`));
	                break;
	            case 'StringValue':
	                var q = v.quote === 'single' ? '\'' : '"';
	                value.push(field$2(state.index++, q + v.value + q));
	                break;
	            case 'FunctionCall':
	                value.push(field$2(state.index++, v.name), literal$3('('));
	                for (var i = 0, il = v.arguments.length; i < il; i++) {
	                    value = value.concat(wrapWithField(v.arguments[i], config, state).value);
	                    if (i !== il - 1) {
	                        value.push(literal$3(', '));
	                    }
	                }
	                value.push(literal$3(')'));
	                break;
	            default:
	                value.push(v);
	        }
	    }
	    return Object.assign(Object.assign({}, node), { value });
	}

	var markupSnippets = {
		"a": "a[href]",
		"a:blank": "a[href='http://${0}' target='_blank' rel='noopener noreferrer']",
		"a:link": "a[href='http://${0}']",
		"a:mail": "a[href='mailto:${0}']",
		"a:tel": "a[href='tel:+${0}']",
		"abbr": "abbr[title]",
		"acr|acronym": "acronym[title]",
		"base": "base[href]/",
		"basefont": "basefont/",
		"br": "br/",
		"frame": "frame/",
		"hr": "hr/",
		"bdo": "bdo[dir]",
		"bdo:r": "bdo[dir=rtl]",
		"bdo:l": "bdo[dir=ltr]",
		"col": "col/",
		"link": "link[rel=stylesheet href]/",
		"link:css": "link[href='${1:style}.css']",
		"link:print": "link[href='${1:print}.css' media=print]",
		"link:favicon": "link[rel='shortcut icon' type=image/x-icon href='${1:favicon.ico}']",
		"link:mf|link:manifest": "link[rel='manifest' href='${1:manifest.json}']",
		"link:touch": "link[rel=apple-touch-icon href='${1:favicon.png}']",
		"link:rss": "link[rel=alternate type=application/rss+xml title=RSS href='${1:rss.xml}']",
		"link:atom": "link[rel=alternate type=application/atom+xml title=Atom href='${1:atom.xml}']",
		"link:im|link:import": "link[rel=import href='${1:component}.html']",
		"meta": "meta/",
		"meta:utf": "meta[http-equiv=Content-Type content='text/html;charset=UTF-8']",
		"meta:vp": "meta[name=viewport content='width=${1:device-width}, initial-scale=${2:1.0}']",
		"meta:compat": "meta[http-equiv=X-UA-Compatible content='${1:IE=7}']",
		"meta:edge": "meta:compat[content='${1:ie=edge}']",
		"meta:redirect": "meta[http-equiv=refresh content='0; url=${1:http://example.com}']",
		"meta:kw": "meta[name=keywords content]",
		"meta:desc": "meta[name=description content]",
		"style": "style",
		"script": "script",
		"script:src": "script[src]",
		"img": "img[src alt]/",
		"img:s|img:srcset": "img[srcset src alt]",
		"img:z|img:sizes": "img[sizes srcset src alt]",
		"picture": "picture",
		"src|source": "source/",
		"src:sc|source:src": "source[src type]",
		"src:s|source:srcset": "source[srcset]",
		"src:t|source:type": "source[srcset type='${1:image/}']",
		"src:z|source:sizes": "source[sizes srcset]",
		"src:m|source:media": "source[media='(${1:min-width: })' srcset]",
		"src:mt|source:media:type": "source:media[type='${2:image/}']",
		"src:mz|source:media:sizes": "source:media[sizes srcset]",
		"src:zt|source:sizes:type": "source[sizes srcset type='${1:image/}']",
		"iframe": "iframe[src frameborder=0]",
		"embed": "embed[src type]/",
		"object": "object[data type]",
		"param": "param[name value]/",
		"map": "map[name]",
		"area": "area[shape coords href alt]/",
		"area:d": "area[shape=default]",
		"area:c": "area[shape=circle]",
		"area:r": "area[shape=rect]",
		"area:p": "area[shape=poly]",
		"form": "form[action]",
		"form:get": "form[method=get]",
		"form:post": "form[method=post]",
		"label": "label[for]",
		"input": "input[type=${1:text}]/",
		"inp": "input[name=${1} id=${1}]",
		"input:h|input:hidden": "input[type=hidden name]",
		"input:t|input:text": "inp[type=text]",
		"input:search": "inp[type=search]",
		"input:email": "inp[type=email]",
		"input:url": "inp[type=url]",
		"input:p|input:password": "inp[type=password]",
		"input:datetime": "inp[type=datetime]",
		"input:date": "inp[type=date]",
		"input:datetime-local": "inp[type=datetime-local]",
		"input:month": "inp[type=month]",
		"input:week": "inp[type=week]",
		"input:time": "inp[type=time]",
		"input:tel": "inp[type=tel]",
		"input:number": "inp[type=number]",
		"input:color": "inp[type=color]",
		"input:c|input:checkbox": "inp[type=checkbox]",
		"input:r|input:radio": "inp[type=radio]",
		"input:range": "inp[type=range]",
		"input:f|input:file": "inp[type=file]",
		"input:s|input:submit": "input[type=submit value]",
		"input:i|input:image": "input[type=image src alt]",
		"input:b|input:button": "input[type=button value]",
		"input:reset": "input:button[type=reset]",
		"isindex": "isindex/",
		"select": "select[name=${1} id=${1}]",
		"select:d|select:disabled": "select[disabled.]",
		"opt|option": "option[value]",
		"textarea": "textarea[name=${1} id=${1} cols=${2:30} rows=${3:10}]",
		"marquee": "marquee[behavior direction]",
		"menu:c|menu:context": "menu[type=context]",
		"menu:t|menu:toolbar": "menu[type=toolbar]",
		"video": "video[src]",
		"audio": "audio[src]",
		"html:xml": "html[xmlns=http://www.w3.org/1999/xhtml]",
		"keygen": "keygen/",
		"command": "command/",
		"btn:s|button:s|button:submit" : "button[type=submit]",
		"btn:r|button:r|button:reset" : "button[type=reset]",
		"btn:d|button:d|button:disabled" : "button[disabled.]",
		"fst:d|fset:d|fieldset:d|fieldset:disabled" : "fieldset[disabled.]",

		"bq": "blockquote",
		"fig": "figure",
		"figc": "figcaption",
		"pic": "picture",
		"ifr": "iframe",
		"emb": "embed",
		"obj": "object",
		"cap": "caption",
		"colg": "colgroup",
		"fst": "fieldset",
		"btn": "button",
		"optg": "optgroup",
		"tarea": "textarea",
		"leg": "legend",
		"sect": "section",
		"art": "article",
		"hdr": "header",
		"ftr": "footer",
		"adr": "address",
		"dlg": "dialog",
		"str": "strong",
		"prog": "progress",
		"mn": "main",
		"tem": "template",
		"fset": "fieldset",
		"datag": "datagrid",
		"datal": "datalist",
		"kg": "keygen",
		"out": "output",
		"det": "details",
		"cmd": "command",

		"ri:d|ri:dpr": "img:s",
		"ri:v|ri:viewport": "img:z",
		"ri:a|ri:art": "pic>src:m+img",
		"ri:t|ri:type": "pic>src:t+img",

		"!!!": "{<!DOCTYPE html>}",
		"doc": "html[lang=${lang}]>(head>meta[charset=${charset}]+meta:vp+title{${1:Document}})+body",
		"!|html:5": "!!!+doc",

		"c": "{<!-- ${0} -->}",
		"cc:ie": "{<!--[if IE]>${0}<![endif]-->}",
		"cc:noie": "{<!--[if !IE]><!-->${0}<!--<![endif]-->}"
	};

	var stylesheetSnippets = {
		"@f": "@font-face {\n\tfont-family: ${1};\n\tsrc: url(${1});\n}",
		"@ff": "@font-face {\n\tfont-family: '${1:FontName}';\n\tsrc: url('${2:FileName}.eot');\n\tsrc: url('${2:FileName}.eot?#iefix') format('embedded-opentype'),\n\t\t url('${2:FileName}.woff') format('woff'),\n\t\t url('${2:FileName}.ttf') format('truetype'),\n\t\t url('${2:FileName}.svg#${1:FontName}') format('svg');\n\tfont-style: ${3:normal};\n\tfont-weight: ${4:normal};\n}",
		"@i|@import": "@import url(${0});",
		"@kf": "@keyframes ${1:identifier} {\n\t${2}\n}",
		"@m|@media": "@media ${1:screen} {\n\t${0}\n}",
		"ac": "align-content:start|end|flex-start|flex-end|center|space-between|space-around|stretch|space-evenly",
		"ai": "align-items:start|end|flex-start|flex-end|center|baseline|stretch",
		"anim": "animation:${1:name} ${2:duration} ${3:timing-function} ${4:delay} ${5:iteration-count} ${6:direction} ${7:fill-mode}",
		"animdel": "animation-delay:time",
		"animdir": "animation-direction:normal|reverse|alternate|alternate-reverse",
		"animdur": "animation-duration:${1:0}s",
		"animfm": "animation-fill-mode:both|forwards|backwards",
		"animic": "animation-iteration-count:1|infinite",
		"animn": "animation-name",
		"animps": "animation-play-state:running|paused",
		"animtf": "animation-timing-function:linear|ease|ease-in|ease-out|ease-in-out|cubic-bezier(${1:0.1}, ${2:0.7}, ${3:1.0}, ${3:0.1})",
		"ap": "appearance:none",
		"as": "align-self:start|end|auto|flex-start|flex-end|center|baseline|stretch",
		"b": "bottom",
		"bd": "border:${1:1px} ${2:solid} ${3:#000}",
		"bdb": "border-bottom:${1:1px} ${2:solid} ${3:#000}",
		"bdbc": "border-bottom-color:${1:#000}",
		"bdbi": "border-bottom-image:url(${0})",
		"bdbk": "border-break:close",
		"bdbli": "border-bottom-left-image:url(${0})|continue",
		"bdblrs": "border-bottom-left-radius",
		"bdbri": "border-bottom-right-image:url(${0})|continue",
		"bdbrrs": "border-bottom-right-radius",
		"bdbs": "border-bottom-style",
		"bdbw": "border-bottom-width",
		"bdc": "border-color:${1:#000}",
		"bdci": "border-corner-image:url(${0})|continue",
		"bdcl": "border-collapse:collapse|separate",
		"bdf": "border-fit:repeat|clip|scale|stretch|overwrite|overflow|space",
		"bdi": "border-image:url(${0})",
		"bdl": "border-left:${1:1px} ${2:solid} ${3:#000}",
		"bdlc": "border-left-color:${1:#000}",
		"bdlen": "border-length",
		"bdli": "border-left-image:url(${0})",
		"bdls": "border-left-style",
		"bdlw": "border-left-width",
		"bdr": "border-right:${1:1px} ${2:solid} ${3:#000}",
		"bdrc": "border-right-color:${1:#000}",
		"bdri": "border-right-image:url(${0})",
		"bdrs": "border-radius",
		"bdrst": "border-right-style",
		"bdrw": "border-right-width",
		"bds": "border-style:none|hidden|dotted|dashed|solid|double|dot-dash|dot-dot-dash|wave|groove|ridge|inset|outset",
		"bdsp": "border-spacing",
		"bdt": "border-top:${1:1px} ${2:solid} ${3:#000}",
		"bdtc": "border-top-color:${1:#000}",
		"bdti": "border-top-image:url(${0})",
		"bdtli": "border-top-left-image:url(${0})|continue",
		"bdtlrs": "border-top-left-radius",
		"bdtri": "border-top-right-image:url(${0})|continue",
		"bdtrrs": "border-top-right-radius",
		"bdts": "border-top-style",
		"bdtw": "border-top-width",
		"bdw": "border-width",
		"bfv": "backface-visibility:hidden|visible",
		"bg": "background:${1:#000}",
		"bga": "background-attachment:fixed|scroll",
		"bgbk": "background-break:bounding-box|each-box|continuous",
		"bgc": "background-color:#${1:fff}",
		"bgcp": "background-clip:padding-box|border-box|content-box|no-clip",
		"bgi": "background-image:url(${0})",
		"bgo": "background-origin:padding-box|border-box|content-box",
		"bgp": "background-position:${1:0} ${2:0}",
		"bgpx": "background-position-x",
		"bgpy": "background-position-y",
		"bgr": "background-repeat:no-repeat|repeat-x|repeat-y|space|round",
		"bgsz": "background-size:contain|cover",
		"bxsh": "box-shadow:${1:inset }${2:hoff} ${3:voff} ${4:blur} ${5:#000}|none",
		"bxsz": "box-sizing:border-box|content-box|border-box",
		"c": "color:${1:#000}",
		"cl": "clear:both|left|right|none",
		"cm": "/* ${0} */",
		"cnt": "content:'${0}'|normal|open-quote|no-open-quote|close-quote|no-close-quote|attr(${0})|counter(${0})|counters(${0})",
		"coi": "counter-increment",
		"colm": "columns",
		"colmc": "column-count",
		"colmf": "column-fill",
		"colmg": "column-gap",
		"colmr": "column-rule",
		"colmrc": "column-rule-color",
		"colmrs": "column-rule-style",
		"colmrw": "column-rule-width",
		"colms": "column-span",
		"colmw": "column-width",
		"cor": "counter-reset",
		"cp": "clip:auto|rect(${1:top} ${2:right} ${3:bottom} ${4:left})",
		"cps": "caption-side:top|bottom",
		"cur": "cursor:pointer|auto|default|crosshair|hand|help|move|pointer|text",
		"d": "display:grid|inline-grid|subgrid|block|none|flex|inline-flex|inline|inline-block|list-item|run-in|compact|table|inline-table|table-caption|table-column|table-column-group|table-header-group|table-footer-group|table-row|table-row-group|table-cell|ruby|ruby-base|ruby-base-group|ruby-text|ruby-text-group",
		"ec": "empty-cells:show|hide",
		"f": "font:${1:1em} ${2:sans-serif}",
		"fd": "font-display:auto|block|swap|fallback|optional",
		"fef": "font-effect:none|engrave|emboss|outline",
		"fem": "font-emphasize",
		"femp": "font-emphasize-position:before|after",
		"fems": "font-emphasize-style:none|accent|dot|circle|disc",
		"ff": "font-family:serif|sans-serif|cursive|fantasy|monospace",
		"fft": "font-family:\"Times New Roman\", Times, Baskerville, Georgia, serif",
		"ffa": "font-family:Arial, \"Helvetica Neue\", Helvetica, sans-serif",
		"ffv": "font-family:Verdana, Geneva, sans-serif",
		"fl": "float:left|right|none",
		"fs": "font-style:italic|normal|oblique",
		"fsm": "font-smoothing:antialiased|subpixel-antialiased|none",
		"fst": "font-stretch:normal|ultra-condensed|extra-condensed|condensed|semi-condensed|semi-expanded|expanded|extra-expanded|ultra-expanded",
		"fv": "font-variant:normal|small-caps",
		"fvs": "font-variation-settings:normal|inherit|initial|unset",
		"fw": "font-weight:normal|bold|bolder|lighter",
		"fx": "flex",
		"fxb": "flex-basis:fill|max-content|min-content|fit-content|content",
		"fxd": "flex-direction:row|row-reverse|column|column-reverse",
		"fxf": "flex-flow",
		"fxg": "flex-grow",
		"fxsh": "flex-shrink",
		"fxw": "flex-wrap:nowrap|wrap|wrap-reverse",
		"fsz": "font-size",
		"fsza": "font-size-adjust",
		"gtc": "grid-template-columns:repeat()|minmax()",
		"gtr": "grid-template-rows:repeat()|minmax()",
		"gta": "grid-template-areas",
		"gt": "grid-template",
		"gg": "grid-gap",
		"gcg": "grid-column-gap",
		"grg": "grid-row-gap",
		"gac": "grid-auto-columns:auto|minmax()",
		"gar": "grid-auto-rows:auto|minmax()",
		"gaf": "grid-auto-flow:row|column|dense|inherit|initial|unset",
		"gd": "grid",
		"gc": "grid-column",
		"gcs": "grid-column-start",
		"gce": "grid-column-end",
		"gr": "grid-row",
		"grs": "grid-row-start",
		"gre": "grid-row-end",
		"ga": "grid-area",
		"h": "height",
		"jc": "justify-content:start|end|stretch|flex-start|flex-end|center|space-between|space-around|space-evenly",
		"ji": "justify-items:start|end|center|stretch",
		"js": "justify-self:start|end|center|stretch",
		"l": "left",
		"lg": "background-image:linear-gradient(${1})",
		"lh": "line-height",
		"lis": "list-style",
		"lisi": "list-style-image",
		"lisp": "list-style-position:inside|outside",
		"list": "list-style-type:disc|circle|square|decimal|decimal-leading-zero|lower-roman|upper-roman",
		"lts": "letter-spacing:normal",
		"m": "margin",
		"mah": "max-height",
		"mar": "max-resolution",
		"maw": "max-width",
		"mb": "margin-bottom",
		"mih": "min-height",
		"mir": "min-resolution",
		"miw": "min-width",
		"ml": "margin-left",
		"mr": "margin-right",
		"mt": "margin-top",
		"ol": "outline",
		"olc": "outline-color:${1:#000}|invert",
		"olo": "outline-offset",
		"ols": "outline-style:none|dotted|dashed|solid|double|groove|ridge|inset|outset",
		"olw": "outline-width|thin|medium|thick",
		"op": "opacity",
		"ord": "order",
		"ori": "orientation:landscape|portrait",
		"orp": "orphans",
		"ov": "overflow:hidden|visible|hidden|scroll|auto",
		"ovs": "overflow-style:scrollbar|auto|scrollbar|panner|move|marquee",
		"ovx": "overflow-x:hidden|visible|hidden|scroll|auto",
		"ovy": "overflow-y:hidden|visible|hidden|scroll|auto",
		"p": "padding",
		"pb": "padding-bottom",
		"pgba": "page-break-after:auto|always|left|right",
		"pgbb": "page-break-before:auto|always|left|right",
		"pgbi": "page-break-inside:auto|avoid",
		"pl": "padding-left",
		"pos": "position:relative|absolute|relative|fixed|static",
		"pr": "padding-right",
		"pt": "padding-top",
		"q": "quotes",
		"qen": "quotes:'\\201C' '\\201D' '\\2018' '\\2019'",
		"qru": "quotes:'\\00AB' '\\00BB' '\\201E' '\\201C'",
		"r": "right",
		"rsz": "resize:none|both|horizontal|vertical",
		"t": "top",
		"ta": "text-align:left|center|right|justify",
		"tal": "text-align-last:left|center|right",
		"tbl": "table-layout:fixed",
		"td": "text-decoration:none|underline|overline|line-through",
		"te": "text-emphasis:none|accent|dot|circle|disc|before|after",
		"th": "text-height:auto|font-size|text-size|max-size",
		"ti": "text-indent",
		"tj": "text-justify:auto|inter-word|inter-ideograph|inter-cluster|distribute|kashida|tibetan",
		"to": "text-outline:${1:0} ${2:0} ${3:#000}",
		"tov": "text-overflow:ellipsis|clip",
		"tr": "text-replace",
		"trf": "transform:${1}|skewX(${1:angle})|skewY(${1:angle})|scale(${1:x}, ${2:y})|scaleX(${1:x})|scaleY(${1:y})|scaleZ(${1:z})|scale3d(${1:x}, ${2:y}, ${3:z})|rotate(${1:angle})|rotateX(${1:angle})|rotateY(${1:angle})|rotateZ(${1:angle})|translate(${1:x}, ${2:y})|translateX(${1:x})|translateY(${1:y})|translateZ(${1:z})|translate3d(${1:tx}, ${2:ty}, ${3:tz})",
		"trfo": "transform-origin",
		"trfs": "transform-style:preserve-3d",
		"trs": "transition:${1:prop} ${2:time}",
		"trsde": "transition-delay:${1:time}",
		"trsdu": "transition-duration:${1:time}",
		"trsp": "transition-property:${1:prop}",
		"trstf": "transition-timing-function:${1:fn}",
		"tsh": "text-shadow:${1:hoff} ${2:voff} ${3:blur} ${4:#000}",
		"tt": "text-transform:uppercase|lowercase|capitalize|none",
		"tw": "text-wrap:none|normal|unrestricted|suppress",
		"us": "user-select:none",
		"v": "visibility:hidden|visible|collapse",
		"va": "vertical-align:top|super|text-top|middle|baseline|bottom|text-bottom|sub",
		"w": "width",
		"whs": "white-space:nowrap|pre|pre-wrap|pre-line|normal",
		"whsc": "white-space-collapse:normal|keep-all|loose|break-strict|break-all",
		"wid": "widows",
		"wm": "writing-mode:lr-tb|lr-tb|lr-bt|rl-tb|rl-bt|tb-rl|tb-lr|bt-lr|bt-rl",
		"wob": "word-break:normal|keep-all|break-all",
		"wos": "word-spacing",
		"wow": "word-wrap:none|unrestricted|suppress|break-word|normal",
		"z": "z-index",
		"zom": "zoom:1"
	};

	var xslSnippets = {
	    "tm|tmatch": "xsl:template[match mode]",
	    "tn|tname": "xsl:template[name]",
	    "call": "xsl:call-template[name]",
	    "ap": "xsl:apply-templates[select mode]",
	    "api": "xsl:apply-imports",
	    "imp": "xsl:import[href]",
	    "inc": "xsl:include[href]",
	    "ch": "xsl:choose",
	    "wh|xsl:when": "xsl:when[test]",
	    "ot": "xsl:otherwise",
	    "if": "xsl:if[test]",
	    "par": "xsl:param[name]",
	    "pare": "xsl:param[name select]",
	    "var": "xsl:variable[name]",
	    "vare": "xsl:variable[name select]",
	    "wp": "xsl:with-param[name select]",
	    "key": "xsl:key[name match use]",
	    "elem": "xsl:element[name]",
	    "attr": "xsl:attribute[name]",
	    "attrs": "xsl:attribute-set[name]",
	    "cp": "xsl:copy[select]",
	    "co": "xsl:copy-of[select]",
	    "val": "xsl:value-of[select]",
	    "for|each": "xsl:for-each[select]",
	    "tex": "xsl:text",
	    "com": "xsl:comment",
	    "msg": "xsl:message[terminate=no]",
	    "fall": "xsl:fallback",
	    "num": "xsl:number[value]",
	    "nam": "namespace-alias[stylesheet-prefix result-prefix]",
	    "pres": "xsl:preserve-space[elements]",
	    "strip": "xsl:strip-space[elements]",
	    "proc": "xsl:processing-instruction[name]",
	    "sort": "xsl:sort[select order]",
	    "choose": "xsl:choose>xsl:when+xsl:otherwise",
	    "xsl": "!!!+xsl:stylesheet[version=1.0 xmlns:xsl=http://www.w3.org/1999/XSL/Transform]>{\n|}",
	    "!!!": "{<?xml version=\"1.0\" encoding=\"UTF-8\"?>}"
	};

	var variables = {
		"lang": "en",
		"locale": "en-US",
		"charset": "UTF-8",
		"indentation": "\t",
		"newline": "\n"
	};

	/**
	 * Default syntaxes for abbreviation types
	 */
	var defaultSyntaxes = {
	    markup: 'html',
	    stylesheet: 'css'
	};
	var defaultOptions = {
	    'inlineElements': [
	        'a', 'abbr', 'acronym', 'applet', 'b', 'basefont', 'bdo',
	        'big', 'br', 'button', 'cite', 'code', 'del', 'dfn', 'em', 'font', 'i',
	        'iframe', 'img', 'input', 'ins', 'kbd', 'label', 'map', 'object', 'q',
	        's', 'samp', 'select', 'small', 'span', 'strike', 'strong', 'sub', 'sup',
	        'textarea', 'tt', 'u', 'var'
	    ],
	    'output.indent': '\t',
	    'output.baseIndent': '',
	    'output.newline': '\n',
	    'output.tagCase': '',
	    'output.attributeCase': '',
	    'output.attributeQuotes': 'double',
	    'output.format': true,
	    'output.formatLeafNode': false,
	    'output.formatSkip': ['html'],
	    'output.formatForce': ['body'],
	    'output.inlineBreak': 3,
	    'output.compactBoolean': false,
	    'output.booleanAttributes': [
	        'contenteditable', 'seamless', 'async', 'autofocus',
	        'autoplay', 'checked', 'controls', 'defer', 'disabled', 'formnovalidate',
	        'hidden', 'ismap', 'loop', 'multiple', 'muted', 'novalidate', 'readonly',
	        'required', 'reversed', 'selected', 'typemustmatch'
	    ],
	    'output.reverseAttributes': false,
	    'output.selfClosingStyle': 'html',
	    'output.field': (index, placeholder) => placeholder,
	    'output.text': text => text,
	    'comment.enabled': false,
	    'comment.trigger': ['id', 'class'],
	    'comment.before': '',
	    'comment.after': '\n<!-- /[#ID][.CLASS] -->',
	    'bem.enabled': false,
	    'bem.element': '__',
	    'bem.modifier': '_',
	    'jsx.enabled': false,
	    'stylesheet.keywords': ['auto', 'inherit', 'unset'],
	    'stylesheet.unitless': ['z-index', 'line-height', 'opacity', 'font-weight', 'zoom', 'flex', 'flex-grow', 'flex-shrink'],
	    'stylesheet.shortHex': true,
	    'stylesheet.between': ': ',
	    'stylesheet.after': ';',
	    'stylesheet.intUnit': 'px',
	    'stylesheet.floatUnit': 'em',
	    'stylesheet.unitAliases': { e: 'em', p: '%', x: 'ex', r: 'rem' },
	    'stylesheet.json': false,
	    'stylesheet.jsonDoubleQuotes': false,
	    'stylesheet.fuzzySearchMinScore': 0.3
	};
	var defaultConfig = {
	    type: 'markup',
	    syntax: 'html',
	    variables,
	    snippets: {},
	    options: defaultOptions
	};
	/**
	 * Default per-syntax config
	 */
	var syntaxConfig = {
	    markup: {
	        snippets: parseSnippets(markupSnippets),
	    },
	    xhtml: {
	        options: {
	            'output.selfClosingStyle': 'xhtml'
	        }
	    },
	    xml: {
	        options: {
	            'output.selfClosingStyle': 'xml'
	        }
	    },
	    xsl: {
	        snippets: parseSnippets(xslSnippets),
	        options: {
	            'output.selfClosingStyle': 'xml'
	        }
	    },
	    jsx: {
	        options: {
	            'jsx.enabled': true
	        }
	    },
	    stylesheet: {
	        snippets: parseSnippets(stylesheetSnippets)
	    },
	    sass: {
	        options: {
	            'stylesheet.after': ''
	        }
	    },
	    stylus: {
	        options: {
	            'stylesheet.between': ' ',
	            'stylesheet.after': '',
	        }
	    }
	};
	/**
	 * Parses raw snippets definitions with possibly multiple keys into a plan
	 * snippet map
	 */
	function parseSnippets(snippets) {
	    var result = {};
	    Object.keys(snippets).forEach(k => {
	        for (var name of k.split('|')) {
	            result[name] = snippets[k];
	        }
	    });
	    return result;
	}
	function resolveConfig(config = {}, globals = {}) {
	    var type = config.type || 'markup';
	    var syntax = config.syntax || defaultSyntaxes[type];
	    return Object.assign(Object.assign(Object.assign({}, defaultConfig), config), { type,
	        syntax, variables: mergedData(type, syntax, 'variables', config, globals), snippets: mergedData(type, syntax, 'snippets', config, globals), options: mergedData(type, syntax, 'options', config, globals) });
	}
	function mergedData(type, syntax, key, config, globals = {}) {
	    var typeDefaults = syntaxConfig[type];
	    var typeOverride = globals[type];
	    var syntaxDefaults = syntaxConfig[syntax];
	    var syntaxOverride = globals[syntax];
	    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, defaultConfig[key]), (typeDefaults && typeDefaults[key])), (syntaxDefaults && syntaxDefaults[key])), (typeOverride && typeOverride[key])), (syntaxOverride && syntaxOverride[key])), config[key]);
	}

	var code$1 = (ch) => ch.charCodeAt(0);
	var specialChars$1 = '#.*:$-_!@%^+>/'.split('').map(code$1);

	function expandAbbreviation(abbr, config) {
	    var resolvedConfig = resolveConfig(config);
	    return resolvedConfig.type === 'stylesheet'
	        ? stylesheet(abbr, resolvedConfig)
	        : markup(abbr, resolvedConfig);
	}
	/**
	 * Expands given *markup* abbreviation (e.g. regular Emmet abbreviation that
	 * produces structured output like HTML) and outputs it according to options
	 * provided in config
	 */
	function markup(abbr, config) {
	    return stringify$1(parse$1(abbr, config), config);
	}
	/**
	 * Expands given *stylesheet* abbreviation (a special Emmet abbreviation designed for
	 * stylesheet languages like CSS, SASS etc.) and outputs it according to options
	 * provided in config
	 */
	function stylesheet(abbr, config, snippets) {
	    return css(parse$2(abbr, config, snippets), config);
	}

	var EditorState = libCM.EditorState;
	var EditorView = libCM.EditorView;
	var EditorSelection = libCM.EditorSelection;
	var keymap$1 = libCM.keymap;
	var history$1 = libCM.history;
	var redo = libCM.redo;
	var redoSelection = libCM.redoSelection;
	var undo = libCM.undo;
	var undoSelection = libCM.undoSelection;
	var lineNumbers = libCM.lineNumbers;
	var baseKeymap = libCM.baseKeymap;
	var indentSelection = libCM.indentSelection;
	var legacyMode = libCM.legacyMode;
	var matchBrackets = libCM.matchBrackets;
	var specialChars$2 = libCM.specialChars;
	var multipleSelections$1 = libCM.multipleSelections;
	var text$2 = libCM.text;

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
				document.addEventListener("DOMContentLoaded", function () {
					// Do something...
				});
			} else {
				var mode = CodeMirror.findModeByExtension(ext);
				if (typeof mode == "undefined" || typeof mode.mode == "undefined") {
					mode = CodeMirror.findModeByExtension("md"); // Using markdown for undefined var
				}

				var script = document.createElement('script');
				script.onload = function () {
					var m = null;
					try {
						m = ExportedMode({
							indentUnit: 2
						});
					} catch (e) {
						if (typeof ExportedMode != "undefined") {
							m = ExportedMode({
								indentUnit: 2
							}, {});
						} else {
							alert(e);
						}
					}

					var mode = legacyMode({
						mode: m
					});
					this.mode = mode;

					var isMac = /Mac/.test(navigator.platform);

					var exts = [
						lineNumbers(),
						history$1(),
						specialChars$2(),
						multipleSelections$1(),
						mode,
						matchBrackets(),
						keymap$1({
							"Mod-z": undo,
							"Mod-Shift-z": redo,
							"Mod-u": function (view) {
								return undoSelection(view) || true
							},
							[isMac ? "Mod-Shift-u" : "Alt-u"]: redoSelection,
							"Ctrl-y": isMac ? undefined : redo,
							"Shift-Tab": indentSelection
						}),
						keymap$1(baseKeymap),
					];
					if (typeof ExternalMode != "undefined") {
						exts.push(legacyMode({
							mode: ExternalMode()
						}));
					}

					this.cm = EditorState.create({
						doc: atobUTF8(value),
						extensions: exts
					});
					var view = window.view = new EditorView({
						state: this.cm
					});

					this.clear();

					document.querySelector("#editor").appendChild(view.dom);
					document.querySelector(".tip").style.display = "none";
					this.listenForAutomcompletion();
					var restricted = ["MD", "TXT", "RTF"];
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
			var content = document.querySelector(".codemirror-content");
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
			var link = document.createElement("link");
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
				setTimeout(function () {
					this.load(file);
				}.bind(this), 16); // Waiting 16ms (~ 1 frame) before rendering for letting WKWebView parse and process everything. Otherwise, we do it again and again.
			} else {
				var str = atobUTF8(file);

				var doc = text$2.of(str, "\n");
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
			var str = atobUTF8(snippet);
			document.querySelector(".codemirror-content").focus();
			if (replaceLine === true) {
				for (var i = 0; i < this.c.getLastToken()[0].length; i++) {
					document.execCommand('delete');
				}
			}
			document.execCommand('insertText', false, str);
		}
		enablePreview(ext) {
			// Load TexLive.js
			var script = document.createElement('script');
			document.body.innerHTML = "<div class=\"tip\">Loading</div>";
			script.onload = () => {
				if (ext == "tex") {
					// var pdftex = new PDFTeX();
					var latex_code = window.view.state.doc.toString();
					// pdftex.compile(latex_code).then(pdf => {
					// 	window.location = pdf
					// })
					window.location = `https://latexonline.cc/compile?text=${encodeURIComponent(latex_code)}`;
				} else if (ext == "md") {
					var converter = new showdown.Converter();
					var text = window.view.state.doc.toString();
					var html = converter.makeHtml(text);
					document.body.innerHTML = "<div class=\"markdown-body\">Loading</div>";
					document.querySelector(".markdown-body").innerHTML = html;
				}
			};
			if (ext == "tex") {
				script.src = `TexLive/pdftex.js`;
			} else if (ext == "md") {
				script.src = `./showdown.js`;
				var link = document.createElement('link');
				link.rel = "stylesheet";
				link.href = "./ghmd.css";
				document.head.appendChild(link);
			}

			document.head.appendChild(script);
		}
		moveLineDown() {
			if (window.view.state.doc.toString() == "") return ""
			var index = window.view.state.selection.ranges[0].anchor;
			var line = view.state.doc.lineAt(index);
			var content = line.content;
			var nextLine = view.state.doc.lineAt(line.end + 1);
			var transaction1 = view.state.t().replace(line.start, line.end, nextLine.content);
			var midstate = transaction1.apply();
			line = midstate.doc.lineAt(line.start);
			nextLine = midstate.doc.lineAt(line.end + 1);
			var transaction2 = midstate.t().replace(nextLine.start, nextLine.end, content);
			window.view.setState(transaction2.apply());
		}
		moveLineUp() {
			if (window.view.state.doc.toString() == "") return ""
			var index = window.view.state.selection.ranges[0].anchor;
			var line = view.state.doc.lineAt(index);
			var content = line.content;
			var nextLine = view.state.doc.lineAt(line.start - 1);
			var transaction1 = view.state.t().replace(line.start, line.end, nextLine.content);
			var midstate = transaction1.apply();
			line = midstate.doc.lineAt(line.start);
			nextLine = midstate.doc.lineAt(line.start - 1);
			var transaction2 = midstate.t().replace(nextLine.start, nextLine.end, content);
			window.view.setState(transaction2.apply());
		}

		listenForAutomcompletion() {
			if (typeof this.c == "undefined") {
				this.c = new Completion(window.view.state.doc.toString());
			} else if (typeof this.c.init != "undefined") {
				this.c.init(window.view.state.doc.toString());
			}
			var parseAndPropose = async function () {
				var currentWord = this.c.getLastToken();
				var suggestions = this.c.getSuggestions(currentWord[0], this.c.getContent(currentWord[0], currentWord[1]));
				this.setCompletion(...suggestions);
			}.bind(this);
			document.querySelector(".codemirror-content").addEventListener("input", () => parseAndPropose());
		}
		setCompletion(a, b, c) {
			window.webkit.messageHandlers.completion.postMessage([a, b, c]);
		}

		expandEmmet(src) {
			var text = expandAbbreviation(src);
			var b64 = btoaUTF8(text);
			this.insertSnippet(b64);
		}

		registerPlugin({
			obj,
			type
		}) {
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
		Text: text$2,
		Completion: Completion,
		add: function (obj, type) {
			BufferCenter$1.default.addTask("execute", () => {
				var plugin = new Notification("registerPlugin", {
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
