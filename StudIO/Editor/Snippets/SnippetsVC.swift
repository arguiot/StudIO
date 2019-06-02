//
//  SnippetsVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 16/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class SnippetsVC: UIViewController, UITableViewDelegate, UITableViewDataSource {
    
    var snippets: [Snippet] = [] {
        didSet {
            var encoded: [[String: String]] = [[:]]
            snippets.forEach { (sn) in
                encoded.append([
                    "name": sn.name,
                    "content": sn.content,
                    "language": sn.language,
                    "color": sn.color.hex
                ])
            }
            UserDefaults.standard.set(encoded, forKey: "studio-snippets")
            
            DispatchQueue.main.async {
                self.tableView.reloadData()
            }
        }
    }
    
    @IBOutlet weak var tableView: UITableView!
    override func viewDidLoad() {
        super.viewDidLoad()
        
        self.preferredContentSize = CGSize(width: 320, height: 400)
        
        // Do any additional setup after loading the view.
        
        var array = [Snippet]()
        
        if let encoded = UserDefaults.standard.array(forKey: "studio-snippets") as? [[String: String]] {
            encoded.forEach { (sn) in
                if (sn.keys.count >= 4) { // make sure that sn is a snippet with 4 (or more) keys (name, content, language, ...)
                    let color = UIColor.hexStringToUIColor(hex: sn["color"]!)
                    array.append(Snippet(n: sn["name"]!,
                                         c: sn["content"]!,
                                         l: sn["language"]!,
                                         co: color))
                }
            }
        }

        snippets = array
    }
    

    @IBAction func exit(_ sender: Any) {
        self.dismiss(animated: true, completion: nil)
    }
    /*
    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
    }
    */
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return snippets.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "SnippetCell", for: indexPath) as! SnippetCell
        let row = indexPath.row
        let data = snippets[row]
        return data.setup(cell: cell)
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let row = indexPath.row
        let snippet = snippets[row]
        
        NotificationCenter.default.post(name: .init("insertSnippet"), object: nil, userInfo: ["selected": snippet, "dismiss": true])
    }
    
    func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool {
        return true
    }
    func tableView(_ tableView: UITableView, editActionsForRowAt indexPath: IndexPath) -> [UITableViewRowAction]? {
        let row = indexPath.row
        _ = snippets[row]
        
        let delete = UITableViewRowAction(style: .destructive, title: "Delete") { (action, indexPath) in
            self.snippets.remove(at: row)
        }
        
        return [delete]
    }
}


extension WorkingDirDetailVC {
    @objc func insertSnippet(notification: Notification) {
        let d = notification.userInfo
        let snippet = d?["selected"] as! Snippet
        
        let data = snippet.content.data(using: .utf8)
        let content = data?.base64EncodedString()
        let js = """
        try {
            window.e.insertSnippet("\(content ?? "")")
        } catch(e) {
            console.log(e)
        }
        """
        DispatchQueue.main.async {
            self.editorView.codeView.evaluateJavaScript(js) { (result, error) in
                if error != nil {
                    NSObject.alert(t: "Snippet error", m: error?.localizedDescription ?? "Couldn't insert snippet")
                }
                if d?.keys.contains("dismiss") ?? false {
                    self.dismiss(animated: true, completion: nil)
                }
            }
        }
    }
}
