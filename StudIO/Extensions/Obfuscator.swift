//
//  Obfuscator.swift
//  StudIO
//
//  Created by Arthur Guiot on 25/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import Foundation

class Obfuscator {
    
    // MARK: - Variables
    
    /// The salt used to obfuscate and reveal the string.
    private var salt: String
    
    // MARK: - Initialization
    
    init() {
        self.salt = "\(String(describing: AppDelegate.self))\(String(describing: NSObject.self))"
    }
    
    init(with salt: String) {
        self.salt = salt
    }
    
    
    // MARK: - Instance Methods
    
    /**
     This method obfuscates the string passed in using the salt
     that was used when the Obfuscator was initialized.
     
     - parameter string: the string to obfuscate
     
     - returns: the obfuscated string in a byte array
     */
    func bytesByObfuscatingString(string: String) -> [UInt8] {
        let text = [UInt8](string.utf8)
        let cipher = [UInt8](self.salt.utf8)
        let length = cipher.count
        
        var encrypted = [UInt8]()
        
        for t in text.enumerated() {
            encrypted.append(t.element ^ cipher[t.offset % length])
        }
        
        #if DEVELOPMENT
        print("Salt used: \(self.salt)\n")
        print("Swift Code:\n************")
        print("// Original \"\(string)\"")
        print("let key: [UInt8] = \(encrypted)\n")
        #endif
        
        return encrypted
    }
    
    /**
     This method reveals the original string from the obfuscated
     byte array passed in. The salt must be the same as the one
     used to encrypt it in the first place.
     
     - parameter key: the byte array to reveal
     
     - returns: the original string
     */
    func reveal(key: [UInt8]) -> String {
        let cipher = [UInt8](self.salt.utf8)
        let length = cipher.count
        
        var decrypted = [UInt8]()
        
        for k in key.enumerated() {
            decrypted.append(k.element ^ cipher[k.offset % length])
        }
        
        return String(bytes: decrypted, encoding: .utf8)!
    }
}


enum ObfuscatedConstants {
    static let obfuscatedGitlab: [UInt8] = [
        43,
        65,
        72,
        119,
        18,
        38,
        1,
        34,
        83,
        31,
        80,
        45,
        7,
        42,
        7,
        56,
        63,
        45,
        66,
        59
    ]
}
