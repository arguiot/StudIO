//
//  MenuDocTableViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/6/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class BaseDocTableViewController: UITableViewController {
    
    // MARK: - Properties
    
    var filteredArticles = [MenuDocTableViewController.Article]()
    private var numberFormatter = NumberFormatter()
    
    // MARK: - Constants
    
    static let tableViewCellIdentifier = "cellID"
    private static let nibName = "TableCell"
    
    // MARK: - View Life Cycle
    
    override func viewDidLoad() {
        super.viewDidLoad()

        numberFormatter.numberStyle = .currency
        numberFormatter.formatterBehavior = .default
        
        let nib = UINib(nibName: BaseDocTableViewController.nibName, bundle: nil)
        
        // Required if our subclasses are to use `dequeueReusableCellWithIdentifier(_:forIndexPath:)`.
        tableView.register(nib, forCellReuseIdentifier: BaseDocTableViewController.tableViewCellIdentifier)
    }
    
    // MARK: - Configuration
    
    func configureCell(_ cell: UITableViewCell, forProduct article: MenuDocTableViewController.Article) {
        cell.textLabel?.text = article.name
    }
    
}
