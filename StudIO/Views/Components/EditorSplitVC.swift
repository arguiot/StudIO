//
//  LightStatus.swift
//  StudIO
//
//  Created by Arthur Guiot on 4/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit

class EditorSplitVC: UISplitViewController {
    override func viewDidLoad() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
        
        let height = UIScreen.main.bounds.height
        let width = UIScreen.main.bounds.width
        accessory.frame = CGRect(x: 0, y: height - 60, width: width, height: 60)
        
        self.view.addSubview(accessory)
        
        accessory.isHidden = true
        
        NotificationCenter.default.addObserver(self, selector: #selector(setCompletes(notification:)), name: .init("setAutoComplete"), object: nil)
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    @IBOutlet var accessory: SmartKeyboard!
    
    @objc func keyboardWillShow(_ notification: Notification) {
        let VC = self.viewControllers.first as! UINavigationController
        guard VC.visibleViewController is WorkingDirDetailVC else { return }
        accessory.isHidden = false
        
        accessory.loader.isHidden = true
        
        if let keyboardFrame: NSValue = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue {
            let height = UIScreen.main.bounds.height
            let width = UIScreen.main.bounds.width
            
            let keyboardRectangle = keyboardFrame.cgRectValue
            let keyboardHeight = keyboardRectangle.height
            
            accessory.frame = CGRect(x: 0, y: height - 60 - keyboardHeight, width: width, height: 60)
            
            self.findKeyboardView()?.isHidden = true
        }
    }
    
    @objc func keyboardWillHide(_ notification: Notification?) {
        accessory.isHidden = true
        
        let height = UIScreen.main.bounds.height
        let width = UIScreen.main.bounds.width
        accessory.frame = CGRect(x: 0, y: height - 60, width: width, height: 60)
    }
    
    @IBAction func HideSmartKeyboard() {
        self.keyboardWillHide(nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            self.keyboardWillHide(nil)
        }
    }
    func findKeyboardView() -> UIView? {
        let result: UIView? = nil
        
        let windows = UIApplication.shared.windows
        
        let prefixes = [
            "<UIInputSetContainerView",
            "<UIInputSetHostView",
            "<_UIKBCompatInputView",
            "<UIKeyboardAutomatic",
            "<UIKeyboardImpl",
        ]
        for window in windows {
            if window.description.hasPrefix("<UIRemoteKeyboardWindow") {
                var last = window.subviews
                for p in prefixes {
                    for s in last {
                        if s.description.hasPrefix(p) {
                            last = s.subviews
                        }
                    }
                }
                for s in last {
                    if s.description.hasPrefix("<UIKeyboardAssistantBar") || s.description.hasPrefix("<UIKeyboardPredictionView") {
                        return s
                    }
                }
                break
            }
        }
        return result
    }
    
    
    // Completion Cells
    var cells: [CompletionFeature] = [
        CompletionFeature(title: "\"", type: .small),
        CompletionFeature(title: "(", type: .small),
        CompletionFeature(title: ")", type: .small),
        CompletionFeature(title: "'", type: .small),
        CompletionFeature(title: "", type: .large),
        CompletionFeature(title: "", type: .large),
        CompletionFeature(title: "", type: .large),
        CompletionFeature(title: "{", type: .small),
        CompletionFeature(title: "}", type: .small), 
        CompletionFeature(title: "[", type: .small),
        CompletionFeature(title: "]", type: .small),
        CompletionFeature(title: "+", type: .small),
        CompletionFeature(title: "-", type: .small),
        CompletionFeature(title: "*", type: .small),
        CompletionFeature(title: "/", type: .small),
    ]
}
