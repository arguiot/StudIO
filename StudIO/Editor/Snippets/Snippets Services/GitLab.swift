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
    
    func down(load: String, completion: @escaping (String) -> Void) {
        let ob = Obfuscator()
        let privateToken = ob.reveal(key: ObfuscatedConstants.obfuscatedGitlab)
        
        var request = URLRequest(url: URL(string: load)!)
        request.setValue(privateToken, forHTTPHeaderField: "PRIVATE-TOKEN")
        
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
