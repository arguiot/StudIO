//
//  PanelManager.swift
//  StudIO
//
//  Created by Arthur Guiot on 14/3/19.
//  Copyright © 2019 Arthur Guiot. All rights reserved.
//

import UIKit
import PanelKit

extension WorkingDirDetailVC: PanelManager {
    var panels: [PanelViewController] {
        snippetPanel = PanelViewController(with: snippet, in: self)
        return [snippetPanel!]
    }
    
    var panelContentWrapperView: UIView {
        return wrapperView
    }
    
    var panelContentView: UIView {
        return self.containerView
    }
    
    func maximumNumberOfPanelsPinned(at side: PanelPinSide) -> Int {
        return panels.count
    }
    var allowPanelPinning: Bool {
        return panelContentWrapperView.bounds.width > 700
    }
    var allowFloatingPanels: Bool {
        return panelContentWrapperView.bounds.width > 700
    }
}

