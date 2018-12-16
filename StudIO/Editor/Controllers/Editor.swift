//
//  Editor.swift
//  StudIO
//
//  Created by Arthur Guiot on 8/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import WebKit

class Editor: UIView {
    
    @IBOutlet var contentView: UIView!
    @IBOutlet weak var codeView: WKWebView!
    
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
        codeView.loadFileURL(url, allowingReadAccessTo: url)
        let request = URLRequest(url: url)
        codeView.load(request)
        codeView.navigationDelegate = self
    }
    
    var highlightExt: String?
    func highlight(_ lang: String, code:  @escaping () -> Void) {
        let arr = lang.split(separator: ".")
        let ext = String(arr[arr.count - 1]).uppercased()
        highlightExt = ext
        if codeView.isLoading == false {
            codeView.evaluateJavaScript("document.body.innerHTML = \"\"; window.e = new editor('\(ext)', '')") { (result, error) in
                code()
            }
        }
    }
    var content: String?
    func loadFile(withContent: String) {
        content = withContent
        if codeView.isLoading == false {
            codeView.evaluateJavaScript("window.e.load('\(content!)')") { (result, error) in
//                print(result, error)
            }
        }
    }
    func getData(_ handler: @escaping (Data?) -> Void) {
        if codeView.isLoading == false {
            codeView.evaluateJavaScript("window.e.save()") { (result, error) in
                let str = result as? String
                let data = Data(base64Encoded: str ?? "")
                handler(data)
            }
        }
    }
}
extension Editor: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if let ext = highlightExt {
            highlight(ext, code: {
                if let c = self.content {
                    self.loadFile(withContent: c)
                }
            })
        }
    }
}
