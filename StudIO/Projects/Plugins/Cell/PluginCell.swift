//
//  PluginCell.swift
//  StudIO
//
//  Created by Arthur Guiot on 6/5/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class PluginCell: UITableViewCell {

    @IBOutlet weak var `switch`: UISwitch!
    @IBOutlet weak var name: UILabel!
    
    override func awakeFromNib() {
        super.awakeFromNib()
        // Initialization code
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)

        // Configure the view for the selected state
    }
    
}
