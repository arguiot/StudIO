//
//  TableViewExtension.swift
//  StudIO
//
//  Created by Arthur Guiot on 17/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2

extension MasterViewController {
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
    override func shouldPerformSegue(withIdentifier identifier: String, sender: Any?) -> Bool {
        return identifier != "showEditor"
    }
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        if segue.identifier == "showEditor" {
            let Ncontroller = segue.destination as! UINavigationController
            let controller = Ncontroller.topViewController as! DetailViewController
            detailViewController = controller
            
            controller.save() // saving before opening file
            
            // Repo
            let path = LoadManager!.project.path
            let repo = Repository.at(URL(fileURLWithPath: path)).value!
            controller.repo = repo
            
            controller.detailItem = (sender as! MenuCellStruct).path as? File
            controller.navigationItem.leftBarButtonItem = splitViewController?.displayModeButtonItem
            controller.navigationItem.leftItemsSupplementBackButton = true
        }
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
        var array = [delete]
        
        if obj.type == .file {
            let edit = UITableViewRowAction(style: .normal, title: "Move") { (action, indexPath) in
                let file = obj.path as! File
                self.newFileManager = self.bulletin(file: file)
                self.newFileManager.showBulletin(above: self)
            }
            array.append(edit)
        }
        
        return array
    }
}
