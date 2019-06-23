//
//  CompletionView.swift
//  StudIO
//
//  Created by Arthur Guiot on 29/4/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import WebKit


extension Editor: WKScriptMessageHandler {
    
    @IBAction func keyTouch(_ sender: Any) {
        let button = sender as! UIButton
        let content = button.currentTitle
        
        var replace = true
        if button is SmallButton {
            replace = false
        }
        
        guard content != "" else { return }
        
        let data = content?.data(using: .utf8)
        let c = data?.base64EncodedString()
        let js = """
        try {
        window.e.insertSnippet("\(c ?? "")", \(replace.description))
        } catch(e) {
        console.log(e)
        }
        """
        DispatchQueue.main.async {
            self.codeView.evaluateJavaScript(js) { (result, error) in
                if error != nil {
                    NSObject.alert(t: "Key error", m: error?.localizedDescription ?? "Couldn't insert key")
                }
            }
        }
    }
    
    
    // Completion Engine
    func setAutoCompletions(key1: String, key2: String, key3: String) {
        guard let detailVC = self.parentViewController as? WorkingDirDetailVC else { return }
        guard let editorVC = detailVC.splitViewController as? EditorSplitVC else { return }
        let smartKeyboard = editorVC.accessory
        _ = smartKeyboard?.completionView
        
        NotificationCenter.default.post(name: .init("setAutoComplete"), object: nil, userInfo: ["titles": [
            key1, key2, key3
            ]])
    }
    func setListen() {
        let userContentController = codeView.configuration.userContentController
        if isScriptAdded == false {
            userContentController.add(self, name: "completion")
            userContentController.add(self, name: "setKeys")
            isScriptAdded = true
        }
    }
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "completion":
            guard let keys = message.body as? [String?] else { return }
            self.setAutoCompletions(key1: keys[0] ?? "", key2: keys[1] ?? "", key3: keys[2] ?? "")
        case "setKeys":
            let keys = message.body as? [String]
            guard let detailVC = self.parentViewController as? WorkingDirDetailVC else { return }
            guard let editorVC = detailVC.splitViewController as? EditorSplitVC else { return }
            
            editorVC.cells = []
            for key in keys ?? [] {
                if key == "STUDIOAUTOCOMPLETE" {
                    editorVC.cells.append(CompletionFeature(title: "", type: .large))
                } else {
                    editorVC.cells.append(CompletionFeature(title: key, type: .small))
                }
            }
            editorVC.accessory.completionView.reloadData()
        default:
            break
        }
    }
}

extension EditorSplitVC: UICollectionViewDataSource, UICollectionViewDelegateFlowLayout {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return cells.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let row = indexPath.row
        let feature = cells[row]
        switch feature.type {
        case .large:
            let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "LargeCell", for: indexPath) as! LargeCompleletionCell
            
            cell.button.setTitle(feature.title, for: .normal)
            return cell
        default:
            let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "SmallCell", for: indexPath) as! SmallCompleletionCell
            cell.button.setTitle(feature.title, for: .normal)
            return cell
        }
    }
    
    func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
        // Compute the dimension of a cell for an NxN layout with space S between
        // cells.  Take the collection view's width, subtract (N-1)*S points for
        // the spaces between the cells, and then divide by N to find the final
        // dimension for the cell's width and height.
        let row = indexPath.row
        let feature = cells[row]
        switch feature.type {
        case .large:
            return CGSize(width: 150, height: 50)
        default:
            return CGSize(width: 35, height: 50)
        }
    }
    
    @objc func setCompletes(notification: Notification) {
        let keys = notification.userInfo!["titles"] as! [String]
        var i = 0
        for a in 0..<cells.count {
            guard cells[a].type == .large else { continue }
            cells[a] = CompletionFeature(title: keys[i], type: .large)
        }
        accessory.completionView.reloadData()
    }
}
