//
//  StudIOPackageReader.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/5/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation
import JASON

extension JSONKeys {
    static let name = JSONKey<String>("name")
    static let title = JSONKey<String?>("title")
    static let author = JSONKey<String>("author")
    static let description = JSONKey<String>("description")
    static let image = JSONKey<NSURL?>("image")
    static let version = JSONKey<String>("version")
    static let git = JSONKey<NSURL?>("git")
    static let type = JSONKey<String>("type")
    static let main = JSONKey<NSURL?>("main")
}

class StudIOPackageReader {
    struct PackageFile {
        let name: String
        let title: String
        let author: String
        let description: String
        let image: URL?
        let version: String
        let git: URL?
        let type: String
        var main: String?
        
        init(json: JSON) {
            name = json[.name]
            title = json[.title] ?? json[.name]
            author = json[.author]
            description = json[.description]
            image = json["image"].nsURL
            version = json[.version]
            git = json["git"].nsURL
            type = json[.type]
            main = json["main"].string
        }
    }
    var dir: URL
    init(directory: URL) {
        dir = directory
    }
    enum ReadErrors: CustomStringConvertible, Error {
        case find, read
        
        /// A string describing the error
        public var description: String {
            switch self {
            case .find:
                return "Couldn't find studio-package.json"
            case .read:
                return "Couldn't read studio-package.json"
            }
        }
    }
    
    func packageFile() throws -> PackageFile {
        guard let str = checkAndReadFile(url: dir) else {
            throw ReadErrors.find
        }
        guard var package = parse(json: str) else {
            throw ReadErrors.read
        }
        let first = dir.appendingPathComponent(package.main ?? "").path
        let home = Folder.home.path
        
        let main = first.dropFirst(home.count)
        
        package.main = String(main)
        
        return package
    }
    
    private func checkAndReadFile(url: URL) -> String? {
        guard let folder = try? Folder(path: url.path) else {
            return nil
        }
        let contains = folder.containsFile(named: "studio-package.json")
        guard contains == true else { return nil }
        guard let file = try? folder.file(named: "studio-package.json") else {
            return nil
        }
        guard let str = try? file.readAsString() else { return nil }
        
        return str
        
    }
    private func parse(json j: String) -> PackageFile? {
        let json = JSON(j)
        let file = PackageFile(json: json)
        return file
    }
}
