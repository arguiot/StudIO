//
//  DetailViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2

class DetailViewController: UIViewController {

    @IBOutlet weak var bottomLine: BottomLine!
    @IBOutlet weak var editorView: Editor!
    
    var file: File?
    var repo: Repository?
    
    func configureView() {
        // Update the user interface for the detail item.
        if let detail = detailItem {
            file = detail
            bottomView((file?.name)!)
            codeEditor((file?.name)!)
        }
    }
    @objc func save() {
        if let f = self.file {
            let hash = try? f.read()
            editorView.getData({ data in
                if let d = data {
                    if d != hash {
                        _ = try? f.write(data: d)
                        DispatchQueue.main.async {
                            self.editorView?.getLangName({ str in
                                self.bottomLine.language.text = str
                            })
                        }
                    }
                }
            })
        }
    }
    func codeEditor(_ str: String) {
        let c = editorView
        c?.content = try! file?.read().base64EncodedString()
        
        let arr = str.split(separator: ".")
        let ext = String(arr[arr.count - 1]).uppercased()
        
        c?.highlightExt = ext
        
        c?.highlight(str, code: {
            c?.loadFile(withContent: (c?.content)!)
            DispatchQueue.main.async {
                c?.getLangName({ str in
                    self.bottomLine.language.text = str
                })
            }
        })
        
    }
    func bottomView(_ str: String = "") {
        let b = bottomLine
        if let branch = repo?.localBranch(named: "master").value {
            let commit = repo?.commits(in: branch).next()?.value!
            let msg = commit?.message
            b?.lastCommit.text = msg
        }
        DispatchQueue.global().async {
            let text = try? self.file?.readSize()
            DispatchQueue.main.async {
                b?.sizeString.text = text as? String
            }
        }
    }
    
    @IBAction func updatedBar() {
        bottomView()
    }
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        updatedBar()
        configureView()
        // GitVC
        let image = #imageLiteral(resourceName: "Repo-white").scaleImage(toSize: CGSize(width: 10, height: 10))
        let gitButton = UIBarButtonItem(image: image, style: .plain, target: self, action: #selector(gitVC(_:)))
        // Git Panel
        let pimg = #imageLiteral(resourceName: "branch-icon").scaleImage(toSize: CGSize(width: 6.25, height: 10))
        let pButton = UIBarButtonItem(image: pimg, style: .plain, target: self, action: #selector(gitPanel(_:)))
        editorView.gitPanel.isHidden = true
        editorView.gitPanel.repo = repo!
//        navigationItem.rightBarButtonItems = [gitButton, pButton] // Disabling Git functionnalities
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    var detailItem: File? {
        didSet {
            // Update the view.
            self.title = detailItem?.name
            configureView()
        }
    }

    @objc func null(_ sender: Any?) {
        // null code
    }
    
    @objc func gitVC(_ sender: Any?) {
        let storyBoard: UIStoryboard = UIStoryboard(name: "git", bundle: nil)
        let newViewController = storyBoard.instantiateViewController(withIdentifier: "GitVC") as! GitVC
        newViewController.repo = repo
        self.navigationController?.pushViewController(newViewController, animated: true)
    }
    
    @objc func gitPanel(_ sender: Any?) {
        save()
        
        let p = editorView.gitPanel
        p?.reloadProperties()
        p?.isHidden = !(p?.isHidden ?? false)
        
    }
}

