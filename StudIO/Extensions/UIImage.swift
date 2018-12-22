//
//  UIImage.swift
//  StudIO
//
//  Created by Arthur Guiot on 22/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit

extension UIImage {
    func scaleImage(toSize newSize: CGSize) -> UIImage? {
        var newImage: UIImage?
        let newRect = CGRect(x: 0, y: 0, width: newSize.width * 3, height: newSize.height * 3).integral
        
        let cg = CGSize(width: newSize.width * 3, height: newSize.height * 3)
        UIGraphicsBeginImageContextWithOptions(cg, false, 0)
        if let context = UIGraphicsGetCurrentContext(), let cgImage = self.cgImage {
            context.interpolationQuality = .high
            let flipVertical = CGAffineTransform(a: 1, b: 0, c: 0, d: -1, tx: 0, ty: newSize.height * 3)
            context.concatenate(flipVertical)
            context.draw(cgImage, in: newRect)
            if let img = context.makeImage() {
                newImage = UIImage(cgImage: img, scale: 3, orientation: .up)
                
            }
            UIGraphicsEndImageContext()
        }
        return newImage
    }
}
