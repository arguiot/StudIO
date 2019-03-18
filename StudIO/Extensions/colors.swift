//
//  colors.swift
//  StudIO
//
//  Created by Arthur Guiot on 18/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

extension UIColor {
    var hex: String {
        get {
            var red:CGFloat = 0
            var blue:CGFloat = 0
            var green:CGFloat = 0
            var alpha:CGFloat = 0
            
            self.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
            let rgb:Int = (Int)(red*255)<<16 | (Int)(green*255)<<8 | (Int)(blue*255)<<0
            return String.localizedStringWithFormat("#%06x", rgb)
        }
    }
    static func hexStringToUIColor (hex:String) -> UIColor {
        var cString:String = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        
        if (cString.hasPrefix("#")) {
            cString.remove(at: cString.startIndex)
        }
        
        if ((cString.count) != 6) {
            return UIColor.gray
        }
        
        var rgbValue:UInt32 = 0
        Scanner(string: cString).scanHexInt32(&rgbValue)
        
        return UIColor(
            red: CGFloat((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: CGFloat((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: CGFloat(rgbValue & 0x0000FF) / 255.0,
            alpha: CGFloat(1.0)
        )
    }
}
