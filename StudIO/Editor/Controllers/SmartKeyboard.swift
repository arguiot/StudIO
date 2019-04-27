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
            UIView.animate(withDuration: 0.5, animations: {
                self.questionInput.center.y += self.bounds.height
                self.questionInput.alpha = 0
                self.bulb.tintColor = .black
            }) { (done) in
                self.questionInput.center.y -= self.bounds.height
            }
            
        }
        
    }
    
}
