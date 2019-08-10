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
        guard let controller = topViewController as? ProjectVC else { return }
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
    
    override var keyCommands: [UIKeyCommand]? {
        return [
            UIKeyCommand(input: "N", modifierFlags: .command, action: #selector(clone), discoverabilityTitle: "Create a new remote project"),
            UIKeyCommand(input: "N", modifierFlags: [.command, .shift], action: #selector(local), discoverabilityTitle: "Create a new local project")
        ]
    }
    
    @objc func clone() {
        guard let controller = topViewController as? ProjectVC else { return }
        controller.addProject(controller)
    }
    @objc func local() {
        guard let controller = topViewController as? ProjectVC else { return }
        controller.bulletinManager = controller.bulletin(goto: 1)
        controller.bulletinManager.showBulletin(above: controller)
    }
}
