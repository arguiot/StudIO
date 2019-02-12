//
//  PickerViewCell.swift
//  StudIO
//
//  Created by Arthur Guiot on 12/2/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class PickerViewCell: UITableViewCell {

    @IBOutlet weak var name: UILabel!
    @IBOutlet weak var pickerView: UIPickerView!
    
    var data: [String] = []
    
    var basic: String = ""
    var key = "" {
        didSet {
            var str = [String]()
            for i in basic.split(separator: ",") {
                str.append(String(i))
            }
            data = str
            
            let v = UserDefaults.standard.string(forKey: "studio-\(key)") ?? ""
            
            let i = data.firstIndex(of: v) ?? 0
            pickerView.reloadAllComponents()
            pickerView.selectRow(i, inComponent: 0, animated: false)
        }
    }
    override func awakeFromNib() {
        super.awakeFromNib()
        // Initialization code
        pickerView.delegate = self
        pickerView.dataSource = self
    }

    override func setSelected(_ selected: Bool, animated: Bool) {
        super.setSelected(selected, animated: animated)

        // Configure the view for the selected state
    }

}
extension PickerViewCell: UIPickerViewDelegate, UIPickerViewDataSource {
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }
    
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return data.count
    }
    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        return data[row]
    }
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        let value = data[row]
        UserDefaults.standard.set(value, forKey: "studio-\(key)")
    }
}
