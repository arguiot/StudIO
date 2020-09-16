//
//  MasterViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import BLTNBoard

class WorkingDirMasterVC: UITableViewController {

    var detailViewController: WorkingDirDetailVC? = nil
    var objects = [MenuCellStruct]()
    var LoadManager: LoadFilesMenu?
    
    var hasToOpen = false
    var args: [String: Any]?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        
        // Refreshing
        self.refreshControl?.addTarget(self, action: #selector(refresh), for: UIControl.Event.valueChanged)
        self.refreshControl?.tintColor = .white
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(goBack(_:)))

        let addButton = UIBarButtonItem(barButtonSystemItem: .add, target: self, action: #selector(insertNewObject(_:)))
        let findAndReplace = UIBarButtonItem(barButtonSystemItem: .search, target: self, action: #selector(findAndReplace(_:)))
        navigationItem.rightBarButtonItems = [addButton, findAndReplace]
        
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
        guard let controller = detailViewController else { // If there is no detail, then there is no file...
            guard let root = self.view.window?.rootViewController as? RootVC else { return }
            root.dismiss(animated: true, completion: nil)
            root.status = false
            return
        }
        try? controller.save(nil) { // save before quitting
            guard let root = self.view.window?.rootViewController as? RootVC else { return }
            root.dismiss(animated: true, completion: nil)
            root.status = false
            
            guard let delegate = UIApplication.shared.delegate as? AppDelegate else { return }
            delegate.processCompleted(nil)
        }
    }
    
    @objc
    func findAndReplace(_ send: Any) {
        let title = "Find and Replace".localized()
        let page = TextFieldBulletinPage(title: title)
        let desc = "Find and replace a RegEx expression in each file of your project.".localized()
        page.descriptionText = desc
        page.placeholder = "Old Expression".localized()
        page.actionButtonTitle = "Find".localized()
        page.checkURL = false
        var expression = ""
        page.textInputHandler = { item, string in
            expression = string!
        }
        page.actionHandler = { (item: BLTNActionItem) in
            let replacePage = TextFieldBulletinPage(title: title)
            replacePage.descriptionText = desc
            replacePage.placeholder = "New Expression".localized()
            replacePage.actionButtonTitle = "Replace".localized()
            replacePage.checkURL = false
            var replacement = ""
            replacePage.textInputHandler = { item, string in
                replacement = string!
            }
            replacePage.actionHandler = { (item: BLTNActionItem) in
                item.manager?.displayActivityIndicator()
                DispatchQueue.global().async {
                    guard let project = self.LoadManager?.project else {
                        NSObject.alert(t: "Find and Replace", m: "Error loading the project object")
                        DispatchQueue.main.sync {
                            item.manager?.dismissBulletin(animated: true)
                        }
                        return
                    }
                    guard expression != "" else {
                        NSObject.alert(t: "Find and Replace", m: "Old Expression is empty")
                        DispatchQueue.main.sync {
                            item.manager?.dismissBulletin(animated: true)
                        }
                        return
                    }
                    var far = FindAndReplace(base: project)
                    far.replace(for: expression, with: replacement)
                    if let e = far.error as? Error {
                        NSObject.alert(t: "Find and Replace", m: e.localizedDescription)
                    }
                    DispatchQueue.main.sync {
                        item.manager?.dismissBulletin(animated: true)
                    }
                }
            }
            page.next = replacePage
            item.manager?.displayNextItem()
        }
        newFileManager = BLTNItemManager(rootItem: page)
        newFileManager?.showBulletin(above: self)
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
        try? detailViewController?.save(nil) { // saving before doing anything
            let s = path.split(separator: "/")
            let n = String(s.last!)
            let subfolder = s.dropLast()
            var l = self.LoadManager!.project
            subfolder.forEach { (str) in
                let n = String(str)
                let sf = try? l.createSubfolderIfNeeded(withName: n)
                l = sf!
            }
            try? file.rename(to: n, keepExtension: false)
            try? file.move(to: l)
            let fpath = URL(fileURLWithPath: self.LoadManager!.project.path)
            if let repo = try? Repository.at(fpath).get() {
                _ = repo.add(path: path)
            }
        }
    }
    @objc func refresh(sender: Any? = nil) {
        self.reloadInterface(nil)
        self.refreshControl?.endRefreshing()
    }
    
    @objc func reloadInterface(_ notification: Notification?) {
        guard let url = notification?.userInfo?["url"] as? URL else {
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
