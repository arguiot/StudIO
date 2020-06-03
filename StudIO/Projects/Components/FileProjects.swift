//
//  LoadProjects.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import SwiftGit2
import ExceptionCatcher

class LoadProjects {
//    let home = try! Folder.home.subfolder(atPath: "Documents")
    let home = Folder.icloud
    
    func listFolders() -> FileSystemSequence<Folder> {
        let sub = home.subfolders
        return sub
    }
    func getProjects() -> [Project]{
        let sub = listFolders()
        var array = [Project]()
        sub.forEach { (folder) in
            if folder.name != "STUDIO-PLUGINS" {
                array.append(Project(project: folder.name, path: folder))
            }
        }
        return array
    }
}
class CreateProject {
    let home = Folder.icloud
    func newLocalProject(name: String) -> Project {
        let f = try! home.createSubfolder(named: name)
        let url = URL(fileURLWithPath: f.path)
        do {
            try GTRepository.initializeEmpty(atFileURL: url, options: nil)
        } catch {
            NSObject.alert(t: "Creating Repository", m: error.localizedDescription)
        }
        return Project(project: name, path: f)
    }
    func newRemoteProject(url: URL, creds: GTCredential?, handler: @escaping (Project) -> Void) {
        let hURL = URL(fileURLWithPath: home.path)
        
        if let name = getName(url: url) {
            let pURL = hURL.appendingPathComponent(name, isDirectory: true)
            
            let f = try! home.createSubfolderIfNeeded(withName: name)
            
            let provider = GTCredentialProvider { (type, URL, credUserName) -> GTCredential? in
                guard URL == url.absoluteString else { return nil }
                guard type == .userPassPlaintext else { return nil }
                return creds
            }
            let checkoutOptions = GTCheckoutOptions(strategy: .safe)
            checkoutOptions.progressBlock = { path, completedSteps, totalSteps in
//                checkoutProgressCalled = true
            }
            let cloneOptions = [
                GTRepositoryCloneOptionsCredentialProvider: provider,
                GTRepositoryCloneOptionsCheckoutOptions: checkoutOptions
            ]
            do {
                let repo = try ExceptionCatcher.catch { () -> GTRepository? in 
                    do {
                        return try GTRepository.clone(from: url, toWorkingDirectory: pURL, options: cloneOptions) { (progress, end) in
                            // TODO: Do something
                        }
                    } catch {
                        debugPrint(error.localizedDescription)
                        return nil
                    }
                }
                guard repo != nil else {
                    alert("We found an error while cloning your repository, there is a high chance this comes from your credentials, try using correct username & password/2FA token")
                    if f.files.count == 0 || f.subfolders.count == 0 {
                        try? f.delete()
                    }
                    return
                }
                let p = Project(project: name, path: f)
                handler(p)
            } catch {
                alert(error.localizedDescription)
                if f.files.count == 0 || f.subfolders.count == 0 {
                    try? f.delete()
                }
            }
        } else {
            alert("Wrong URL, please type a valid git URL.")
        }
        
    }
    private func getName(url: URL) -> String? {
        let component = url.pathComponents.last
        if component?.lowercased().range(of: ".git") != nil {
            let sub = component?.dropLast(4)
            return String(sub!)
        }
        return component
    }
    func deleteProject(name: String) {
        try? home.subfolder(atPath: name).delete()
    }
    
    private func alert(_ str: String) {
        DispatchQueue.main.sync {
            let alert = UIAlertController(title: "Error", message: str, preferredStyle: UIAlertController.Style.alert)
            alert.addAction(UIAlertAction(title: "Cancel", style: UIAlertAction.Style.default, handler: nil))
            UIApplication.shared.keyWindow?.rootViewController?.dismiss(animated: true, completion: nil)
            UIApplication.shared.keyWindow?.rootViewController?.present(alert, animated: true, completion: nil)
        }
    }
}
