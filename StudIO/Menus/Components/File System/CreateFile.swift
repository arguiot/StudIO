//
//  CreateFile.swift
//  StudIO
//
//  Created by Arthur Guiot on 13/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import Foundation

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
        let fpath: URL = URL(fileURLWithPath: home.path)
        if let repo = try? Repository.at(fpath).get() {
            _ = repo.add(path: f.path)
        }
        return MenuCellStruct(type: .file, ident: i, name: n, path: f, toggled: false)
    }
}
