//
//  Services.swift
//  StudIO
//
//  Created by Arthur Guiot on 24/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

protocol SnippetService {
    func isOk(_ str: String) -> Bool
    func download(str: String, completion: @escaping (String) -> Void)
}
