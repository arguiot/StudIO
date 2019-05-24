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
        tableView.backgroundColor = #colorLiteral(red: 0.1674376428, green: 0.1674425602, blue: 0.167439878, alpha: 1)
        tableView.backgroundView?.backgroundColor = #colorLiteral(red: 0.1674376428, green: 0.1674425602, blue: 0.167439878, alpha: 1)
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
    
    var builder: GTTreeBuilder?
    
    @IBAction func commit(_ sender: Any) {
        DispatchQueue.global().sync {
            let name = UserDefaults.standard.string(forKey: "name") ?? "StudIO User"
            let email = UserDefaults.standard.string(forKey: "email") ?? "studio@exemple.com"
            let sig = GTSignature(name: name, email: email, time: nil)
            
            // branches
            do {
                let r = try GTRepository(url: (repo?.directoryURL)!)
                let b = try r.currentBranch().name
                if (b == nil) {
                    let branch = repo?.localBranch(named: "master").value
                    let oid = branch?.oid
                    repo?.checkout(oid!, strategy: .Safe)
                }
                // commit

                let subtree = try self.builder!.writeTree()
                
                self.builder!.clear()
                
                let branch = try r.currentBranch()
                let last = try branch.targetCommit()
                
                let name = branch.reference.name
                
                let commit = try r.createCommit(with: subtree, message: commitStrip.text, author: sig!, committer: sig!, parents: [last], updatingReferenceNamed: name)
                
                self.commitStrip.text = ""
                self.status = []
                DispatchQueue.main.async {
                    self.tableView.reloadData()
                    self.reloadProperties()
                }
            } catch {
                NSObject.alert(t: "Commit error", m: error.localizedDescription)
            }
            
        }
        
    }
    
    func reloadProperties() {
        DispatchQueue.global().async {
            self.status = []
            
            guard let rsg2 = self.repo?.directoryURL else { return }
            
            guard let r = try? GTRepository(url: rsg2) else { return }
            
            self.builder = try? GTTreeBuilder(tree: nil, repository: r)
            
            guard nil != r.fileURL else { return }
            do {
                try r.enumerateFileStatus(options: nil, usingBlock: { (delta1, delta2, val) in
                    if delta2?.status != .unmodified || delta1?.status != .unmodified {
                        if delta2?.newFile?.path != nil {
                            self.status.append(delta2?.newFile?.path)
                        } else {
                            self.status.append(delta1?.newFile?.path)
                        }
                    }
                })
            } catch {
                NSObject.alert(t: "Status error", m: error.localizedDescription)
            }
            
            do {
                guard self.repo != nil else { return }
                let r = try GTRepository(url: (self.repo?.directoryURL)!)
                self.builder = try GTTreeBuilder(tree: nil, repository: r)
            } catch {
                NSObject.alert(t: "Git panel error", m: error.localizedDescription)
            }
            
            DispatchQueue.main.async {
                self.tableView.reloadData()
                self.checkButton()
            }
        }
    }
    
    // properties
    var status: [String?] = []
    
    @IBOutlet weak var commitButton: UIButton!
    func checkButton() {
        if status.count == 0 {
            commitButton.isEnabled = false
            commitButton.backgroundColor = #colorLiteral(red: 0.01993954368, green: 0.2427439988, blue: 0.5180901885, alpha: 1)
        } else {
            commitButton.isEnabled = true
            commitButton.backgroundColor = #colorLiteral(red: 0, green: 0.4784313725, blue: 1, alpha: 1)
        }
    }

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
        cell.contentView.backgroundColor = #colorLiteral(red: 0.1674376428, green: 0.1674425602, blue: 0.167439878, alpha: 1)
        let s = status
        let row = indexPath.row
        guard let path = s[row] else { return cell }
        
        guard self.builder != nil else { return cell }
        
        let url = URL(fileURLWithPath: path, relativeTo: repo?.directoryURL)
        do {
            let d = try Data(contentsOf: url)
            _ = try self.builder!.addEntry(with: d, fileName: path, fileMode: GTFileMode.blob)
        } catch {
            NSObject.alert(t: "Git panel error", m: error.localizedDescription)
        }
        
//        self.repo?.add(path: path ?? "Error")
        cell.textLabel?.text = path
        cell.textLabel?.textColor = #colorLiteral(red: 0.6666666865, green: 0.6666666865, blue: 0.6666666865, alpha: 1)
        cell.accessoryType = .checkmark
        return cell
    }
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let cell = tableView.cellForRow(at: indexPath)
        cell?.accessoryType = .none
        
        checkButton()
    }
    func tableView(_ tableView: UITableView, didDeselectRowAt indexPath: IndexPath) {
        let cell = tableView.cellForRow(at: indexPath)
        cell?.accessoryType = .checkmark
//        repo?.add(path: cell?.textLabel?.text ?? "")
        try? builder?.removeEntry(withFileName: cell?.textLabel?.text ?? "")
        
        checkButton()
    }
}
