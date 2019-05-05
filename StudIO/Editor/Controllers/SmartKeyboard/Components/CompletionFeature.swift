//
//  CompletionFeature.swift
//  StudIO
//
//  Created by Arthur Guiot on 5/5/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

enum CellType {
    case small, large
}
struct CompletionFeature {
    var title: String
    var type: CellType = .small
}
