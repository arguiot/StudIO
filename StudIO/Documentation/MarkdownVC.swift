//
//  MarkdownVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/6/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import Down

class MarkdownVC: UIViewController {

    @IBOutlet weak var textView: UITextView!
    @IBOutlet weak var section: UILabel!
    
    private static let viewControllerIdentifier = "MarkdownVC"
    
    var article: MenuDocTableViewController.Article? = nil
    override func viewDidLoad() {
        super.viewDidLoad()

        // Do any additional setup after loading the view.
        guard article != nil else {
            section.isHidden = false
            textView.isHidden = true
            return
        }
        let url = article!.path
        
        section.text = "Loading ressources..."
        DispatchQueue.global().async {
            do {
                let content = try String(contentsOf: url)
                
                let down = Down(markdownString: content)
                let attributedString = try down.toAttributedString()
                DispatchQueue.main.async {
                    self.textView.attributedText = attributedString
                    
                    self.section.isHidden = true
                    self.textView.isHidden = false
                    self.section.text = "Open an article"
                    
                    self.uiChecks()
                }
                
            } catch {
                NSObject.alert(t: "Couldn't load file", m: error.localizedDescription)
                DispatchQueue.main.async {
                    self.section.text = "Open an article"
                }
            }
        }
    }
    
    func uiChecks() {
        if #available(iOS 13.0, *) {
            textView.textColor = .label
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
