//
//  Gist.swift
//  StudIO
//
//  Created by Arthur Guiot on 21/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

class GitHubGist {
    static let regex = "^(http|https):\\/\\/gist\\.github\\.com\\/\\w*\\/[0-9a-f]{32}\\/?$"
    static func isOk(_ str: String) -> Bool {
        return str.match(patternString: regex)
    }
}
