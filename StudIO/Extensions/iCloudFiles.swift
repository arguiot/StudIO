//
//  iCloudFiles.swift
//  StudIO
//
//  Created by Arthur Guiot on 10/2/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

extension Folder {
    public static var icloud: Folder {
        let ubiquity = "iCloud.com.ArthurG.StudIO"
        if let iCloudDocumentsURL = FileManager.default.url(forUbiquityContainerIdentifier: ubiquity)?.appendingPathComponent("Documents") {
            if (!FileManager.default.fileExists(atPath: iCloudDocumentsURL.path, isDirectory: nil)) {
                do {
                    try FileManager.default.createDirectory(at: iCloudDocumentsURL, withIntermediateDirectories: true, attributes: nil)
                    return try Folder(path: iCloudDocumentsURL.path)
                } catch {
                    NSObject.alert(t: "iCloud Document Error", m: error.localizedDescription)
                }
            }
            do {
                return try Folder(path: iCloudDocumentsURL.path)
            } catch {
                NSObject.alert(t: "iCloud Document Error", m: error.localizedDescription)
            }
        }
        return home
    }
    static func copyDocumentsToiCloudDrive() {
        let ubiquity = "iCloud.com.ArthurG.StudIO"
        
        let localDocumentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).last
        let iCloudDocumentsURL = FileManager.default.url(forUbiquityContainerIdentifier: ubiquity)?.appendingPathComponent("Documents")
        
        if let iCloudDocumentsURL = iCloudDocumentsURL {
            var isDir:ObjCBool = false
            if (FileManager.default.fileExists(atPath: iCloudDocumentsURL.path, isDirectory: &isDir)) {
                do {
                    try FileManager.default.removeItem(at: iCloudDocumentsURL)
                } catch {
                    NSObject.alert(t: "iCloud Document Synchronisation", m: error.localizedDescription)
                }
                
            }
            do {
                try FileManager.default.copyItem(at: localDocumentsURL!, to: iCloudDocumentsURL)
            } catch {
                NSObject.alert(t: "iCloud Document Synchronisation", m: error.localizedDescription)
            }
        }
    }
}
