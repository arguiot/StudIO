//
//  SmartKeyboard.swift
//  StudIO
//
//  Created by Arthur Guiot on 16/4/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class SmartKeyboard: UIView {

    /*
    // Only override draw() if you perform custom drawing.
    // An empty implementation adversely affects performance during animation.
    override func draw(_ rect: CGRect) {
        // Drawing code
    }
    */

    @IBOutlet weak var bulb: UIButton!
    @IBOutlet weak var questionInput: UITextField!
    var state = false
    
    var `extension` = "js"
    @IBAction func cheatCode(_ sender: Any) {
        questionInput.isHidden = state
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
            load()
            UIView.animate(withDuration: 0.5, animations: {
                self.questionInput.center.y += self.bounds.height
                self.questionInput.alpha = 0
                self.bulb.tintColor = .black
            }) { (done) in
                self.questionInput.center.y -= self.bounds.height
                self.questionInput.text = ""
            }
        }
        
    }
    func load() {
        let cht = ChtSH()
        let url = cht.getLink(question: questionInput.text ?? "", language: self.extension, comments: false)
        DispatchQueue.global().async {
            cht.down(load: url) { (str) in
                let snippet = Snippet(n: "smartCheatCode", c: str, l: self.extension)
                NotificationCenter.default.post(name: .init("insertSnippet"), object: nil, userInfo: ["selected": snippet])
            }
        }
    }
}
