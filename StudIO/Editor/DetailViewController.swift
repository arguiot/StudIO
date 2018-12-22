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
            editorView.getData({ data in
                if let d = data {
                    _ = try? f.write(data: d)
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
    func bottomView(_ str: String) {
        let b = bottomLine
        if let branch = repo?.localBranch(named: "master").value {
            let commit = repo?.commits(in: branch).next()?.value!
            let msg = commit?.message
            b?.lastCommit.text = msg
        }
        DispatchQueue.global().async {
            let text = try? self.file?.readSize() as! String
            DispatchQueue.main.async {
                b?.sizeString.text = text
            }
        }
    }
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        configureView()
        let image = #imageLiteral(resourceName: "Repo-white").scaleImage(toSize: CGSize(width: 10, height: 10))
        let gitButton = UIBarButtonItem(image: image, style: .plain, target: self, action: #selector(gitVC(_:)))
        navigationItem.rightBarButtonItem = gitButton
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
        
    }
}

