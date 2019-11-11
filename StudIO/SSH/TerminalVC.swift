//
//  TerminalVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 2019-11-10.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftSH
import WebKit
class TerminalVC: UIViewController, WKUIDelegate, WKNavigationDelegate {

    @IBOutlet weak var containerCodeView: UIView!
    var XtermView: WKWebView!
    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "EditorView")!
        
        let webConfiguration = WKWebViewConfiguration()
        let customFrame = CGRect.init(origin: .zero, size: .init(width: 0.0, height: self.containerCodeView.frame.size.height))
        
        self.XtermView = WKWebView (frame: customFrame , configuration: webConfiguration)
        XtermView.translatesAutoresizingMaskIntoConstraints = false
        
        XtermView.backgroundColor = #colorLiteral(red: 0.06666666667, green: 0.06666666667, blue: 0.06666666667, alpha: 1)
        
        self.containerCodeView.addSubview(XtermView)
        
        XtermView.topAnchor.constraint(equalTo: containerCodeView.topAnchor).isActive = true
        XtermView.rightAnchor.constraint(equalTo: containerCodeView.rightAnchor).isActive = true
        XtermView.leftAnchor.constraint(equalTo: containerCodeView.leftAnchor).isActive = true
        XtermView.bottomAnchor.constraint(equalTo: containerCodeView.bottomAnchor).isActive = true
        XtermView.heightAnchor.constraint(equalTo: containerCodeView.heightAnchor).isActive = true
        
        XtermView.uiDelegate = self
        
        XtermView.loadFileURL(url, allowingReadAccessTo: url)
        let request = URLRequest(url: url)
        XtermView.load(request)
        XtermView.navigationDelegate = self
    }
    

    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */

}
