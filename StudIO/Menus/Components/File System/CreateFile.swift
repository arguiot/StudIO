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
        let f = try! home.createFile(named: name)
        
        return MenuCellStruct(type: .file, ident: i, name: name, path: f)
    }
}
