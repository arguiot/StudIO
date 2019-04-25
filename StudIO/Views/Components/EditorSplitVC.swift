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
        
//        let obj: [String: Any] = ["keyboard": accessory]
//
//        var formatString = "|-[keyboard]-|"
//        var constraints = NSLayoutConstraint.constraints(withVisualFormat: formatString, options: .alignAllTop, metrics: nil, views: obj)
//
//        formatString = "H:[keyboard]-|"
//        constraints.append(contentsOf: NSLayoutConstraint.constraints(withVisualFormat: formatString, options: .alignAllTop, metrics: nil, views: obj))
//
//        NSLayoutConstraint.activate(constraints)
        
        let height = UIScreen.main.bounds.height
        let width = UIScreen.main.bounds.width
        accessory.frame = CGRect(x: 0, y: height - 50, width: width, height: 50)
        
        self.view.addSubview(accessory)
        
        accessory.isHidden = true
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    @IBOutlet var accessory: SmartKeyboard!
    
    @objc func keyboardWasShown() {
        
        
    }
}
