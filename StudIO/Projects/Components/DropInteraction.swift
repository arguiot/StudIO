//
//  DropInteraction.swift
//  StudIO
//
//  Created by Arthur Guiot on 3/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import Zip
extension ProjectVC: UIDropInteractionDelegate {
    func setupDrop() {
        if #available(iOS 11.0, *) {
            view.addInteraction(UIDropInteraction(delegate: self))
        }
    }
    @available(iOS 11.0, *)
    var types: [NSItemProviderReading.Type] {
        return [
            ZipDocument.self,
//            FolderDocument.self
        ]
    }
    @available(iOS 11.0, *)
    func dropInteraction(_ interaction: UIDropInteraction, canHandle session: UIDropSession) -> Bool {
        
        for t in types {
            if session.canLoadObjects(ofClass: t ) {
                return true
            }
        }
        return false
    }
    @available(iOS 11.0, *)
    func dropInteraction(_ interaction: UIDropInteraction, sessionDidUpdate session: UIDropSession) -> UIDropProposal {
        return UIDropProposal(operation: .copy)
    }
    @available(iOS 11.0, *)
    func dropInteraction(_ interaction: UIDropInteraction, performDrop session: UIDropSession) {
        for dragItem in session.items {
            for t in types {
                if dragItem.itemProvider.canLoadObject(ofClass: t) {
                    dragItem.itemProvider.loadObject(ofClass: t) { (obj, error) in
                        if error != nil {
                            NSObject.alert(t: "Drop load error", m: error?.localizedDescription ?? "Couldn't access the file / folder")
                            return
                        }
                        if let obj = obj as? FolderDocument {
                            let folderURL = URL(dataRepresentation: obj.data!, relativeTo: nil)
                            self.loadFolder(url: folderURL!)
                        } else if let obj = obj as? ZipDocument {
                            self.loadZIP(document: obj)
                        }
                    }
                }
            }
        }
    }
    
    func loadFolder(url: URL) {
        do {
            let folder = try Folder(path: url.path)
            let target = try LoadProjects().home.createSubfolderIfNeeded(withName: folder.name)
            try folder.copy(to: target)
        } catch {
            NSObject.alert(t: "Drop folder error", m: error.localizedDescription )
        }
        DispatchQueue.main.async {
            self.collectionView.reloadData()
        }
    }
    func loadZIP(document: ZipDocument) {
        DispatchQueue.global().async {
            do {
                DispatchQueue.main.async {
                    SwiftSpinner.show("Copying ZIP file", animated: true)
                }
                let url = try LoadProjects().home.createFile(named: "temp.zip", contents: document.data!)
                
                let temp = try LoadProjects().home.createSubfolderIfNeeded(withName: "_STUDIO_TEMP")
                let URLpath = URL(fileURLWithPath: url.path)
                let URLDest = URL(fileURLWithPath: temp.path)
                try Zip.unzipFile(URLpath, destination: URLDest, overwrite: true, password: nil, progress: { (progress) in
                    DispatchQueue.main.async {
                        SwiftSpinner.show(progress: progress, title: "Unzipping")
                    }
                    if progress == 1 {
                        do {
                            try url.delete()
                            try temp.subfolder(named: "__MACOSX").delete()
                            try temp.subfolders.first?.move(to: LoadProjects().home)
                            try temp.delete()
                            DispatchQueue.main.async {
                                SwiftSpinner.hide()
                                self.collectionView.reloadData()
                            }
                        } catch {
                            NSObject.alert(t: "Drop error", m: error.localizedDescription )
                            DispatchQueue.main.async {
                                SwiftSpinner.show(duration: 2.0, title: error.localizedDescription)
                            }
                            try? temp.delete()
                            return
                        }
                    }
                })
            } catch {
                NSObject.alert(t: "Drop error (copy)", m: error.localizedDescription )
                DispatchQueue.main.async {
                    SwiftSpinner.show(duration: 2.0, title: error.localizedDescription)
                }
                return
            }
        }
    }
}
