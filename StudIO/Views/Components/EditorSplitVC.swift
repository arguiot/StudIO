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
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    @IBOutlet var accessory: SmartKeyboard!
    
    @objc func keyboardWillShow(_ notification: Notification) {
        accessory.isHidden = false
        
        if let keyboardFrame: NSValue = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? NSValue {
            let height = UIScreen.main.bounds.height
            let width = UIScreen.main.bounds.width
            
            let keyboardRectangle = keyboardFrame.cgRectValue
            let keyboardHeight = keyboardRectangle.height
            
            accessory.frame = CGRect(x: 0, y: height - 60 - keyboardHeight, width: width, height: 60)
        }
    }
    
    @objc func keyboardWillHide(_ notification: Notification) {
        accessory.isHidden = true
        
        let height = UIScreen.main.bounds.height
        let width = UIScreen.main.bounds.width
        accessory.frame = CGRect(x: 0, y: height - 60, width: width, height: 60)
    }
}