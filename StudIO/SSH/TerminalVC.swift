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
class TerminalVC: UIViewController, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    
    @IBOutlet weak var containerCodeView: UIView!
    var XtermView: WKWebView!
    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(goBack(_:)))
        
        
        let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "SSHView")!
        
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
        
        setListen()
        
        login()
    }
    
    @objc func goBack(_ send: Any) {
        guard let root = self.view.window?.rootViewController as? RootVC else { return }
        root.dismiss(animated: true, completion: nil)
    }
    var SSH: SSHShell!
    func login() {
        do {
            SSH = try SSHShell(host: "new@sdf.org", port: 22)
            SSH.withCallback { (data: Data?, error: Data?) in
                if (error != nil) {
                    NSObject.alert(t: "Error", m: String(data: error!, encoding: .utf8) ?? "UNDEFINED")
                }
                if (data != nil) {
                    self.inject(data: data!)
                }
            }
            .connect()
            .authenticate(.none)
            .open { (error) in
                if let error = error {
                    print("\(error)")
                }
            }
        } catch {
            NSObject.alert(t: "Error", m: error.localizedDescription)
        }
        
    }
    
    func inject(data: Data) {
        XtermView.evaluateJavaScript("term.write(\"\(String(data: data, encoding: .utf8) ?? "UNDEFINED")\")", completionHandler: nil)
    }
    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */
    var isScriptAdded = false
    func setListen() {
        let userContentController = XtermView.configuration.userContentController
        if isScriptAdded == false {
            userContentController.add(self, name: "sshData")
            isScriptAdded = true
        }
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "sshData" else { return }
        guard let content = message.body as? String else { return }
        SSH.write(Data(content.utf8))
    }

}
