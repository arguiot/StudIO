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
    
    var file: File!

    func configureView() {
        // Update the user interface for the detail item.
        if let detail = detailItem {
            file = detail
            bottomView(file.name)
            codeEditor(file.name)
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
    var detailItem: File? {
        didSet {
            // Update the view.
            self.title = detailItem?.nameExcludingExtension
            configureView()
        }
    }

    @objc func null(_ sender: Any?) {
        // null code
    }
}

