//
//  URL.swift
//  StudIO
//
//  Created by Arthur Guiot on 30/1/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

extension URL {
    static func getData(from url: URL, completion: @escaping (Data?, URLResponse?, Error?) -> ()) {
        URLSession.shared.dataTask(with: url, completionHandler: completion).resume()
    }
}
