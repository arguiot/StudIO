//
//  Gist.swift
//  StudIO
//
//  Created by Arthur Guiot on 21/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

class GitHubGist: SnippetService {
    static let regex = "^(http|https):\\/\\/gist\\.github\\.com\\/\\w*\\/[0-9a-f]{32}\\/?$"
    
    func isOk(_ str: String) -> Bool {
        return str.match(patternString: GitHubGist.regex)
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
        
        let query = "https://api.github.com/gists/\(id)"
        
        dJSON(str: query) { (dic) in
            let files = dic["files"] as! [String: Any]
            
            let keys = Array(files.keys)
            
            let first = String(keys[0])
            
            let dFiles = files[first] as! [String: Any]
            let url = dFiles["raw_url"] as! String
            
            self.down(load: url, completion: completion)
            
        }
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
                do {
                    let str = String(data: data!, encoding: .utf8)
                    completion(str ?? "")
                } catch {
                    // Something went wrong
                }
            }
        }.resume()
    }
}
