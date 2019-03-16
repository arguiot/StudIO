//
//  Snippets.swift
//  StudIO
//
//  Created by Arthur Guiot on 16/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class Snippet {
    var name: String
    var content: String
    var language: String
    var color: UIColor
    
    init(n: String, c: String, l: String, co: UIColor = .black) {
        name = n
        content = c
        language = l
        color = co
    }
    
    func setup(cell: SnippetCell) -> SnippetCell {
        cell.snippet = name
        cell.l = language
        cell.icon.textColor = color
        
        cell.update()
        
        return cell
    }
}
