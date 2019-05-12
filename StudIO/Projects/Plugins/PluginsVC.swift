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
        
        load()
    }
    
    func load() {
        self.sections = [
            Section(title: "Modes", list: [
                
                ]),
            Section(title: "Themes", list: [
                
                ]),
            Section(title: "Autocompletion Hint", list: [
                
                ])
        ]
        guard let plugins = UserDefaults.standard.array(forKey: "plugins") as? [[String: String]] else {
            return
        }
        plugins.forEach { (plugin) in
            let name = plugin["name"]
            let path = URL(fileURLWithPath: plugin["path"] ?? "")
            let type = PluginsVC.PluginType(rawValue: plugin["type"] ?? "Modes") ?? .mode
            switch type {
            case .hint:
                sections[2].list.append(PluginsVC.Row(title: name!, source: path, type: type, enable: Bool(plugin["enabled"]!)!))
            case .mode:
                sections[0].list.append(PluginsVC.Row(title: name!, source: path, type: type, enable: Bool(plugin["enabled"]!)!))
            case .theme:
                sections[1].list.append(PluginsVC.Row(title: name!, source: path, type: type, enable: Bool(plugin["enabled"]!)!))
            }
        }
        tableView.reloadData()
    }
    override func viewWillAppear(_ animated: Bool) {
        load()
    }
    @objc func dismissController() {
        self.dismiss(animated: true)
    }
    
    var sections: [Section]!
    
    struct Row {
        var title: String
        var source: URL
        var type: PluginType
        var enable: Bool
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
