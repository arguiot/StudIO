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
        loadingIndicator.isHidden = false
        loadingIndicator.startAnimating()
        guard let url = URL(string: pluginURL.text ?? "") else {
            return
        }
        guard let p = try? Folder.home.createSubfolderIfNeeded(withName: "Plugins") else {
            return
        }
        guard let name = getName(url: url) else {
            return
        }
        guard let u = try? p.createSubfolderIfNeeded(withName: name) else {
            return
        }
        let pURL = URL(fileURLWithPath: u.path)
        let repo = Repository.clone(from: url, to: pURL)
        if case .success(let r) = repo {
            setUI(url: pURL)
        } else {
            NSObject.alert(t: "Cloning error", m: repo.error?.localizedDescription ?? "No details")
            loadingIndicator.isHidden = true
            loadingIndicator.stopAnimating()
        }
    }
    
    private func getName(url: URL) -> String? {
        let component = url.pathComponents.last
        if component?.lowercased().range(of: ".git") != nil {
            let sub = component?.dropLast(4)
            return String(sub!)
        }
        return component
    }
    
    @IBAction func done(_ sender: Any) {
        checkPlugin(self)
    }
    
    func setUI(url: URL) {
        let pck = StudIOPackageReader(directory: url)
        loadingIndicator.isHidden = true
        loadingIndicator.stopAnimating()
        do {
            let package = try pck.packageFile()
            
            pluginTitle.text = package.title
            pluginTextView.text = package.description
        } catch {
            NSObject.alert(t: "Couldn't load plugin", m: error.localizedDescription)
        }
    }
}
