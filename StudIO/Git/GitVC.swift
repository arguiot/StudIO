//
//  GitVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 22/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2

class GitVC: UIViewController {

    @IBOutlet weak var branchPicker: UIPickerView!
    
    var repo: Repository?
    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        branchPicker.tintColor = .white
    }
    

    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */

}

extension GitVC: UIPickerViewDelegate, UIPickerViewDataSource {
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }
    
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        let branches = repo?.localBranches()
        let remotes = repo?.remoteBranches()
        if var b = branches?.value, let r = remotes?.value {
            b.append(contentsOf: r)
            return b.count
        } else {
            return 1
        }
        
    }
    func pickerView(_ pickerView: UIPickerView, attributedTitleForRow row: Int, forComponent component: Int) -> NSAttributedString? {
        let branches = repo?.localBranches()
        let remotes = repo?.remoteBranches()
        if var b = branches?.value, let r = remotes?.value {
            b.append(contentsOf: r)
            return NSAttributedString(string: b[row].name, attributes: [.foregroundColor: UIColor.white])
        } else {
            return NSAttributedString(string: "master", attributes: [.foregroundColor: UIColor.white])
        }
    }
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        let branches = repo?.localBranches()
        let remotes = repo?.remoteBranches()
        if var b = branches?.value, let r = remotes?.value {
            b.append(contentsOf: r)
            let oid = b[row].oid
            if (repo?.checkout(oid, strategy: .Safe).value) != nil {
                print("Checkout: ok")
            }
        }
    }
}
