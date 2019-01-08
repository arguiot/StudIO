//
//  GitCommit.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/1/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2

class GitCommit: UIView {
    @IBOutlet var contentView: UIView!
    
    @IBOutlet weak var tableView: UITableView!
    @IBOutlet weak var commitStrip: UITextView!
    
    var repo: Repository?
    override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }
    
    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        commonInit()
    }
    
    
    private func commonInit() {
        Bundle.main.loadNibNamed("GitCommit", owner: self, options: nil)
        addSubview(contentView)
        contentView.frame = self.bounds
        contentView.autoresizingMask = [.flexibleHeight, .flexibleWidth]
        
        initialisation()
        
    }
    func initialisation() {
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillShow), name: UIResponder.keyboardWillShowNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillHide), name: UIResponder.keyboardWillHideNotification, object: nil)
        
        tableView.delegate = self
        tableView.dataSource = self
        tableView.estimatedRowHeight = 89
        reloadProperties()
    }
    @objc func keyboardWillShow(notification: NSNotification) {
        if let keyboardSize = (notification.userInfo?[UIResponder.keyboardFrameBeginUserInfoKey] as? NSValue)?.cgRectValue {
            if self.frame.origin.y == 0 {
                self.frame.origin.y -= keyboardSize.height
            }
        }
    }
    
    @objc func keyboardWillHide(notification: NSNotification) {
        if self.frame.origin.y != 0 {
            self.frame.origin.y = 0
        }
    }
    
    @IBAction func commit(_ sender: Any) {
        let name = UserDefaults.standard.string(forKey: "name") ?? "StudIO User"
        let email = UserDefaults.standard.string(forKey: "email") ?? "studio@exemple.com"
        let sig = Signature(name: name, email: email)
        if repo?.commit(message: commitStrip.text, signature: sig).value != nil {
            commitStrip.text = ""
            self.status = []
            tableView.reloadData()
            reloadProperties()
        }
        
    }
    
    func reloadProperties() {
        DispatchQueue.global().async {
            if let s = self.repo?.status().value {
                self.status = s
            } else {
                self.status = []
            }
            DispatchQueue.main.async {
                self.tableView.reloadData()
            }
        }
    }
    
    // properties
    var status: [StatusEntry] = []

}

extension GitCommit: UITableViewDelegate, UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return status.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell: UITableViewCell = {
            guard let cell = tableView.dequeueReusableCell(withIdentifier: "cell") else {
                return UITableViewCell(style: .default, reuseIdentifier: "cell")
            }
            return cell
        }()
        cell.backgroundColor = #colorLiteral(red: 0.1674376428, green: 0.1674425602, blue: 0.167439878, alpha: 1)
        let s = status
        let row = indexPath.row
        cell.textLabel?.text = s[row].indexToWorkDir?.newFile?.path ?? (s[row].headToIndex?.newFile?.path ?? "ERROR")
        cell.textLabel?.textColor = #colorLiteral(red: 0.6666666865, green: 0.6666666865, blue: 0.6666666865, alpha: 1)
        cell.accessoryType = .checkmark
        return cell
    }
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let cell = tableView.cellForRow(at: indexPath)
        cell?.accessoryType = .none
    }
    func tableView(_ tableView: UITableView, didDeselectRowAt indexPath: IndexPath) {
        let cell = tableView.cellForRow(at: indexPath)
        cell?.accessoryType = .checkmark
        repo?.add(path: cell?.textLabel?.text ?? "")
    }
}
