//
//  PluginsTableView.swift
//  StudIO
//
//  Created by Arthur Guiot on 6/5/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

extension PluginsVC {
    override func numberOfSections(in tableView: UITableView) -> Int {
        return sections.count
    }
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        let rows = sections[section].list
        return rows.count
    }
    override func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        let sec = sections[section]
        return sec.title
    }
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let section = indexPath.section
        let rows = sections[section].list
        let row = rows[indexPath.row]
        
        let c = tableView.dequeueReusableCell(withIdentifier: "pluginCell", for: indexPath)
        
        let cell = c as! PluginCell
        cell.name.text = row.title
        return cell
    }
}

