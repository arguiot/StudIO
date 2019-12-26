//
//  TableViewExtension.swift
//  StudIO
//
//  Created by Arthur Guiot on 17/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2

extension WorkingDirMasterVC: UITableViewDragDelegate {
    
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
        if object.name == "studio-package.json" {
            UserDefaults.standard.set(true, forKey: "studio-behaviours")
        }
        cell.fileType = object.type
        cell.ident = object.ident
        
        cell.update() // more optimized than previous method
        
        return cell
    }
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let object = objects[indexPath.row]
        if object.type == .folder {
            let folder = object.path as! Folder
            let array = LoadManager!.loadFolders(base: folder, i: object.ident + 1)
            if (object.toggled == false) {
                objects.insert(contentsOf: array, at: indexPath.row + 1)
                objects[indexPath.row].toggled = true
            } else {
                closeFolder(folder, object: object, indexPath: indexPath)
                objects[indexPath.row].toggled = false
            }
            tableView.reloadSections([0], with: .automatic)
        } else {
            self.performSegue(withIdentifier: "showEditor", sender: object)
        }
    }
    
    override func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool {
        // Return false if you do not want the specified item to be editable.
        return true
    }
    
    override func tableView(_ tableView: UITableView, editActionsForRowAt indexPath: IndexPath) -> [UITableViewRowAction]? {
        let obj = self.objects[indexPath.row]
        let delete = UITableViewRowAction(style: .destructive, title: "Delete") { (action, indexPath) in
            let o = self.objects[indexPath.row]
            switch o.type {
            case .file:
                let f = o.path as! File
                _ = try? f.delete()
                
                self.objects.remove(at: indexPath.row)
            case .folder:
                // Toggle
                if o.toggled == true {
                    self.closeFolder(o.path as! Folder, object: o, indexPath: indexPath)
                }
                
                let f = o.path as! Folder
                _ = try? f.delete()
                
                self.objects.remove(at: indexPath.row)
            }
            tableView.reloadSections([0], with: .automatic)
        }
        delete.backgroundColor = #colorLiteral(red: 1, green: 0.1491314173, blue: 0, alpha: 1)
        
        let copyPath = UITableViewRowAction(style: .normal, title: "Copy Path") { (action, indexPath) in
            let o = self.objects[indexPath.row]
            switch(o.type) {
            case .file:
                let f = o.path as! File
                let project = URL(fileURLWithPath: self.LoadManager?.project.path ?? "/")
                let url = URL(fileURLWithPath: f.path, relativeTo: project)
                UIPasteboard.general.string = String(url.path.dropFirst(project.path.count + 1))
            case .folder:
                let f = o.path as! Folder
                let project = URL(fileURLWithPath: self.LoadManager?.project.path ?? "/")
                let url = URL(fileURLWithPath: f.path, relativeTo: project)
                UIPasteboard.general.string = String(url.path.dropFirst(project.path.count + 1))
            }
        }
        copyPath.backgroundColor = .blue
        
        var array = [delete, copyPath]
        
        if obj.type == .file {
            let edit = UITableViewRowAction(style: .normal, title: "Move") { (action, indexPath) in
                let file = obj.path as! File
                self.newFileManager = self.bulletin(file: file)
                self.newFileManager?.showBulletin(above: self)
            }
            array.append(edit)
        }
        
        return array
    }
    
    @available(iOS 11.0, *)
    func tableView(_ tableView: UITableView, itemsForBeginning session: UIDragSession, at indexPath: IndexPath) -> [UIDragItem] {
        guard let visible = detailViewController?.visibleViewController as? DetailVC else { return [] }
        visible.save() // saving before doing anything stupid
        
        var out = [UIDragItem]()
        let object = objects[indexPath.row]
        
        let userActivity = NSUserActivity(activityType: "com.ArthurG.StudIO.openFile")
        userActivity.title = "openFile"

        
        switch object.type {
        case .file:
            guard let f = object.path as? File else { return out }
            let p = f.path
            let url = URL(fileURLWithPath: p)
            userActivity.userInfo = [
                "type": "file",
                "project": self.LoadManager?.project.path ?? "",
                "url": url
            ]
            let provider = NSItemProvider(contentsOf: url)
            provider?.registerObject(userActivity, visibility: .all)
            
            let item = UIDragItem(itemProvider: provider!)
            item.localObject = object
            out.append(item)
        case .folder:
            return out
        }
        
        return out
    }
}
