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
        let VC = self.viewControllers as! [UINavigationController]
        guard VC.first?.visibleViewController is WorkingDirDetailVC || VC.last?.visibleViewController is WorkingDirDetailVC else { return }
        
        let color = UIColor.create(light: UIColor(red: 203 / 255, green: 205 / 255, blue: 210 / 255, alpha: 1.0), dark: UIColor(red: 40 / 255, green: 40 / 255, blue: 40 / 255, alpha: 1.0))
        accessory.backgroundColor = color
        accessory.completionView.backgroundColor = color
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
        guard let root = self.presentingViewController as? RootVC else { return }
        root.editorFocussed = true
    }
    
    @objc func keyboardWillHide(_ notification: Notification?) {
        accessory.isHidden = true
        
        let height = UIScreen.main.bounds.height
        let width = UIScreen.main.bounds.width
        accessory.frame = CGRect(x: 0, y: height - 60, width: width, height: 60)
        
        guard let root = self.presentingViewController as? RootVC else { return }
        root.editorFocussed = false
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
        CompletionFeature(title: "\\", type: .small)
    ]
}


extension UIColor {
    public static func create(light lightColor: UIColor, dark darkColor: UIColor?) -> UIColor {
        if #available(iOS 13.0, *) {
            return UIColor { (traitCollection) -> UIColor in
                if let darkColor = darkColor, traitCollection.userInterfaceStyle == .dark {
                    return darkColor
                } else {
                    return lightColor
                }
            }
        } else {
            return lightColor
        }
    }
}
