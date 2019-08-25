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
    // MARK: Keyboard Shortcuts
    var status = false
    
    override var keyCommands: [UIKeyCommand]? {
        if status == true {
            return [
                UIKeyCommand(input: "W", modifierFlags: .command, action: #selector(goBack(_:)), discoverabilityTitle: "Close editor"),
                UIKeyCommand(input: "S", modifierFlags: .command, action: #selector(save(_:)), discoverabilityTitle: "Save document"),
                UIKeyCommand(input: "S", modifierFlags: [.command, .shift], action: #selector(showSnippet(_:)), discoverabilityTitle: "Show snippets"),
                UIKeyCommand(input: "G", modifierFlags: .command, action: #selector(gitPanel(_:)), discoverabilityTitle: "Show Git Panel"),
                UIKeyCommand(input: "G", modifierFlags: [.command, .shift], action: #selector(gitVC(_:)), discoverabilityTitle: "Show Repository information"),
                UIKeyCommand(input: "Z", modifierFlags: [.command], action: #selector(undo(_:)), discoverabilityTitle: "Undo"),
                UIKeyCommand(input: "Z", modifierFlags: [.command, .shift], action: #selector(redo(_:)), discoverabilityTitle: "Redo"),
                UIKeyCommand(input: "\t", modifierFlags: .control, action: #selector(escapeKeyTapped), discoverabilityTitle: "Reset cell focus"),
                UIKeyCommand(input: "\t", modifierFlags: [], action: #selector(nextKeyTapped), discoverabilityTitle: "Next item"),
                UIKeyCommand(input: "\t", modifierFlags: .shift, action: #selector(previousKeyTapped), discoverabilityTitle: "Previous item"),
                UIKeyCommand(input: "\r", modifierFlags: [], action: #selector(selectKeyTapped), discoverabilityTitle: "Select item")
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
    @objc func undo(_ send: Any) {
        guard let splitViewController = self.presentedViewController as? EditorSplitVC else { return }
        guard let editor = splitViewController.viewControllers.last as? UINavigationController else { return }
        guard let e = editor.topViewController as? WorkingDirDetailVC else { return }
        e.undo(send)
    }
    @objc func redo(_ send: Any) {
        guard let splitViewController = self.presentedViewController as? EditorSplitVC else { return }
        guard let editor = splitViewController.viewControllers.last as? UINavigationController else { return }
        guard let e = editor.topViewController as? WorkingDirDetailVC else { return }
        e.redo(send)
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
    
    // MARK: Keyboard shortcuts
    
//    override var keyCommands: [UIKeyCommand]? {
//        return [
//            UIKeyCommand(input: "\t", modifierFlags: .control, action: #selector(escapeKeyTapped), discoverabilityTitle: "Reset cell focus"),
//            UIKeyCommand(input: "\t", modifierFlags: [], action: #selector(nextKeyTapped), discoverabilityTitle: "Next item"),
//            UIKeyCommand(input: "\t", modifierFlags: .shift, action: #selector(previousKeyTapped), discoverabilityTitle: "Previous item"),
//            UIKeyCommand(input: "\r", modifierFlags: [], action: #selector(selectKeyTapped), discoverabilityTitle: "Select item"),
//            UIKeyCommand(input: "\t", modifierFlags: .alternate, action: #selector(selectKeyTapped), discoverabilityTitle: "Select item"),
//            UIKeyCommand(input: "S", modifierFlags: .command, action: #selector(showSettings(_:)), discoverabilityTitle: "Open Settings"),
//            UIKeyCommand(input: "?", modifierFlags: [], action: #selector(openDucmentation(_:)), discoverabilityTitle: "Open Documentation"),
//            UIKeyCommand(input: "W", modifierFlags: .command, action: #selector(dismissAll), discoverabilityTitle: "Dismiss current view")
//        ]
//    }

    override var canBecomeFirstResponder: Bool {
        return true
    }
    
    @objc func dismissAll() {
        self.presentedViewController?.dismiss(animated: true, completion: nil)
    }
    @objc func escapeKeyTapped() {
        collectionViewKeyCommandsController?.escapeKeyTapped()
    }

    @objc func selectKeyTapped() {
        guard let focussedIndexPath = collectionViewKeyCommandsController?.focussedIndexPath else { return }
        guard let splitViewController = self.presentedViewController as? EditorSplitVC else { return }
        guard let menu = splitViewController.viewControllers.first as? UINavigationController else { return }
        guard let m = menu.topViewController as? WorkingDirMasterVC else { return }
        m.tableView(m.tableView, didSelectRowAt: focussedIndexPath)
    }

    @objc func nextKeyTapped() {
        collectionViewKeyCommandsController?.nextKeyTapped()
    }

    @objc func previousKeyTapped() {
        collectionViewKeyCommandsController?.previousKeyTapped()
    }
    
    fileprivate var collectionViewKeyCommandsController: TableViewKeyCommandsController? {
        guard let splitViewController = self.presentedViewController as? EditorSplitVC else { return nil }
        guard let menu = splitViewController.viewControllers.first as? UINavigationController else { return nil }
        guard let m = menu.topViewController as? WorkingDirMasterVC else { return nil }
        return TableViewKeyCommandsController(tableView: m.tableView)
    }
    
    final class TableViewKeyCommandsController {
        private let tableView: UITableView
        var focussedIndexPath: IndexPath? {
            didSet {
                if oldValue != nil, let oldCell = tableView.cellForRow(at: oldValue!) {
                    guard let oldcell = oldCell as? FileCell else { return }
                    oldcell.backgroundColor = #colorLiteral(red: 0, green: 0, blue: 0, alpha: 0)
                }
                
                guard let focussedIndexPath = focussedIndexPath, let focussedCell = tableView.cellForRow(at: focussedIndexPath) else { return }

                UIView.animate(withDuration: 0.2, animations: {
                    focussedCell.alpha = 0.5
                    guard let cell = focussedCell as? FileCell else { return }
                    cell.backgroundColor = #colorLiteral(red: 0, green: 0, blue: 0, alpha: 0.5)
                }, completion: { _ in
                    UIView.animate(withDuration: 0.2, animations: {
                        focussedCell.alpha = 1.0
                    })
                })

            }
        }

        init(tableView: UITableView) {
            self.tableView = tableView
        }

        func escapeKeyTapped() {
            focussedIndexPath = nil
        }

        func nextKeyTapped() {
            guard let focussedIndexPath = focussedIndexPath else {
                self.focussedIndexPath = firstIndexPath
                return
            }

            let numberOfItems = tableView.numberOfRows(inSection: 0)
            let focussedItem = focussedIndexPath.item

            guard focussedItem != (numberOfItems - 1) else {
                self.focussedIndexPath = firstIndexPath
                return
            }

            self.focussedIndexPath = IndexPath(item: focussedItem + 1, section: 0)
        }

        func previousKeyTapped() {
            guard let focussedIndexPath = focussedIndexPath else {
                self.focussedIndexPath = lastIndexPath
                return
            }

            let focussedItem = focussedIndexPath.item

            guard focussedItem > 0 else {
                self.focussedIndexPath = lastIndexPath
                return
            }

            self.focussedIndexPath = IndexPath(item: focussedItem - 1, section: 0)
        }

        private var lastIndexPath: IndexPath {
            return IndexPath(item: tableView.numberOfRows(inSection: 0) - 1, section: 0)
        }

        private var firstIndexPath: IndexPath {
            return IndexPath(item: 0, section: 0)
        }
    }
}
