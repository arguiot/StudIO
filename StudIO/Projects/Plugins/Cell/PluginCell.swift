//
//  PluginCell.swift
//  StudIO
//
//  Created by Arthur Guiot on 6/5/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class PluginCell: UITableViewCell {

    @IBOutlet weak var `switch`: UISwitch!
    @IBOutlet weak var name: UILabel!
    
    var rowIndex: IndexPath!
    override func awakeFromNib() {
        super.awakeFromNib()
        // Initialization code
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)

        // Configure the view for the selected state
    }
    @IBAction func toggleSwitch(_ sender: Any) {
        guard let pVC = self.tableViewDelegate as? PluginsVC else {
            return
        }
        let a = rowIndex.section
        let section = pVC.sections[a]
        let row = section.list[rowIndex.row]
        let source = row.source.path
        
        guard var plugins = UserDefaults.standard.array(forKey: "plugins") as? [[String: String]] else { return }
        for i in 0..<(plugins.count) {
            if plugins[i]["path"] == source {
                plugins[i]["enabled"] = self.switch.isOn.description
            }
        }
        UserDefaults.standard.set(plugins, forKey: "plugins")
    }
}

extension UITableViewCell {
    var tableView:UITableView? {
        get {
            var view = self.superview
            while view != nil {
                if view! is UITableView {
                    return (view! as! UITableView)
                }
                view = view!.superview
            }
            return nil
        }
    }
    
    var tableViewDataSource:UITableViewDataSource? {
        get {
            return self.tableView?.dataSource
        }
    }
    
    var tableViewDelegate:UITableViewDelegate? {
        get {
            return self.tableView?.delegate
        }
    }
}
