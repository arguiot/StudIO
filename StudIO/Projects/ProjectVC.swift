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
import Zip

class ProjectVC: UICollectionViewController {
    
    var project: [Project] = LoadProjects().getProjects()
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Uncomment the following line to preserve selection between presentations
        // self.clearsSelectionOnViewWillAppear = false
//        DispatchQueue.global().async {
//            Folder.copyDocumentsToiCloudDrive()
//        }
        
        // Do any additional setup after loading the view.
        bulletinManager = bulletin()
        setupDrop()
        
        let lgpr = UILongPressGestureRecognizer(target: self, action: #selector(handleLongPress))
        lgpr.minimumPressDuration = 2.0
        self.collectionView.addGestureRecognizer(lgpr)
        
        let button = UIBarButtonItem(barButtonSystemItem: .bookmarks, target: self, action: #selector(openDucmentation(_:)))
        button.tintColor = .lightGray
        self.navigationItem.rightBarButtonItems?.append(button)
    }
    @IBAction func openDucmentation(_ sender: Any) {
        let storyboard = UIStoryboard(name: "Documentation", bundle: nil)
        let vc = storyboard.instantiateInitialViewController()!
        self.navigationController?.present(vc, animated: true, completion: nil)
    }
    
    
    override func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        let vc = storyboard.instantiateInitialViewController()
        vc?.modalPresentationStyle = .fullScreen
        
        // MARK: Prepare
        
        let appDelegate = UIApplication.shared.delegate as! AppDelegate
        if let splitViewController = vc as? EditorSplitVC {
            let navigationController = splitViewController.viewControllers[splitViewController.viewControllers.count - 1] as! UINavigationController
            navigationController.topViewController!.navigationItem.leftBarButtonItem = splitViewController.displayModeButtonItem
            splitViewController.delegate = appDelegate
            
            if let indexPath = collectionView.indexPathsForSelectedItems {
                let row = indexPath[0].row
                let master = splitViewController.viewControllers.first as! UINavigationController
                let m = master.topViewController as! WorkingDirMasterVC
                m.title = project[row].name
                m.LoadManager = LoadFilesMenu(p: project[row].path)
                
                // repo
                let editor = splitViewController.viewControllers.last as! UINavigationController
                let e = editor.topViewController as! WorkingDirDetailVC
                let p = self.project[row].path
                let path = URL(fileURLWithPath: p.path)
                let repo = Repository.at(path)
                switch repo {
                case .success(let r):
                    e.repo = r
                case .failure(let error):
                    NSObject.alert(t: "Couldn't transfer repo", m: error.localizedDescription)
                }
            }
        }
        
        self.present(vc!, animated: true, completion: nil)
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
        
        return cell
    }
    
    @objc func handleLongPress(gestureReconizer: UILongPressGestureRecognizer) {
        if gestureReconizer.state != .began {
            return
        }
        let p = gestureReconizer.location(in: self.collectionView)
        
        if let indexPath = self.collectionView.indexPathForItem(at: p) {
            // get the cell at indexPath (the one you long pressed)
            let cell = self.collectionView.cellForItem(at: indexPath) as! ProjectCell
            let alert = UIAlertController(title: nil, message: nil, preferredStyle: UIAlertController.Style.actionSheet)
            // add the actions (buttons)
            alert.addAction(UIAlertAction(title: "Share", style: .default, handler: { (result) in
                let name = cell.name.text!
                DispatchQueue.global().async {
                    do {
                        let path = try LoadProjects().home.subfolder(atPath: name)
                        DispatchQueue.main.sync {
                            cell.progressView.isHidden = false
                        }
                        let pathURL = URL(fileURLWithPath: path.path)
                        try Zip.quickZipFiles([pathURL], fileName: "temp", progress: { (progress) in
                            DispatchQueue.main.sync {
                                cell.progressView.setProgress(Float(progress), animated: true)
                            }
                            if progress == 1 {
                                do {
                                    let zip = try LoadProjects().home.file(named: "temp.zip")
                                    let zipURL = URL(fileURLWithPath: zip.path)
                                    let share = UIActivityViewController(activityItems: [zipURL], applicationActivities: nil)
                                    
                                    if let pop = share.popoverPresentationController {
                                        pop.sourceView = cell.contentView
                                        pop.sourceRect = CGRect(x: cell.contentView.bounds.midX, y: cell.contentView.bounds.midY, width: 0, height: 0)
                                    }
                                    DispatchQueue.main.async {
                                        cell.progressView.isHidden = true
                                        
                                        self.present(share, animated: true)
                                    }
                                } catch {
                                    NSObject.alert(t: "Share error", m: error.localizedDescription)
                                }
                            }
                        })
                    } catch {
                        NSObject.alert(t: "Share error", m: error.localizedDescription)
                    }
                }
            }))
            alert.addAction(UIAlertAction(title: "Delete '\(cell.name.text!)'", style: UIAlertAction.Style.destructive) { result in
                CreateProject().deleteProject(name: cell.name.text!)
                self.collectionView.reloadData()
            })
            alert.addAction(UIAlertAction(title: "Cancel", style: UIAlertAction.Style.cancel, handler: nil))
            if let pop = alert.popoverPresentationController {
                pop.sourceView = cell.contentView
                pop.sourceRect = CGRect(x: cell.contentView.bounds.midX, y: cell.contentView.bounds.midY, width: 0, height: 0)
            }
            // show the alert
            self.present(alert, animated: true, completion: nil)
        } else {
            print("couldn't find index path")
        }
    }
    
    var bulletinManager: BLTNItemManager!
    
    func bulletin(goto: Int = 0) -> BLTNItemManager {
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
        var new: BLTNPageItem {
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
            return new
        }
        page.alternativeHandler = { item in
            page.next = new
            item.manager?.displayNextItem()
        }
        
        if goto == 1 {
            return BLTNItemManager(rootItem: new)
        }
        return BLTNItemManager(rootItem: page)
    }
    
    var creds: Credentials = .default
    
    func clone(_ page: TextFieldBulletinPage) -> BLTNPageItem {
        page.descriptionText = "Enter the Git repository URL you would like to clone.".localized()
        page.actionButtonTitle = "Done".localized()
        page.alternativeButtonTitle = "Clone using custom credentials".localized()
        
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
            // Dismiss the Old
            let presented = self.presentedViewController
            
            if presented != nil {
                presented!.dismiss(animated: true, completion: nil)
            }
            
            //1. Create the alert controller.
            let alert = UIAlertController(title: "Username".localized(), message: "Please enter your git username".localized(), preferredStyle: .alert)
            
            //2. Add the text field. You can configure it however you need.
            alert.addTextField { (textField) in
                textField.placeholder = "username".localized()
            }
            
            // 3. Grab the value from the text field, and print it when the user clicks OK.
            alert.addAction(UIAlertAction(title: "OK", style: .default, handler: { [weak alert] (_) in
                let textField = alert?.textFields![0] // Force unwrapping because we know it exists.
                let username = textField?.text
                alert?.dismiss(animated: true, completion: nil)
                //1. Create the alert controller.
                let alert = UIAlertController(title: "Password".localized(), message: "Please enter your git password".localized(), preferredStyle: .alert)
                
                //2. Add the text field. You can configure it however you need.
                alert.addTextField { (textField) in
                    textField.placeholder = "password".localized()
                    textField.isSecureTextEntry = true
                }
                
                // 3. Grab the value from the text field, and print it when the user clicks OK.
                alert.addAction(UIAlertAction(title: "OK", style: .default, handler: { [weak alert] (_) in
                    let textField = alert?.textFields![0] // Force unwrapping because we know it exists.
                    let password = textField?.text
                    self.creds = .plaintext(username: username ?? "", password: password ?? "")
                    alert?.dismiss(animated: true, completion: nil)
                    
                    if presented != nil {
                        let clone = TextFieldBulletinPage(title: "Clone")
                        self.bulletinManager = BLTNItemManager(rootItem: self.clone(clone))
                        self.bulletinManager.showBulletin(above: self)
                    }
                }))
                
                // 4. Present the alert.
                self.present(alert, animated: true, completion: nil)
            }))
            
            self.present(alert, animated: true, completion: nil)
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
    @IBAction func showPlugins(_ sender: Any) {
        let storyboard = UIStoryboard(name: "Projects", bundle: nil)
        let vc = storyboard.instantiateViewController(withIdentifier: "pluginsVC")
        vc.modalPresentationStyle = .formSheet
        
        self.present(vc, animated: true, completion: nil)
    }
}
