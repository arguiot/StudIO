//
//  DetailViewController.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2

class DetailVC: UIViewController {

    @IBOutlet weak var bottomLine: BottomLine!
    @IBOutlet weak var editorView: Editor!
    
    var file: File?
    var repo: Repository?
    
    var secondWindow: UIWindow?
    
    var currentActivity: NSUserActivity!
    init(file: File, repo: Repository) {
        super.init(nibName: nil, bundle: nil)
        // Do any additional setup after loading the view, typically from a nib.
        updatedBar()
        configureView()
        
        // Listen for events
        NotificationCenter.default.addObserver(self, selector: #selector(insertSnippet(notification:)), name: .init("insertSnippet"), object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(reloadInterface(_:)), name: .init("reloadEditorMenu"), object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(enablePreview(notification:)), name: .init("enablePreview"), object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(disablePreview(notification:)), name: .init("disablePreview"), object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(emmet(notification:)), name: .init("emmet"), object: nil)
        // Double screen
        observe()
        
        currentActivity = NSUserActivity(activityType: "com.ArthurG.StudIO.inProject")
        guard let repo = self.repo else { return }
        guard let path = try? repo.allRemotes().get().first?.URL else { return }
        currentActivity.webpageURL = URL(string: path)
        currentActivity.isEligibleForHandoff = true
        currentActivity.becomeCurrent()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
//        fatalError("init(coder:) has not been implemented")
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
        let arr = str.split(separator: ".")
        let ext = String(arr[arr.count - 1]).uppercased()
        
        guard let c = editorView else { return }
        guard var content = try? file?.read().base64EncodedString() else { return }
        let img = ["PNG", "JPG", "JPEG"]
        if img.contains(ext) {
            guard let path = file?.path else { return }
            let image = UIImage(contentsOfFile: path)
            guard let data = image?.jpegData(compressionQuality: 0.4) else { return }
            content = data.base64EncodedString() 
        }
        c.loadFile(withContent: content, lang: str)
        c.fileName = str
        
        
        guard let editorSplit = self.splitViewController as? EditorSplitVC else { return }
        editorSplit.accessory.extension = ext.lowercased()
        
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
        
        guard let url = repo?.directoryURL else { return }
        guard let r = try? GTRepository(url: url) else { return }
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
    @objc func enablePreview(notification: Notification) {
        self.save()
        guard let c = editorView else { return }
        guard let ext = c.highlightExt?.lowercased() else { return }
        
        if ext == "html" {
            guard let allow = self.repo?.directoryURL else { return }
            guard let path = self.file?.path else { return }
            let fURL = URL(fileURLWithPath: path)
            self.editorView.codeView.loadFileURL(fURL, allowingReadAccessTo: allow)
            
            return
        }
        
        let js = """
        try {
            window.e.enablePreview("\(ext)")
        } catch(e) {
            console.log(e)
        }
        """
        DispatchQueue.main.async {
            self.editorView.codeView.evaluateJavaScript(js) { (result, error) in
                if error != nil {
                    NSObject.alert(t: "Preview error", m: error?.localizedDescription ?? "Couldn't load preview")
                }
            }
        }
    }
    @objc func disablePreview(notification: Notification) {
        self.reloadInterface(notification)
    }
    @objc func emmet(notification: Notification) {
        guard let data = notification.userInfo?["data"] as? String else { return }
        
        let js = """
        try {
            window.e.expandEmmet("\(data)")
        } catch(e) {
            console.log(e)
        }
        """
        DispatchQueue.main.async {
            self.editorView.codeView.evaluateJavaScript(js) { (result, error) in
                if error != nil {
                    NSObject.alert(t: "Preview error", m: error?.localizedDescription ?? "Couldn't load preview")
                }
            }
        }
    }
}
