//
//  PullPush.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/1/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation
import SwiftGit2

class Push: NSObject {
    func push(_ url: URL?, options: NSDictionary?, progress: ((UInt32, UInt32, Int, UnsafeMutablePointer<ObjCBool>) -> Void)?) -> Bool {
        let repo = try? GTRepository(url: url!)
        let branches = try! repo?.branches()
        let remotes = try! repo?.remoteNames()
        let remote = try? GTRemote(name: (remotes?[0])!, in: repo!)
        do {
            try repo?.pushBranches(branches!, to: remote!, withOptions: options as! [AnyHashable : Any], progress: progress)
        } catch {
            print("Couldn't push")
        }
        return true
    }
    
    func pull(_ url: URL?, options: NSDictionary?, progress: @escaping (UnsafePointer<git_transfer_progress>, UnsafeMutablePointer<ObjCBool>) -> ()) -> Bool {
        let repo = try? GTRepository(url: url!)
        let branches = try! repo?.branches()
        let remotes = try? repo?.remoteNames()
        let remote = try? GTRemote(name: remotes!![0], in: repo!)
        do {
            try repo?.pull(branches![0], from: remote!, withOptions: options as! [AnyHashable : Any], progress: progress)
        } catch {
            print("Couldn't pull")
        }
        
        return true
    }
    func creds(creds: GTCredential?) -> NSDictionary? {
        let gtcp = GTCredentialProvider { (type, a, b) -> GTCredential? in
            return creds
        }
        let d: NSDictionary = [
            "GTRepositoryRemoteOptionsCredentialProvider": gtcp
        ]
        return d
    }
}
