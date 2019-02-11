//
//  SliderCell.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/2/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class SliderCell: UITableViewCell {

    @IBOutlet weak var name: UILabel!
    @IBOutlet weak var slider: UISwitch!
    
    var basic: String = "false"
    var key = "" {
        didSet {
            let v = UserDefaults.standard.bool(forKey: "studio-\(key)") ?? Bool(basic)!
            slider.setOn(v, animated: false)
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
        let value = slider.isOn
        UserDefaults.standard.set(value, forKey: "studio-\(key)")
    }
    
}
