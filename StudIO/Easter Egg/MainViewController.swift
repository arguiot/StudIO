//
//  MainViewController.swift
//  ArcadeGame
//
//  Created by Nikki Truong on 2019-02-28.
//  Copyright © 2019 PenguinExpress. All rights reserved.
//

import UIKit
import AVFoundation

class MainViewController: UIViewController {
    
    var videoPlayer = AVPlayer()
    
    @IBAction func btnTapped(_ sender: Any) {
        audioPlayer.playBtnTappedSound()
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        if audioPlayer.firstPlay == true {
            audioPlayer.playBackgroundSound()
            audioPlayer.firstPlay = false
        }
    }
}
