//
//  SettingsTableView.swift
//  StudIO
//
//  Created by Arthur Guiot on 11/2/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

extension SettingsVC {
    override func numberOfSections(in tableView: UITableView) -> Int {
        return settings.count
    }
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        let rows = settings[section].list
        return rows.count
    }
    override func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        let sec = settings[section]
        return sec.title
    }
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let section = indexPath.section
        let rows = settings[section].list
        let row = rows[indexPath.row]
        
        let c = tableView.dequeueReusableCell(withIdentifier: row.type.rawValue, for: indexPath)
        switch row.type {
        case .slider:
            let cell = c as! SliderCell
            cell.name.text = row.title
            cell.basic = row.basic
            cell.key = row.key
            return cell
        case .stepper:
            let cell = c as! StepperCell
            cell.name.text = row.title
            cell.basic = row.basic
            if let m = row.model {
                cell.model = m
            }
            cell.key = row.key
            return cell
        case .text:
            let cell = c as! TextFieldCell
            cell.name.text = row.title
            cell.basic = row.basic
            cell.key = row.key
            return cell
        case .picker:
            let cell = c as! PickerViewCell
            cell.name.text = row.title
            cell.basic = row.basic
            cell.key = row.key
            return cell
        }
    }
}
