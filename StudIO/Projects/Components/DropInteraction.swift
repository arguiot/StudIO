//
//  DropInteraction.swift
//  StudIO
//
//  Created by Arthur Guiot on 3/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import ZipArchive

extension ProjectVC: UIDropInteractionDelegate {
    func setupDrop() {
        view.addInteraction(UIDropInteraction(delegate: self))
    }
    var types: [NSItemProviderReading.Type] {
        return [
            ZipDocument.self,
//            FolderDocument.self
        ]
    }
    func dropInteraction(_ interaction: UIDropInteraction, canHandle session: UIDropSession) -> Bool {
        
        for t in types {
            if session.canLoadObjects(ofClass: t as! NSItemProviderReading.Type) {
                return true
            }
        }
        return false
    }
    func dropInteraction(_ interaction: UIDropInteraction, sessionDidUpdate session: UIDropSession) -> UIDropProposal {
        return UIDropProposal(operation: .copy)
    }
    func dropInteraction(_ interaction: UIDropInteraction, performDrop session: UIDropSession) {
        for dragItem in session.items {
            for t in types {
                if dragItem.itemProvider.canLoadObject(ofClass: t) {
                    dragItem.itemProvider.loadObject(ofClass: t) { (obj, error) in
                        if let err = error {
                            NSObject.alert(t: "Drop error", m: error?.localizedDescription ?? "Couldn't access the file / folder")
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
            NSObject.alert(t: "Drop error", m: error.localizedDescription )
        }
        DispatchQueue.main.async {
            self.collectionView.reloadData()
        }
    }
    func loadZIP(document: ZipDocument) {
        do {
            let url = try LoadProjects().home.createFile(named: "temp.zip", contents: document.data!)
            let new = LoadProjects().home
            SSZipArchive.unzipFile(atPath: url.path, toDestination: new.path, progressHandler: nil, completionHandler: { (str, bool, error) in
                if let err = error {
                    NSObject.alert(t: "Drop error", m: err.localizedDescription )
                }
                DispatchQueue.main.async {
                    self.collectionView.reloadData()
                }
                try? url.delete()
            })
        } catch {
            NSObject.alert(t: "Drop error", m: error.localizedDescription )
            return
        }
    }
}
