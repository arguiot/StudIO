//
//  MenuDoc.swift
//  StudIO
//
//  Created by Arthur Guiot on 28/09/2019.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class ResultsTableController: BaseDocTableViewController {
    
    // MARK: - UITableViewDataSource
    
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredArticles.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: BaseDocTableViewController.tableViewCellIdentifier, for: indexPath)
        let product = filteredArticles[indexPath.row]
        configureCell(cell, forProduct: product)
        
        return cell
    }
}
