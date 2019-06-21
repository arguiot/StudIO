//
//  CellStruct.swift
//  StudIO
//
//  Created by Arthur Guiot on 12/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import Foundation

struct MenuCellStruct: Equatable {
    static func == (lhs: MenuCellStruct, rhs: MenuCellStruct) -> Bool {
        guard lhs.type == rhs.type else { return false }
        guard lhs.ident == rhs.ident else { return false }
        guard lhs.name == rhs.name else { return false }
        switch lhs.type {
        case .file:
            guard let file = rhs.path as? File else { return false }
            guard file == lhs.path as! File else { return false }
        case .folder:
            guard let folder = rhs.path as? Folder else { return false }
            guard folder == lhs.path as! Folder else { return false }
        }
        return true
    }
    
    var type: FileCell.FileFolder
    var ident: Int
    var name: String
    var path: Any? // File or Folder
    var toggled: Bool
}
