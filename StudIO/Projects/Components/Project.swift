//
//  Project.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import Foundation

class Project {
    var name: String
    var path: Folder
    
    init(project: String, path: Folder) {
        name = project
        self.path = path
    }
}
