//
//  PullPush.swift
//  StudIO
//
//  Created by Arthur Guiot on 9/1/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

class Push: NSObject {
    func push(_ url: URL?, progress: ((UInt32, UInt32, Int, UnsafeMutablePointer<ObjCBool>) -> Void)?) -> Bool {
        let repo = try? GTRepository(url: url!)
        let branches = try! repo?.branches()
        let remotes = try! repo?.remoteNames()
        let remote = try? GTRemote(name: (remotes?[0])!, in: repo!)
        do {
            try repo?.pushBranches(branches!, to: remote!, withOptions: nil, progress: progress)
        } catch {
            print("Couldn't push")
        }
        return true
    }
    
    func pull(_ url: URL?, progress: @escaping (UnsafePointer<git_transfer_progress>, UnsafeMutablePointer<ObjCBool>) -> ()) -> Bool {
        let repo = try? GTRepository(url: url!)
        let branches = try! repo?.branches()
        let remotes = try? repo?.remoteNames()
        let remote = try? GTRemote(name: remotes!![0], in: repo!)
        do {
            try repo?.pull(branches![0], from: remote!, withOptions: nil, progress: progress)
        } catch {
            print("Couldn't pull")
        }
        
        return true
    }
}
