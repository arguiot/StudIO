//
//  PullPush.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/1/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit

class Push: NSObject {
    func push(_ url: URL, options: NSDictionary?, progress: ((UInt32, UInt32, Int, UnsafeMutablePointer<ObjCBool>) -> Void)?) throws {
        let repo = try GTRepository(url: url)
        let branche = try repo.currentBranch()
        let remotes = try repo.remoteNames()
        let remote = try GTRemote(name: remotes[0], in: repo)
        try repo.push(branche, to: remote, withOptions: options as? [AnyHashable : Any], progress: progress)
    }
    
    func pull(_ url: URL, options: NSDictionary?, progress: @escaping (UnsafePointer<git_transfer_progress>, UnsafeMutablePointer<ObjCBool>) -> ()) throws {
        let repo = try GTRepository(url: url)
        let branche = try repo.currentBranch()
        let remotes = try repo.remoteNames()
        let remote = try GTRemote(name: remotes[0], in: repo)
        try repo.pull(branche, from: remote, withOptions: options as? [AnyHashable : Any], progress: progress)
    }
    func creds(creds: GTCredential?) -> NSDictionary? {
        let gtcp = GTCredentialProvider { (type, a, b) -> GTCredential? in
            return creds
        }
        let d = [
            GTRepositoryCloneOptionsCredentialProvider: gtcp,
            GTRepositoryRemoteOptionsCredentialProvider: gtcp
        ]
        return d as NSDictionary
    }
}
