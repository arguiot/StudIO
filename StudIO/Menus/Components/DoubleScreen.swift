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
            let controller = Ncontroller.topViewController as! WorkingDirDetailVC
            detailViewController = controller
            
            try? controller.save(nil) { // saving before opening file
                // Repo
                let path = self.LoadManager!.project.path
                let repo = try! Repository.at(URL(fileURLWithPath: path)).get()
                controller.repo = repo
                if sender is MenuCellStruct {
                    controller.detailItem = (sender as! MenuCellStruct).path as? File
                } else if sender is URL {
                    guard let file = try? File(path: (sender as! URL).path) else { return }
                    controller.detailItem = file
                }
               
                controller.navigationItem.leftItemsSupplementBackButton = true
                guard let button = self.splitViewController?.displayModeButtonItem else { return }
                controller.navigationItem.leftBarButtonItems = [button]
            }
        }
    }
}

extension WorkingDirDetailVC {
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
