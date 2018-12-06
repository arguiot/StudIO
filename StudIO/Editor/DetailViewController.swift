//
//  DetailViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit

class DetailViewController: UIViewController {

    @IBOutlet weak var detailDescriptionLabel: UILabel! {
        didSet {
            file = detailDescriptionLabel.text ?? ""
        }
    }
    @IBOutlet weak var bottomLine: BottomLine!
    
    var file: String = ""

    func configureView() {
        // Update the user interface for the detail item.
        if let detail = detailItem {
            if let label = detailDescriptionLabel {
                label.text = detail
            }
            bottomView(detail)
        }
    }
    func bottomView(_ str: String) {
        let b = bottomLine
        b?.setupLanguage(str)
    }
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        file = detailDescriptionLabel.text ?? ""
        configureView()
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    var detailItem: String? {
        didSet {
            // Update the view.
            configureView()
        }
    }


}

