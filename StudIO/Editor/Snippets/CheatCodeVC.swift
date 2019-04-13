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
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Do any additional setup after loading the view.
        self.preferredContentSize = CGSize(width: 415, height: 800)
        setupEditor()
        
        searchBar.delegate = self
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
    }
    
    @IBAction func saveSnippet(_ sender: Any) {
        guard let n = searchBar.text else { return }
        
        if n == "" {
            return
        }
        self.navigationItem.rightBarButtonItems?.last?.title = "Loading..."
        
        DispatchQueue.global().async {
            
        }
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

extension CheatCodeVC: UISearchBarDelegate {
    func searchBarTextDidEndEditing(_ searchBar: UISearchBar) {
        let cht = ChtSH()
        let url = cht.getLink(question: searchBar.text ?? "", language: lang.text ?? "js")
        cht.down(load: url) { (str) in
            DispatchQueue.main.async {
                self.codeView.loadFile(withContent: str)
            }
        }
    }
}
