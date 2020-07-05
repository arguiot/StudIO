//
//  Utils.swift
//  StudIO
//
//  Created by Arthur Guiot on 2020-07-05.
//  Copyright © 2020 Arthur Guiot. All rights reserved.
//

import UIKit

extension AppDelegate {
    // MARK: Action methods
    
    @IBAction func resetChecks(_ sender: Any?) {
        // Just for testing, reset the run counter and last bundle version checked
        UserDefaults.standard.set(0, forKey: UserDefaultsKeys.processCompletedCountKey)
        UserDefaults.standard.set("", forKey: UserDefaultsKeys.lastVersionPromptedForReviewKey)
        print("All checks have been reset")
    }
    
    /// - Tag: ManualReviewRequest
    @IBAction func requestReviewManually(_ sender: Any?) {
        // Note: Replace the XXXXXXXXXX below with the App Store ID for your app
        //       You can find the App Store ID in your app's product URL
        guard let writeReviewURL = URL(string: "https://itunes.apple.com/app/id1518717886?action=write-review")
            else { fatalError("Expected a valid URL") }
        UIApplication.shared.open(writeReviewURL, options: [:])
    }
}

