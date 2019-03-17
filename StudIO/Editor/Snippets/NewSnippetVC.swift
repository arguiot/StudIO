//
//  NewSnippetVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 17/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import ColorSlider

class NewSnippetVC: UIViewController {

    @IBOutlet weak var name: UITextField!
    @IBOutlet weak var lang: UITextField!
    @IBOutlet weak var colorView: UIView!
    
    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        
        setupColorSlider()
    }
    
    
    func setupColorSlider() {
        let colorSlider = ColorSlider(orientation: .horizontal, previewSide: .right)
        colorSlider.frame = CGRect(x: 0, y: 0, width: 200, height: 30)
        colorView.addSubview(colorSlider)
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
