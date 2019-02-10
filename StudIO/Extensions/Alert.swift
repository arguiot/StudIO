//
//  Alert.swift
//  StudIO
//
//  Created by Arthur Guiot on 27/1/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

extension NSObject {
    static func alert(t: String, m: String) {
        print(t, m)
        DispatchQueue.main.sync {
            let alertWindow = UIWindow(frame: UIScreen.main.bounds)
            alertWindow.rootViewController = UIViewController()
            alertWindow.windowLevel = UIWindow.Level.alert + 1
            alertWindow.makeKeyAndVisible()
            
            //1. Create the alert controller.
            let alert = UIAlertController(title: t, message: m, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
            alertWindow.rootViewController?.present(alert, animated: true, completion: nil)
        }
    }
}
