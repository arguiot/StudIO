//
//  LoadProjects.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2

class LoadProjects {
//    let home = try! Folder.home.subfolder(atPath: "Documents")
    let home = Folder.icloud
    
    func listFolders() -> FileSystemSequence<Folder> {
        let sub = home.subfolders
        return sub
    }
    func getProjects() -> [Project]{
        let sub = listFolders()
        var array = [Project]()
        sub.forEach { (folder) in
            array.append(Project(project: folder.name, path: folder))
        }
        return array
    }
}
class CreateProject {
    let home = Folder.icloud
    func newLocalProject(name: String) -> Project {
        let f = try! home.createSubfolder(named: name)
        return Project(project: name, path: f)
    }
    func newRemoteProject(url: URL, creds: Credentials, handler: @escaping (Project) -> Void) {
        let hURL = URL(string: home.path)!
        
        if let name = getName(url: url) {
            let pURL = hURL.appendingPathComponent(name, isDirectory: true)
            
            let f = try! home.createSubfolderIfNeeded(withName: name)
            
            let repo = Repository.clone(from: url, to: pURL, credentials: creds, checkoutStrategy: .Safe)
            if case .success(let r) = repo {
                let p = Project(project: name, path: f)
                handler(p)
            } else {
                alert(repo.error?.localizedDescription ?? "Cloning error")
                if f.files.count == 0 || f.subfolders.count == 0 {
                    try? f.delete()
                }
            }
        } else {
            alert("Wrong URL, please type a valid git URL.")
        }
        
    }
    private func getName(url: URL) -> String? {
        let component = url.pathComponents.last
        if component?.lowercased().range(of: ".git") != nil {
            let sub = component?.dropLast(4)
            return String(sub!)
        }
        return component
    }
    func deleteProject(name: String) {
        try! home.subfolder(atPath: name).delete()
    }
    
    private func alert(_ str: String) {
        let alert = UIAlertController(title: "Error", message: str, preferredStyle: UIAlertController.Style.alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: UIAlertAction.Style.default, handler: nil))
        UIApplication.shared.keyWindow?.rootViewController?.dismiss(animated: true, completion: nil)
        UIApplication.shared.keyWindow?.rootViewController?.present(alert, animated: true, completion: nil)
    }
}
