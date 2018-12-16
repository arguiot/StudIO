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
    
    lazy var newFileManager: BLTNItemManager = {
        let page = TextFieldBulletinPage(title: "New File")
        page.descriptionText = "Create a new file in \(self.title ?? "UNDEFINED")"
        page.actionButtonTitle = "Create"
        page.checkURL = false
        page.placeholder = "File name"
        var text = ""
        page.textInputHandler = { item, string in
            text = string!
        }
        page.actionHandler = { (item: BLTNActionItem) in
            let c = CreateFile(p: self.LoadManager.project)
            _ = c.createFile(name: text)
            
            self.objects = self.LoadManager.loadProject()
            
            self.tableView.reloadSections([0], with: .automatic)
            
            item.manager?.dismissBulletin(animated: true)
        }
        return BLTNItemManager(rootItem: page)
    }()
    
    @objc
    func insertNewObject(_ sender: Any) {
        newFileManager.showBulletin(above: self)
    }

    // MARK: - Table View

    override func numberOfSections(in tableView: UITableView) -> Int {
        return 1
    }

    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return objects.count
    }

    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "FileCell", for: indexPath) as! FileCell

        let object = objects[indexPath.row]
        cell.file = object.name
        cell.fileType = object.type
        cell.ident = object.ident
        
        cell.update() // more optimized than previous method
        
        return cell
    }

    override func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool {
        // Return false if you do not want the specified item to be editable.
        return true
    }

    override func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        if editingStyle == .delete {
            let o = objects[indexPath.row]
            switch o.type {
            case .file:
                let f = o.path as! File
                _ = try? f.delete()
                
                objects.remove(at: indexPath.row)
            case .folder:
                // Toggle
                if o.toggled == true {
                    closeFolder(o.path as! Folder, object: o, indexPath: indexPath)
                }
                
                let f = o.path as! Folder
                _ = try? f.delete()
                
                objects.remove(at: indexPath.row)
            }
            tableView.reloadSections([0], with: .automatic)
        } else if editingStyle == .insert {
            // Create a new instance of the appropriate class, insert it into the array, and add a new row to the table view.
        }
    }
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let object = objects[indexPath.row]
        if object.type == .folder {
            let folder = object.path as! Folder
            let array = LoadManager.loadFolders(base: folder, i: object.ident + 1)
            if (object.toggled == false) {
                objects.insert(contentsOf: array, at: indexPath.row + 1)
                objects[indexPath.row].toggled = true
            } else {
                closeFolder(folder, object: object, indexPath: indexPath)
                objects[indexPath.row].toggled = false
            }
            tableView.reloadSections([0], with: .automatic)
        } else {
            let controller = detailViewController
            controller?.save() // saving before opening file
            controller?.detailItem = object.path as? File
            controller?.navigationItem.leftBarButtonItem = splitViewController?.displayModeButtonItem
            controller?.navigationItem.leftItemsSupplementBackButton = true
        }
    }
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
}

