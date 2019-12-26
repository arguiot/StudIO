//
//  AppDelegate.swift
//  StudIO
//
//  Created by Arthur Guiot on 1/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit
import OneSignal

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UISplitViewControllerDelegate {

    var window: UIWindow?

    var quickActions: QuickActions<AppShortcut>?
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Launch
        self.window = UIWindow(frame: UIScreen.main.bounds)
        
        let storyboard = UIStoryboard(name: "Projects", bundle: nil)
        
        let initialViewController = storyboard.instantiateInitialViewController()
        
        self.window?.rootViewController = initialViewController
        self.window?.makeKeyAndVisible()
        
        
        // Shortcuts
        
        let shortcuts: [Shortcut] = [
            Shortcut(type: AppShortcut.cloneRepo, title: NSLocalizedString("Clone Repo", comment: ""), subtitle: nil, icon: ShortcutIcon.cloud),
            Shortcut(type: AppShortcut.localRepo, title: NSLocalizedString("Local Repo", comment: ""), subtitle: nil, icon: ShortcutIcon.add)
        ]
        if let actionHandler = window?.rootViewController as? QuickActionSupport, let bundleIdentifier = Bundle.main.bundleIdentifier {
            quickActions = QuickActions(application, actionHandler: actionHandler, bundleIdentifier: bundleIdentifier, shortcuts: shortcuts, launchOptions: launchOptions)
        }
        
        UIApplication.shared.statusBarStyle = .lightContent
        
        // OneSignal
        let onesignalInitSettings = [kOSSettingsKeyAutoPrompt: false]

        // Replace 'YOUR_APP_ID' with your OneSignal App ID.
        OneSignal.initWithLaunchOptions(launchOptions,
        appId: "fb2196f8-2d1a-43c2-aced-083dcdbf6826",
        handleNotificationAction: nil,
        settings: onesignalInitSettings)

        OneSignal.inFocusDisplayType = OSNotificationDisplayType.notification;

        // Recommend moving the below line to prompt for push after informing the user about
        //   how your app will use them.
        OneSignal.promptForPushNotifications(userResponse: { accepted in
            print("User accepted notifications: \(accepted)")
        })
        
        return true
    }
    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }
    
    
    @available(iOS 9, *)
    func application(_ application: UIApplication, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Swift.Void) {
        // This callback is used if your application is already launched in the background, if not application(_:,willFinishLaunchingWithOptions:) or application(_:didFinishLaunchingWithOptions) will be called (handle the shortcut in those callbacks and return `false`)
        guard let quickActions = quickActions else {
            return completionHandler(false)
        }
        guard let actionHandler = window?.rootViewController as? QuickActionSupport else {
            return completionHandler(false)
        }
        completionHandler(quickActions.handle(actionHandler, shortcutItem: shortcutItem))
    }
    
    
    // MARK: - Split view

    func splitViewController(_ splitViewController: UISplitViewController, collapseSecondary secondaryViewController:UIViewController, onto primaryViewController:UIViewController) -> Bool {
        guard let secondaryAsNavController = secondaryViewController as? UINavigationController else { return false }
        guard let topAsDetailController = secondaryAsNavController.topViewController as? WorkingDirDetailVC else { return false }
        guard let visible = topAsDetailController.visibleViewController as? DetailVC else { return false }
        if visible.detailItem == nil {
            // Return true to indicate that we have handled the collapse by doing nothing; the secondary controller will be discarded.
            return true
        }
        return false
    }
    
    // MARK: Multiple View
    
    @available(iOS 13.0, *)
    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        return UISceneConfiguration(name: "General Configuration", sessionRole: connectingSceneSession.role)
    }
}

enum AppShortcut: String, ShortcutType {
    case cloneRepo
    case localRepo
}
extension UIApplication {
    class func topViewController(base: UIViewController? = UIApplication.shared.keyWindow?.rootViewController) -> UIViewController? {
        if let nav = base as? UINavigationController {
            return topViewController(base: nav.visibleViewController)
        }
        if let tab = base as? UITabBarController {
            if let selected = tab.selectedViewController {
                return topViewController(base: selected)
            }
        }
        if let presented = base?.presentedViewController {
            return topViewController(base: presented)
        }
        return base
    }
}
