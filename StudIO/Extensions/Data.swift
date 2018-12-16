//
//  Data.swift
//  StudIO
//
//  Created by Arthur Guiot on 16/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import Foundation
extension Data {
    func sizeString(units: ByteCountFormatter.Units = [.useAll], countStyle: ByteCountFormatter.CountStyle = .file) -> String {
        let bcf = ByteCountFormatter()
        bcf.allowedUnits = units
        bcf.countStyle = .file
        
        return bcf.string(fromByteCount: Int64(count))
    }
}
