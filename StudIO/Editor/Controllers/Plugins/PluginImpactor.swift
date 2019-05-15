//
//  PluginImpactor.swift
//  StudIO
//
//  Created by Arthur Guiot on 12/5/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation
import WebKit

extension Editor {
    func loadTheme(name: String) {
        let names = Themes.name
        guard let i = names.firstIndex(of: name) else { return }
        
        let themes = Themes.themes
        let theme = themes[i]
        self.injectTheme(url: theme.src)
    }
    
    func injectTheme(url: URL) {
        let home = URL(fileURLWithPath: Folder.home.path)
        let fileURL = home.appendingPathComponent(url.path)
        guard let content = try? String(contentsOf: fileURL) else { return }
        let jsString = """
        var style = document.createElement('style');
        style.innerHTML = window.atobUTF8('\(content.data(using: .utf8)?.base64EncodedString() ?? "")');
        document.head.appendChild(style);
        """
        codeView.evaluateJavaScript(jsString)  { (result, error) in
            if error != nil {
                print(error!)
            }
        }
    }
    
    func injectAllPlugins() {
        guard let fileName = self.fileName else {
            return
        }
        guard let plugins = UserDefaults.standard.array(forKey: "plugins") as? [[String: String]] else {
            return
        }
        plugins.forEach { (plugin) in
            let url = URL(fileURLWithPath: plugin["main"]!)
            let type = PluginsVC.PluginType(rawValue: plugin["type"] ?? "mode") ?? .mode
            if type == .hint || type == .mode {
                let home = URL(fileURLWithPath: Folder.home.path)
                let fileURL = home.appendingPathComponent(url.path)
                
                if plugin["activation"] != nil {
                    let activation = Regex(pattern: plugin["activation"]!)
                    guard fileName.matchRegex(pattern: activation) == true else { return }
                }
                
                self.injectPlugin(url: fileURL)
            }
        }
    }
    
    func injectPlugin(url: URL) {
        guard let content = try? String(contentsOf: url) else { return }
        codeView.evaluateJavaScript(content)   { (result, error) in
            if error != nil {
                print(error!)
            }
        }
    }
}
