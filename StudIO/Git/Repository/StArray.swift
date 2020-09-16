//
//  StArray.swift
//  StudIO
//
//  Created by Arthur Guiot on 2020-09-16.
//  Copyright © 2020 Arthur Guiot. All rights reserved.
//

import Foundation

extension git_strarray {
    func filter(_ isIncluded: (String) -> Bool) -> [String] {
        return map { $0 }.filter(isIncluded)
    }

    func map<T>(_ transform: (String) -> T) -> [T] {
        return (0..<self.count).map {
            let string = String(validatingUTF8: self.strings[$0]!)!
            return transform(string)
        }
    }
}
