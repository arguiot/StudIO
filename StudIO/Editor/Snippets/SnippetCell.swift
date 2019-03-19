//
//  SnippetCell.swift
//  StudIO
//
//  Created by Arthur Guiot on 16/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class SnippetCell: UITableViewCell {

    @IBOutlet weak var icon: UILabel!
    @IBOutlet weak var name: UILabel!
    
    override func awakeFromNib() {
        super.awakeFromNib()
        // Initialization code
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)

        // Configure the view for the selected state
    }
    
    var ident = 0
    var snippet = ""
    var l = ""
    func update() {
        let id = ident * 20
        
        // reset all transformations
        self.name.transform = CGAffineTransform.identity
        self.icon.transform = CGAffineTransform.identity
        
        
        self.name.transform = self.name.transform.translatedBy(x: CGFloat(id), y: 0)
        self.name.text = snippet 
        _ = setIcon(l , i: ident)
    }
    
    var icons: Dictionary<String, Dictionary<String, String>> {
        if let path = Bundle.main.path(forResource: "Icons", ofType: "plist") {
            return NSDictionary(contentsOfFile: path) as! Dictionary<String, Dictionary<String, String>>
        }
        return Dictionary<String, Dictionary<String, String>>()
    }
    
    func setIcon(_ name: String, i: Int = 0) -> Bool {
        
        let ic = self.icons
        let split = name.split(separator: ".")
        guard let last = split.last else { return false }
        let ext = String(last)
        
        let id = i * 20 // 20 px
        self.icon.transform = self.icon.transform.translatedBy(x: CGFloat(id), y: 0)
        
        var found = false

        for i in ic.keys {
            let dic = ic[i]
            let font = UIFont(name: i, size: 17)
            for n in (dic?.keys)! {
                if n == name {
                    self.icon.font = font
                    let scalar = UnicodeScalar(Int(dic![n]!, radix: 16)!)
                    let char = Character(scalar!)
                    self.icon.text = String(char)
                    return true
                }
                if n == ext {
                    self.icon.font = font
                    let scalar = UnicodeScalar(Int(dic![n]!, radix: 16)!)
                    let char = Character(scalar!)
                    self.icon.text = String(char)
                    found = true
                }
            }
        }
        if found == false {
            self.icon.font = UIFont(name: "file-icons", size: 17)
            let scalar = UnicodeScalar(Int("1F5CC", radix: 16)!)
            let char = Character(scalar!)
            self.icon.text = String(char)
        }
        return true
    }
}
