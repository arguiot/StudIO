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
    func highlight(_ lang: String) {
        let arr = lang.split(separator: ".")
        let ext = String(arr[arr.count - 1]).uppercased()
        highlightExt = ext
        if codeView.isLoading == false {
            codeView.evaluateJavaScript("var e = new editor('\(ext)', '')") { (result, error) in
                print(result, error)
            }
        }
    }
}
extension Editor: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        if let ext = highlightExt {
            codeView.evaluateJavaScript("var e = new editor('\(ext)', '')") { (result, error) in
                print(result, error)
            }
        }
    }
}
