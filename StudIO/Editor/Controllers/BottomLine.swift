//
//  BottomLine.swift
//  StudIO
//
//  Created by Arthur Guiot on 3/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit

class BottomLine: UIView {
    

    @IBOutlet weak var time: UILabel!
    @IBOutlet var contentView: UIView!
    
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
        updateTime()
        
        setupTimers()
    }
    func setupTimers() {
        Timer.scheduledTimer(timeInterval: 5, target: self, selector: #selector(updateTime), userInfo: nil, repeats: true)
    }
    @objc func updateTime() {
        let date = Date()
        time.text = date.toShortTimeString()
    }

}
