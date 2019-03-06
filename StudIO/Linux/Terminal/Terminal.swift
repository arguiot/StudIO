//
//  Terminal.swift
//  StudIO
//
//  Created by Arthur Guiot on 6/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import WebKit
class Terminal: UIView, WKScriptMessageHandler {
    private var webView: WKWebView?
    private var tty: tty?
    private var pendingData: Data?
    private var refreshTask: DelayedUITask?
    private var scrollToBottomTask: DelayedUITask?
    private var applicationCursor = false
    
    init() {
        pendingData = Data()
        refreshTask = DelayedUITask(target: self, action: #selector(self.refresh))
        scrollToBottomTask = DelayedUITask(target: self, action: #selector(self.scrollToBottom))
        
        let config = WKWebViewConfiguration()
        config.userContentController.add(self, name: "log")
        config.userContentController.add(self, name: "resize")
        config.userContentController.add(self, name: "propUpdate")
        webView = CustomWebView(frame: CGRect.zero, configuration: config)
        webView?.scrollView.isScrollEnabled = false
        if let url = Bundle.main.url(forResource: "xterm-dist/term", withExtension: "html") {
            webView?.load(URLRequest(url: url))
        }
        webView?.addObserver(self, forKeyPath: "loading", options: [], context: nil)
        _addPreferenceObservers()
    }
    
    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func setTty(_ tty: tty?) {
        self.tty = tty
        syncWindowSize()
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if (message.name == "log") {
            print("\(message.body)")
        } else if (message.name == "resize") {
            syncWindowSize()
        } else if (message.name == "propUpdate") {
            self[message.body[0]] = message.body[1]
        }
    }
    
    func syncWindowSize() {
        webView?.evaluateJavaScript("[term.cols, term.rows]", completionHandler: { dimensions, error in
            if self.tty == nil {
                return
            }
            let cols: Int = dimensions?[0].intValue
            let rows: Int = dimensions?[1].intValue
            lock(&self.tty.lock)
            tty_set_winsize(self.tty, winsize_(col: cols, row: rows))
            unlock(&self.tty.lock)
        })
    }
    
    func write(_ buf: UnsafeRawPointer?, length len: size_t) -> Int {
        let lockQueue = DispatchQueue(label: "self")
        lockQueue.sync {
            pendingData.append(Data(bytes: buf, length: len))
            refreshTask?.schedule()
        }
        return 0
    }
    
    func sendInput(_ buf: UnsafePointer<Int8>?, length len: size_t) {
        tty_input(tty, buf, len, 0)
        scrollToBottomTask?.schedule()
    }
    
    @objc func scrollToBottom() {
        webView?.evaluateJavaScript("term.scrollToBottom()", completionHandler: nil)
    }
    
    func arrow(_ direction: Int8) -> String? {
        return "1b\(applicationCursor ? "O" : "[")\(direction)"
    }
    
    func _addPreferenceObservers() {
        let prefs = UserPreferences.shared()
        let opts: NSKeyValueObservingOptions = .new
        prefs.addObserver(self, forKeyPath: "fontSize", options: opts, context: nil)
        prefs.addObserver(self, forKeyPath: "theme", options: opts, context: nil)
    }
    
    func cssColor(_ color: UIColor?) -> String? {
        var red: CGFloat
        var green: CGFloat
        var blue: CGFloat
        var alpha: CGFloat
        color?.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        return String(format: "rgba(%ld, %ld, %ld, %ld)", lround(Double(red * 255)), lround(Double(green * 255)), lround(Double(blue * 255)), lround(Double(alpha * 255)))
    }
    
    func _updateStyleFromPreferences() {
        let prefs = UserPreferences.shared()
        let themeInfo = [
            "fontSize": prefs.fontSize,
            "foregroundColor": cssColor(prefs.theme.foregroundColor) ?? 0,
            "backgroundColor": cssColor(prefs.theme.backgroundColor) ?? 0
        ]
        var json: String? = nil
        if let data = try? JSONSerialization.data(withJSONObject: themeInfo, options: []) {
            json = String(data: data, encoding: .utf8)
        }
        webView?.evaluateJavaScript("updateStyle(\(json ?? ""))", completionHandler: nil)
    }
    
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if (object as? WKWebView) == webView && (keyPath == "loading") && !(webView?.isLoading ?? false) {
            _updateStyleFromPreferences()
            refreshTask!.schedule()
            webView?.removeObserver(self, forKeyPath: "loading")
        } else if object == UserPreferences.shared() {
            _updateStyleFromPreferences()
        }
    }
    
    let removeInvalidUTF8Mins = [0, 128, 2048, 65536]
    
    func removeInvalidUTF8(data: Data?) -> Data? {
        var cleanData = Data(length: data?.count ?? 0)
        let bytes = UInt8(data?.bytes ?? 0)
        let clean_bytes = UInt8(cleanData?.mutableBytes ?? 0)
        var clean_length: size_t = 0
        var clean_i: size_t = 0
        var continuations: UInt = 0
        var c: UInt32 = 0
        var min_c: UInt32 = 0
        for i in 0..<(data?.count ?? 0) {
            if (bytes?[i] ?? 0) >> 6 != 0b10 {
                // start of new sequence
                if continuations != 0 {
                }
                if (bytes?[i] ?? 0) >> 7 == 0b0 {
                    continuations = 0
                    c = UInt32((bytes?[i] ?? 0) & 0b1111111)
                } else if (bytes?[i] ?? 0) >> 5 == 0b110 {
                    continuations = 1
                    c = UInt32((bytes?[i] ?? 0) & 0b11111)
                } else if (bytes?[i] ?? 0) >> 4 == 0b1110 {
                    continuations = 2
                    c = UInt32((bytes?[i] ?? 0) & 0b1111)
                } else if (bytes?[i] ?? 0) >> 3 == 0b11110 {
                    continuations = 3
                    c = UInt32((bytes?[i] ?? 0) & 0b111)
                } else {
                }
                min_c = removeInvalidUTF8Mins[continuations]
            } else {
                // continuation
                if continuations == 0 {
                }
                continuations -= 1
                c = UInt32(UInt((c << 6)) | UInt(((bytes?[i] ?? 0) & 0b111111)))
            }
            clean_bytes?[clean_i] = bytes?[i]
            clean_i += 1
            if continuations == 0 {
                if c < min_c || c > 0x10ffff {
                    // out of range
                }
                if (c >> 11) == 0x1b {
                    // surrogate pair (this isn't cesu8)
                }
                clean_length = clean_i
            }
            continue
            clean_i = clean_length
            continuations = 0
        }
        (cleanData?.count ?? 0) = clean_length
        return cleanData
    }
    @objc func refresh() {
        if webView?.isLoading ?? false {
            return
        }
        
        var data: Data?
        let lockQueue = DispatchQueue(label: "self")
        lockQueue.sync {
            data = pendingData
            pendingData = Data()
        }
        let cleanData: Data? = removeInvalidUTF8(data: data)
        var str: String? = nil
        if let cleanData = cleanData {
            str = String(data: cleanData, encoding: .utf8)
        }
        
        let jsonData: Data? = try? JSONSerialization.data(withJSONObject: [str], options: [])
        var json: String? = nil
        if let jsonData = jsonData {
            json = String(data: jsonData, encoding: .utf8)
        }
        assert(err == nil, "JSON serialization failed, wtf")
        let jsToEvaluate = "termWrite(\(json ?? "")[0])"
        webView?.evaluateJavaScript(jsToEvaluate, completionHandler: nil)
    }
}

private func ios_tty_init(_: tty?) -> Int {
    let terminal = Terminal(type: tty?.type, number: tty?.num)
    terminal.tty = tty
    tty?.refcount = tty?.refcount + 1
    tty?.data = CFBridgingRetain(terminal)
    
    // termios
    tty?.termios.lflags = ISIG_ | ICANON_ | ECHO_ | ECHOE_ | ECHOCTL_
    tty?.termios.iflags = ICRNL_
    tty?.termios.oflags = OPOST_ | ONLCR_
    tty?.termios.cc[VINTR_] = x03
    tty?.termios.cc[VQUIT_] = x1c
    tty?.termios.cc[VERASE_] = x7f
    tty?.termios.cc[VKILL_] = x15
    tty?.termios.cc[VEOF_] = x04
    tty?.termios.cc[VTIME_] = 0
    tty?.termios.cc[VMIN_] = 1
    tty?.termios.cc[VSTART_] = x11
    tty?.termios.cc[VSTOP_] = x13
    tty?.termios.cc[VSUSP_] = x1a
    tty?.termios.cc[VEOL_] = 0
    tty?.termios.cc[VREPRINT_] = x12
    tty?.termios.cc[VDISCARD_] = x0f
    tty?.termios.cc[VWERASE_] = x17
    tty?.termios.cc[VLNEXT_] = x16
    tty?.termios.cc[VEOL2_] = 0
    
    return 0
}

private func ios_tty_write(_: tty?, size_t: UnsafeRawPointer?) -> Int {
}

private func ios_tty_cleanup(tty: tty?) {
    CFBridgingRelease(tty?.data)
}

class CustomWebView: WKWebView {
    override func becomeFirstResponder() -> Bool {
        return false
    }
}
