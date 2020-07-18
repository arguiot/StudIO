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
    
    var error: Any? = nil
    
    mutating func replace(for pattern: String, with template: String) {
        NotificationCenter.default.post(name: .init("save"), object: nil)
        // Subfolders
        base.makeSubfolderSequence(recursive: true, includeHidden: false).forEach { folder in
            for file in folder.files {
                do {
                    var content = try? file.readAsString()
                    if content == nil {
                        continue
                    }
                    content = content!.replace(pattern: pattern, template: template)
                    try file.write(string: content!)
                } catch {
                    self.error = error
                }
            }
        }
        // All root files
        for file in base.files {
            do {
                var content = try? file.readAsString()
                if content == nil {
                    continue
                }
                content = content!.replace(pattern: pattern, template: template)
                try file.write(string: content!)
            } catch {
                self.error = error
            }
        }
    }
}
