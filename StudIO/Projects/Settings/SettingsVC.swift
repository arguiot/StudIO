//
//  SettingsVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/2/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class SettingsVC: UITableViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        let done = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(self.dismissController))
        navigationItem.rightBarButtonItem = done
    }
    
    @objc func dismissController() {
        self.dismiss(animated: true)
    }
    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */
    class Row {
        var title: String
        var type: Row.Types
        init(name: String, type: Row.Types) {
            title = name
            self.type = type
        }
        enum Types: String {
            case stepper = "stepperCell"
            case slider = "sliderCell"
            case text = "textFieldCell"
        }
    }
    class Section {
        var title: String
        var list: [SettingsVC.Row]
        init(name: String, rows: [SettingsVC.Row]) {
            title = name
            list = rows
        }
    }
    
    
    
    let settings: [Section] = [
        Section(name: "Editor", rows: [
            Row(name: "Font Size", type: .stepper)
        ])
    ]
}
