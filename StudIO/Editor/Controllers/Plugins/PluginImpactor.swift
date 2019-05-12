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
    func injectTheme(url: URL) {
        guard let content = try? String(contentsOf: url) else { return }
        let jsString = "var style = document.createElement('style'); style.innerHTML = '\(content.trimmingCharacters(in: .whitespacesAndNewlines))'; document.head.appendChild(style);"
        codeView.evaluateJavaScript(jsString, completionHandler: nil)
    }
    func injectPlugin(url: URL) {
        guard let content = try? String(contentsOf: url) else { return }
        codeView.evaluateJavaScript(content, completionHandler: nil)
    }
}
