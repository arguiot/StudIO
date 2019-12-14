//
//  SmartKeyboard.swift
//  StudIO
//
//  Created by Arthur Guiot on 16/4/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import WebKit

class SmartKeyboard: UIView {
    
    @IBOutlet weak var loader: UIActivityIndicatorView!
    
    @IBOutlet weak var bulb: UIButton!
    @IBOutlet weak var preview: UIButton!
    @IBOutlet weak var questionInput: UITextField!
    
    @IBOutlet weak var completionView: UICollectionView!
    var state = false
    
    var `extension` = "js" {
        didSet {
            let previews = ["md", "tex", "html"]
            if previews.contains(self.extension) {
                self.preview.isHidden = false
                let color = UIColor.create(light: UIColor(red: 203 / 255, green: 205 / 255, blue: 210 / 255, alpha: 1.0), dark: UIColor(red: 40 / 255, green: 40 / 255, blue: 40 / 255, alpha: 1.0))
                self.preview.backgroundColor = color
                
                self.pstate = false
                if #available(iOS 13.0, *) {
                    self.preview.tintColor = .label
                } else {
                    self.preview.tintColor = .black
                }
                
            } else {
                self.preview.isHidden = true
            }
        }
    }
    var pstate = false
    @IBAction func openPreview(_ sender: Any) {
        if pstate == true {
            pstate = false
            if #available(iOS 13.0, *) {
                self.preview.tintColor = .label
            } else {
                self.preview.tintColor = .black
            }
            
            NotificationCenter.default.post(name: .init("disablePreview"), object: nil, userInfo: nil)
        } else {
            pstate = true
            self.preview.tintColor = .blue
            
            NotificationCenter.default.post(name: .init("enablePreview"), object: nil, userInfo: nil)
            
        }
    }
    @IBAction func cheatCode(_ sender: Any) {
        questionInput.isHidden = state
        completionView.isHidden = !state
        state = !state
        
        if (state == true) {
            questionInput.center.y += self.bounds.height
            questionInput.alpha = 0
            UIView.animate(withDuration: 0.5) {
                self.questionInput.center.y -= self.bounds.height
                self.questionInput.alpha = 1
                self.bulb.tintColor = .blue
            }
        } else {
            if questionInput.text != "" {
                load()
            }
            UIView.animate(withDuration: 0.5, animations: {
                self.questionInput.center.y += self.bounds.height
                self.questionInput.alpha = 0
                if #available(iOS 13.0, *) {
                    self.bulb.tintColor = .label
                } else {
                    self.bulb.tintColor = .black
                }
            }) { (done) in
                self.questionInput.center.y -= self.bounds.height
                self.questionInput.text = ""
            }
        }
        
    }
    func load() {
        bulb.isHidden = true
        loader.isHidden = false
        loader.startAnimating()
        
        let cht = ChtSH()
        let url = cht.getLink(question: questionInput.text ?? "", language: self.extension, comments: true)
        DispatchQueue.global().async {
            cht.down(load: url) { (str) in
                let snippet = Snippet(n: "smartCheatCode", c: str, l: self.extension)
                NotificationCenter.default.post(name: .init("insertSnippet"), object: nil, userInfo: ["selected": snippet])
                
                DispatchQueue.main.sync {
                    self.bulb.isHidden = false
                    self.loader.isHidden = true
                    self.loader.stopAnimating()
                }
            }
        }
    }
}



// Removes accessory bar
fileprivate final class InputAccessoryHackHelper: NSObject {
    @objc var inputAccessoryView: AnyObject? { return nil }
}

extension WKWebView {
    func hack_removeInputAccessory() {
        guard let target = scrollView.subviews.first(where: {
            String(describing: type(of: $0)).hasPrefix("WKContent")
        }), let superclass = target.superclass else {
            return
        }
        
        let noInputAccessoryViewClassName = "\(superclass)_NoInputAccessoryView"
        var newClass: AnyClass? = NSClassFromString(noInputAccessoryViewClassName)
        
        if newClass == nil, let targetClass = object_getClass(target), let classNameCString = noInputAccessoryViewClassName.cString(using: .ascii) {
            newClass = objc_allocateClassPair(targetClass, classNameCString, 0)
            
            if let newClass = newClass {
                objc_registerClassPair(newClass)
            }
        }
        
        guard let noInputAccessoryClass = newClass, let originalMethod = class_getInstanceMethod(InputAccessoryHackHelper.self, #selector(getter: InputAccessoryHackHelper.inputAccessoryView)) else {
            return
        }
        class_addMethod(noInputAccessoryClass.self, #selector(getter: InputAccessoryHackHelper.inputAccessoryView), method_getImplementation(originalMethod), method_getTypeEncoding(originalMethod))
        object_setClass(target, noInputAccessoryClass)
    }
}
