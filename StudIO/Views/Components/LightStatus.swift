//
//  LightStatus.swift
//  StudIO
//
//  Created by Arthur Guiot on 4/12/18.
//  Copyright © 2018 Arthur Guiot. All rights reserved.
//

import UIKit

class LightStatus: UISplitViewController {
    override func viewDidLoad() {
        // do something
    }
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
    override var inputAccessoryView: UIView? {
        guard let nv = self.viewControllers.last as? UINavigationController else {
            return UIView(frame: .init(x: 0, y: 0, width: 0, height: 0))
        }
        guard let detail = nv.viewControllers.first as? WorkingDirDetailVC else {
            return UIView(frame: .init(x: 0, y: 0, width: 0, height: 0))
        }
        return detail.accessory
    }
}
