//
//  Plugin.swift
//  StudIO
//
//  Created by Arthur Guiot on 11/5/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

struct Plugin {
    var name: String
    var type: PluginsVC.PluginType
    var path: URL
    var enabled: Bool
    
    init(url: URL) {
        let reader = StudIOPackageReader(directory: url)
        do {
            let pkg = try reader.packageFile()
            self.name = pkg.title
            self.type = PluginsVC.PluginType(rawValue: pkg.type) ?? .mode
            self.path = url
            self.enabled = true
        } catch {
            print(error.localizedDescription)
        }
        self.name = ""
        self.type = .mode
        self.path = URL(fileURLWithPath: Folder.home.path)
        self.enabled = false
    }
}
