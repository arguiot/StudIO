//
//  DetailViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit

class DetailViewController: UIViewController {

    @IBOutlet weak var bottomLine: BottomLine!
    @IBOutlet weak var editorView: Editor!
    
    var file: String = ""

    func configureView() {
        // Update the user interface for the detail item.
        if let detail = detailItem {
            file = detail
            bottomView(detail)
            codeEditor(detail)
        }
    }
    func codeEditor(_ str: String) {
        let c = editorView
        c?.highlight(str)
    }
    func bottomView(_ str: String) {
        let b = bottomLine
        b?.setupLanguage(str)
    }
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        configureView()
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    var detailItem: String? {
        didSet {
            // Update the view.
            self.title = detailItem
            configureView()
        }
    }

    @objc func null(_ sender: Any?) {
        // null code
    }
}

