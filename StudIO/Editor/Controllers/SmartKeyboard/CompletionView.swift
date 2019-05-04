//
//  CompletionView.swift
//  StudIO
//
//  Created by Arthur Guiot on 29/4/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import WebKit

class CompletionView: UIViewController {
    /*
    // Only override draw() if you perform custom drawing.
    // An empty implementation adversely affects performance during animation.
    override func draw(_ rect: CGRect) {
        // Drawing code
    }
    */
    
    @IBOutlet weak var scrollView: UIScrollView!
    
    override func viewWillAppear(_ animated: Bool) {
        NotificationCenter.default.addObserver(self, selector: #selector(setCompletes(notification:)), name: .init("setAutoComplete"), object: nil)
    }
    
    
    @IBOutlet weak var complete1: UIButton!
    @IBOutlet weak var complete2: UIButton!
    @IBOutlet weak var complete3: UIButton!
    
    @objc func setCompletes(notification: Notification) {
        let keys = notification.userInfo!["titles"] as! [String]
        let key1 = keys[0]
        let key2 = keys[1]
        let key3 = keys[2]
        complete1.setTitle(key1, for: .normal)
        complete2.setTitle(key2, for: .normal)
        complete3.setTitle(key3, for: .normal)
    }
}


extension Editor: WKScriptMessageHandler {
    
    @IBAction func keyTouch(_ sender: Any) {
        let button = sender as! UIButton
        let content = button.currentTitle
        
        let data = content?.data(using: .utf8)
        let c = data?.base64EncodedString()
        let js = """
        try {
        window.e.insertSnippet("\(c ?? "")", true)
        } catch(e) {
        console.log(e)
        }
        """
        DispatchQueue.main.async {
            self.codeView.evaluateJavaScript(js) { (result, error) in
                if error != nil {
                    NSObject.alert(t: "Key error", m: error?.localizedDescription ?? "Couldn't insert key")
                }
            }
        }
    }
    
    
    // Completion Engine
    func setAutoCompletions(key1: String, key2: String, key3: String) {
        let detailVC = self.parentViewController as! WorkingDirDetailVC
        let editorVC = detailVC.splitViewController as! EditorSplitVC
        let smartKeyboard = editorVC.accessory
        let completion = smartKeyboard?.completionView
        
        NotificationCenter.default.post(name: .init("setAutoComplete"), object: nil, userInfo: ["titles": [
            key1, key2, key3
            ]])
    }
    func setListen() {
        let userContentController = codeView.configuration.userContentController
        if isScriptAdded == false {
            userContentController.add(self, name: "completion")
            
            isScriptAdded = true
        }
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "completion":
            let keys = message.body as? [String]
            self.setAutoCompletions(key1: keys?[0] ?? "", key2: keys?[1] ?? "", key3: keys?[2] ?? "")
        default:
            break
        }
    }
}
