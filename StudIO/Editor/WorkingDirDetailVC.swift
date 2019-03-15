//
//  DetailViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2
import PanelKit

class WorkingDirDetailVC: UIViewController {

    var bottomLine: BottomLine!
    var editorView: Editor!
    @IBOutlet weak var wrapperView: UIView!
    @IBOutlet weak var containerView: UIView!
    var container: containerView!
    
    var file: File?
    var repo: Repository?
    
    var secondWindow: UIWindow?
    
    var snippetsButton: UIBarButtonItem!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Do any additional setup after loading the view, typically from a nib.
        updatedBar()
        configureView()
        // GitVC
        let image = #imageLiteral(resourceName: "Repo-white").scaleImage(toSize: CGSize(width: 10, height: 10))
        let gitButton = UIBarButtonItem(image: image, style: .plain, target: self, action: #selector(gitVC(_:)))
        // Git Panel
        let pimg = #imageLiteral(resourceName: "branch-icon").scaleImage(toSize: CGSize(width: 6.25, height: 10))
        let pButton = UIBarButtonItem(image: pimg, style: .plain, target: self, action: #selector(gitPanel(_:)))
        editorView?.gitPanel.isHidden = true
        if let r = repo {
            editorView?.gitPanel.repo = r
        }
        //        navigationItem.rightBarButtonItems = [gitButton, pButton] // Disabling Git functionnalities
        
        let undoButton = UIBarButtonItem(barButtonSystemItem: .undo, target: self, action: #selector(undo(_:)))
        let redoButton = UIBarButtonItem(barButtonSystemItem: .redo, target: self, action: #selector(redo(_:)))
        
        snippetsButton = UIBarButtonItem(title: "Snippets", style: .plain, target: self, action: #selector(snippets(_:)))
        
        navigationItem.rightBarButtonItems = [snippetsButton, undoButton, redoButton].reversed()
        
        var saveIcon = #imageLiteral(resourceName: "save-icon")
        saveIcon = saveIcon.scaleImage(toSize: CGSize(width: 24 / 2, height: 24 / 2)) ?? saveIcon
        let saveButton = UIBarButtonItem(image: saveIcon, style: .plain, target: self, action: #selector(save(_:)))
        
        navigationItem.leftItemsSupplementBackButton = true
        navigationItem.leftBarButtonItems?.append(saveButton)
        
        // Double screen
        observe()
    }
    
    func configureView() {
        // Update the user interface for the detail item.
        if let detail = detailItem {
            file = detail
            bottomView((file?.name)!)
            codeEditor((file?.name)!)
        }
    }
    @objc func save(_ sender: Any? = nil) {
        if let f = self.file {
            let hash = try? f.read()
            editorView?.getData({ data in
                if let d = data {
                    if d != hash {
                        _ = try? f.write(data: d)
                        DispatchQueue.main.async {
                            self.editorView?.getLangName({ str in
                                self.bottomLine.language.text = str
                            })
                        }
                    }
                }
            })
        }
    }
    func codeEditor(_ str: String) {
        guard let c = editorView else { return }
        c.content = try! file?.read().base64EncodedString()
        
        let arr = str.split(separator: ".")
        let ext = String(arr[arr.count - 1]).uppercased()
        
        c.highlightExt = ext
        
        c.settings([
            "fontSize": UserDefaults.standard.string(forKey: "studio-font-size") ?? "26",
            "lineWrapping": UserDefaults.standard.string(forKey: "studio-line-wrapping") ?? "false",
            "theme": UserDefaults.standard.string(forKey: "studio-editor-theme") ?? "monokai"
            ])
        
        c.highlight(str, code: {
            self.bottomLine.setupLanguage(str)
        })
        
        // Second display
        if UIScreen.screens.count > 1 {
            handleScreenConnectNotification()
        }
    }
    func bottomView(_ str: String = "") {
        let b = bottomLine
        if let branch = repo?.localBranch(named: "master").value {
            let commit = repo?.commits(in: branch).next()?.value!
            let msg = commit?.message
            b?.lastCommit.text = msg
        }
        DispatchQueue.global().async {
            let text = try? self.file?.readSize()
            DispatchQueue.main.async {
                b?.sizeString.text = text as? String
            }
        }
    }
    
    @IBAction func updatedBar() {
        bottomView()
    }
    override func viewWillDisappear(_ animated: Bool) {
        save()
    }
    
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    var detailItem: File? {
        didSet {
            // Update the view.
            self.title = detailItem?.name
            configureView()
        }
    }

    @objc func null(_ sender: Any?) {
        // null code
    }
    
    @objc func gitVC(_ sender: Any?) {
        let storyBoard: UIStoryboard = UIStoryboard(name: "git", bundle: nil)
        let newViewController = storyBoard.instantiateViewController(withIdentifier: "GitVC") as! GitVC
        newViewController.repo = repo
        self.navigationController?.pushViewController(newViewController, animated: true)
    }
    
    @objc func gitPanel(_ sender: Any?) {
        save()
        
        let p = editorView?.gitPanel
        p?.reloadProperties()
        p?.isHidden = !(p?.isHidden ?? false)
        
    }
    
    @objc func undo(_ sender: Any?) {
        editorView?.undo()
    }
    @objc func redo(_ sender: Any?) {
        editorView?.redo()
    }
    
    var snippetPanel: PanelViewController?
    
    var snippet: SnippetsVC {
        let stb = UIStoryboard(name: "Projects", bundle: Bundle.main)
        let vc = stb.instantiateViewController(withIdentifier: "SnippetsVC")
        return vc as! SnippetsVC
    }
    @objc func snippets(_ sender: Any?) {
        if let panel = snippetPanel {
            showPopover(panel, from: snippetsButton)
        } else {
            snippetPanel = PanelViewController(with: snippet, in: self)
            showPopover(snippetPanel!, from: snippetsButton)
        }
        
    }
    
    func showPopover(_ vc: UIViewController, from barButtonItem: UIBarButtonItem) {
        
        vc.modalPresentationStyle = .popover
        vc.popoverPresentationController?.barButtonItem = barButtonItem
        
        present(vc, animated: true, completion: nil)
        moveAllPanelsToValidPositions()
    }
    
    override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: coordinator)
        
        coordinator.animate(alongsideTransition: { (context) in
            
        }) { (context) in
            
            if !self.allowFloatingPanels {
                self.closeAllFloatingPanels()
            }
            
            if !self.allowPanelPinning {
                self.closeAllPinnedPanels()
            }
            
        }
        
    }
    
    @IBAction func closeALLPanels() {
        self.closeAllPinnedPanels()
        self.closeAllFloatingPanels()
        self.close(snippetPanel!)
    }
}


class containerView: UIViewController {
    @IBOutlet weak var editorView: Editor!
    @IBOutlet weak var bottomBar: BottomLine!
}

extension WorkingDirDetailVC {
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        if segue.identifier == "containerEditorSegue" {
            let vc = segue.destination as! containerView
            container = vc
            
            editorView = container.editorView
            bottomLine = container.bottomBar
        }
    }
}
