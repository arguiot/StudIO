//
//  CreateFile.swift
//  StudIO
//
//  Created by Arthur Guiot on 13/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import Foundation
import SwiftGit2
class CreateFile {
    var home: Folder
    init(p: Folder) {
        home = p
    }
    func createFile(name: String, i: Int = 0) -> MenuCellStruct {
        let s = name.split(separator: "/")
        if name.last == "/" {
            let subfolder = s
            var l = home
            subfolder.forEach { (str) in
                let n = String(str)
                let sf = try? l.createSubfolderIfNeeded(withName: n)
                l = sf!
            }
            
            return MenuCellStruct(type: .folder, ident: i, name: String(s.last!), path: l, toggled: false)
        }
        let n = String(s.last!)
        let subfolder = s.dropLast()
        var l = home
        subfolder.forEach { (str) in
            let n = String(str)
            let sf = try? l.createSubfolderIfNeeded(withName: n)
            l = sf!
        }
        let f = try! l.createFile(named: n)
        let fpath: URL = URL(string: home.path)!
        if let repo = Repository.at(fpath).value {
            repo.add(path: f.path)
        }
        return MenuCellStruct(type: .file, ident: i, name: n, path: f, toggled: false)
    }
}
