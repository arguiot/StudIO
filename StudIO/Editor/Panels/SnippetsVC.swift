//
//  SnippetsVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 15/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import PanelKit

class SnippetsVC: UIViewController, PanelContentDelegate {
    
    var preferredPanelContentSize = CGSize(width: 320, height: 400)

    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        self.title = "Snippets"
    }
    
    var shouldAdjustForKeyboard: Bool {
        return false
    }
    
    var minimumPanelContentSize: CGSize {
        return CGSize(width: 240, height: 260)
    }
    var preferredPanelPinnedHeight: CGFloat {
        return 300
    }
    
    var closeButtonTitle = "Exit"
}
