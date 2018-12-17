//
//  MasterViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import BLTNBoard

class MasterViewController: UITableViewController {

    var detailViewController: DetailViewController? = nil
    var objects = [MenuCellStruct]()
    var LoadManager: LoadFilesMenu!

    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(goBack(_:)))

        let addButton = UIBarButtonItem(barButtonSystemItem: .add, target: self, action: #selector(insertNewObject(_:)))
        navigationItem.rightBarButtonItem = addButton
        if let split = splitViewController {
            let controllers = split.viewControllers
            detailViewController = (controllers[controllers.count-1] as! UINavigationController).topViewController as? DetailViewController
        }
        
        
        // Load objects
        objects = LoadManager.loadProject()
        
        // Create Bulleting
        newFileManager = bulletin()
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
        let controller = detailViewController
        controller?.save() // save before quitting
        
        self.view.window?.rootViewController?.dismiss(animated: true, completion: nil)
    }
    
    var newFileManager: BLTNItemManager!
    
    func bulletin(file: File? = nil) -> BLTNItemManager {
        let root = LoadManager.project.path
        let subPath = file?.path.dropFirst(root.count)
        let strP = String(subPath ?? "")
        var title = ""
        var desc = ""
        var action = ""
        if file != nil {
            title = "Move / Rename file"
            desc = "Move or rename your file using the path below."
            action = "Move / Rename"
        } else {
            title = "New File"
            desc = "Create a new file in \(self.title ?? "UNDEFINED")"
            action = "Create"
        }
        let page = TextFieldBulletinPage(title: title)
        page.content = strP
        page.descriptionText = desc
        page.actionButtonTitle = action
        page.checkURL = false
        page.placeholder = "File name"
        var text = ""
        page.textInputHandler = { item, string in
            text = string!
        }
        page.actionHandler = { (item: BLTNActionItem) in
            if file != nil {
                self.move(file: file!, path: text)
            } else {
                let c = CreateFile(p: self.LoadManager.project)
                _ = c.createFile(name: text)
            }
            self.objects = self.LoadManager.loadProject()
            
            self.tableView.reloadSections([0], with: .automatic)
            
            item.manager?.dismissBulletin(animated: true)
        }
        return BLTNItemManager(rootItem: page)
    }
    
    @objc
    func insertNewObject(_ sender: Any) {
        newFileManager = bulletin()
        newFileManager.showBulletin(above: self)
    }

    // MARK: - Table View

    
    func closeFolder(_ folder: Folder, object: MenuCellStruct, indexPath: IndexPath) {
        let array = LoadManager.loadFolders(base: folder, i: object.ident + 1)
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
        let s = path.split(separator: "/")
        let n = String(s.last!)
        let subfolder = s.dropLast()
        var l = LoadManager.project
        subfolder.forEach { (str) in
            let n = String(str)
            let sf = try? l.createSubfolderIfNeeded(withName: n)
            l = sf!
        }
        try? file.rename(to: n, keepExtension: false)
        try? file.move(to: l)
    }
}
