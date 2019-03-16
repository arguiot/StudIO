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
    
    override func viewDidLoad() {
        super.viewDidLoad()

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
}
