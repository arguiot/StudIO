//
//  NewPluginVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 7/5/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2

class NewPluginVC: UIViewController {

    @IBOutlet var pluginURL: UITextField!
    @IBOutlet weak var pluginTitle: UILabel!
    @IBOutlet weak var pluginImage: UIImageView!
    @IBOutlet weak var pluginTextView: UITextView!
    @IBOutlet weak var loadingIndicator: UIActivityIndicatorView!
    
    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
    }
    

    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */
    @IBAction func checkPlugin(_ sender: Any) {
        guard let url = URL(string: pluginURL.text ?? "") else {
            return
        }
        guard let p = try? Folder.home.createSubfolderIfNeeded(withName: "Plugins") else {
            return
        }
        let pURL = URL(fileURLWithPath: p.path)
        let repo = Repository.clone(from: url, to: pURL)
        if case .success(let r) = repo {
            
        } else {
            NSObject.alert(t: "Cloning error", m: repo.error?.localizedDescription ?? "No details")
        }
    }
    
    @IBAction func done(_ sender: Any) {
    }
}
