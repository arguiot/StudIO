//
//  SetButtons.swift
//  ArcadeGame
//
//  Created by Nikki Truong on 2019-02-28.
//  Copyright © 2019 PenguinExpress. All rights reserved.
//

import UIKit

class SetButtons: UIButton {

    override func awakeFromNib() {
        super.awakeFromNib()
        
        layer.borderWidth = 2
        layer.borderColor = UIColor.blue.cgColor
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        layer.cornerRadius = frame.height / 2
    }
}
