//
//  NewPluginVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 7/5/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class NewPluginVC: UIViewController {

    @IBOutlet var pluginURL: UIView!
    @IBOutlet weak var pluginTitle: UILabel!
    @IBOutlet weak var pluginImage: UIImageView!
    @IBOutlet weak var pluginTextView: UITextView!
    
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

    @IBAction func done(_ sender: Any) {
    }
}
