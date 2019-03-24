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
    @IBOutlet weak var gist: UITextField!
    
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
        colorSlider.addTarget(self, action: #selector(changedColor(_:)), for: .valueChanged)
        
        colorView.addSubview(colorSlider)
    }
    var color: UIColor = .black
    @objc func changedColor(_ slider: ColorSlider) {
        color = slider.color
    }
    
    @IBOutlet weak var codeView: Editor!
    
    
    func setupEditor() {
        guard let c = codeView else { return }
        
//        c.codeView.scrollView.delegate = self
        
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
    
    @IBAction func saveSnippet(_ sender: Any) {
        guard let n = name.text else { return }
        
        if n == "" {
            name.placeHolderColor = #colorLiteral(red: 1, green: 0.1491314173, blue: 0, alpha: 1)
            return
        }
        codeView.getData({ (data) in
            guard let d = data else { return }
            guard var c = String(data: d, encoding: .utf8) else { return }
            guard let l = self.lang.text else { return }
            
            guard let g = self.gist.text else { return }
            if c == "" {
                c = g
            }
            self.navigationItem.rightBarButtonItems?.last?.title = "Loading..."
            
            DispatchQueue.global().async {
                self.getSnippetContent(input: c, completion: { (c) in
                    DispatchQueue.main.sync {
                        let snippet = Snippet(n: n, c: c, l: l, co: self.color)
                        
                        let snippetVC = self.navigationController?.viewControllers.first as! SnippetsVC
                        snippetVC.snippets.append(snippet)
                        
                        self.navigationController?.popViewController(animated: true)
                    }
                })
            }
        })
    }
    
    func getSnippetContent(input: String, completion: @escaping (String) -> Void) {
        let services: [SnippetService] = [
            GitHubGist(),
            GitlabSnippets()
        ]
        
        for service in services {
            if service.isOk(input) {
                service.download(str: input) { (str) in
                    completion(str)
                }
                return
            }
        }
        completion(input)
    }
}

//extension NewSnippetVC: UIScrollViewDelegate {
//    func scrollViewWillBeginZooming(_ scrollView: UIScrollView, with view: UIView?) {
//        scrollView.pinchGestureRecognizer?.isEnabled = false // disable zooming
//    }
//}
