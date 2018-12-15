//
//  FileCell.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit

class FileCell: UITableViewCell {

    @IBOutlet weak var name: UILabel!
    @IBOutlet weak var icon: UILabel!

    enum FileFolder {
        case file
        case folder
    }
    var fileType: FileFolder = .file
    
    override func awakeFromNib() {
        super.awakeFromNib()
        // Initialization code
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)

        // Configure the view for the selected state
    }
    
    var ident: Int = 0
    var file: String?
    
    func update() {
        let id = Array((0..<ident).map { _ in "    " }).joined(separator: "") // 4 spaces
        self.name.text = id + (file ?? "")
        _ = setIcon(file ?? "", i: ident)
    }
    var icons: Dictionary<String, Dictionary<String, String>> {
        if let path = Bundle.main.path(forResource: "Icons", ofType: "plist") {
            return NSDictionary(contentsOfFile: path) as! Dictionary<String, Dictionary<String, String>>
        }
        return Dictionary<String, Dictionary<String, String>>()
    }
    
    func setIcon(_ name: String, i: Int) -> Bool {
        
        let ic = self.icons
        let split = name.split(separator: ".")
        let ext = String(split[split.count - 1])
        let id = Array((0..<ident).map { _ in "    " }).joined(separator: "") // 4 spaces
        
        var found = false
        if fileType == .folder {
            self.icon.font = UIFont(name: "octicons", size: 17)
            let scalar = UnicodeScalar(Int("F016", radix: 16)!)
            let char = Character(scalar!)
            self.icon.text = id + String(char)
            return true
        }
        for i in ic.keys {
            let dic = ic[i]
            let font = UIFont(name: i, size: 17)
            for n in (dic?.keys)! {
                if n == name {
                    self.icon.font = font
                    let scalar = UnicodeScalar(Int(dic![n] as! String, radix: 16)!)
                    let char = Character(scalar!)
                    self.icon.text = id + String(char)
                    return true
                }
                if n == ext {
                    self.icon.font = font
                    let scalar = UnicodeScalar(Int(dic![n] as! String, radix: 16)!)
                    let char = Character(scalar!)
                    self.icon.text = id + String(char)
                    found = true
                }
            }
        }
        if found == false {
            self.icon.font = UIFont(name: "file-icons", size: 17)
            let scalar = UnicodeScalar(Int("1F5CC", radix: 16)!)
            let char = Character(scalar!)
            self.icon.text = id + String(char)
        }
        return true
    }
}
