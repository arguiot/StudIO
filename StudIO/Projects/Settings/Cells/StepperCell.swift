//
//  StepperCell.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/2/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class StepperCell: UITableViewCell {

    @IBOutlet weak var name: UILabel!
    @IBOutlet weak var displayedValue: UILabel!
    @IBOutlet weak var stepper: UIStepper!
    
    var model: (String) -> String = { str in
        return str
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
        let value = stepper.value
        let modeled = model(String(value))
        displayedValue.text = modeled
    }
    
}
