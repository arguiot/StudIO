//
//  CheatCodeVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 13/4/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//


import UIKit
import WebKit

class CheatCodeVC: UIViewController {

    @IBOutlet weak var lang: UITextField!
    @IBOutlet weak var searchBar: UISearchBar!
    @IBOutlet weak var toggleSwitch: UISwitch!
    @IBOutlet weak var doneButton: UIBarButtonItem!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Do any additional setup after loading the view.
        self.preferredContentSize = CGSize(width: 415, height: 800)
        setupEditor()
        
        searchBar.delegate = self
        lang.delegate = self
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
            "fontSize": "26",
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
        
        searchBarTextDidEndEditing(self.searchBar)
    }
    @IBAction func updateComments(_ sender: Any) {
        searchBarTextDidEndEditing(self.searchBar)
    }
    @IBAction func updateSearch(_ sender: Any) {
        searchBarTextDidEndEditing(self.searchBar)
    }
    
    @IBAction func saveSnippet(_ sender: Any) {
        guard let n = searchBar.text else { return }
        guard let l = lang.text else { return }
        if n == "" {
            return
        }
        self.navigationItem.rightBarButtonItems?.last?.title = "Loading..."
        
        self.getSnippetContent { (c) in
            let snippet = Snippet(n: n, c: c, l: l, co: .black)
            
            let snippetVC = self.navigationController?.viewControllers.first as! SnippetsVC
            snippetVC.snippets.append(snippet)
            
            self.navigationController?.popViewController(animated: true)
        }
    }
    
    func getSnippetContent(completion: @escaping (String) -> Void) {
        codeView.getData { (data) in
            guard let d = data else { return }
            let str = String(data: d, encoding: .utf8)
            completion(str ?? "")
        }
    }
}

//extension NewSnippetVC: UIScrollViewDelegate {
//    func scrollViewWillBeginZooming(_ scrollView: UIScrollView, with view: UIView?) {
//        scrollView.pinchGestureRecognizer?.isEnabled = false // disable zooming
//    }
//}

extension CheatCodeVC: UISearchBarDelegate {
    func searchBarTextDidEndEditing(_ searchBar: UISearchBar) {
        doneButton.title = "Loading..."
        let cht = ChtSH()
        let url = cht.getLink(question: searchBar.text ?? "", language: lang.text ?? "js", comments: !toggleSwitch.isOn)
        DispatchQueue.global().async {
            cht.down(load: url) { (str) in
                DispatchQueue.main.async {
                    let base64 = str.data(using: .utf8)?.base64EncodedString()
                    self.codeView.loadFile(withContent: base64 ?? "")
                    self.doneButton.title = "Done"
                }
            }
        }
    }
}

extension CheatCodeVC: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        self.view.endEditing(true)
        return false
    }
}
