//
//  MenuDocTableViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/6/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class MenuDocTableViewController: UITableViewController, UISearchBarDelegate {
    struct Article {
        var path: URL
        var name: String
        var tags: [String]
    }
    var articles = [Article]()
    var displaying = [Article]()
    
    @IBOutlet weak var searchBar: UISearchBar!
    
    override func viewDidLoad() {
        super.viewDidLoad()

        // Uncomment the following line to preserve selection between presentations
        // self.clearsSelectionOnViewWillAppear = false

        // Uncomment the following line to display an Edit button in the navigation bar for this view controller.
        // self.navigationItem.rightBarButtonItem = self.editButtonItem
        searchBar.delegate = self
        loadArticles()
    }
    func loadArticles() {
        let paths = Bundle.main.paths(forResourcesOfType: "md", inDirectory: "Articles")
        for path in paths {
            let url = URL(fileURLWithPath: path)
            let name = url.standardizedFileURL.lastPathComponent.split(separator: ".").first!
            articles.append(Article(path: url, name: String(name), tags: []))
        }
        displaying = articles
    }
    @IBAction func dismiss(_ sender: Any) {
        self.dismiss(animated: true, completion: nil)
    }
    
    // MARK: - Table view data source

    override func numberOfSections(in tableView: UITableView) -> Int {
        // #warning Incomplete implementation, return the number of sections
        return 1
    }

    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        // #warning Incomplete implementation, return the number of rows
        return displaying.count
    }

    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "ArticleCell", for: indexPath)
        let row = displaying[indexPath.row]
        cell.textLabel?.text = row.name
        return cell
    }
    
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        displaying = []
        let length = searchText.count
        for article in articles {
            if article.name.prefix(length) == searchText {
                displaying.append(article)
            }
        }
        tableView.reloadData()
    }

    /*
    // Override to support conditional editing of the table view.
    override func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool {
        // Return false if you do not want the specified item to be editable.
        return true
    }
    */

    /*
    // Override to support editing the table view.
    override func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        if editingStyle == .delete {
            // Delete the row from the data source
            tableView.deleteRows(at: [indexPath], with: .fade)
        } else if editingStyle == .insert {
            // Create a new instance of the appropriate class, insert it into the array, and add a new row to the table view
        }    
    }
    */

    /*
    // Override to support rearranging the table view.
    override func tableView(_ tableView: UITableView, moveRowAt fromIndexPath: IndexPath, to: IndexPath) {

    }
    */

    /*
    // Override to support conditional rearranging of the table view.
    override func tableView(_ tableView: UITableView, canMoveRowAt indexPath: IndexPath) -> Bool {
        // Return false if you do not want the item to be re-orderable.
        return true
    }
    */

    // MARK: - Navigation

    // In a storyboard-based application, you will often want to do a little preparation before navigation
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        // Get the new view controller using segue.destination.
        // Pass the selected object to the new view controller.
        
        guard let nv = segue.destination as? UINavigationController else { return }
        guard let destination = nv.viewControllers.first as? MarkdownVC else { return }
        guard let indexPath = tableView.indexPathForSelectedRow else { return }
        let article = displaying[indexPath.row]
        destination.article = article
        destination.title = article.name
    }

}
