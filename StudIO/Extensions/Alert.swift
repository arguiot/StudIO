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
        DispatchQueue.main.async {
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
    static func alert(t: String, m: String, completion: @escaping (String?) -> Void) {
        DispatchQueue.main.async {
            let alertWindow = UIWindow(frame: UIScreen.main.bounds)
            alertWindow.rootViewController = UIViewController()
            alertWindow.windowLevel = UIWindow.Level.alert + 1
            alertWindow.makeKeyAndVisible()
            
            //1. Create the alert controller.
            let alert = UIAlertController(title: t, message: m, preferredStyle: .alert)
            alert.addTextField(configurationHandler: { (textField) in
                textField.placeholder = "Type here"
            })
            let action = UIAlertAction(title: "OK", style: .default, handler: { (action) in
                let field = alert.textFields?.first!
                completion(field?.text)
            })
            alert.addAction(action)
            alertWindow.rootViewController?.present(alert, animated: true, completion: nil)
        }
    }
}
