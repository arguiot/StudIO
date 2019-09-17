//
//  SttingsViewController.swift
//  ArcadeGame
//
//  Created by Nikki Truong on 2019-02-28.
//  Copyright © 2019 PenguinExpress. All rights reserved.
//

import UIKit
import AVFoundation

class SettingsViewController: UIViewController {

    @IBOutlet weak var bgBtn: SetButtons!
    @IBOutlet weak var effBtn: SetButtons!
    
    @IBAction func backgroundSoundBtn   (_ sender: UIButton) {
        
        audioPlayer.playBtnTappedSound()
        
        if audioPlayer.backgroundSoundIsMuted == false {
            audioPlayer.backgroundSoundIsMuted = true
            audioPlayer.muteBackgroundSound()
        } else {
            audioPlayer.backgroundSoundIsMuted = false
            audioPlayer.unmuteBackgroundSound()
        }
        
        setBgBtn()
    }
    
    @IBAction func effectsBtn(_ sender: UIButton) {
        
        audioPlayer.playBtnTappedSound()    
        
        if audioPlayer.effectSoundIsMuted == false  {
            audioPlayer.effectSoundIsMuted = true
        } else {
            audioPlayer.effectSoundIsMuted = false
        }
        
        setEffBtn()
    }
    
    func setBgBtn() {
        if audioPlayer.backgroundSoundIsMuted == true {
            bgBtn.setTitle("Unmute", for: .normal)
        } else {
            bgBtn.setTitle("Mute", for: .normal)
        }
    }
    
    func setEffBtn() {
        if audioPlayer.effectSoundIsMuted == true {
            effBtn.setTitle("Unmute", for: .normal)
        } else {
            effBtn.setTitle("Mute", for: .normal)
        }
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view.
        
        setBgBtn()
        setEffBtn()
    }
}
