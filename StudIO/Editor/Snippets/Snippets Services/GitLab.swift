//
//  GitLab.swift
//  StudIO
//
//  Created by Arthur Guiot on 24/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//


import Foundation

class GitlabSnippets: SnippetService {
    static let regex = "^(http|https):\\/\\/gitlab\\.com\\/snippets\\/[0-9]{1,}\\/?$"
    
    func isOk(_ str: String) -> Bool {
        return str.match(patternString: GitlabSnippets.regex)
    }
    
    func download(str: String, completion: @escaping (String) -> Void) {
        let splits = str.split(separator: "/")
        
        var id = ""
        
        splits.forEach { (substr) in
            let s = String(substr)
            if s != "" {
                id = s
            }
        }
        
        let query = "https://gitlab.com/api/v4/snippets/\(id)/raw"
        
        self.down(load: query, completion: completion)
    }
    
    func dJSON(str: String, completion: @escaping ([String: Any]) -> Void) {
        URLSession.shared.dataTask(with: URL(string: str)!) { (data, response, error) -> Void in
            // Check if data was received successfully
            if error == nil && data != nil {
                do {
                    // Convert to dictionary where keys are of type String, and values are of any type
                    let json = try JSONSerialization.jsonObject(with: data!, options: .mutableContainers) as! [String: Any]
                    
                    completion(json)
                } catch {
                    // Something went wrong
                }
            }
            }.resume()
    }
    
    func down(load: String, completion: @escaping (String) -> Void) {
        URLSession.shared.dataTask(with: URL(string: load)!) { (data, response, error) -> Void in
            // Check if data was received successfully
            if error == nil && data != nil {
                let str = String(data: data!, encoding: .utf8)
                completion(str ?? "")
            }
            }.resume()
    }
}
