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
                Row(name: "Editor Theme", type: .picker, set: "editor-theme", def: Themes.theme.joined(separator: ","))
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
    static let theme = [ "3024-day",
                  "3024-night",
                  "abcdef",
                  "ambiance-mobile",
                  "ambiance",
                  "base16-dark",
                  "base16-light",
                  "bespin",
                  "blackboard",
                  "cobalt",
                  "colorforth",
                  "darcula",
                  "dracula",
                  "duotone-dark",
                  "duotone-light",
                  "eclipse",
                  "elegant",
                  "erlang-dark",
                  "gruvbox-dark",
                  "hopscotch",
                  "icecoder",
                  "idea",
                  "isotope",
                  "lesser-dark",
                  "liquibyte",
                  "lucario",
                  "material",
                  "mbo",
                  "mdn-like",
                  "midnight",
                  "monokai",
                  "neat",
                  "neo",
                  "night",
                  "oceanic-next",
                  "panda-syntax",
                  "paraiso-dark",
                  "paraiso-light",
                  "pastel-on-dark",
                  "railscasts",
                  "rubyblue",
                  "seti",
                  "shadowfox",
                  "solarized",
                  "ssms",
                  "the-matrix",
                  "tomorrow-night-bright",
                  "tomorrow-night-eighties",
                  "ttcn",
                  "twilight",
                  "vibrant-ink",
                  "xq-dark",
                  "xq-light",
                  "yeti",
                  "zenburn" ]
}
