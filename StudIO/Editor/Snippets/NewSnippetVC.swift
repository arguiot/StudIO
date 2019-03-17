//
//  NewSnippetVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 17/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import WebKit
import ColorSlider

class NewSnippetVC: UIViewController {

    @IBOutlet weak var name: UITextField!
    @IBOutlet weak var lang: UITextField!
    @IBOutlet weak var colorView: UIView!
    
    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        self.preferredContentSize = CGSize(width: 415, height: 800)
        setupColorSlider()
        setupEditor()
    }
    
    
    func setupColorSlider() {
        let colorSlider = ColorSlider(orientation: .horizontal, previewSide: .right)
        colorSlider.frame = CGRect(x: 0, y: 0, width: 200, height: 30)
        colorView.addSubview(colorSlider)
    }

    
    @IBOutlet weak var codeView: Editor!
    
    
    func setupEditor() {
        guard let c = codeView else { return }
        
        c.codeView.scrollView.delegate = self
        
        c.content = ""
        
        c.gitPanel.isHidden = true
        
        let ext = lang.text ?? "c"
        
        c.highlightExt = ext
        
        c.settings([
            "fontSize": UserDefaults.standard.string(forKey: "studio-font-size") ?? "26",
            "lineWrapping": UserDefaults.standard.string(forKey: "studio-line-wrapping") ?? "false",
            "theme": UserDefaults.standard.string(forKey: "studio-editor-theme") ?? "monokai"
            ])
        
        c.highlight(ext) {
            // nil
        }
    }
    @IBAction func updateHighlight(_ sender: Any) {
        guard let c = codeView else { return }
        
        let ext = lang.text ?? "c"
        
        c.getData { (data) in
            let str = data?.base64EncodedString()
            c.highlight(ext, code: {
                c.loadFile(withContent: str ?? "")
            })
        }
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

extension NewSnippetVC: UIScrollViewDelegate {
    func scrollViewWillBeginZooming(_ scrollView: UIScrollView, with view: UIView?) {
        scrollView.pinchGestureRecognizer?.isEnabled = false // disable zooming
    }
}
