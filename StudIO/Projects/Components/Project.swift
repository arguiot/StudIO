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
    var path: URL
    
    init(project: String, path: URL) {
        name = project
        self.path = path
    }
}
