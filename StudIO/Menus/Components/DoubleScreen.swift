//
//  DoubleScreen.swift
//  StudIO
//
//  Created by Arthur Guiot on 3/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2

extension WorkingDirMasterVC {
    override func shouldPerformSegue(withIdentifier identifier: String, sender: Any?) -> Bool {
        return identifier != "showEditor"
    }
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        if segue.identifier == "showEditor" {
            let Ncontroller = segue.destination as! UINavigationController
            let c = Ncontroller.topViewController as! WorkingDirDetailVC
            
            // Repo
            let path = LoadManager!.project.path
            guard let repo = try? Repository.at(URL(fileURLWithPath: path)).get() else { return }
            // File
            var detailItem: File!
            if sender is MenuCellStruct {
                guard let file = (sender as! MenuCellStruct).path as? File else { return }
                detailItem = file
            } else if sender is URL {
                guard let file = try? File(path: (sender as! URL).path) else { return }
                detailItem = file
            }
            
            let controller = DetailVC(file: detailItem, repo: repo)
            detailViewController?.viewControllers.append(controller)
            detailViewController?.activateTab(controller)
            
            controller.save() // saving before opening file
            
            c.navigationItem.leftItemsSupplementBackButton = true
            guard let button = splitViewController?.displayModeButtonItem else { return }
            c.navigationItem.leftBarButtonItems = [button]
        }
    }
}

extension DetailVC {
    func observe() {
        NotificationCenter.default.addObserver(self, selector: #selector(handleScreenConnectNotification), name: UIScreen.didConnectNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(handleScreenDisconnectNotification), name: UIScreen.didDisconnectNotification, object: nil)
    }
    
    @objc func handleScreenConnectNotification() {
        let secondDisplay = UIScreen.screens[1]
        
        if secondWindow == nil {
            secondWindow = UIWindow(frame: secondDisplay.bounds)
        }
        //windows require a root view controller
        let viewcontroller = UIViewController()
        
        let secondScreenView = editorView! //add the view to the second screens window
        
        secondScreenView.frame = secondScreenView.bounds
        secondScreenView.bounds = secondScreenView.bounds
        secondScreenView.removeConstraints(secondScreenView.constraints)
        secondScreenView.contentView.removeConstraints(secondScreenView.contentView.constraints)
        
        viewcontroller.view.addSubview(secondScreenView)
        
        secondWindow?.rootViewController = viewcontroller //tell the window which screen to use
        
        secondWindow?.screen = secondDisplay //set the dimensions for the view for the external screen so it fills the screen
        secondWindow?.isHidden = false //customised the view
    }
    @objc func handleScreenDisconnectNotification() {
        
    }
}
