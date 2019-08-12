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
    
    var status = false
    
    override var keyCommands: [UIKeyCommand]? {
        if status == true {
            return [
                UIKeyCommand(input: "W", modifierFlags: .command, action: #selector(goBack(_:)), discoverabilityTitle: "Close editor"),
                UIKeyCommand(input: "S", modifierFlags: .command, action: #selector(save(_:)), discoverabilityTitle: "Save document"),
                UIKeyCommand(input: "S", modifierFlags: [.command, .shift], action: #selector(showSnippet(_:)), discoverabilityTitle: "Show snippets"),
                UIKeyCommand(input: "G", modifierFlags: .command, action: #selector(gitPanel(_:)), discoverabilityTitle: "Show Git Panel"),
                UIKeyCommand(input: "G", modifierFlags: [.command, .shift], action: #selector(gitVC(_:)), discoverabilityTitle: "Show Repository information")
            ]
        }
        return [
            UIKeyCommand(input: "N", modifierFlags: .command, action: #selector(clone), discoverabilityTitle: "Create a new remote project"),
            UIKeyCommand(input: "N", modifierFlags: [.command, .shift], action: #selector(local), discoverabilityTitle: "Create a new local project")
        ]
    }
    @objc func goBack(_ send: Any) {
        guard let splitViewController = self.presentedViewController as? EditorSplitVC else { return }
        guard let master = splitViewController.viewControllers.first as? UINavigationController else { return }
        guard let m = master.topViewController as? WorkingDirMasterVC else { return }
        m.goBack(self)
    }
    @objc func save(_ send: Any) {
        guard let splitViewController = self.presentedViewController as? EditorSplitVC else { return }
        guard let editor = splitViewController.viewControllers.last as? UINavigationController else { return }
        guard let e = editor.topViewController as? WorkingDirDetailVC else { return }
        e.save()
    }
    @objc func showSnippet(_ send: Any) {
        guard let splitViewController = self.presentedViewController as? EditorSplitVC else { return }
        guard let editor = splitViewController.viewControllers.last as? UINavigationController else { return }
        guard let e = editor.topViewController as? WorkingDirDetailVC else { return }
        e.showSnippet(send)
    }
    @objc func gitPanel(_ send: Any) {
        guard let splitViewController = self.presentedViewController as? EditorSplitVC else { return }
        guard let editor = splitViewController.viewControllers.last as? UINavigationController else { return }
        guard let e = editor.topViewController as? WorkingDirDetailVC else { return }
        e.gitPanel(send)
    }
    @objc func gitVC(_ send: Any) {
        guard let splitViewController = self.presentedViewController as? EditorSplitVC else { return }
        guard let editor = splitViewController.viewControllers.last as? UINavigationController else { return }
        guard let e = editor.topViewController as? WorkingDirDetailVC else { return }
        e.gitVC(send)
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
