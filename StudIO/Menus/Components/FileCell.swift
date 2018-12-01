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
    
    override func awakeFromNib() {
        super.awakeFromNib()
        // Initialization code
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)

        // Configure the view for the selected state
    }
    var file: String? {
        didSet {
            self.name.text = file
            setIcon(file ?? "")
        }
    }
    var icons: Dictionary<String, Dictionary<String, String>> {
        if let path = Bundle.main.path(forResource: "Icons", ofType: "plist") {
            return NSDictionary(contentsOfFile: path) as! Dictionary<String, Dictionary<String, String>>
        }
        return Dictionary<String, Dictionary<String, String>>()
    }
    
    func setIcon(_ name: String) {
        
        let ic = self.icons
        let split = name.split(separator: ".")
        let ext = String(split[split.count - 1])
        
        for i in ic.keys {
            let dic = ic[i]
            let font = UIFont(name: i, size: 17)
            self.icon.font = font
            for n in (dic?.keys)! {
                if n == name {
                    let scalar = UnicodeScalar(Int(dic![n] as! String, radix: 16)!)
                    let char = Character(scalar!)
                    self.icon.text = String(char)
                    return
                }
                if n == ext {
                    let scalar = UnicodeScalar(Int(dic![n] as! String, radix: 16)!)
                    let char = Character(scalar!)
                    self.icon.text = String(char)
                }
            }
        }
        self.icon.font = UIFont(name: "file-icons", size: 17)
        let scalar = UnicodeScalar(Int("1F5CC", radix: 16)!)
        let char = Character(scalar!)
        self.icon.text = String(char)
    }
}
