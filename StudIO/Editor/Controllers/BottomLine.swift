//
//  BottomLine.swift
//  StudIO
//
//  Created by Arthur Guiot on 3/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit

class BottomLine: UIView {
    

    
    @IBOutlet weak var language: UILabel!
    @IBOutlet var contentView: UIView!
    @IBOutlet weak var sizeString: UILabel!
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        commonInit()
    }
    
    
    private func commonInit() {
        Bundle.main.loadNibNamed("BottomLine", owner: self, options: nil)
        
        addSubview(contentView)
        contentView.frame = self.bounds
        contentView.autoresizingMask = [.flexibleHeight, .flexibleWidth]
        
        initialisation()
        
    }
    func initialisation() {
        
    }
    
    func setupLanguage(_ file: String) {
        let arr = file.split(separator: ".")
        let ext = String(arr[arr.count - 1]).uppercased()
        language.text = ext
    }
}
