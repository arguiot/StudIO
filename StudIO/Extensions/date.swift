//
//  date.swift
//  StudIO
//
//  Created by Arthur Guiot on 3/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import Foundation
extension Date {
    
    func toShortTimeString() -> String {
        //Get Short Time String
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        let timeString = formatter.string(from: self)
        
        //Return Short Time String
        return timeString
    }
}
