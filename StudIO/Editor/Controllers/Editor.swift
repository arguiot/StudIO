//
//  Editor.swift
//  StudIO
//
//  Created by Arthur Guiot on 8/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import Highlightr

class Editor: UIView {
    
    @IBOutlet var contentView: UIView!
    @IBOutlet weak var codeView: UIView!
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        commonInit()
    }
    
    
    private func commonInit() {
        Bundle.main.loadNibNamed("Editor", owner: self, options: nil)
        print("Loaded view")
        addSubview(contentView)
        contentView.frame = self.bounds
        contentView.autoresizingMask = [.flexibleHeight, .flexibleWidth]
        
        initialisation()
        
    }
    let textStorage = CodeAttributedString()
    func initialisation() {
        textStorage.highlightr.setTheme(to: "monokai-sublime")
        let layoutManager = NSLayoutManager()
        textStorage.addLayoutManager(layoutManager)
        
        let textContainer = NSTextContainer(size: codeView.bounds.size)
        layoutManager.addTextContainer(textContainer)
        
        let textView = UITextView(frame: codeView.frame, textContainer: textContainer)
        textView.backgroundColor = #colorLiteral(red: 0.1299999952, green: 0.1299999952, blue: 0.1299999952, alpha: 1) // Monokai bg color
        textView.keyboardType = .emailAddress
        textView.keyboardAppearance = .dark
        textView.autocorrectionType = .no
        textView.autocapitalizationType = .none
        self.addSubview(textView)
    }
    func highlight(_ lang: String) {
        let arr = lang.split(separator: ".")
        let ext = String(arr[arr.count - 1]).uppercased()
        textStorage.language = ext
    }
}
