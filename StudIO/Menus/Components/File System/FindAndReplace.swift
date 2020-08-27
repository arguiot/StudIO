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
                    guard let content = try? file.readAsString() else { continue }
                    let new = content.replace(pattern: pattern, template: template)
                    guard new != content else { continue }
                    try file.write(string: new)
                } catch {
                    self.error = error
                }
            }
        }
        // All root files
        for file in base.files {
            do {
                guard let content = try? file.readAsString() else { continue }
                let new = content.replace(pattern: pattern, template: template)
                guard new != content else { continue }
                try file.write(string: new)
            } catch {
                self.error = error
            }
        }
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: .init("reloadEditorMenu"), object: nil)
        }
    }
}
