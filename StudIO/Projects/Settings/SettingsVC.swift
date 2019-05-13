//
//  SettingsVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/2/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class SettingsVC: UITableViewController {
    
    var settings: [Section]!
    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        let done = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(self.dismissController))
        navigationItem.rightBarButtonItem = done
        
        defaults()
        
        settings = [
            Section(name: "Editor", rows: [
                Row(name: "Font Size", type: .stepper, set: "font-size", def: "26", model: { dbl in
                    let str = dbl as! Double
                    return "\(Int(str))px"
                }),
                Row(name: "Line Wrapping", type: .slider, set: "line-wrapping", def: "true"),
                Row(name: "Editor Theme", type: .picker, set: "editor-theme", def: Themes.name.joined(separator: ","))
            ])
        ]
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
    
    func defaults() {
        if UserDefaults.standard.object(forKey: "studio-font-size") == nil {
            UserDefaults.standard.set(26, forKey: "studio-font-size")
        }
        if UserDefaults.standard.object(forKey: "studio-line-wrapping") == nil {
            UserDefaults.standard.set(true, forKey: "studio-line-wrapping")
        }
        if UserDefaults.standard.object(forKey: "studio-editor-theme") == nil {
            UserDefaults.standard.set("monokai", forKey: "studio-editor-theme")
        }
    }
}


class Themes {
    init() {}
    static var themes: [Theme] {
        let path = Bundle.main.path(forResource: "monokai", ofType: "css")
        let url = URL(fileURLWithPath: path ?? "")
        var out = [Theme(name: "monokai", src: url)]
        
        guard let plugins = UserDefaults.standard.array(forKey: "plugins") as? [[String: String]] else {
            return out
        }
        
        plugins.forEach { (plugin) in
            if plugin["type"] == "theme" {
                let name = plugin["name"]!
                let src = URL(fileURLWithPath: plugin["main"]!, relativeTo: URL(fileURLWithPath: Folder.home.path))
                out.append(Theme(name: name, src: src))
            }
        }
        
        return out
    }
    static var name: [String] {
        return self.themes.map { $0.name }
    }
    struct Theme {
        var name: String
        var src: URL
    }
}
