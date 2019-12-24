//
//  MenuDoc.swift
//  StudIO
//
//  Created by Arthur Guiot on 28/09/2019.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class MenuDocTableViewController: BaseDocTableViewController {
    
    // MARK: - Types
    
    /// State restoration values.
    private enum RestorationKeys: String {
        case viewControllerTitle
        case searchControllerIsActive
        case searchBarText
        case searchBarIsFirstResponder
    }
    
    /// NSPredicate expression keys.
    private enum ExpressionKeys: String {
        case name
    }
    
    private struct SearchControllerRestorableState {
        var wasActive = false
        var wasFirstResponder = false
    }
    
    // MARK: - Properties
    
    /// Data model for the table view.
    @objc(_TtCC6StudIO26MenuDocTableViewController7Article)class Article: NSObject, NSCoding {
        @objc var path: URL
        @objc var name: String
        
        init(path: URL, name: String) {
            self.path = path
            self.name = name
        }
        // MARK: - Types
        
        private enum CoderKeys: String {
            case nameKey
            case pathKey
        }
        
        // MARK: - NSCoding
        
        /// This is called for UIStateRestoration
        required init?(coder aDecoder: NSCoder) {
            guard let decodedTitle = aDecoder.decodeObject(forKey: CoderKeys.nameKey.rawValue) as? String else {
                fatalError("A title did not exist. In your app, handle this gracefully.")
            }
            name = decodedTitle
            path = aDecoder.decodeObject(forKey: CoderKeys.pathKey.rawValue) as! URL
        }
        
        func encode(with aCoder: NSCoder) {
            aCoder.encode(name, forKey: CoderKeys.nameKey.rawValue)
            aCoder.encode(path, forKey: CoderKeys.pathKey.rawValue)
        }
    }
    var articles = [Article]()
    
    /** The following 2 properties are set in viewDidLoad(),
        They are implicitly unwrapped optionals because they are used in many other places
        throughout this view controller.
    */
    
    /// Search controller to help us with filtering.
    private var searchController: UISearchController!
    
    /// Secondary search results table view.
    private var resultsTableController: ResultsTableController!
    
    /// Restoration state for UISearchController
    private var restoredState = SearchControllerRestorableState()
    
    // MARK: - View Life Cycle
    
    func loadArticles() {
        guard let pathURL = Bundle.main.path(forResource: "Home", ofType: "md", inDirectory: "Articles") else { return }
        let baseURL = URL(fileURLWithPath: pathURL).deletingLastPathComponent()
        
        articles = [
            MenuDocTableViewController.Article(path: baseURL.appendingPathComponent("Home.md"), name: "Home"),
            MenuDocTableViewController.Article(path: baseURL.appendingPathComponent("Create-a-project.md"), name: "Create a project"),
            MenuDocTableViewController.Article(path: baseURL.appendingPathComponent("SmartKeyboard.md"), name: "Using the completion bar"),
            MenuDocTableViewController.Article(path: baseURL.appendingPathComponent("Use-snippets.md"), name: "Use snippets"),
            MenuDocTableViewController.Article(path: baseURL.appendingPathComponent("Create-a-Theme.md"), name: "Create a custom theme"),
            MenuDocTableViewController.Article(path: baseURL.appendingPathComponent("Using-Git.md"), name: "Using the git system")
        ]
    }
    @IBAction func dismiss(_ sender: Any) {
        self.dismiss(animated: true, completion: nil)
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        loadArticles()
        
        resultsTableController = ResultsTableController()

        resultsTableController.tableView.delegate = self
        
        searchController = UISearchController(searchResultsController: resultsTableController)
        searchController.searchResultsUpdater = self
        searchController.searchBar.autocapitalizationType = .none
        
        if #available(iOS 11.0, *) {
            // For iOS 11 and later, place the search bar in the navigation bar.
            navigationItem.searchController = searchController
            
            // Make the search bar always visible.
            navigationItem.hidesSearchBarWhenScrolling = false
        } else {
            // For iOS 10 and earlier, place the search controller's search bar in the table view's header.
            tableView.tableHeaderView = searchController.searchBar
        }
        
        searchController.delegate = self
        searchController.dimsBackgroundDuringPresentation = false // The default is true.
        searchController.searchBar.delegate = self // Monitor when the search button is tapped.
        
        /** Search presents a view controller by applying normal view controller presentation semantics.
            This means that the presentation moves up the view controller hierarchy until it finds the root
            view controller or one that defines a presentation context.
        */
        
        /** Specify that this view controller determines how the search controller is presented.
            The search controller should be presented modally and match the physical size of this view controller.
        */
        definesPresentationContext = true
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        // Restore the searchController's active state.
        if restoredState.wasActive {
            searchController.isActive = restoredState.wasActive
            restoredState.wasActive = false
            
            if restoredState.wasFirstResponder {
                searchController.searchBar.becomeFirstResponder()
                restoredState.wasFirstResponder = false
            }
        }
    }

}

// MARK: - UITableViewDelegate

extension MenuDocTableViewController {
    
    override func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let selectedProduct: Article
        
        // Check to see which table view cell was selected.
        if tableView === self.tableView {
            selectedProduct = articles[indexPath.row]
        } else {
            selectedProduct = resultsTableController.filteredArticles[indexPath.row]
        }
        
        // Set up the detail view controller to show.
        let storyboard = UIStoryboard(name: "Documentation", bundle: nil)

        let viewController =
            storyboard.instantiateViewController(withIdentifier: "MarkdownVC") as! UINavigationController
        
        if let detailViewController = viewController.topViewController as? MarkdownVC {
            detailViewController.article = selectedProduct
            detailViewController.navigationItem.hidesBackButton = false
            splitViewController?.showDetailViewController(detailViewController, sender: self)
        }
        
        tableView.deselectRow(at: indexPath, animated: false)
    }
}

// MARK: - UITableViewDataSource

extension MenuDocTableViewController {
    override func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return articles.count
    }
    
    override func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: BaseDocTableViewController.tableViewCellIdentifier, for: indexPath)
        
        let product = articles[indexPath.row]
        configureCell(cell, forProduct: product)
        
        return cell
    }
    
}

// MARK: - UISearchBarDelegate

extension MenuDocTableViewController: UISearchBarDelegate {
    
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }
    
}

// MARK: - UISearchControllerDelegate

// Use these delegate functions for additional control over the search controller.

extension MenuDocTableViewController: UISearchControllerDelegate {
    
    func presentSearchController(_ searchController: UISearchController) {
        debugPrint("UISearchControllerDelegate invoked method: \(#function).")
    }
    
    func willPresentSearchController(_ searchController: UISearchController) {
        debugPrint("UISearchControllerDelegate invoked method: \(#function).")
    }
    
    func didPresentSearchController(_ searchController: UISearchController) {
        debugPrint("UISearchControllerDelegate invoked method: \(#function).")
    }
    
    func willDismissSearchController(_ searchController: UISearchController) {
        debugPrint("UISearchControllerDelegate invoked method: \(#function).")
    }
    
    func didDismissSearchController(_ searchController: UISearchController) {
        debugPrint("UISearchControllerDelegate invoked method: \(#function).")
    }
    
}

// MARK: - UISearchResultsUpdating

extension MenuDocTableViewController: UISearchResultsUpdating {
    
    private func findMatches(searchString: String) -> NSCompoundPredicate {
        /** Each searchString creates an OR predicate for: name, yearIntroduced, introPrice.
            Example if searchItems contains "Gladiolus 51.99 2001":
                name CONTAINS[c] "gladiolus"
                name CONTAINS[c] "gladiolus", yearIntroduced ==[c] 2001, introPrice ==[c] 51.99
                name CONTAINS[c] "ginger", yearIntroduced ==[c] 2007, introPrice ==[c] 49.98
        */
        var searchItemsPredicate = [NSPredicate]()
        
        /** Below we use NSExpression represent expressions in our predicates.
            NSPredicate is made up of smaller, atomic parts:
            two NSExpressions (a left-hand value and a right-hand value).
        */
        
        // Name field matching.
        let titleExpression = NSExpression(forKeyPath: ExpressionKeys.name.rawValue)
        let searchStringExpression = NSExpression(forConstantValue: searchString)
        
        let titleSearchComparisonPredicate =
            NSComparisonPredicate(leftExpression: titleExpression,
                                  rightExpression: searchStringExpression,
                                  modifier: .direct,
                                  type: .contains,
                                  options: [.caseInsensitive, .diacriticInsensitive])
        
        searchItemsPredicate.append(titleSearchComparisonPredicate)
        
        let orMatchPredicate = NSCompoundPredicate(orPredicateWithSubpredicates: searchItemsPredicate)
        
        return orMatchPredicate
    }
    
    func updateSearchResults(for searchController: UISearchController) {
        // Update the filtered array based on the search text.
        let searchResults = articles

        // Strip out all the leading and trailing spaces.
        let whitespaceCharacterSet = CharacterSet.whitespaces
        let strippedString =
            searchController.searchBar.text!.trimmingCharacters(in: whitespaceCharacterSet)
        let searchItems = strippedString.components(separatedBy: " ") as [String]

        // Build all the "AND" expressions for each value in searchString.
        let andMatchPredicates: [NSPredicate] = searchItems.map { searchString in
            findMatches(searchString: searchString)
        }

        // Match up the fields of the Product object.
        let finalCompoundPredicate =
            NSCompoundPredicate(andPredicateWithSubpredicates: andMatchPredicates)

        let filteredResults = searchResults.filter { finalCompoundPredicate.evaluate(with: $0) }

        // Apply the filtered results to the search results table.
        if let resultsController = searchController.searchResultsController as? ResultsTableController {
            resultsController.filteredArticles = filteredResults
            resultsController.tableView.reloadData()
        }
    }
    
}

// MARK: - UIStateRestoration

extension MenuDocTableViewController {
    override func encodeRestorableState(with coder: NSCoder) {
        super.encodeRestorableState(with: coder)
        
        // Encode the view state so it can be restored later.
        
        // Encode the title.
        coder.encode(navigationItem.title!, forKey: RestorationKeys.viewControllerTitle.rawValue)

        // Encode the search controller's active state.
        coder.encode(searchController.isActive, forKey: RestorationKeys.searchControllerIsActive.rawValue)
        
        // Encode the first responser status.
        coder.encode(searchController.searchBar.isFirstResponder, forKey: RestorationKeys.searchBarIsFirstResponder.rawValue)
        
        // Encode the search bar text.
        coder.encode(searchController.searchBar.text, forKey: RestorationKeys.searchBarText.rawValue)
    }
    
    override func decodeRestorableState(with coder: NSCoder) {
        super.decodeRestorableState(with: coder)
        
        // Restore the title.
        guard let decodedTitle = coder.decodeObject(forKey: RestorationKeys.viewControllerTitle.rawValue) as? String else {
            fatalError("A title did not exist. In your app, handle this gracefully.")
        }
        navigationItem.title! = decodedTitle
        
        /** Restore the active state:
            We can't make the searchController active here since it's not part of the view
            hierarchy yet, instead we do it in viewWillAppear.
        */
        restoredState.wasActive = coder.decodeBool(forKey: RestorationKeys.searchControllerIsActive.rawValue)
        
        /** Restore the first responder status:
            Like above, we can't make the searchController first responder here since it's not part of the view
            hierarchy yet, instead we do it in viewWillAppear.
        */
        restoredState.wasFirstResponder = coder.decodeBool(forKey: RestorationKeys.searchBarIsFirstResponder.rawValue)
        
        // Restore the text in the search field.
        searchController.searchBar.text = coder.decodeObject(forKey: RestorationKeys.searchBarText.rawValue) as? String
    }
    
}
