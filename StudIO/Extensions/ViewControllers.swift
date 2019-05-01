//
//  ViewControllers.swift
//  StudIO
//
//  Created by Arthur Guiot on 30/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit

extension UIViewController {
    var previousViewController: UIViewController? {
        if let controllersOnNavStack = self.navigationController?.viewControllers {
            let n = controllersOnNavStack.count
            //if self is still on Navigation stack
            if controllersOnNavStack.last === self, n > 1 {
                return controllersOnNavStack[n - 2]
            } else if n > 0{
                return controllersOnNavStack[n - 1]
            }
        }
        return nil
    }
}
extension UIView {
    //Get Parent View Controller from any view
    var parentViewController: UIViewController {
        var responder: UIResponder? = self
        while !(responder is UIViewController) {
            responder = responder?.next
            if nil == responder {
                break
            }
        }
        return (responder as? UIViewController)!
    }
}
