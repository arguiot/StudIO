//
//  CellStruct.swift
//  StudIO
//
//  Created by Arthur Guiot on 12/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import Foundation

struct MenuCellStruct {
    var type: FileCell.FileFolder
    var ident: Int
    var name: String
    var path: Any? // File or Folder
}
