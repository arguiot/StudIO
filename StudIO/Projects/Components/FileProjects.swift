//
//  LoadProjects.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import Foundation
import SwiftGit2

class LoadProjects {
    let home = try! Folder.home.subfolder(atPath: "Documents")
    
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
    let home = try! Folder.home.subfolder(atPath: "Documents")
    func newLocalProject(name: String) -> Project {
        let f = try! home.createSubfolder(named: name)
        return Project(project: name, path: f)
    }
    func newRemoteProject(url: URL, handler: @escaping (Project) -> Void) {
        let hURL = URL(string: home.path)!
        
        let name = url.pathComponents.last
        let pURL = hURL.appendingPathComponent(name!, isDirectory: true)
        
        let f = try! home.createSubfolderIfNeeded(withName: name!)
        
        let repo = Repository.clone(from: url, to: pURL, credentials: .default, checkoutStrategy: .Safe)
        if case .success(let r) = repo {
            let remote = r.remote(named: "origin").value
            let p = Project(project: name!, path: f)
            handler(p)
        } else {
            print(repo.error)
        }
    }
    func deleteProject(name: String) {
        try! home.subfolder(atPath: name).delete()
    }
}
