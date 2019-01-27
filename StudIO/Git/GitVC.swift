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
        name.text = UserDefaults.standard.string(forKey: "name") ?? ""
        email.text = UserDefaults.standard.string(forKey: "email") ?? ""
        passwd.text = UserDefaults.standard.string(forKey: "password") ?? ""
        
        selectCorrectB()
    }
    @objc @IBAction func pushAction(_ sender: Any) {
        let p = Push()
        let rurl = repo?.directoryURL
        DispatchQueue.global().async {
            let email = UserDefaults.standard.string(forKey: "email") ?? ""
            let passwd = UserDefaults.standard.string(forKey: "password") ?? ""
            var creds: NSDictionary? = [:]
            if (email != "" || passwd != "") {
                let git_cred = try? GTCredential(userName: email, password: passwd)
                creds = p.creds(creds: git_cred)
            }
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
            let email = UserDefaults.standard.string(forKey: "email") ?? ""
            let passwd = UserDefaults.standard.string(forKey: "password") ?? ""
            var creds: NSDictionary? = [:]
            if (email != "" || passwd != "") {
                let git_cred = try? GTCredential(userName: email, password: passwd)
                creds = p.creds(creds: git_cred)
            }
            
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
        UserDefaults.standard.set(passwd.text, forKey: "password")
    }
    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */
    @IBOutlet weak var nbranch: UITextField!
    @IBAction func newBranch(_ sender: Any) {
        let name = nbranch.text
        let r = GTRepository(gitRepository: (repo?.pointer)!)!
        
        do {
            let lb = try r.localBranches()
            let oid = lb[0].oid
            try r.createBranchNamed(name!, from: oid!, message: nil)
        } catch {
            let alert = UIAlertController(title: "Couldn't create branch", message: error.localizedDescription, preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "OK", style: .default, handler: nil))
        }
    }
    
}

extension GitVC: UIPickerViewDelegate, UIPickerViewDataSource {
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }
    
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        let branches = repo?.localBranches()
        if var b = branches?.value {
            return b.count
        } else {
            return 1
        }
        
    }
    func pickerView(_ pickerView: UIPickerView, attributedTitleForRow row: Int, forComponent component: Int) -> NSAttributedString? {
        let branches = repo?.localBranches()
        if var b = branches?.value {
            return NSAttributedString(string: b[row].name, attributes: [.foregroundColor: UIColor.white])
        } else {
            return NSAttributedString(string: "master", attributes: [.foregroundColor: UIColor.white])
        }
    }
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        let branches = repo?.localBranches()
        if var b = branches?.value {
            let oid = b[row].oid
            if (repo?.checkout(oid, strategy: .Safe).value) != nil {
                print("Checkout: ok")
            }
        }
    }
    func selectCorrectB() {
        let r = GTRepository(gitRepository: (repo?.pointer)!)
        let branches = repo?.localBranches()
        if let b = branches?.value {
            let name = try? r?.currentBranch().shortName
            let ns = b.map { $0.shortName }
            let i = ns.firstIndex(of: name ?? "")
            let ind = i ?? 0
            if (ind == 0) {
                let lb = try? r?.localBranches()
                let ref = lb!![0].reference
                do {
                    try r?.checkoutReference(ref, options: GTCheckoutOptions(strategy: .safe))
                } catch {
                    print(error.localizedDescription)
                }
                
            }
            branchPicker.selectRow(ind, inComponent: 0, animated: true)
        }
    }
}
