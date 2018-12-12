//
//  LoadFiles.swift
//  StudIO
//
//  Created by Arthur Guiot on 12/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import Foundation

class LoadFilesMenu {
    var project: Folder
    init(p: Folder) {
        project = p
    }
    func loadProject() -> [MenuCellStruct] {
        return loadFolders(base: project, i: 0)
    }
    func loadFolders(base: Folder, i: Int) -> [MenuCellStruct] {
        var array = [MenuCellStruct]()
        base.subfolders.forEach { (file) in
            array.append(MenuCellStruct(
                type: .folder,
                ident: i,
                name: file.name,
                path: file
            ))
        }
        array.append(contentsOf: loadFiles(base: base, i: i))
        return array
    }
    func loadFiles(base: Folder, i: Int) -> [MenuCellStruct] {
        var array = [MenuCellStruct]()
        base.files.forEach { (file) in
            array.append(MenuCellStruct(
                type: .file,
                ident: i,
                name: file.name,
                path: file
            ))
        }
        return array
    }
}
