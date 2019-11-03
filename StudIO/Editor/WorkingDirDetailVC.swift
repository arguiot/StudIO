//
//  DetailViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2

class WorkingDirDetailVC: UIViewController {

    @IBOutlet weak var bottomLine: BottomLine!
    @IBOutlet weak var editorView: Editor!
    
    var file: File?
    var repo: Repository?
    
    var secondWindow: UIWindow?
    
    var currentActivity: NSUserActivity!
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
        let undoImg = #imageLiteral(resourceName: "Undo").scaleImage(toSize: CGSize(width: 10, height: 10))
        let undoButton = UIBarButtonItem(image: undoImg, style: .plain, target: self, action: #selector(undo(_:)))
        let redoImg = #imageLiteral(resourceName: "Redo").scaleImage(toSize: CGSize(width: 10, height: 10))
        let redoButton = UIBarButtonItem(image: redoImg, style: .plain, target: self, action: #selector(redo(_:)))
        
        let simg = #imageLiteral(resourceName: "snippet").scaleImage(toSize: CGSize(width: 10, height: 10))
        snippetButton = UIBarButtonItem(image: simg, style: .plain, target: self, action: #selector(showSnippet(_:)))
        
        navigationItem.rightBarButtonItems = [
            gitButton, pButton,
            snippetButton, undoButton, redoButton].reversed()
        
        var saveIcon = #imageLiteral(resourceName: "save-icon")
        saveIcon = saveIcon.scaleImage(toSize: CGSize(width: 24 / 2, height: 24 / 2)) ?? saveIcon
        
        let saveButton = UIButton(type: .custom)
        saveButton.frame = CGRect(x: 0, y: 0, width: 40, height: 40)
        saveButton.setImage(saveIcon, for: .normal)
        saveButton.tintColor = #colorLiteral(red: 0.6588235294, green: 0.6588235294, blue: 0.6588235294, alpha: 1)
        saveButton.addTarget(self, action: #selector(saveButton(_:)), for: .touchUpInside)
        
        let lgpr = UILongPressGestureRecognizer(target: self, action: #selector(saveLongPress))
        saveButton.addGestureRecognizer(lgpr)
        let saveBarButton = UIBarButtonItem(customView: saveButton)
        navigationItem.leftBarButtonItems?.append(saveBarButton)
        
        
        // Listen for events
        NotificationCenter.default.addObserver(self, selector: #selector(insertSnippet(notification:)), name: .init("insertSnippet"), object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(reloadInterface(_:)), name: .init("reloadEditorMenu"), object: nil)
        // Double screen
        observe()
        
        currentActivity = NSUserActivity(activityType: "com.ArthurG.StudIO.inProject")
        guard let repo = self.repo else { return }
        guard let path = try? repo.allRemotes().get().first?.URL else { return }
        currentActivity.webpageURL = URL(string: path)
        currentActivity.isEligibleForHandoff = true
        currentActivity.becomeCurrent()
    }
    override func viewWillDisappear(_ animated: Bool) {
        save(nil) {
//            self.editorView.codeView = nil
        }
    }
    override func viewWillAppear(_ animated: Bool) {
        reloadInterface(.init(name: .init("reloadEditorMenu")))
    }
    
    func configureView() {
        // Update the user interface for the detail item.
        if let detail = detailItem {
            file = detail
            bottomView((file?.name)!)
            codeEditor((file?.name)!)
        }
    }
    @objc func saveButton(_ sender: Any? = nil) {
        save()
    }
    @objc func save(_ sender: Any? = nil, _ callback: (() -> Void)? = nil) {
        guard let f = self.file else { return }
        guard let hash = try? f.read() else { return }
        editorView?.getData({ data, error  in
            if error != nil {
                NSObject.alert(t: "Code wasn't saved", m: error!.localizedDescription)
                return
            }
            guard let d = data else { return }
            guard d != hash else { return }
            _ = try? f.write(data: d)
            DispatchQueue.main.async {
                self.editorView?.getLangName({ str in
                    self.bottomLine.language.text = str
                })
            }
            guard let c = callback else { return }
            c()
        })
    }
    
    @objc func saveLongPress(gestureReconizer: UILongPressGestureRecognizer) {
        if gestureReconizer.state != .began {
            return
        }
        
        let impactFeedbackgenerator = UIImpactFeedbackGenerator(style: .heavy)
        impactFeedbackgenerator.prepare()
        
        let alert = UIAlertController(title: nil, message: nil, preferredStyle: UIAlertController.Style.actionSheet)
        alert.addAction(UIAlertAction(title: "Reload from last version", style: UIAlertAction.Style.destructive) { result in
            guard let f = self.file else { return }
            self.editorView.initialisation()
            self.bottomView(f.name)
            self.codeEditor(f.name)
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: UIAlertAction.Style.cancel, handler: nil))
        
        if let pop = alert.popoverPresentationController {
            pop.sourceView = navigationItem.leftBarButtonItems?.last?.customView
            pop.sourceRect = CGRect(x: pop.sourceView!.bounds.midX, y: pop.sourceView!.bounds.midY, width: 0, height: 0)
        }
        // show the alert + make impact
        impactFeedbackgenerator.impactOccurred()
        self.present(alert, animated: true, completion: nil)
    }
    
    func codeEditor(_ str: String) {
        guard let c = editorView else { return }
        guard let content = try? file?.read().base64EncodedString() else { return }
        
        c.loadFile(withContent: content, lang: str)
        c.fileName = str
        
        let arr = str.split(separator: ".")
        let ext = String(arr[arr.count - 1]).uppercased()
        
        guard let editorSplit = self.splitViewController as? EditorSplitVC else { return }
        editorSplit.accessory.extension = ext
        
        c.highlightExt = ext
        
        c.settings([
            "fontSize": UserDefaults.standard.string(forKey: "studio-font-size") ?? "26",
            "lineWrapping": UserDefaults.standard.string(forKey: "studio-line-wrapping") ?? "false",
            "theme": UserDefaults.standard.string(forKey: "studio-editor-theme") ?? "monokai"
            ])
        
        self.bottomLine.setupLanguage(str)
        
        // Second display
        if UIScreen.screens.count > 1 {
            handleScreenConnectNotification()
        }
    }
    func bottomView(_ str: String = "") {
        let b = bottomLine
        
        DispatchQueue.global().async {
            guard let text = try? self.file?.readSize() else { return }
            DispatchQueue.main.async {
                b?.sizeString.text = text
            }
        }
        
        
        guard let r = try? GTRepository(url: (repo?.directoryURL)!) else { return }
        guard let branch = try? r.currentBranch() else { return }
        guard let commit = try? branch.targetCommit() else { return }
        b?.setup(commit: commit)
    }
    
    @IBAction func updatedBar() {
        bottomView()
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
        
        guard let p = editorView?.gitPanel else { return }
        
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
        editorView?.undo()
    }
    @objc func redo(_ sender: Any?) {
        editorView?.redo()
    }
    
    var snippetButton: UIBarButtonItem!
    weak var snippetVC: snippetController?
    @objc func showSnippet(_ sender: Any?) {
        snippetVC = storyboard?.instantiateViewController(withIdentifier: "snippetController") as? snippetController
        snippetVC?.preferredContentSize = CGSize(width: 320, height: 400)
        
        showPopover(snippetVC!, from: snippetButton)
    }
    
    func showPopover(_ vc: UIViewController, from barButtonItem: UIBarButtonItem) {
        
        vc.modalPresentationStyle = .popover
        vc.popoverPresentationController?.barButtonItem = barButtonItem
        
        present(vc, animated: true, completion: nil)
    }
    
    @objc func reloadInterface(_ notification: Notification) {
        save()
        guard let f = self.file else { return }
        self.editorView.initialisation()
        self.bottomView(f.name)
        self.codeEditor(f.name)
    }
}
