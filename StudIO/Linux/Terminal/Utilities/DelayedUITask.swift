//
//  DelayedUITask.swift
//  StudIO
//
//  Created by Arthur Guiot on 6/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

class DelayedUITask {
    private var target: Any?
    private var action: Selector?
    private var timer: Timer?
    
    init(target: Any?, action: Selector?) {
        //if super.init()
        self.target = target
        if let action = action {
            self.action = action
        }
    }
    
    func schedule() {
        if !(timer?.isValid ?? false) {
            if let target = target {
                timer = Timer(timeInterval: 1.0 / 60, target: target, selector: action!, userInfo: nil, repeats: false)
            }
            if let timer = timer {
                RunLoop.main.add(timer, forMode: .default)
            }
        }
    }
}
