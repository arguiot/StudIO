//
//  TextFieldCell.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/2/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class TextFieldCell: UITableViewCell {

    @IBOutlet weak var name: UILabel!
    @IBOutlet weak var textField: UITextField!
    
    var basic: String = ""
    var key = "" {
        didSet {
            let v = UserDefaults.standard.string(forKey: "studio-\(key)") ?? basic
            textField.text = v
        }
    }
    override func awakeFromNib() {
        super.awakeFromNib()
        // Initialization code
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)

        // Configure the view for the selected state
    }

    @IBAction func onChange(_ sender: Any) {
        let value = textField.text
        UserDefaults.standard.set(value, forKey: "studio-\(key)")
    }
}
