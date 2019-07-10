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
        do {
            let p = try Folder.icloud.createSubfolderIfNeeded(withName: "STUDIO-PLUGINS")
            
            guard let name = getName(url: url) else {
                return
            }
            if let s = try? p.subfolder(named: name) {
                try? s.delete()
            }
            
            let u = try p.createSubfolder(named: name)
            
            let pURL = URL(fileURLWithPath: u.path)
            
            DispatchQueue.global().async {
                let repo = Repository.clone(from: url, to: pURL, localClone: false, bare: false, credentials: .default, checkoutStrategy: .Safe, checkoutProgress: nil)
                switch repo {
                case .success(_):
                    DispatchQueue.main.sync {
                        self.setUI(url: pURL)
                    }
                case .failure(let error):
                    DispatchQueue.main.sync {
                        NSObject.alert(t: "Cloning error", m: error.localizedDescription )
                        self.loadingIndicator.isHidden = true
                        self.loadingIndicator.stopAnimating()
                    }
                }
            }
            
        } catch {
            NSObject.alert(t: "Cloning error", m: error.localizedDescription)
            self.loadingIndicator.isHidden = true
            self.loadingIndicator.stopAnimating()
            return
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
    var state = false
    @IBAction func done(_ sender: Any) {
        if state == false {
            checkPlugin(self)
            return
        }
        var plugins = UserDefaults.standard.array(forKey: "plugins") as? [[String: String]] ?? []
        
        let p = Plugin(url: pluginUrl)
        plugins.append([
            "name": p.name,
            "path": pluginUrl.path,
            "type": p.type.rawValue,
            "main": p.main.path,
            "enabled": p.enabled.description,
            "activation": p.activation?.pattern ?? ""
        ])
        
        UserDefaults.standard.set(plugins, forKey: "plugins")
        
        self.navigationController?.popViewController(animated: true)
    }
    var pluginUrl: URL!
    func setUI(url: URL) {
        let pck = StudIOPackageReader(directory: url)
        loadingIndicator.isHidden = true
        loadingIndicator.stopAnimating()
        do {
            let package = try pck.packageFile()
            
            pluginTitle.isHidden = false
            pluginTextView.isHidden = false
            pluginImage.isHidden = false
            
            pluginTitle.text = package.title
            pluginTextView.text = package.description
            
            guard let image = package.image?.path else {
                self.state = true
                self.pluginUrl = url
                return
            }
            let path = url.appendingPathComponent(image)
            let data = try Data(contentsOf: path)
            
            pluginImage.image = UIImage(data: data)
            
            self.state = true
            self.pluginUrl = url
        } catch {
            NSObject.alert(t: "Couldn't load plugin", m: error.localizedDescription)
        }
    }
}
