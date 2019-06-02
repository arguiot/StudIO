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
    
    var model: (Any) -> String = { dbl in
        let str = dbl as! Double
        return String(Int(str))
    }
    var basic: String = "0"
    var key = "" {
        didSet {
            let v = UserDefaults.standard.double(forKey: "studio-\(key)") 
            let modeled = model(v)
            displayedValue.text = modeled
            stepper.value = v
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
        let value = stepper.value
        let modeled = model(value)
        displayedValue.text = modeled
        UserDefaults.standard.set(value, forKey: "studio-\(key)")
    }
    
}
