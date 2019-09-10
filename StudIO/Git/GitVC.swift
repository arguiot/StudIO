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
import SafariServices

class GitVC: UIViewController {

    @IBOutlet weak var branchPicker: UIPickerView!
    
    var repo: Repository?
    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        branchPicker.tintColor = .white
        let keychain = KeychainSwift()
        keychain.synchronizable = true
        name.text = keychain.get("name") ?? ""
        email.text = keychain.get("email") ?? ""
        passwd.text = keychain.get("password") ?? ""
        
        selectCorrectB()
        let img = #imageLiteral(resourceName: "link").scaleImage(toSize: CGSize(width: 10, height: 10))
        let item = UIBarButtonItem(image: img, style: .plain, target: self, action: #selector(openURL(_:)))
        self.navigationItem.rightBarButtonItem = item
    }
    @IBAction func openURL(_ sender: Any) {
        guard let repo = self.repo else { return }
        do {
            guard let path = try repo.allRemotes().get().first?.URL else { return }
            let url = URL(string: path)
            let vc = SFSafariViewController(url: url!)
            self.splitViewController?.present(vc, animated: true, completion: nil)
        } catch {
            NSObject.alert(t: "Couldn't open remote URL", m: error.localizedDescription)
        }
        
    }
    @objc @IBAction func pushAction(_ sender: Any) {
        let p = Push()
        guard let rurl = repo?.directoryURL else { return }
        SwiftSpinner.show("Pushing", animated: true).addTapHandler({
            SwiftSpinner.hide()
        })
        DispatchQueue.global().async {
            let email = UserDefaults.standard.string(forKey: "email") ?? ""
            let passwd = UserDefaults.standard.string(forKey: "password") ?? ""
            var creds: NSDictionary? = [:]
            if (email != "" || passwd != "") {
                do {
                    let git_cred = try GTCredential(userName: email, password: passwd)
                    creds = p.creds(creds: git_cred)
                } catch {
                    NSObject.alert(t: "Cred issue", m: error.localizedDescription)
                }
            }
            p.push(rurl, options: creds) { (current, total, bytes, stop) in
                print(current, total, bytes, stop)
                DispatchQueue.main.sync {
                    SwiftSpinner.show(progress: Double(current) / Double(total), title: "Pushing")
                }
                if stop.pointee.boolValue == true || current == total {
                    DispatchQueue.main.sync {
                        SwiftSpinner.show(duration: 1.0, title: "Success")
                        self.reload()
                    }
                }
            }
        }
        
        self.reload()
    }
    
    @IBAction func fetch(_ sender: Any) {
        SwiftSpinner.show("Fetching", animated: true).addTapHandler({
            SwiftSpinner.hide()
        })
        DispatchQueue.main.async {
            guard let remotes = ((try? self.repo?.allRemotes().get()) as [Remote]??) else { return }
            remotes?.forEach({ r in
                if (try? self.repo!.fetch(r).get()) != nil {
                    SwiftSpinner.show(duration: 1.0, title: "Success")
                    self.reload()
                }
            })
        }
    }
    
    @IBAction func pullAction(_ sender: Any) {
        let p = Push()
        let rurl = repo?.directoryURL
        SwiftSpinner.show("Pulling", animated: true).addTapHandler({
            SwiftSpinner.hide()
        })
        DispatchQueue.global().async {
            let email = UserDefaults.standard.string(forKey: "email") ?? ""
            let passwd = UserDefaults.standard.string(forKey: "password") ?? ""
            var creds: NSDictionary? = [:]
            if (email != "" || passwd != "") {
                let git_cred = try? GTCredential(userName: email, password: passwd)
                creds = p.creds(creds: git_cred)
            }
            
            p.pull(rurl!, options: creds) { (transfer, stop) in
                let t = Double(transfer.pointee.received_objects) / Double(transfer.pointee.total_objects)
                DispatchQueue.main.sync {
                    SwiftSpinner.show(progress: Double(t), title: "Pulling")
                }
                
                if stop.pointee.boolValue == true || transfer.pointee.received_objects == transfer.pointee.total_objects {
                    DispatchQueue.main.sync {
                        SwiftSpinner.hide()
                        self.reload()
                    }
                }
            }
        }
        
        self.reload()
    }
    func reload() {
        NotificationCenter.default.post(name: .init("reloadEditorMenu"), object: nil)
    }
    @IBOutlet weak var email: UITextField!
    @IBOutlet weak var name: UITextField!
    @IBOutlet weak var passwd: UITextField!
    @IBAction func setGitEmail(_ sender: Any) {
        let keychain = KeychainSwift()
        keychain.synchronizable = true
        keychain.set(email.text!, forKey: "email")
    }
    @IBAction func setGitName(_ sender: Any) {
        let keychain = KeychainSwift()
        keychain.synchronizable = true
        keychain.set(name.text!, forKey: "name")
    }
    @IBAction func setGitPasswd(_ sender: Any) {
        let keychain = KeychainSwift()
        keychain.synchronizable = true
        keychain.set(passwd.text!, forKey: "password")
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
        do {
            let r = try GTRepository(url: (repo?.directoryURL)!)
            let lb = try r.currentBranch()
            let oid = lb.oid
            try r.createBranchNamed(name!, from: oid!, message: nil)
            
            self.branchPicker.reloadAllComponents()
        } catch {
            NSObject.alert(t: "Couldn't create branch", m: error.localizedDescription)
        }
    }
    
}

extension GitVC: UIPickerViewDelegate, UIPickerViewDataSource {
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }
    
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        guard let branches = repo?.localBranches() else { return 1 }
        if let b = try? branches.get() {
            return b.count
        } else {
            return 1
        }
        
    }
    func pickerView(_ pickerView: UIPickerView, attributedTitleForRow row: Int, forComponent component: Int) -> NSAttributedString? {
        let d = NSAttributedString(string: "master", attributes: [.foregroundColor: UIColor.white])
        guard let r = try? GTRepository(url: (repo?.directoryURL)!) else { return d }
        guard let branches = try? r.branches() else { return d }
        guard let oid = try? branches[row].targetCommit().oid.sha else { return NSAttributedString(string: "\(branches[row].name ?? "UNDEFINED")", attributes: [.foregroundColor: UIColor.white])}
        return NSAttributedString(string: "\(branches[row].name ?? "UNDEFINED") - \(oid.prefix(7))", attributes: [.foregroundColor: UIColor.white])
    }
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        do {
            let r = try GTRepository(url: (repo?.directoryURL)!)
            let branches = try r.localBranches()
            let oid = branches[row].reference
            try r.checkoutReference(oid, options: .init(strategy: .safe))
        } catch {
            NSObject.alert(t: "Checkout issue", m: error.localizedDescription)
        }
    }
    func selectCorrectB() {
        guard let r = try? GTRepository(url: (repo?.directoryURL)!) else { return }
        guard let branches = repo?.localBranches() else { return }
        if let b = try? branches.get() {
            let name = ((try? r.currentBranch().shortName) as String??)
            let ns = b.map { $0.shortName }
            let i = ns.firstIndex(of: name ?? "")
            guard let ind = i else { return }
            if (ind == 0) {
                let lb = try? r.localBranches()
                let ref = lb![0].reference
                do {
                    try r.checkoutReference(ref, options: GTCheckoutOptions(strategy: .safe))
                } catch {
                    print(error.localizedDescription)
                }
                
            }
            branchPicker.selectRow(ind, inComponent: 0, animated: true)
        }
    }
}
