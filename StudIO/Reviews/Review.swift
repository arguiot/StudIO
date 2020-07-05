//
//  Review.swift
//  StudIO
//
//  Created by Arthur Guiot on 2020-07-05.
//  Copyright © 2020 Arthur Guiot. All rights reserved.
//

import Foundation
import StoreKit

extension AppDelegate {
    @IBAction func processCompleted(_ sender: Any?) {
        // If the count has not yet been stored, this will return 0
        var count = UserDefaults.standard.integer(forKey: UserDefaultsKeys.processCompletedCountKey)
        count += 1
        UserDefaults.standard.set(count, forKey: UserDefaultsKeys.processCompletedCountKey)
        
        print("Process completed \(count) time(s)")
        
        // Get the current bundle version for the app
        let infoDictionaryKey = kCFBundleVersionKey as String
        guard let currentVersion = Bundle.main.object(forInfoDictionaryKey: infoDictionaryKey) as? String
            else { fatalError("Expected to find a bundle version in the info dictionary") }
        
        let lastVersionPromptedForReview = UserDefaults.standard.string(forKey: UserDefaultsKeys.lastVersionPromptedForReviewKey)
        
        // Has the process been completed several times and the user has not already been prompted for this version?
        if count >= 1 && currentVersion != lastVersionPromptedForReview {
            let twoSecondsFromNow = DispatchTime.now() + 0.5
            DispatchQueue.main.asyncAfter(deadline: twoSecondsFromNow) {
                if #available(iOS 10.3, *) {
                    SKStoreReviewController.requestReview()
                } else {
                    return
                }
                UserDefaults.standard.set(currentVersion, forKey: UserDefaultsKeys.lastVersionPromptedForReviewKey)
            }
        }
    }
}
