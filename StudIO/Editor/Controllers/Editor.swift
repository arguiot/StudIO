//
//  Editor.swift
//  StudIO
//
//  Created by Arthur Guiot on 8/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import WebKit

class Editor: UIView, WKUIDelegate {
    
    @IBOutlet var contentView: UIView!
    var codeView: WKWebView!
    @IBOutlet weak var containerCodeView: UIView!
    @IBOutlet weak var gitPanel: GitCommit!
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        commonInit()
    }
    
    
    private func commonInit() {
        Bundle.main.loadNibNamed("Editor", owner: self, options: nil)
        addSubview(contentView)
        contentView.frame = self.bounds
        contentView.autoresizingMask = [.flexibleHeight, .flexibleWidth]
        
        initialisation()
        
    }
    func initialisation() {
        let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "EditorView")!
        
        let webConfiguration = WKWebViewConfiguration()
        let customFrame = CGRect.init(origin: .zero, size: .init(width: 0.0, height: self.containerCodeView.frame.size.height))
        
        self.codeView = WKWebView (frame: customFrame , configuration: webConfiguration)
        codeView.translatesAutoresizingMaskIntoConstraints = false
        
        codeView.backgroundColor = #colorLiteral(red: 0.06666666667, green: 0.06666666667, blue: 0.06666666667, alpha: 1)
        
        self.containerCodeView.addSubview(codeView)
        
        codeView.topAnchor.constraint(equalTo: containerCodeView.topAnchor).isActive = true
        codeView.rightAnchor.constraint(equalTo: containerCodeView.rightAnchor).isActive = true
        codeView.leftAnchor.constraint(equalTo: containerCodeView.leftAnchor).isActive = true
        codeView.bottomAnchor.constraint(equalTo: containerCodeView.bottomAnchor).isActive = true
        codeView.heightAnchor.constraint(equalTo: containerCodeView.heightAnchor).isActive = true
        
        codeView.uiDelegate = self
        
        codeView.loadFileURL(url, allowingReadAccessTo: url)
        let request = URLRequest(url: url)
        codeView.load(request)
        codeView.navigationDelegate = self
        
        codeView.hack_removeInputAccessory()
    }
    
    var highlightExt: String?
    // Completion Script
    var isScriptAdded = false
    
    
    var content: String?
    var fileName: String?
    func loadFile(withContent: String, lang: String) {
        content = withContent
        let arr = lang.split(separator: ".")
        let ext = String(arr.last ?? "").uppercased()
        highlightExt = ext
        if codeView.isLoading == false {
            self.setListen()
            codeView.evaluateJavaScript("try{StudIO_loadFile('\(content ?? "")', '\(ext)')}catch(e){console.log(e)}") { (result, error) in
//                print(result, error)
            }
        }
    }
    func getData(_ handler: @escaping (Data?, Error?) -> Void) {
        if codeView.isLoading == false {
            codeView.evaluateJavaScript("window.e.save()") { (result, error) in
                let str = result as? String
                let data = Data(base64Encoded: str ?? "")
                handler(data, error)
            }
        }
    }
    
    func getLangName(_ handler: @escaping (String?) -> Void) {
        if codeView.isLoading == false {
            codeView.evaluateJavaScript("window.e.getLangName()") { (result, error) in
                let str = result as? String
                handler(str)
            }
        }
    }
    
    
    func settings(_ data: [String: String]) {
        var d = data
        if data["theme"] != "monokai" && data["theme"] != "default" {
            d.removeValue(forKey: "theme")
            self.loadTheme(name: data["theme"] ?? "")
        } else if data["theme"] == "monokai" {
            let jsString = """
            var style = document.createElement('link');
            style.setAttribute('rel','stylesheet');
            style.setAttribute('href', './theme/monokai.css');
            document.head.appendChild(style);
            """
            codeView.evaluateJavaScript(jsString)  { (result, error) in
                if error != nil {
                    print(error!)
                }
            }
        }
        
        var json: Data!
        if #available(iOS 11.0, *) {
            guard let j = try? JSONSerialization.data(withJSONObject: d, options: .sortedKeys) else {
                return
            }
            json = j
        } else {
            // Fallback on earlier versions
            guard let j = try? JSONSerialization.data(withJSONObject: d, options: .prettyPrinted) else {
                return
            }
            json = j
        }
        let query = String(data: json, encoding: .ascii)!
        codeView.evaluateJavaScript("window.EditorSettings = \(query); StudIO.BufferCenter.default.addTask('settings')") { (result, error) in
            
        }
        
        self.injectAllPlugins()
    }
    
    func undo() {
        if codeView.isLoading == false {
            codeView.evaluateJavaScript("try{document.execCommand('undo')}catch(e){console.log(e)}", completionHandler: nil)
        }
    }
    func redo() {
        if codeView.isLoading == false {
            codeView.evaluateJavaScript("try{document.execCommand('redo')}catch(e){console.log(e)}", completionHandler: nil)
        }
    }
    func moveLineDown() {
        if codeView.isLoading == false {
            codeView.evaluateJavaScript("try{window.e.moveLineDown()}catch(e){console.log(e)}", completionHandler: nil)
        }
    }
    func moveLineUp() {
        if codeView.isLoading == false {
            codeView.evaluateJavaScript("try{window.e.moveLineUp()}catch(e){console.log(e)}", completionHandler: nil)
        }
    }
}
extension Editor: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        settings([
            "fontSize": UserDefaults.standard.string(forKey: "studio-font-size") ?? "26",
            "lineWrapping": UserDefaults.standard.string(forKey: "studio-line-wrapping") ?? "false",
            "theme": UserDefaults.standard.string(forKey: "studio-editor-theme") ?? "monokai"
        ])
        
        guard let ext = highlightExt else { return }
        guard let c = self.content else { return }
        self.loadFile(withContent: c, lang: ext)
    }
    
    
}
