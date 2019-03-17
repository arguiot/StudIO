//
//  SnippetsVC.swift
//  StudIO
//
//  Created by Arthur Guiot on 16/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class SnippetsVC: UIViewController, UITableViewDelegate, UITableViewDataSource {
    
    var snippets: [Snippet] = [
        Snippet(n: "Test Snippet", c: """
for (let i = 0; i < a; i++) {

}
""", l: "js", co: .red)
    ]
    
    @IBOutlet weak var tableView: UITableView!
    override func viewDidLoad() {
        super.viewDidLoad()
        
        self.preferredContentSize = CGSize(width: 320, height: 400)
        
        // Do any additional setup after loading the view.
        
        let array = UserDefaults.standard.array(forKey: "studio-snippets") ?? snippets
        let sn = array as? [Snippet]
        snippets = sn ?? snippets
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
        
        NotificationCenter.default.post(name: .init("insertSnippet"), object: nil, userInfo: ["selected": snippet])
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
        self.editorView.codeView.evaluateJavaScript(js) { (result, error) in
            if error != nil {
                NSObject.alert(t: "Snippet error", m: error?.localizedDescription ?? "Couldn't insert snippet")
            }
            self.dismiss(animated: true, completion: nil)
        }
    }
}
