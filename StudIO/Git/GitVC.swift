//
//  GitVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 22/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2
import BLTNBoard

class GitVC: UIViewController {

    @IBOutlet weak var branchPicker: UIPickerView!
    
    var repo: Repository?
    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        branchPicker.tintColor = .white
    }
    @objc @IBAction func pushAction(_ sender: Any) {
        let p = Push()
        let rurl = repo?.directoryURL
        DispatchQueue.global().async {
            let email = UserDefaults.standard.string(forKey: "email")
            let passwd = UserDefaults.standard.string(forKey: "password")
            let creds = p.creds(creds: try! GTCredential(userName: email ?? "", password: passwd ?? ""))
            p.push(rurl!, options: creds) { (current, total, bytes, stop) in
                print(current, total, bytes, stop)
                if stop.pointee.boolValue == true {
                    DispatchQueue.main.sync {
                        self.reload()
                    }
                }
            }
        }
        
        self.reload()
    }
    
    @IBAction func fetch(_ sender: Any) {
        let remotes = repo?.allRemotes().value
        remotes?.forEach({ r in
            if repo?.fetch(r).value != nil {
                print("Pull: ok")
            }
        })
    }
    
    @IBAction func pullAction(_ sender: Any) {
        let p = Push()
        let rurl = repo?.directoryURL
        DispatchQueue.global().async {
            let email = UserDefaults.standard.string(forKey: "email")
            let passwd = UserDefaults.standard.string(forKey: "password")
            let creds = p.creds(creds: try? GTCredential(userName: email ?? "", password: passwd ?? ""))
            p.pull(rurl!, options: creds) { (transfer, stop) in
                print(transfer, stop)
                if stop.pointee.boolValue == true {
                    DispatchQueue.main.sync {
                        self.reload()
                    }
                }
            }
        }
        
        self.reload()
    }
    func reload() {
        let prevVC = self.previousViewController as! DetailViewController
        prevVC.configureView()
        
        let splitViewController = prevVC.splitViewController

        let master = splitViewController?.viewControllers.first as! UINavigationController
        let m = master.topViewController as! MasterViewController
        m.objects = m.LoadManager.loadProject()
        m.tableView.reloadData()
    }
    @IBOutlet weak var email: UITextField!
    @IBOutlet weak var name: UITextField!
    @IBOutlet weak var passwd: UITextField!
    @IBAction func setGitEmail(_ sender: Any) {
        UserDefaults.standard.set(email.text, forKey: "email")
    }
    @IBAction func setGitName(_ sender: Any) {
        UserDefaults.standard.set(name.text, forKey: "name")
    }
    @IBAction func setGitPasswd(_ sender: Any) {
        UserDefaults.standard.set(name.text, forKey: "password")
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
