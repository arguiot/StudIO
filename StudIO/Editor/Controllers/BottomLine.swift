//
//  BottomLine.swift
//  StudIO
//
//  Created by Arthur Guiot on 3/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import JavaScriptCore

class BottomLine: UIView {
    

    
    @IBOutlet weak var language: UILabel!
    @IBOutlet var contentView: UIView!
    @IBOutlet weak var sizeString: UILabel!
    @IBOutlet weak var lastCommit: UILabel!
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        commonInit()
    }
    
    
    private func commonInit() {
        Bundle.main.loadNibNamed("BottomLine", owner: self, options: nil)
        
        addSubview(contentView)
        contentView.frame = self.bounds
        contentView.autoresizingMask = [.flexibleHeight, .flexibleWidth]
        
    }
    
    func setupLanguage(_ file: String) {
        DispatchQueue.global().async {
            let arr = file.split(separator: ".")
            let ext = String(arr[arr.count - 1]).uppercased()
            let url = Bundle.main.url(forResource: "meta", withExtension: "js", subdirectory: "EditorView/mode")!
            let file = try? String(contentsOf: url)
            let context = JSContext()
            _ = context?.evaluateScript("var CodeMirror = {}")
            _ = context?.evaluateScript(file)
            let name = context?.evaluateScript("CodeMirror.findModeByExtension('\(ext)').name")
            DispatchQueue.main.sync {
                self.language.text = name?.toString()
            }
        }
    }
    func setup(commit: GTCommit) {
        self.text = commit.message
        self.oid = commit.oid.sha
        
        lastCommit.text = self.text
        
        let press = UITapGestureRecognizer(target: self, action: #selector(toggleCommit))
        if lastCommit.gestureRecognizers?.count == 0 {
            lastCommit.addGestureRecognizer(press)
        }
    }
    var text: String?
    var oid: String?
    @objc func toggleCommit() {
        if lastCommit.text == self.text {
            lastCommit.text = self.oid
        } else {
            lastCommit.text = self.text
        }
    }
}
