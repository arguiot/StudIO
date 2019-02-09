//
//  ProjectVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import BLTNBoard
import SwiftGit2

class ProjectVC: UICollectionViewController {
    
    var project: [Project] = LoadProjects().getProjects()
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Uncomment the following line to preserve selection between presentations
        // self.clearsSelectionOnViewWillAppear = false
        
        
        // Do any additional setup after loading the view.
        bulletinManager = bulletin()
    }
    
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        let appDelegate = UIApplication.shared.delegate as! AppDelegate
        if let splitViewController = segue.destination as? LightStatus {
            let navigationController = splitViewController.viewControllers[splitViewController.viewControllers.count - 1] as! UINavigationController
            navigationController.topViewController!.navigationItem.leftBarButtonItem = splitViewController.displayModeButtonItem
            splitViewController.delegate = appDelegate
            
            if let indexPath = collectionView.indexPathsForSelectedItems {
                let row = indexPath[0].row
                let master = splitViewController.viewControllers.first as! UINavigationController
                let m = master.topViewController as! MasterViewController
                m.title = project[row].name
                m.LoadManager = LoadFilesMenu(p: project[row].path)
                
                // repo
                let editor = splitViewController.viewControllers.last as! UINavigationController
                let e = editor.topViewController as! DetailViewController
                let path = URL(string: project[row].path.path)
                let repo = Repository.at(path!)
                if let r = repo.value {
                    e.repo = r
                }
            }
        }
    }
    
    // MARK: UICollectionViewDataSource
    
    override func numberOfSections(in collectionView: UICollectionView) -> Int {
        // #warning Incomplete implementation, return the number of sections
        return 1
    }
    
    
    override func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        // #warning Incomplete implementation, return the number of items
        project = LoadProjects().getProjects()
        return project.count
    }
    
    override func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "project", for: indexPath) as! ProjectCell
        let row = indexPath.row
        
        cell.name.text = project[row].name
        cell.edit()
        
        return cell
    }
    
    var bulletinManager: BLTNItemManager!
    
    func bulletin() -> BLTNItemManager {
        let page = BLTNPageItem(title: "New Project")
        page.image = #imageLiteral(resourceName: "Repo")
        page.descriptionText = "Create a new project in StudIO using the 2 following methods:"
        page.actionButtonTitle = "Clone repository"
        page.alternativeButtonTitle = "Start a local repository"
        
        page.actionHandler = { (item: BLTNActionItem) in
            var clone = TextFieldBulletinPage(title: "Clone")
            clone = self.clone(clone) as! TextFieldBulletinPage
            page.next = clone
            item.manager?.displayNextItem()
            
        }
        page.alternativeHandler = { item in
            let new = TextFieldBulletinPage(title: "Local project")
            new.descriptionText = "Create a local git project that will not be backed up by any git hosting platform."
            new.actionButtonTitle = "Done"
            new.checkURL = false
            new.placeholder = "Project name"
            var name = ""
            new.textInputHandler = { item, text in
                name = text!
            }
            
            new.actionHandler = { (item: BLTNActionItem) in
                if name != "" {
                    item.manager?.dismissBulletin(animated: true)
                    let n = CreateProject()
                    let p = n.newLocalProject(name: name)
                    self.project.append(p)
                    self.collectionView.reloadData()
                }
                
            }
            page.next = new
            item.manager?.displayNextItem()
        }
        return BLTNItemManager(rootItem: page)
    }
    
    var creds: Credentials = .default
    
    func clone(_ page: TextFieldBulletinPage) -> BLTNPageItem {
        page.descriptionText = "Enter the Git repository URL you would like to clone."
        page.actionButtonTitle = "Done"
        page.alternativeButtonTitle = "Clone using custom credentials"
        
        var can = false
        var url: URL?
        
        page.textInputHandler = { item, text in
            can = true
            url = URL(string: text!)
        }
        page.actionHandler = { (item: BLTNActionItem) in
            // Show new page
            let done = BLTNPageItem(title: "Done")
            done.image = #imageLiteral(resourceName: "IntroCompletion")
            done.shouldStartWithActivityIndicator = true
            done.appearance.imageViewTintColor = .green
            done.presentationHandler = { item in
                item.manager?.displayActivityIndicator()
                DispatchQueue.global().async {
                    let n = CreateProject()
                    n.newRemoteProject(url: url!, creds: self.creds, handler: { p in
                        self.project.append(p)
                        DispatchQueue.main.async {
                            item.manager?.dismissBulletin(animated: true)
                            self.collectionView.reloadData()
                        }
                    })
                    
                }
                
                
            }
            if can == true {
                page.next = done
                item.manager?.displayNextItem()
            }
        }
        page.alternativeHandler = { (item: BLTNActionItem) in
            let alertWindow = UIWindow(frame: UIScreen.main.bounds)
            alertWindow.rootViewController = UIViewController()
            alertWindow.windowLevel = UIWindow.Level.alert + 1
            alertWindow.makeKeyAndVisible()
            
            //1. Create the alert controller.
            let alert = UIAlertController(title: "Username", message: "Please enter your git username", preferredStyle: .alert)
            
            //2. Add the text field. You can configure it however you need.
            alert.addTextField { (textField) in
                textField.placeholder = "username"
            }
            
            // 3. Grab the value from the text field, and print it when the user clicks OK.
            alert.addAction(UIAlertAction(title: "OK", style: .default, handler: { [weak alert] (_) in
                let textField = alert?.textFields![0] // Force unwrapping because we know it exists.
                let username = textField?.text
                alertWindow.rootViewController?.dismiss(animated: true, completion: nil)
                //1. Create the alert controller.
                let alert = UIAlertController(title: "Password", message: "Please enter your git password", preferredStyle: .alert)
                
                //2. Add the text field. You can configure it however you need.
                alert.addTextField { (textField) in
                    textField.placeholder = "password"
                    textField.isSecureTextEntry = true
                }
                
                // 3. Grab the value from the text field, and print it when the user clicks OK.
                alert.addAction(UIAlertAction(title: "OK", style: .default, handler: { [weak alert] (_) in
                    let textField = alert?.textFields![0] // Force unwrapping because we know it exists.
                    let password = textField?.text
                    self.creds = .plaintext(username: username ?? "", password: password ?? "")
                    alertWindow.rootViewController?.dismiss(animated: true, completion: nil)
                }))
                
                // 4. Present the alert.
                alertWindow.rootViewController?.present(alert, animated: true, completion: nil)
            }))
            
            alertWindow.rootViewController?.present(alert, animated: true, completion: nil)
        }
        
        return page
    }
    
    @IBAction func addProject(_ sender: Any) {
        bulletinManager = bulletin()
        bulletinManager.showBulletin(above: self)
    }
    @IBAction func showSettings(_ sender: Any) {
        let storyboard = UIStoryboard(name: "Projects", bundle: nil)
        let vc = storyboard.instantiateViewController(withIdentifier: "settingsVC")
        vc.modalPresentationStyle = .formSheet
        
        self.present(vc, animated: true, completion: nil)
    }
}
