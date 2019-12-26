//
//  MasterViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import BLTNBoard
import SwiftGit2

class WorkingDirMasterVC: UITableViewController {

    var detailViewController: WorkingDirDetailVC? = nil
    var objects = [MenuCellStruct]()
    var LoadManager: LoadFilesMenu?
    
    var hasToOpen = false
    var args: [String: Any]?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(goBack(_:)))

        let addButton = UIBarButtonItem(barButtonSystemItem: .add, target: self, action: #selector(insertNewObject(_:)))
        navigationItem.rightBarButtonItem = addButton
        if let split = splitViewController {
            let controllers = split.viewControllers
            detailViewController = (controllers[controllers.count-1] as! UINavigationController).topViewController as? WorkingDirDetailVC
        }
        
        
        // Load objects
        objects = LoadManager?.loadProject() ?? []
        
        // Create Bulleting
        newFileManager = bulletin()
        
        if #available(iOS 11.0, *) {
            self.tableView.dragDelegate = self
        }
        
        // Automatically reload files
        NotificationCenter.default.addObserver(self, selector: #selector(reloadInterface(_:)), name: .init("reloadEditorMenu"), object: nil)
        
        if hasToOpen {
            guard let path = args?["path"] as? URL else { return }
            self.performSegue(withIdentifier: "showEditor", sender: path)
        }
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        UIApplication.shared.statusBarStyle = .lightContent
        return .lightContent
    }
    override func viewWillAppear(_ animated: Bool) {
        clearsSelectionOnViewWillAppear = splitViewController!.isCollapsed
        super.viewWillAppear(animated)
    }
    @objc
    func goBack(_ send: Any) {
        guard let controller = detailViewController?.visibleViewController as? DetailVC else { return }
        controller.save() // save before quitting
        
        guard let root = self.view.window?.rootViewController as? RootVC else { return }
        root.dismiss(animated: true, completion: nil)
        root.status = false
    }
    
    var newFileManager: BLTNItemManager?
    
    func bulletin(file: File? = nil) -> BLTNItemManager? {
        guard let root = LoadManager?.project.path else {
            return nil
        }
        let subPath = file?.path.dropFirst(root.count)
        let strP = String(subPath ?? "")
        var title = ""
        var desc = ""
        var action = ""
        if file != nil {
            title = "Move / Rename file".localized()
            desc = "Move or rename your file using the path below.".localized()
            action = "Move / Rename".localized()
        } else {
            title = "New File".localized()
            desc = ("Create a new file or folder in \(self.title ?? "UNDEFINED")").localized()
            action = "Create".localized()
        }
        let page = TextFieldBulletinPage(title: title)
        page.content = strP
        page.descriptionText = desc
        page.actionButtonTitle = action
        page.checkURL = false
        page.placeholder = "File name".localized()
        var text = strP
        page.textInputHandler = { item, string in
            text = string!
        }
        page.actionHandler = { (item: BLTNActionItem) in
            if file != nil {
                self.move(file: file!, path: text)
            } else if text != "" {
                let c = CreateFile(p: self.LoadManager!.project)
                _ = c.createFile(name: text)
            }
            self.objects = self.LoadManager!.loadProject()
            
            self.tableView.reloadSections([0], with: .automatic)
            
            item.manager?.dismissBulletin(animated: true)
        }
        return BLTNItemManager(rootItem: page)
    }
    
    @objc
    func insertNewObject(_ sender: Any) {
        newFileManager = bulletin()
        newFileManager?.showBulletin(above: self)
    }

    // MARK: - Table View

    
    func closeFolder(_ folder: Folder, object: MenuCellStruct, indexPath: IndexPath) {
        let array = LoadManager!.loadFolders(base: folder, i: object.ident + 1)
        let count = array.count
        
        let row = indexPath.row + 1
        if count >= 1 {
            for i in 0...(count - 1) {
                let cell = self.objects[row + i]
                if cell.type == .folder && cell.toggled == true {
                    closeFolder(cell.path as! Folder, object: cell, indexPath: IndexPath(row: row + i, section: 0))
                    self.tableView.reloadData()
                }
            }
        }
        let low = indexPath.row + 1
        let high = low + count - 1
        if high >= low {
            objects.removeSubrange(low...high)
        }
    }
    
    func move(file: File, path: String) {
        guard let visible = detailViewController?.visibleViewController as? DetailVC else { return }
        visible.save() // saving before doing anything
        
        let s = path.split(separator: "/")
        let n = String(s.last!)
        let subfolder = s.dropLast()
        var l = LoadManager!.project
        subfolder.forEach { (str) in
            let n = String(str)
            let sf = try? l.createSubfolderIfNeeded(withName: n)
            l = sf!
        }
        try? file.rename(to: n, keepExtension: false)
        try? file.move(to: l)
        let fpath = URL(fileURLWithPath: LoadManager!.project.path)
        if let repo = try? Repository.at(fpath).get() {
            _ = repo.add(path: path)
        }
    }
    
    @objc func reloadInterface(_ notification: Notification) {
        guard let url = notification.userInfo?["url"] as? URL else {
            objects = LoadManager?.loadProject() ?? []
            self.tableView.reloadData()
            return
        }
        reloadFolder(url: url)
    }
    func reloadFolder(url: URL) {
        let baseURL = url.isFileURL ? url.deletingLastPathComponent() : url
        for object in objects {
            guard object.type == .folder else { continue }
            let folder = object.path as! Folder
            let path = URL(fileURLWithPath: folder.path)
            if baseURL == path && object.toggled == true {
                guard let index = objects.firstIndex(of: object) else { continue }
                let indexPath = IndexPath(row: index, section: 0)
                closeFolder(folder, object: object, indexPath: indexPath)
                
                let array = LoadManager!.loadFolders(base: folder, i: object.ident + 1)
                objects.insert(contentsOf: array, at: indexPath.row + 1)
                return
            }
        }
        objects = LoadManager?.loadProject() ?? []
        self.tableView.reloadData()
    }
}
