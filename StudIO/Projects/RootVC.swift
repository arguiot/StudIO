//
//  RootVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 23/2/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import BLTNBoard

class RootVC: UINavigationController, QuickActionSupport {
    func prepareForQuickAction<T>(_ shortcutType: T) where T : ShortcutType {
        let controller = topViewController as! ProjectVC
        if let shortcut = AppShortcut(rawValue: shortcutType.value) {
            switch shortcut {
            case .cloneRepo:
                controller.addProject(controller)
            case .localRepo:
                controller.bulletinManager = controller.bulletin(goto: 1)
                controller.bulletinManager.showBulletin(above: controller)
            }
        }
    }
    
    
}
