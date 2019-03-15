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
        return []
    }
    
    var panelContentWrapperView: UIView {
        return self.view
    }
    
    var panelContentView: UIView {
        return self.editorView
    }
}

