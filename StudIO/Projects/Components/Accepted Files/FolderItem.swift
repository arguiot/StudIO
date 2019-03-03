//
//  FolderItem.swift
//  StudIO
//
//  Created by Arthur Guiot on 3/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation
import MobileCoreServices

class FolderDocument: NSObject, NSItemProviderReading {
    let data: Data?
    
    required init(zipData: Data, typeIdentifier: String) {
        data = zipData
    }
    
    static var readableTypeIdentifiersForItemProvider: [String] {
        return [kUTTypeURL as String]
    }
    
    static func object(withItemProviderData data: Data, typeIdentifier: String) throws -> Self {
        return self.init(zipData: data, typeIdentifier: typeIdentifier)
    }
}
