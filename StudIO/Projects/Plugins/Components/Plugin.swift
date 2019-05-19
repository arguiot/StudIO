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
    var main: URL
    var enabled: Bool
    var activation: Regex?
    
    init(url: URL) {
        let reader = StudIOPackageReader(directory: url)
        do {
            let pkg = try reader.packageFile()
            self.name = pkg.title
            self.type = PluginsVC.PluginType(rawValue: pkg.type) ?? .mode
            self.path = url
            self.main = URL(fileURLWithPath: pkg.main!)
            self.enabled = true
            if pkg.activation != nil {
                self.activation = Regex(pattern: pkg.activation!)
            }
            return
        } catch {
            print(error.localizedDescription)
        }
        self.name = ""
        self.type = .mode
        self.path = URL(fileURLWithPath: Folder.icloud.path)
        self.enabled = false
        self.main = URL(fileURLWithPath: Folder.icloud.path)
    }
}
