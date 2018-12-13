//
//  ProjectCell.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit

class ProjectCell: UICollectionViewCell {
    @IBOutlet weak var name: UILabel!
    func edit() {
        let lgpr = UILongPressGestureRecognizer(target: self, action: #selector(handleLongPress))
        self.addGestureRecognizer(lgpr)
    }
    @objc func handleLongPress(gestureReconizer: UILongPressGestureRecognizer) {
        let alert = UIAlertController(title: "Remove '\(name.text!)'", message: "Would you like to delete this project forever?", preferredStyle: UIAlertController.Style.alert)
        
        // add the actions (buttons)
        alert.addAction(UIAlertAction(title: "Delete Project", style: UIAlertAction.Style.destructive) { result in
            CreateProject().deleteProject(name: self.name.text!)
            let cv = self.superview as! UICollectionView
            cv.reloadData()
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: UIAlertAction.Style.cancel, handler: nil))
        // show the alert
        self.window?.rootViewController?.present(alert, animated: true, completion: nil)
    }
}
