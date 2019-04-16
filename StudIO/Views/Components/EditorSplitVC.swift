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
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWasShown), name: UIResponder.keyboardDidShowNotification, object: nil)
        
        let obj: [String: Any] = ["keyboard": accessory]
        
        let formatString = "|-[keyboard]-|"
        let constraints = NSLayoutConstraint.constraints(withVisualFormat: formatString, options: .alignAllTop, metrics: nil, views: obj)
        
        NSLayoutConstraint.activate(constraints)
        
        accessory.addConstraints(NSLayoutConstraint.constraints(withVisualFormat: "H:[view]-|", options: NSLayoutConstraint.FormatOptions.alignAllCenterY, metrics: nil, views: obj))
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    @IBOutlet var accessory: SmartKeyboard!
    
    @objc func keyboardWasShown() {
        
        
    }
}
