//
//  ProjectVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import BLTNBoard

class ProjectVC: UICollectionViewController {
    
    var project: [Project] = [Project(project: "Neuron", path: URL(fileURLWithPath: "path/to/project"))]
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Uncomment the following line to preserve selection between presentations
        // self.clearsSelectionOnViewWillAppear = false
        
        
        // Do any additional setup after loading the view.
    }
    
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        let appDelegate = UIApplication.shared.delegate as! AppDelegate
        let splitViewController = segue.destination as! UISplitViewController
        let navigationController = splitViewController.viewControllers[splitViewController.viewControllers.count - 1] as! UINavigationController
        navigationController.topViewController!.navigationItem.leftBarButtonItem = splitViewController.displayModeButtonItem
        splitViewController.delegate = appDelegate
        
        if let indexPath = collectionView.indexPathsForSelectedItems {
            let row = indexPath[0].row
            let master = splitViewController.viewControllers.first as! UINavigationController
            master.topViewController!.title = project[row].name
        }
    }
    
    // MARK: UICollectionViewDataSource
    
    override func numberOfSections(in collectionView: UICollectionView) -> Int {
        // #warning Incomplete implementation, return the number of sections
        return 1
    }
    
    
    override func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        // #warning Incomplete implementation, return the number of items
        return project.count
    }
    
    override func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "project", for: indexPath) as! ProjectCell
        let row = indexPath.row
        
        cell.name.text = project[row].name
        
        return cell
    }
    
    // MARK: UICollectionViewDelegate
    
    /*
     // Uncomment this method to specify if the specified item should be highlighted during tracking
     override func collectionView(_ collectionView: UICollectionView, shouldHighlightItemAt indexPath: IndexPath) -> Bool {
     return true
     }
     */
    
    /*
     // Uncomment this method to specify if the specified item should be selected
     override func collectionView(_ collectionView: UICollectionView, shouldSelectItemAt indexPath: IndexPath) -> Bool {
     return true
     }
     */
    
    /*
     // Uncomment these methods to specify if an action menu should be displayed for the specified item, and react to actions performed on the item
     override func collectionView(_ collectionView: UICollectionView, shouldShowMenuForItemAt indexPath: IndexPath) -> Bool {
     return false
     }
     
     override func collectionView(_ collectionView: UICollectionView, canPerformAction action: Selector, forItemAt indexPath: IndexPath, withSender sender: Any?) -> Bool {
     return false
     }
     
     override func collectionView(_ collectionView: UICollectionView, performAction action: Selector, forItemAt indexPath: IndexPath, withSender sender: Any?) {
     
     }
     */
    lazy var bulletinManager: BLTNItemManager = {
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
            var new = TextFieldBulletinPage(title: "Local project")
            new.descriptionText = "Create a local git project that will not be backed up by any git hosting platform."
            new.actionButtonTitle = "Done"
            new.checkURL = false
            
            var name = ""
            new.textInputHandler = { item, text in
                name = text!
            }
            
            new.actionHandler = { (item: BLTNActionItem) in
                if name != "" {
                    item.manager?.dismissBulletin(animated: true)
                    self.project.append(Project(project: name, path: URL(fileURLWithPath: "path/to/project")))
                    self.collectionView.reloadData()
                }
                
            }
            page.next = new
            item.manager?.displayNextItem()
        }
        return BLTNItemManager(rootItem: page)
    }()
    
    func clone(_ page: TextFieldBulletinPage) -> BLTNPageItem {
        page.descriptionText = "Enter the Git repository URL you would like to clone."
        page.actionButtonTitle = "Done"
        
        var can = false
        var url = ""
        page.textInputHandler = { item, text in
            can = true
            url = text!
        }
        page.actionHandler = { (item: BLTNActionItem) in
            let done = BLTNPageItem(title: "Done")
            done.image = #imageLiteral(resourceName: "IntroCompletion")
            done.shouldStartWithActivityIndicator = true
            done.appearance.imageViewTintColor = .green
            done.presentationHandler = { item in
                item.manager?.displayActivityIndicator()
                DispatchQueue.main.asyncAfter(deadline: .now() + .seconds(5)) {
                    item.manager?.dismissBulletin(animated: true)
                    self.collectionView.reloadData()
                }
                
            }
            if can == true {
                page.next = done
                item.manager?.displayNextItem()
            }
        }
        return page
    }
    
    @IBAction func addProject(_ sender: Any) {
        bulletinManager.showBulletin(above: self)
    }
}
