//
//  LoadProjects.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import Foundation

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
            array.append(Project(project: folder.name, path: URL(string: folder.path)!))
        }
        return array
    }
}
class CreateProject {
    let home = try! Folder.home.subfolder(atPath: "Documents")
    func newLocalProject(name: String) -> Project {
        let f = try! home.createSubfolder(named: name)
        return Project(project: name, path: URL(string: f.path)!)
    }
}
