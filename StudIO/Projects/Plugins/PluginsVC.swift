//
//  PluginsVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 6/5/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class PluginsVC: UITableViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Uncomment the following line to preserve selection between presentations
        // self.clearsSelectionOnViewWillAppear = false

        // Uncomment the following line to display an Edit button in the navigation bar for this view controller.
        // self.navigationItem.rightBarButtonItem = self.editButtonItem
        let done = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(self.dismissController))
        navigationItem.rightBarButtonItems?.append(done)
    }
    
    @objc func dismissController() {
        self.dismiss(animated: true)
    }
    
    var sections: [Section] = [
        Section(title: "Modes", list: [
            
        ]),
        Section(title: "Themes", list: [
            
        ]),
        Section(title: "Autocompletion Hint", list: [
            
        ])
    ]
    
    struct Row {
        var title: String
        var source: URL
        var type: PluginType
    }
    enum PluginType: String {
        case mode = "Modes"
        case theme = "Themes"
        case hint = "Autocompletion Hints"
    }
    struct Section {
        var title: String
        var list: [Row]
    }
}
