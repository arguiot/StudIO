//
//  Cht.swift
//  StudIO
//
//  Created by Arthur Guiot on 13/4/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

class ChtSH {
    func getLink(question: String, language: String, comments: Bool = true) -> String {
        let l = language.lowercased().addingPercentEncoding(withAllowedCharacters: .urlHostAllowed)!
        let q = question.lowercased().replace(pattern: " ", template: "+").addingPercentEncoding(withAllowedCharacters: .urlHostAllowed)!
        var t = "?T"
        if comments == true {
            t = "?Q&T"
        }
        let url = "https://cht.sh/\(l)/\(q)\(t)"
        return url
    }
    func down(load: String, completion: @escaping (String) -> Void) {
        
        let request = URLRequest(url: URL(string: load)!)
        
        URLSession.shared.downloadTask(with: request) { (location, response, error) -> Void in
            // Check if data was received successfully
            if error == nil && location != nil {
                do {
                    let str = try NSString(contentsOfFile: location!.path, encoding: String.Encoding.utf8.rawValue) as String
                    completion(str)
                } catch {
                    // Something went wrong
                }
                
            }
        }.resume()
    }
}
