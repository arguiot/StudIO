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
        var key: String
        var basic: String
        var model: ((Any) -> String)?
        init(name: String, type: Row.Types, set: String, def: String, model: ((Any) -> String)? = nil) {
            title = name
            self.type = type
            key = set
            basic = def
            self.model = model
        }
        enum Types: String {
            case stepper = "stepperCell"
            case slider = "sliderCell"
            case text = "textFieldCell"
            case picker = "pickerViewCell"
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
            Row(name: "Font Size", type: .stepper, set: "font-size", def: "26", model: { dbl in
                let str = dbl as! Double
                return "\(Int(str))px"
            }),
            Row(name: "Line Wrapping", type: .slider, set: "line-wrapping", def: "true"),
            Row(name: "Editor Theme", type: .picker, set: "editor-theme", def: "material,monokai,light,dark")
        ])
    ]
}
