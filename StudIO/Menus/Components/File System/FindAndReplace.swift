//
//  FindAndReplace.swift
//  StudIO
//
//  Created by Arthur Guiot on 2020-07-13.
//  Copyright © 2020 Arthur Guiot. All rights reserved.
//

import Foundation

struct FindAndReplace {
    var base: Folder
    
    func replace(in: File, for: String, with: String) {
        NotificationCenter.default.post(name: .init("save"), object: nil)
        base.subfolders.recursive.forEach { folder in
            folder.files.forEach { file in
                
            }
        }
    }
}
