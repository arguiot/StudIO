//
//  DetailTabContainer.swift
//  StudIO
//
//  Created by Arthur Guiot on 2019-12-26.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import TabView
import SwiftGit2

class WorkingDirDetailVC: TabViewController {
    var repo: Repository?
    var file: File?
    override func viewDidLoad() {
        super.viewDidLoad()
        
        self.theme = TabViewThemeDark()
        
        self.viewControllers = [
            DetailVC(file: file!, repo: repo!)
        ]
        
        guard let visible = self.visibleViewController as? DetailVC else { return }
        // GitVC
        let image = #imageLiteral(resourceName: "Repo-white").scaleImage(toSize: CGSize(width: 10, height: 10))
        let gitButton = UIBarButtonItem(image: image, style: .plain, target: self, action: #selector(gitVC(_:)))
        // Git Panel
        let pimg = #imageLiteral(resourceName: "branch-icon").scaleImage(toSize: CGSize(width: 6.25, height: 10))
        let pButton = UIBarButtonItem(image: pimg, style: .plain, target: self, action: #selector(gitPanel(_:)))
        visible.editorView?.gitPanel.isHidden = true
        if let r = repo {
            visible.editorView?.gitPanel.repo = r
        }
        //        navigationItem.rightBarButtonItems = [gitButton, pButton] // Disabling Git functionnalities
        let undoImg = #imageLiteral(resourceName: "Undo").scaleImage(toSize: CGSize(width: 10, height: 10))
        let undoButton = UIBarButtonItem(image: undoImg, style: .plain, target: self, action: #selector(undo(_:)))
        let redoImg = #imageLiteral(resourceName: "Redo").scaleImage(toSize: CGSize(width: 10, height: 10))
        let redoButton = UIBarButtonItem(image: redoImg, style: .plain, target: self, action: #selector(redo(_:)))
        
        let simg = #imageLiteral(resourceName: "snippet").scaleImage(toSize: CGSize(width: 10, height: 10))
        visible.snippetButton = UIBarButtonItem(image: simg, style: .plain, target: self, action: #selector(visible.showSnippet(_:)))
        
        navigationItem.rightBarButtonItems = [
            gitButton, pButton,
            visible.snippetButton, undoButton, redoButton].reversed()
        
        var saveIcon = #imageLiteral(resourceName: "save-icon")
        saveIcon = saveIcon.scaleImage(toSize: CGSize(width: 24 / 2, height: 24 / 2)) ?? saveIcon
        
        let saveButton = UIButton(type: .custom)
        saveButton.frame = CGRect(x: 0, y: 0, width: 40, height: 40)
        saveButton.setImage(saveIcon, for: .normal)
        saveButton.tintColor = #colorLiteral(red: 0.6588235294, green: 0.6588235294, blue: 0.6588235294, alpha: 1)
        saveButton.addTarget(self, action: #selector(visible.saveButton(_:)), for: .touchUpInside)
        
        let lgpr = UILongPressGestureRecognizer(target: self, action: #selector(visible.saveLongPress))
        saveButton.addGestureRecognizer(lgpr)
        let saveBarButton = UIBarButtonItem(customView: saveButton)
        navigationItem.leftBarButtonItems?.append(saveBarButton)
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        guard let visible = self.visibleViewController as? DetailVC else { return }
        visible.save(nil) {
            // self.editorView.codeView = nil
        }
    }
    override func viewWillAppear(_ animated: Bool) {
        guard let visible = self.visibleViewController as? DetailVC else { return }
        visible.reloadInterface(.init(name: .init("reloadEditorMenu")))
    }
    
    @objc func gitVC(_ sender: Any?) {
        let storyBoard: UIStoryboard = UIStoryboard(name: "git", bundle: nil)
        let newViewController = storyBoard.instantiateViewController(withIdentifier: "GitVC") as! GitVC
        newViewController.repo = repo
        guard let visible = self.visibleViewController as? DetailVC else { return }
        visible.navigationController?.pushViewController(newViewController, animated: true)
    }
    
    @objc func gitPanel(_ sender: Any?) {
        guard let visible = self.visibleViewController as? DetailVC else { return }
        visible.save()
        
        guard let p = visible.editorView?.gitPanel else { return }
        
        let screenSize = UIScreen.main.bounds
        if p.contentView.frame.width > screenSize.width {
            p.contentView.frame = CGRect(x: 400 - screenSize.width, y: p.bounds.minY, width: screenSize.width, height: p.bounds.height)
        }
        
        if p.isHidden == true {
            p.reloadProperties()
        }
        p.isHidden = !(p.isHidden)
        
        let split = self.splitViewController as! EditorSplitVC
        split.HideSmartKeyboard()
    }
    
    @objc func undo(_ sender: Any?) {
        guard let visible = self.visibleViewController as? DetailVC else { return }
        visible.editorView?.undo()
    }
    @objc func redo(_ sender: Any?) {
        guard let visible = self.visibleViewController as? DetailVC else { return }
        visible.editorView?.redo()
    }
}
