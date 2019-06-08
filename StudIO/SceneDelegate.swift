//
//  SceneDelegate.swift
//  StudIO
//
//  Created by Arthur Guiot on 7/6/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    
    // UIWindowScene delegate
    
    @available(iOS 13.0, *)
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        if let userActivity = connectionOptions.userActivities.first ?? session.stateRestorationActivity {
            if !configure(window: window, with: userActivity) {
                print("Failed to restore from \(userActivity)")
            }
        }
        
        // If there were no user activities, we don't have to do anything.
        // The `window` property will automatically be loaded with the storyboard's initial view controller.
    }
    
    @available(iOS 13.0, *)
    func stateRestorationActivity(for scene: UIScene) -> NSUserActivity? {
        return scene.userActivity
    }
    
    // Utilities
    
    func configure(window: UIWindow?, with activity: NSUserActivity) -> Bool {
        if activity.title == "openFile" {
            return true
        }
        return false
    }
}
