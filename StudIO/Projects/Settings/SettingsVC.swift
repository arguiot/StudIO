//
//  SettingsVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/2/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class SettingsVC: UITableViewController {

    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        let done = UIBarButtonItem(barButtonSystemItem: .done, target: self, action: #selector(self.dismissController))
        navigationItem.rightBarButtonItem = done
    }
    
    @objc func dismissController() {
        self.dismiss(animated: true)
    }
    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */
    

}
